import Document from "../models/documents.js";
import Chunk from "../models/Chunk.js";
import qdrant from "../utils/qdrant.js";
import { embedTexts } from "../utils/embedder.js";

const COLLECTION = "resonance_chunks";
const TOP_K_CHUNKS = 20;
const TOP_N_DOCS = 5;
const PREVIEW_CHUNKS = 3;

const MIN_SCORE = 0.25;
const DELTA = 0.08;

export const searchDocuments = async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q) {
      return res.status(400).json({ msg: "Query parameter `q` is required" });
    }

    const [queryVector] = await embedTexts([q]);

    const hits = await qdrant.search(COLLECTION, {
      vector: queryVector,
      limit: TOP_K_CHUNKS,
      with_payload: true,
      filter: {
        must: [{ key: "userId", match: { value: req.userId.toString() } }],
      },
    });

    const byDoc = {};

    for (const hit of hits ?? []) {
      const { documentId, chunkId } = hit.payload;

      if (!byDoc[documentId]) {
        byDoc[documentId] = {
          score: hit.score,
          chunkIds: [chunkId],
        };
      } else {
        byDoc[documentId].score = Math.max(
          byDoc[documentId].score,
          hit.score
        );
        byDoc[documentId].chunkIds.push(chunkId);
      }
    }

    let contentMatches = [];

    const rankedDocs = Object.entries(byDoc)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, TOP_N_DOCS);

    if (rankedDocs.length > 0) {
      const topScore = rankedDocs[0][1].score;

      if (topScore >= MIN_SCORE) {
        const cutoff = topScore - DELTA;

        const filteredDocIds = rankedDocs
          .filter(([, data]) => data.score >= cutoff)
          .map(([docId]) => docId);

        if (filteredDocIds.length > 0) {
          const documents = await Document.find({
            _id: { $in: filteredDocIds },
            userId: req.userId,
          }).select("filename");

          const previewChunkIds = filteredDocIds.flatMap((docId) =>
            byDoc[docId].chunkIds.slice(0, PREVIEW_CHUNKS)
          );

          const chunks = await Chunk.find({
            _id: { $in: previewChunkIds },
          }).select("text");

          const chunkTextById = {};
          for (const c of chunks) {
            chunkTextById[c._id.toString()] = c.text;
          }

          const docById = {};
          for (const d of documents) {
            docById[d._id.toString()] = d;
          }

          contentMatches = filteredDocIds.map((docId) => ({
            documentId: docId,
            filename: docById[docId]?.filename ?? "Unknown",
            score: byDoc[docId].score,
            matches: byDoc[docId].chunkIds
              .slice(0, PREVIEW_CHUNKS)
              .map((cid) => chunkTextById[cid])
              .filter(Boolean),
          }));
        }
      }
    }

   
    const contentDocIds = new Set(
      contentMatches.map((d) => d.documentId.toString())
    );

    const nameMatchesRaw = await Document.find({
      userId: req.userId,
      filename: { $regex: q, $options: "i" },
      _id: { $nin: Array.from(contentDocIds) },
    })
      .limit(5)
      .select("filename");

    const nameMatches = nameMatchesRaw.map((doc) => ({
      documentId: doc._id,
      filename: doc.filename,
    }));

    res.json({
      contentMatches,
      nameMatches,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
