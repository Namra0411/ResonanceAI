import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    // Ownership
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic file info
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
      type: Number, // bytes
    },

    // Supabase storage reference
    storageKey: {
      type: String,
      // required: true,
    },

    // Processing state
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
      index: true,
    },

    // Optional (future use)
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Document", documentSchema);
