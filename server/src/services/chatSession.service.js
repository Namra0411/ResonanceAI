import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import { runDocumentChat } from "./chat.service.js";

const CONTEXT_TURNS = 6;

export async function getOrCreateSession({ userId, documentId }) {
  let session = await ChatSession.findOne({ userId, documentId });

  if (!session) {
    session = await ChatSession.create({ userId, documentId });
  }

  return session;
}

export async function getSessionMessages(sessionId) {
  return ChatMessage.find({ sessionId })
    .sort({ createdAt: 1 })
    .lean();
}

export async function handleChatMessage({
  userId,
  documentId,
  sessionId,
  query,
}) {
  // Save user message
  await ChatMessage.create({
    sessionId,
    role: "user",
    content: query,
  });

  // Fetch recent context
  const recentMessages = await ChatMessage.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(CONTEXT_TURNS)
    .lean();

  const chatHistory = recentMessages
    .reverse()
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  // Run RAG
  const ragResult = await runDocumentChat({
    userId,
    documentId,
    query,
    chatHistory,
  });

  // 🔍 DEBUG (keep for now)
  console.log("🧪 SESSION CHAT RESULT:", {
    topPages: ragResult.topPages,
    sources: ragResult.sources?.map((s) => s.pageNumber),
  });

  // Save assistant message (✅ FIXED)
  const assistantMessage = await ChatMessage.create({
    sessionId,
    role: "assistant",
    content: ragResult.answer,
    confidence: ragResult.confidence,
    sources: ragResult.sources,
    topPages: ragResult.topPages, // 🔥 DO NOT MAP / DESTROY
  });

  return assistantMessage;
}
