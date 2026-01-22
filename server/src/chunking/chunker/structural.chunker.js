/**
 * Structural chunker
 * Used for key-value, forms, IDs, receipts, tables.
 * Preserves adjacency and meaning.
 */

export function structuralChunker({
  page,
  userId,
  documentId,
  filename,
  fileType,
}) {
  const lines = page.text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = [];

  const FLUSH_SIZE = 6; // small windows preserve structure

  function flush() {
    if (buffer.length === 0) return;

    chunks.push({
      userId,
      documentId,
      text: buffer.join("\n"),
      metadata: {
        filename,
        fileType,
        pageNumber: page.pageNumber,
        chunkingMode: "structural",
      },
    });

    buffer = [];
  }

  for (const line of lines) {
    buffer.push(line);

    if (buffer.length >= FLUSH_SIZE) {
      flush();
    }
  }

  flush();

  return chunks;
}
