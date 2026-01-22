/**
 * Extract atomic key–value pairs from structural chunks.
 * Works for receipts, forms, Aadhaar-like docs, invoices.
 */

export function extractAtomicKeyValues(chunks) {
  const atomicChunks = [];

  for (const chunk of chunks) {
    if (chunk.metadata?.chunkingMode !== "structural") {
      atomicChunks.push(chunk);
      continue;
    }

    const lines = chunk.text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length - 1; i++) {
      const key = lines[i];
      const value = lines[i + 1];

      const keyHasText = /[a-zA-Z]/.test(key);
      const valueHasNumber = /\d/.test(value);

      if (keyHasText && valueHasNumber) {
        atomicChunks.push({
          ...chunk,
          text: `${key}: ${value}`,
          metadata: {
            ...chunk.metadata,
            chunkingMode: "atomic",
            key: key,
            value: value,
          },
        });

        i++; // skip value line
      }
    }
  }

  return atomicChunks;
}
