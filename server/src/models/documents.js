import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    filename: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      enum: ["pdf", "txt"],
      required: true,
    },

    fileSize: {
      type: Number, 
    },

    storageKey: {
      type: String,
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
      index: true,
    },

    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Document", documentSchema);
