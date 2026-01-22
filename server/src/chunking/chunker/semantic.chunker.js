import { chunkText } from "../../utils/chunker.js";

/**
 * Semantic chunker
 * Page-aware semantic chunking.
 */
export async function semanticChunker({
  pages,
  userId,
  documentId,
  filename,
  fileType,
}) {
  const semanticChunks = [];

  for (const page of pages) {
    const chunks = await chunkText({
      text: page.text,
      userId,
      documentId,
      filename,
      fileType,
      metadata: {
        pageNumber: page.pageNumber,
        chunkingMode: "semantic",
      },
    });

    semanticChunks.push(...chunks);
  }

  return semanticChunks;
}
