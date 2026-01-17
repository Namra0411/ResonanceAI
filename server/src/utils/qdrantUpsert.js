import qdrant from "./qdrant.js";
import { v4 as uuidv4 } from "uuid";

const COLLECTION_NAME = "resonance_chunks";

export async function ensureQdrantCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3072,
        distance: "Cosine",
      },
    });
  }
}

export async function upsertChunks(chunks, vectors) {
  await qdrant.upsert(COLLECTION_NAME, {
    points: chunks.map((chunk, index) => ({
      id: uuidv4(), 
      vector: vectors[index],
      payload: {

        chunkId: chunk._id.toString(),
        userId: chunk.userId.toString(),
        documentId: chunk.documentId.toString(),
        chunkIndex: chunk.metadata.chunkIndex,
        filename: chunk.metadata.filename,
        fileType: chunk.metadata.fileType,
      },
    })),
  });
}
