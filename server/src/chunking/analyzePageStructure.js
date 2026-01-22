/**
 * Analyze page structure to determine chunking mode.
 *
 * Modes:
 * - semantic   → paragraphs, prose, explanations
 * - structural → key-value, tables, forms, IDs
 * - page       → fallback (messy OCR, mixed)
 */

function analyzeSinglePage(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "page";
  }

  const totalLines = lines.length;

  const numericLines = lines.filter(l => /\d/.test(l)).length;
  const shortLines = lines.filter(l => l.length <= 40).length;
  const longLines = lines.filter(l => l.length >= 120).length;

  const numericRatio = numericLines / totalLines;
  const shortLineRatio = shortLines / totalLines;
  const longLineRatio = longLines / totalLines;

  // Heuristic rules (intentionally simple)
  if (shortLineRatio > 0.6 && numericRatio > 0.25) {
    return "structural";
  }

  if (longLineRatio > 0.3 && numericRatio < 0.2) {
    return "semantic";
  }

  return "page";
}

/**
 * Analyze all pages
 */
export function analyzePageStructure(pages) {
  return pages.map(page => ({
    ...page,
    structureMode: analyzeSinglePage(page.text),
  }));
}
