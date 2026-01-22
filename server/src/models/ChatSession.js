import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// One session per user per document
chatSessionSchema.index(
  { userId: 1, documentId: 1 },
  { unique: true }
);

export default mongoose.model("ChatSession", chatSessionSchema);
