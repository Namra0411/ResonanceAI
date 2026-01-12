import supabase from "../config/supabase.js";
import Document from "../models/documents.js";

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

    // 1. Create metadata (storageKey NOT required now)
    const document = await Document.create({
      userId: req.userId,
      filename: originalname,
      fileType,
      fileSize: size,
      status: "uploaded",
    });

    // 2. Build storage key
    const storageKey = `${req.userId}/${document._id}.${fileType}`;

    // 3. Upload to Supabase (use imported client directly)
    const { error } = await supabase.storage
      .from("documents")
      .upload(storageKey, buffer, { contentType: mimetype });

    if (error) {
      document.status = "failed";
      document.error = error.message;
      await document.save();
      return res.status(500).json({ msg: "Upload failed" });
    }

    // 4. Save storageKey
    document.storageKey = storageKey;
    await document.save();

    res.json(document);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json(documents);
  } catch {
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
        return res
          .status(500)
          .json({ msg: "Failed to delete file from storage" });
      }
    }

    await document.deleteOne();
    res.json({ msg: "Document deleted successfully" });
  } catch {
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

    document.filename = filename;
    await document.save();

    res.json(document);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};
