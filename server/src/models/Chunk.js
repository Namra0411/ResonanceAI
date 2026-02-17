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

export default mongoose.model("Chunk", chunkSchema);
