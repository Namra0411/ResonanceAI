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

import { analyzePageStructure } from "../src/chunking/analyzePageStructure.js";
import { chunkDocumentByStructure } from "../src/chunking/chunker/chunkDispatcher.js";
import { extractAtomicKeyValues } from "../src/chunking/atomicKeyValueExtractor.js";

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
      await Document.findByIdAndUpdate(documentId, {
        status: "processing",
      });
      //  Download file
      const buffer = await downloadFromSupabase(doc.storageKey);

      //  Parse pages
      const pages = await parseFile(buffer, doc.fileType);
      // pages[] MUST retain page identity

      // Normalize pageNumber (defensive)
      const normalizedPages = pages.map((page, index) => {
        const pageNumber =
          page?.pageNumber ??
          page?.metadata?.loc?.pageNumber ??
          index + 1;

        return {
          ...page,
          pageNumber,
        };
      });

      //  Analyze structure (page-aware)
      const analyzedPages = analyzePageStructure(normalizedPages);

      //  Structure-aware chunking
      const baseChunks = await chunkDocumentByStructure({
        pages: analyzedPages,
        userId,
        documentId,
        filename: doc.filename,
        fileType: doc.fileType,
      });

      //  Atomic key–value extraction
      const finalChunks = extractAtomicKeyValues(baseChunks);

      console.log(
        `🧩 Chunks created: base=${baseChunks.length}, atomic=${finalChunks.length}`
      );

      //  Attach pageNumber to every chunk FIX)
      const chunksWithPageNumbers = finalChunks.map((chunk) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          pageNumber:
            chunk.pageNumber ??
            chunk.metadata?.pageNumber ??
            chunk.sourcePageNumber ??
            null,
        },
      }));

      //  Store chunks
      const savedChunks = await Chunk.insertMany(
        chunksWithPageNumbers
      );

      //  Vector store
      await ensureQdrantCollection();

      const vectors = await embedTexts(
        savedChunks.map((c) => c.text)
      );

      await upsertChunks(savedChunks, vectors);

      //  Mark processed
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
