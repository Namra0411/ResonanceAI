import express from "express";
import auth from "../middleware/auth.js";

import {
  getOrCreateSession,
  getSessionMessages,
  handleChatMessage,
  streamChatMessage,
} from "../services/chatSession.service.js";

const router = express.Router();


router.post("/session", auth, async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.userId; 

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!documentId) {
      return res.status(400).json({
        error: "documentId is required",
      });
    }

    const session = await getOrCreateSession({
      userId,
      documentId,
    });

    res.json({ sessionId: session._id });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});


router.get(
  "/session/:sessionId/messages",
  auth,
  async (req, res) => {
    try {
      const userId = req.userId; 

      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const { sessionId } = req.params;

      const messages = await getSessionMessages(sessionId);
      res.json(messages);
    } catch (err) {
      console.error("Fetch messages error:", err);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);
router.get(
  "/:id/page/:pageNumber",
  auth,
  async (req, res) => {
    try {
      const { id, pageNumber } = req.params;

      const signedUrl = await getDocumentSignedUrlInternal(id);

      return res.redirect(`${signedUrl}#page=${pageNumber}`);
    } catch (err) {
      console.error("Page redirect error:", err);
      res.status(500).json({
        error: "Failed to open document page",
      });
    }
  }
);
router.post("/message", auth, async (req, res) => {
  try {
    const { sessionId, documentId, query } = req.body;
    const userId = req.userId; 

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!sessionId || !documentId || !query) {
      return res.status(400).json({
        error: "sessionId, documentId and query are required",
      });
    }

    const assistantMessage = await handleChatMessage({
      userId,
      documentId,
      sessionId,
      query,
    });

    res.json({
      answer: assistantMessage.content,
      confidence: assistantMessage.confidence,
      topPages: assistantMessage.topPages,
      sources: assistantMessage.sources,
    });
  } catch (err) {
    console.error("Chat message error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

router.post("/message/stream", auth, async (req, res) => {
  const { sessionId, documentId, query } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!sessionId || !documentId || !query) {
    return res.status(400).json({
      error: "sessionId, documentId and query are required",
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  try {
    await streamChatMessage({ userId, documentId, sessionId, query, res });
  } catch (err) {
    console.error("Stream chat error:", err);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
    res.end();
  }
});

export default router;