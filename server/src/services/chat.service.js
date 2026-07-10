import Chunk from "../models/Chunk.js";
import {
  embedText,
  generateAnswer,
  generateAnswerStream,
} from "../utils/openrouter.js";
import { hybridSearch } from "../utils/hybridSearch.js";
import { rerankChunks } from "../utils/reranker.js";

/**
 * Retrieval configuration
 * FACT  → precision (atomic-heavy)
 * SUMMARY → coverage (semantic + structural)
 *
 * NOTE: these thresholds were originally tuned against raw Qdrant cosine
 * similarity (0–1). They now apply to the RRF-fused hybrid score (also 0–1,
 * but a different distribution — a chunk ranked #1 by both retrievers scores
 * near 1.0, a chunk found by only one retriever scores lower even at rank #1).
 * Kept the same values for now since both are 0–1 bounded, but these are the
 * first constants worth re-tuning against real query logs.
 */
const TOP_K_FACT = 6;
const SCORE_THRESHOLD_FACT = 0.25;

const TOP_K_SUMMARY = 14;
const SCORE_THRESHOLD_SUMMARY = 0.15;

// How many candidates to pull from each retriever before RRF fusion + thresholding.
// Wider than TOP_K so the fusion step has real candidates to rank against, not just
// the ones that were already going to survive the threshold on vector score alone.
const CANDIDATE_MULTIPLIER = 3;
const MIN_CANDIDATES = 20;

// How many post-threshold hits get sent into the reranker. Capped independently
// of TOP_K/candidate limits — the rerank prompt cost scales with pool size, so
// this is the dial for "thoroughness vs. latency/cost" of the rerank step itself.
const RERANK_POOL_SIZE = 15;

/**
 * Detect summary / explanation queries
 * Explicit, deterministic, production-safe
 */
function isSummaryQuery(query) {
  const q = query.toLowerCase();
  return (
    q.includes("summary") ||
    q.includes("summarize") ||
    q.includes("explain") ||
    q.includes("overview") ||
    q.includes("details") ||
    q.includes("this document") ||
    q.includes("about")
  );
}

/**
 * Retrieval-based confidence score (0 → 1)
 * Deterministic, no LLM involvement beyond the rerank scores already computed.
 */
function computeConfidence(hits) {
  if (!hits.length) return 0;

  const avgScore =
    hits.reduce((sum, h) => sum + h.score, 0) / hits.length;

  const confidence =
    avgScore * Math.log2(hits.length + 1);

  return Math.min(1, Number(confidence.toFixed(2)));
}


function getTopPagesFromRetrieval(chunks, limit = 3) {
  const seen = new Set();
  const pages = [];

  for (const c of chunks) {
    const p = c.metadata?.pageNumber;
    if (typeof p === "number" && !seen.has(p)) {
      seen.add(p);
      pages.push(p);
      if (pages.length === limit) break;
    }
  }

  return pages;
}


function rewriteQueryWithHistory(query, chatHistory) {
  if (!chatHistory || chatHistory.length < 2) return query;

  const q = query.toLowerCase();
  const needsResolution = /\b(it|its|this|that|given|same)\b/.test(q);

  if (!needsResolution) return query;

  const previousUserMessages = chatHistory.filter(
    (m) => m.role === "user" && m.content !== query
  );

  if (previousUserMessages.length === 0) return query;

  const lastUserMessage =
    previousUserMessages[previousUserMessages.length - 1];

  return `${lastUserMessage.content}. ${query}`;
}

