import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * chunkText
 * Preserves incoming metadata (especially pageNumber).
 */
export async function chunkText({
  text,
  userId,
  documentId,
  filename,
  fileType,
  metadata = {}, // 🔥 ACCEPT METADATA
}) {
  const docs = await splitter.createDocuments(
    [text],
    [{ userId, documentId, filename, fileType }]
  );

  return docs.map((doc, index) => ({
    userId,
    documentId,
    text: doc.pageContent,
    metadata: {
      ...metadata,          // 🔥 PRESERVE pageNumber
      chunkIndex: index,
      totalChunks: docs.length,
      filename,
      fileType,
    },
  }));
}
