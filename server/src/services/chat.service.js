import qdrant from "../utils/qdrant.js";
import Chunk from "../models/Chunk.js";
import { embedText, generateAnswer } from "../utils/openrouter.js";

/**
 * Retrieval configuration
 * FACT  → precision (atomic-heavy)
 * SUMMARY → coverage (semantic + structural)
 */
const TOP_K_FACT = 6;
const SCORE_THRESHOLD_FACT = 0.25;

const TOP_K_SUMMARY = 14;
const SCORE_THRESHOLD_SUMMARY = 0.15;

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
 * Deterministic, no LLM involvement
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
}) => {
 
  // STEP 0 — Decide retrieval mode
 
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

 
  // STEP 2 — Vector search (document scoped)
 
  const searchResult = await qdrant.search("resonance_chunks", {
    vector: queryEmbedding,
    limit: TOP_K,
    filter: {
      must: [
        { key: "userId", match: { value: userId.toString() } },
        { key: "documentId", match: { value: documentId.toString() } },
      ],
    },
  });

 
  // STEP 3 — Apply threshold + SUMMARY fallback
 
  let hits = searchResult.filter(
    (r) => r.score >= SCORE_THRESHOLD
  );

  if (summaryMode && hits.length === 0) {
    hits = searchResult.slice(0, 6);
  }

  if (hits.length === 0) {
    return {
      answer: "I could not find this information in the document.",
      sources: [],
      confidence: 0,
      mode,
      topPages: [],
    };
  }

 
  // STEP 4 — Fetch chunks from Mongo (preserve order)
 
  const chunkIds = hits.map((h) => h.payload.chunkId);

  const chunks = await Chunk.find({
    _id: { $in: chunkIds },
  }).select("text metadata");

  const chunkMap = new Map(
    chunks.map((c) => [c._id.toString(), c])
  );

  const orderedChunks = hits
    .map((h) => chunkMap.get(h.payload.chunkId))
    .filter(Boolean);

  const context = orderedChunks
    .map((c) => c.text)
    .join("\n\n");

 
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
 
  const answer = await generateAnswer({
    systemPrompt,
    userPrompt,
  });

 
  // STEP 8 — Confidence + citations
 
  const confidence = computeConfidence(hits);

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
