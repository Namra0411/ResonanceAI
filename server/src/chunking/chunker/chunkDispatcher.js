import { semanticChunker } from "../chunker/semantic.chunker.js";
import { structuralChunker } from "../chunker/structural.chunker.js";
import { pageChunker } from "../chunker/page.chunker.js";

/**
 * Dispatch chunking strategy per page.
 * Page-aware, structure-aware.
 * Guarantees:
 * - pageNumber
 * - chunkIndex
 * - totalChunks
 */
export async function chunkDocumentByStructure({
  pages,
  userId,
  documentId,
  filename,
  fileType,
}) {
  let allChunks = [];
  let hasStructural = false;

  for (const page of pages) {
    const pageNumber = page.pageNumber;

    if (page.structureMode === "structural") {
      hasStructural = true;

      const chunks = structuralChunker({
        page,
        userId,
        documentId,
        filename,
        fileType,
      });

      allChunks.push(
        ...chunks.map((c) => ({
          ...c,
          metadata: {
            ...c.metadata,
            pageNumber,
          },
        }))
      );
    } else if (page.structureMode === "page") {
      const chunks = pageChunker({
        page,
        userId,
        documentId,
        filename,
        fileType,
      });

      allChunks.push(
        ...chunks.map((c) => ({
          ...c,
          metadata: {
            ...c.metadata,
            pageNumber,
          },
        }))
      );
    }
  }

  // Fallback to semantic chunking (page-aware)
  if (!hasStructural || allChunks.length === 0) {
    allChunks = await semanticChunker({
      pages,
      userId,
      documentId,
      filename,
      fileType,
    });
  }

  //  FINAL NORMALIZATION STEP (THIS FIXES YOUR ERROR)
  const totalChunks = allChunks.length;

  return allChunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      chunkIndex: index,
      totalChunks,
    },
  }));
}
