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
      chunkIndex: Number,
      totalChunks: Number,
      filename: String,
      fileType: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Chunk", chunkSchema);
