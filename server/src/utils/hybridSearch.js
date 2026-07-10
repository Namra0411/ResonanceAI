import qdrant from "./qdrant.js";
import Chunk from "../models/Chunk.js";

const COLLECTION = "resonance_chunks";

// Standard RRF constant from Cormack, Clarke & Buettcher (2009),
// "Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods".
// k=60 dampens the influence of very top ranks so one list can't dominate the merge.
const RRF_K = 60;

/**
 * Reciprocal Rank Fusion.
 * score(d) = Σ over lists containing d of 1 / (k + rank(d))
 *
 * rankedLists: array of arrays, each already sorted best-first,
 * each item shaped as { id, ...anyExtraFields }.
 *
 * Returns items sorted by fused score, normalized to ~[0,1]
 * (1.0 = ranked #1 in every list it appeared in).
 */
function reciprocalRankFusion(rankedLists, k = RRF_K) {
  const merged = new Map(); // id -> { score, data }

  for (const list of rankedLists) {
    list.forEach((item, idx) => {
      const rank = idx + 1;
      const contribution = 1 / (k + rank);

      const existing = merged.get(item.id) || { score: 0, data: {} };
      existing.score += contribution;
      existing.data = { ...existing.data, ...item };
      merged.set(item.id, existing);
    });
  }

  // Max possible score if a doc were ranked #1 in every supplied list.
  const maxPossible = rankedLists.length / (k + 1);

  return Array.from(merged.entries())
    .map(([id, { score, data }]) => ({
      id,
      score: maxPossible > 0 ? score / maxPossible : 0,
      data,
    }))
    .sort((a, b) => b.score - a.score);
}

async function vectorSearch({ queryVector, userId, documentId, limit }) {
  const must = [{ key: "userId", match: { value: userId.toString() } }];
  if (documentId) {
    must.push({ key: "documentId", match: { value: documentId.toString() } });
  }

  const results = await qdrant.search(COLLECTION, {
    vector: queryVector,
    limit,
    with_payload: true,
    filter: { must },
  });

  return results.map((r) => ({
    id: r.payload.chunkId,
    rawVectorScore: r.score,
    payload: r.payload,
  }));
}

async function textSearch({ queryText, userId, documentId, limit }) {
  const filter = { userId };
  if (documentId) filter.documentId = documentId;

  // NOTE: requires a MongoDB text index on Chunk.text (see models/Chunk.js).
  // If the index doesn't exist yet, this throws — caller degrades to vector-only.
  const results = await Chunk.find(
    { ...filter, $text: { $search: queryText } },
    { score: { $meta: "textScore" }, documentId: 1 }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .lean();

  return results.map((c) => ({
    id: c._id.toString(),
    rawTextScore: c.score,
    documentId: c.documentId.toString(),
  }));
}

/**
 * Hybrid search: Qdrant vector search + MongoDB $text keyword search,
 * merged with Reciprocal Rank Fusion.
 *
 * Why RRF over averaging raw scores: cosine similarity (Qdrant) and Lucene-style
 * textScore (Mongo) live on completely different, incomparable scales — averaging
 * them directly would let whichever score happens to have a bigger numeric range
 * dominate the merge. RRF only looks at each list's *rank order*, so it's scale-free
 * and doesn't require normalizing two unrelated scoring functions.
 *
 * Degrades gracefully: if the text index is missing, or a $text query has no
 * matching terms (or the query text has no tokenizable words at all, e.g. a query
 * built purely from stopwords), textSearch fails/returns empty and results fall
 * back to vector-only — never a hard failure of retrieval.
 *
 * @param {number[]} queryVector - embedding of the query
 * @param {string} queryText - same query, raw text, for keyword matching
 * @param {string|ObjectId} userId
 * @param {string|ObjectId|null} documentId - omit for cross-document search
 * @param {number} vectorLimit - how many candidates to pull from Qdrant
 * @param {number} textLimit - how many candidates to pull from Mongo $text
 */
export async function hybridSearch({
  queryVector,
  queryText,
  userId,
  documentId = null,
  vectorLimit = 20,
  textLimit = 20,
}) {
  const [vectorHits, textHits] = await Promise.all([
    vectorSearch({ queryVector, userId, documentId, limit: vectorLimit }).catch(
      (err) => {
        console.error("hybridSearch: vector search failed:", err.message);
        return [];
      }
    ),
    textSearch({ queryText, userId, documentId, limit: textLimit }).catch(
      (err) => {
        // Common causes: no text index yet, or no terms matched — not fatal.
        console.error("hybridSearch: text search failed:", err.message);
        return [];
      }
    ),
  ]);

  if (vectorHits.length === 0 && textHits.length === 0) return [];

  const fused = reciprocalRankFusion([vectorHits, textHits]);
  const vectorPayloadById = new Map(vectorHits.map((v) => [v.id, v.payload]));

  return fused.map((f) => ({
    score: Number(f.score.toFixed(4)),
    vectorScore: f.data.rawVectorScore ?? null,
    textScore: f.data.rawTextScore ?? null,
    payload:
      vectorPayloadById.get(f.id) ||
      { chunkId: f.id, documentId: f.data.documentId },
  }));
}