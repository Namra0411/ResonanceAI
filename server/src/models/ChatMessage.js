import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },

    // assistant-only metadata
    confidence: Number,
    answerMode: {
      type: String,
      enum: ["strict", "general"],
    },
    topPages: [
  {
    pageNumber: Number,
    url: String,
  },
],

    sources: [
      {
        pageNumber: Number,
        chunkingMode: String,
        filename: String,
      },
    ],
  },
  { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);