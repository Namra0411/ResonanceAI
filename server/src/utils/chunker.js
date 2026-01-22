import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Generic text chunker
 * IMPORTANT:
 * - Preserves upstream metadata (pageNumber, chunkingMode, etc.)
 * - Never overwrites metadata blindly
 */
export async function chunkText({
  text,
  userId,
  documentId,
  filename,
  fileType,
  metadata = {}, // 🔥 accept upstream metadata
}) {
  const docs = await splitter.createDocuments(
    [text],
    [
      {
        userId,
        documentId,
        filename,
        fileType,
        ...metadata, // pass-through for completeness
      },
    ]
  );

  return docs.map((doc, index) => ({
    userId,
    documentId,
    text: doc.pageContent,
    metadata: {
      // 🔥 PRESERVE upstream metadata
      ...metadata,

      // local chunk info
      chunkIndex: index,
      totalChunks: docs.length,

      // file info (safe defaults)
      filename,
      fileType,
    },
  }));
}
