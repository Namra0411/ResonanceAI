// Load env vars (worker runs outside src)
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import { Worker } from "bullmq";
import { redis } from "../src/queue/redis.js";

import Document from "../src/models/documents.js";
import Chunk from "../src/models/Chunk.js";

import { downloadFromSupabase } from "./downloadFromSupabase.js";
import { parseFile } from "./parser.js";

import { chunkText } from "../src/utils/chunker.js";
import { embedTexts } from "../src/utils/embedder.js";
import {
  ensureQdrantCollection,
  upsertChunks,
} from "../src/utils/qdrantUpsert.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("🟢 Worker connected to MongoDB");

const worker = new Worker(
  "document-ingestion",
  async (job) => {
    const { documentId, userId } = job.data;

    console.log("📄 Processing document:", documentId);

    const doc = await Document.findById(documentId);
    if (!doc || !doc.storageKey) {
      throw new Error("Document or storageKey missing");
    }

    try {
      // Mark processing
      await Document.findByIdAndUpdate(documentId, {
        status: "processing",
      });

      // Download file
      const buffer = await downloadFromSupabase(doc.storageKey);
      console.log(
        `⬇️ Downloaded file for ${documentId}, size: ${buffer.length} bytes`
      );

      // Parse file
      const text = await parseFile(buffer, doc.fileType);

      console.log("📄 Parsed document confirmation:");
      console.log("Text length:", text.length);
      console.log("Word count:", text.split(/\s+/).length);
      console.log("Sample:", text.slice(0, 200));

      const chunkData = await chunkText({
        text,
        userId,
        documentId,
        filename: doc.filename,
        fileType: doc.fileType,
      });

      console.log(`🧩 Created ${chunkData.length} chunks`);

      const savedChunks = await Chunk.insertMany(chunkData);

      await ensureQdrantCollection();

      const vectors = await embedTexts(
        savedChunks.map((c) => c.text)
      );

      await upsertChunks(savedChunks, vectors);

      await Document.findByIdAndUpdate(documentId, {
        status: "processed",
      });

      console.log("✅ Document fully ingested:", documentId);
    } catch (err) {
      console.error("❌ Worker error:", err);

      await Document.findByIdAndUpdate(documentId, {
        status: "failed",
      });

      throw err;
    }
  },
  {
    connection: redis,
  }
);

worker.on("completed", (job) => {
  console.log("🎉 Job completed:", job.id);
});

worker.on("failed", (job, err) => {
  console.error("❌ Job failed:", err.message);
});
