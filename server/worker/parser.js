import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";


export async function parseFile(buffer, fileType) {
  // TXT is easy
  if (fileType.includes("txt")) {
    return buffer.toString("utf-8");
  }

  if (fileType.includes("pdf")) {
    const tempFilePath = path.join(
      os.tmpdir(),
      `doc-${Date.now()}.pdf`
    );

    await fs.writeFile(tempFilePath, buffer);

    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();

    await fs.unlink(tempFilePath);

    return docs.map((d) => d.pageContent).join("\n");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
