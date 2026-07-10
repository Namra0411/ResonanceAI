import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    metadata: {
      chunkIndex: {
        type: Number,
        required: true,
      },

      totalChunks: {
        type: Number,
        required: true,
      },

      pageNumber: {
        type: Number,
        index: true,
        required: true,
      },

      chunkingMode: {
        type: String,
        enum: ["atomic", "structural", "semantic", "page"], // ✅ FIX
        required: true,
      },

      filename: {
        type: String,
        required: true,
      },

      fileType: {
        type: String,
        required: true,
      },
    },
  },
  { timestamps: true }
);

// Compound text index for hybrid search (keyword half of vector + keyword RRF merge).
// userId is included as a leading equality key so scoped $text queries (both the
// per-document chat search and the cross-document search endpoint always filter
// by userId at minimum) can use this index instead of a full collection scan.
// MongoDB only allows one text index per collection, so documentId is deliberately
// left out of the index — it's still applied as a normal filter on top of it.
chunkSchema.index({ userId: 1, text: "text" });

export default mongoose.model("Chunk", chunkSchema);