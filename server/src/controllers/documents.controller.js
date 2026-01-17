import supabase from "../config/supabase.js";
import Document from "../models/documents.js";
import Chunk from "../models/Chunk.js";
import { ingestionQueue } from "../queue/ingestion.queue.js";
import qdrant from "../utils/qdrant.js";


export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    let fileType;
    if (mimetype === "application/pdf") fileType = "pdf";
    else if (mimetype === "text/plain") fileType = "txt";
    else {
      return res.status(400).json({ msg: "Unsupported file type" });
    }

    const document = await Document.create({
      userId: req.userId,
      filename: originalname,
      fileType,
      fileSize: size,
      status: "uploaded",
    });

    const storageKey = `${req.userId}/${document._id}.${fileType}`;

    const { error } = await supabase.storage
      .from("documents")
      .upload(storageKey, buffer, { contentType: mimetype });

    if (error) {
      document.status = "failed";
      await document.save();
      return res.status(500).json({ msg: "Upload failed" });
    }

    document.storageKey = storageKey;
    await document.save();

    await ingestionQueue.add(
      "document-ingestion",
      {
        documentId: document._id.toString(),
        userId: req.userId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    res.status(200).json(document);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const listDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json(documents);
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!document) {
      return res.status(404).json({ msg: "Document not found" });
    }

    if (document.storageKey) {
      const { error } = await supabase.storage
        .from("documents")
        .remove([document.storageKey]);

      if (error) {
        console.error("Supabase delete failed:", error.message);
      }
    }

    await Chunk.deleteMany({ documentId: document._id });

    await qdrant.delete("resonance_chunks", {
      filter: {
        must: [
          {
            key: "documentId",
            match: { value: document._id.toString() },
          },
          {
            key: "userId",
            match: { value: req.userId.toString() },
          },
        ],
      },
    });

    await document.deleteOne();

    res.json({ msg: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const renameDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.body;

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ msg: "Invalid filename" });
    }

    const document = await Document.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!document) {
      return res.status(404).json({ msg: "Document not found" });
    }

    document.filename = filename.trim();
    await document.save();

    res.json(document);
  } catch (err) {
    console.error("Rename document error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
