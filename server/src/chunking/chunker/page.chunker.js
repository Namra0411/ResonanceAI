/**
 * Page chunker
 * Fallback for messy OCR or unclear structure.
 */

export function pageChunker({
  page,
  userId,
  documentId,
  filename,
  fileType,
}) {
  return [
    {
      userId,
      documentId,
      text: page.text,
      metadata: {
        filename,
        fileType,
        pageNumber: page.pageNumber,
        chunkingMode: "page",
      },
    },
  ];
}