export const runDocumentChat = async ({
  userId,
  documentId,
  query,
  chatHistory = [],
  onStatus, // optional: (status: string) => void, e.g. "retrieving" | "generating"
  onToken, // optional: (deltaText: string) => void — enables streaming
}) => {
 
  // STEP 0 — Decide retrieval mode
 
  onStatus?.("retrieving");

  const summaryMode = isSummaryQuery(query);

  const mode = summaryMode ? "SUMMARY" : "FACT";
  const TOP_K = summaryMode ? TOP_K_SUMMARY : TOP_K_FACT;
  const SCORE_THRESHOLD = summaryMode
    ? SCORE_THRESHOLD_SUMMARY
    : SCORE_THRESHOLD_FACT;

 
  // STEP 1 — Embed query (WITH retrieval memory)
 
  const retrievalQuery = rewriteQueryWithHistory(
    query,
    chatHistory
  );

  const queryEmbedding = await embedText(retrievalQuery);

 
  // STEP 2 — Hybrid search: Qdrant vector search + Mongo $text keyword search,
  // merged via Reciprocal Rank Fusion (document scoped)
 
  const candidateLimit = Math.max(TOP_K * CANDIDATE_MULTIPLIER, MIN_CANDIDATES);

  const searchResult = await hybridSearch({
    queryVector: queryEmbedding,
    queryText: retrievalQuery,
    userId,
    documentId,
    vectorLimit: candidateLimit,
    textLimit: candidateLimit,
  });

 
  // STEP 3 — Apply threshold + SUMMARY fallback
 
  let hits = searchResult.filter(
    (r) => r.score >= SCORE_THRESHOLD
  );

  if (summaryMode && hits.length === 0) {
    hits = searchResult.slice(0, 6);
  }

  if (hits.length === 0) {
    const fallbackAnswer = "I could not find this information in the document.";
    onToken?.(fallbackAnswer);
    return {
      answer: fallbackAnswer,
      sources: [],
      confidence: 0,
      mode,
      topPages: [],
    };
  }

 
  // STEP 4 — Rerank: pull a pool from hybrid hits, fetch their text once,
  // let the LLM grade relevance, then keep only the top TOP_K afterward.
  // This is the step that reorders "vector+keyword agree it's relevant" into
  // "actually answers this specific question" — RRF rank ≠ answer relevance.
 
  const rerankPool = hits.slice(0, RERANK_POOL_SIZE);
  const poolChunkIds = rerankPool.map((h) => h.payload.chunkId);

  const poolChunks = await Chunk.find({
    _id: { $in: poolChunkIds },
  }).select("text metadata");

  const poolChunkMap = new Map(
    poolChunks.map((c) => [c._id.toString(), c])
  );

  const rerankCandidates = rerankPool
    .map((h) => {
      const chunk = poolChunkMap.get(h.payload.chunkId);
      return chunk ? { id: h.payload.chunkId, text: chunk.text } : null;
    })
    .filter(Boolean);

  const reranked = await rerankChunks(retrievalQuery, rerankCandidates);

  const finalChunkIds = reranked.slice(0, TOP_K).map((r) => r.id);

  const orderedChunks = finalChunkIds
    .map((id) => poolChunkMap.get(id))
    .filter(Boolean);

  const context = orderedChunks
    .map((c) => c.text)
    .join("\n\n");

  // Effective score per final chunk, for confidence computation below:
  // rerank score (normalized 0-1) when available, falling back to the
  // pre-rerank hybrid score if the reranker degraded to original order.
  const hybridHitByChunkId = new Map(
    rerankPool.map((h) => [h.payload.chunkId, h])
  );
  const rerankScoreById = new Map(
    reranked.map((r) => [r.id, r.rerankScore])
  );

  const finalHits = finalChunkIds.map((id) => {
    const rerankScore = rerankScoreById.get(id);
    const effectiveScore =
      rerankScore != null
        ? rerankScore / 10
        : hybridHitByChunkId.get(id)?.score ?? 0;

    return { score: effectiveScore };
  });

 
  // STEP 5 — Build chat history block (Layer 1)
 
  const historyBlock =
    chatHistory.length > 0
      ? chatHistory
          .map(
            (m) =>
              `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
          )
          .join("\n")
      : "";

 
  // STEP 6 — Prompts
 
  const systemPrompt = `You are a document-based assistant.

You are given:
- a user question
- retrieved excerpts from a single document
- optional previous conversation turns

Rules:
- be very fexible if u dont find the thing in document and if u think it is related to the document in some or other way answer it with ur natural thinking 
- Use the document excerpts as the factual source.
- You may use prior conversation for context and references.
- Do NOT introduce new factual claims.
- If the document does not contain the answer, say exactly:
  "I could not find this information in the document."

Be clear, grounded, and helpful.
`;

  const userPrompt = `
Conversation so far:
${historyBlock}

Context:
${context}

Question:
${query}
`;

  
  // STEP 7 — Generate answer
 
  onStatus?.("generating");

  const answer = onToken
    ? await generateAnswerStream({ systemPrompt, userPrompt, onToken })
    : await generateAnswer({ systemPrompt, userPrompt });

 
  // STEP 8 — Confidence + citations
 
  const confidence = computeConfidence(finalHits);

  const sources = orderedChunks.map((c) => ({
    chunkId: c._id,
    pageNumber: c.metadata?.pageNumber,
    chunkingMode: c.metadata?.chunkingMode,
    filename: c.metadata?.filename,
  }));

// 🔒 numeric pages for storage
const topPageNumbers = getTopPagesFromRetrieval(
  orderedChunks,
  3
);

// 🔥 enriched pages for frontend
const topPages = topPageNumbers.map((page) => ({
  pageNumber: page,
  url: `/api/documents/${documentId}/page/${page}`,
}));


 
  // STEP 9 — Final response
 
  return {
    answer,
    mode,
    confidence,
    sources,
    topPages,
  };
};