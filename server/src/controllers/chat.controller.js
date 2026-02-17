import Document from "../models/documents.js";
import { runDocumentChat } from "../services/chat.service.js";

export const chatWithDocument = async (req, res) => {
  try {
    const { documentId, query } = req.body;

    if (!documentId || !query || typeof query !== "string") {
      return res.status(400).json({ msg: "Invalid request" });
    }

    // Ensure document belongs to user and is processed
    const document = await Document.findOne({
      _id: documentId,
      userId: req.userId,
      status: "processed",
    });

    if (!document) {
      return res.status(404).json({ msg: "Document not found or not ready" });
    }

    const result = await runDocumentChat({
      userId: req.userId,
      documentId,
      query,
    });
console.log("🧪 FINAL CHAT API RESPONSE:", {
  topPages: result.topPages,
  sources: result.sources?.map(s => s.pageNumber),
});

    res.json(result);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
