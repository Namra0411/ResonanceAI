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

/**
 * Streaming variant using fetch + SSE parsing (axios can't read a live stream).
 * callbacks: { onStatus(status), onToken(token), onDone(meta), onError(err) }
 */
export const streamChatMessage = async (
  { sessionId, documentId, query },
  { onStatus, onToken, onDone, onError }
) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/chat/message/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, documentId, query }),
      }
    );

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line
      const events = buffer.split("\n\n");
      buffer = events.pop(); // last (possibly incomplete) chunk stays in buffer

      for (const raw of events) {
        const lines = raw.split("\n");
        const eventLine = lines.find((l) => l.startsWith("event: "));
        const dataLine = lines.find((l) => l.startsWith("data: "));
        if (!eventLine || !dataLine) continue;

        const eventName = eventLine.replace("event: ", "").trim();
        const data = JSON.parse(dataLine.replace("data: ", ""));

        if (eventName === "status") onStatus?.(data.status);
        else if (eventName === "token") onToken?.(data.token);
        else if (eventName === "done") onDone?.(data);
        else if (eventName === "error") onError?.(data.error);
      }
    }
  } catch (err) {
    onError?.(err.message || "Stream failed");
  }
};