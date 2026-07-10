import { getOpenRouter } from "./openrouter.js";

// Cheap, fast model — good enough for relevance *grading*, not answer generation.
// This is a deliberate choice: reranking only needs "is this excerpt relevant,
// 0-10", which doesn't need the same model quality as the final answer.
const RERANK_MODEL = "gpt-4o-mini";

// Truncate each candidate before sending to the grader — we only need enough
// text to judge relevance, not the full chunk, and this keeps the single
// batched prompt bounded regardless of how large individual chunks are.
const MAX_CHARS_PER_CANDIDATE = 600;

const SYSTEM_PROMPT = `You are a relevance grader for a retrieval-augmented generation system.
Given a user question and a numbered list of candidate excerpts, score EACH excerpt's
relevance to directly answering the question, on a 0-10 integer scale:
- 10 = excerpt directly contains or fully answers the question
- 5 = excerpt is topically related but does not directly answer it
- 0 = excerpt is unrelated

Respond with ONLY a JSON array, one entry per excerpt, in this exact form:
[{"id": 0, "score": 8}, {"id": 1, "score": 2}]
No prose, no markdown fences, no explanation — JSON only.`;

function truncate(text, max) {
  if (!text || text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function buildUserPrompt(query, candidates) {
  const excerpts = candidates
    .map((c, i) => `${i}: ${truncate(c.text, MAX_CHARS_PER_CANDIDATE)}`)
    .join("\n\n");

  return `Question: ${query}\n\nExcerpts:\n${excerpts}`;
}

/**
 * Rerank candidate chunks by LLM-judged relevance to the query.
 *
 * One batched call scores every candidate at once (cheap model, temp 0) —
 * cost and latency stay roughly constant regardless of K, instead of scaling
 * with the number of candidates the way per-chunk scoring would.
 *
 * Degrades gracefully: on any parse/API failure, returns candidates in their
 * original (pre-rerank) order rather than failing the request — reranking is
 * a quality improvement layered on top of retrieval, not a dependency of it.
 *
 * @param {string} query
 * @param {Array<{id: string, text: string}>} candidates - order = fallback/tiebreak order
 * @returns {Promise<Array<{id: string, rerankScore: number|null}>>} sorted best-first
 */
export async function rerankChunks(query, candidates) {
  if (!candidates.length) return [];

  // Nothing to reorder with a single candidate — skip the LLM call entirely.
  if (candidates.length === 1) {
    return [{ id: candidates[0].id, rerankScore: 10 }];
  }

  try {
    const openai = getOpenRouter();

    const response = await openai.chat.completions.create({
      model: RERANK_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(query, candidates) },
      ],
    });

    const raw = response.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("Reranker response was not a JSON array");
    }

    const scoreByIndex = new Map(
      parsed.map((p) => [Number(p.id), Number(p.score)])
    );

    return candidates
      .map((c, i) => ({
        id: c.id,
        rerankScore: scoreByIndex.has(i) ? scoreByIndex.get(i) : 0,
        originalRank: i, // tiebreak — preserves hybrid-search order on ties or missing scores
      }))
      .sort(
        (a, b) => b.rerankScore - a.rerankScore || a.originalRank - b.originalRank
      )
      .map(({ id, rerankScore }) => ({ id, rerankScore }));
  } catch (err) {
    console.error(
      "rerankChunks: LLM rerank failed, falling back to original order:",
      err.message
    );
    return candidates.map((c) => ({ id: c.id, rerankScore: null }));
  }
}