import { semanticChunker } from "../chunker/semantic.chunker.js";
import { structuralChunker } from "../chunker/structural.chunker.js";
import { pageChunker } from "../chunker/page.chunker.js";

/**
 * Dispatch chunking strategy per page.
 * Page-aware, structure-aware.
 * Guarantees pageNumber is preserved on every chunk.
 */
export async function chunkDocumentByStructure({
  pages,
  userId,
  documentId,
  filename,
  fileType,
}) {
  const structuralChunks = [];
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

      structuralChunks.push(
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

      structuralChunks.push(
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

  if (hasStructural && structuralChunks.length > 0) {
    return structuralChunks.map((c, i) => ({
      ...c,
      metadata: {
        ...c.metadata,
        chunkIndex: i,
      },
    }));
  }

  const semanticChunks = await semanticChunker({
    pages,
    userId,
    documentId,
    filename,
    fileType,
  });

  return semanticChunks.map((c, i) => ({
    ...c,
    metadata: {
      ...c.metadata,
      chunkIndex: i,
    },
  }));
}
