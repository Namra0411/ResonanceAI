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

  // Save assistant message
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

/**
 * SSE variant of handleChatMessage.
 * Writes "status" events (retrieving/generating), "token" events per chunk,
 * and a final "done" event with the persisted message metadata.
 * `res` is an already-open Express response with SSE headers set by the caller.
 */
export async function streamChatMessage({
  userId,
  documentId,
  sessionId,
  query,
  res,
}) {
  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Save user message
  await ChatMessage.create({
    sessionId,
    role: "user",
    content: query,
  });

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

  const ragResult = await runDocumentChat({
    userId,
    documentId,
    query,
    chatHistory,
    onStatus: (status) => send("status", { status }),
    onToken: (token) => send("token", { token }),
  });

  const assistantMessage = await ChatMessage.create({
    sessionId,
    role: "assistant",
    content: ragResult.answer,
    confidence: ragResult.confidence,
    sources: ragResult.sources,
    topPages: ragResult.topPages,
  });

  send("done", {
    messageId: assistantMessage._id,
    confidence: assistantMessage.confidence,
    sources: assistantMessage.sources,
    topPages: assistantMessage.topPages,
  });

  res.end();
}