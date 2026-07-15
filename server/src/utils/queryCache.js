import crypto from "crypto";
import { redis } from "../queue/redis.js";

/**
 * Caches full RAG results (answer + sources + confidence + topPages) for
 * repeated queries against the same document, keyed by a hash of
 * (documentId, answerMode, normalized query text).
 *
 * Scope/limits, intentionally kept simple for now:
 * - Only exact-repeat queries hit the cache (no semantic/near-duplicate
 *   matching) — normalization just lowercases + trims + collapses whitespace.
 * - TTL-based expiry (default 1h) rather than active invalidation on
 *   document re-ingestion — good enough for a resume-project demo, but the
 *   real fix for production would be invalidating on re-ingest by document
 *   version instead of relying on time alone.
 * - Cached results skip retrieval AND generation entirely on a hit, since
 *   both are deterministic-ish given the same inputs, retrieval mode, and
 *   answer mode.
 */

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const NAMESPACE = "chatcache";

function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildCacheKey({ documentId, answerMode, query }) {
  const raw = `${documentId}:${answerMode}:${normalizeQuery(query)}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return `${NAMESPACE}:${hash}`;
}

export async function getCachedAnswer({ documentId, answerMode, query }) {
  try {
    const key = buildCacheKey({ documentId, answerMode, query });
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    // Cache is a pure optimization — never let a Redis hiccup break chat.
    console.warn("⚠️ queryCache read failed:", err.message);
    return null;
  }
}

export async function setCachedAnswer(
  { documentId, answerMode, query },
  result,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  try {
    const key = buildCacheKey({ documentId, answerMode, query });
    await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
  } catch (err) {
    console.warn("⚠️ queryCache write failed:", err.message);
  }
}