import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/**
 * Create or get chat session for a document
 */
export const getOrCreateChatSession = async (documentId) => {
  const res = await API.post("/api/chat/session", {
    documentId,
  });
  return res.data.sessionId;
};

/**
 * Fetch chat history
 */
export const fetchChatMessages = async (sessionId) => {
  const res = await API.get(
    `/api/chat/session/${sessionId}/messages`
  );
  return res.data;
};

/**
 * Send chat message
 */
export const sendChatMessage = async ({
  sessionId,
  documentId,
  query,
}) => {
  const res = await API.post("/api/chat/message", {
    sessionId,
    documentId,
    query,
  });
  return res.data;
};
