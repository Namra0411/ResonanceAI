import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

/**
 * parseFile
 * Returns page-wise text instead of flattening everything.
 *
 * Output format:
 * [
 *   { pageNumber: 1, text: "..." },
 *   { pageNumber: 2, text: "..." }
 * ]
 */
export async function parseFile(buffer, fileType) {
  // TXT: treat whole file as one page
  if (fileType.includes("txt")) {
    return [
      {
        pageNumber: 1,
        text: buffer.toString("utf-8"),
      },
    ];
  }

  // PDF: preserve pages
  if (fileType.includes("pdf")) {
    const tempFilePath = path.join(
      os.tmpdir(),
      `doc-${Date.now()}.pdf`
    );

    await fs.writeFile(tempFilePath, buffer);

    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();

    await fs.unlink(tempFilePath);

    // Each doc corresponds to one page
    return docs.map((d, index) => ({
      pageNumber: index + 1,
      text: d.pageContent,
    }));
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
