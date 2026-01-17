import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function chunkText({
  text,
  userId,
  documentId,
  filename,
  fileType,
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
      chunkIndex: index,
      totalChunks: docs.length,
      filename,
      fileType,
    },
  }));
}
