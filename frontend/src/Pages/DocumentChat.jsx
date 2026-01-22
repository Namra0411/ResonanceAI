import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getOrCreateChatSession,
  fetchChatMessages,
  sendChatMessage,
} from "../api/chat";

const DocumentChat = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Create / get session + load history
  useEffect(() => {
    const initChat = async () => {
      try {
        const session = await getOrCreateChatSession(
          documentId
        );
        setSessionId(session);

        const history = await fetchChatMessages(session);
        setMessages(history);
      } catch (err) {
        console.error("INIT CHAT ERROR:", err);
        setError("Failed to load chat");
      }
    };

    initChat();
  }, [documentId]);

  // 2️⃣ Send message
  const handleAsk = async () => {
    if (!query.trim() || !sessionId) return;

    setLoading(true);
    setError("");

    const userMessage = {
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    try {
      const res = await sendChatMessage({
        sessionId,
        documentId,
        query: userMessage.content,
      });

      const assistantMessage = {
        role: "assistant",
        content: res.answer,
        confidence: res.confidence,
        topPages: res.topPages,
        sources: res.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("CHAT ERROR:", err);
      setError("Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)}>← Back</button>

      <h2>Document Chat</h2>

      {/* Chat messages */}
      <div style={{ marginBottom: 24 }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 12,
              padding: 12,
              background:
                m.role === "user" ? "#0e43e2" : "#df1313",
              borderRadius: 6,
            }}
          >
            <strong>
              {m.role === "user" ? "You" : "Assistant"}
            </strong>
            <p style={{ marginTop: 4 }}>{m.content}</p>

            {m.role === "assistant" && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {m.confidence !== undefined && (
                  <div>Confidence: {m.confidence}</div>
                )}
                {m.topPages?.length > 0 && (
  <div style={{ marginTop: 6 }}>
    Pages:
    {m.topPages.map((p) => (
      <a
        key={p.pageNumber}
        href={p.url}
        target="_blank"
        rel="noreferrer"
        style={{
          marginLeft: 8,
          color: "#4ea1ff",
          textDecoration: "underline",
        }}
      >
        {p.pageNumber}
      </a>
    ))}
  </div>
)}

              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <textarea
        rows={3}
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Ask a question about this document…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
      />

      <button onClick={handleAsk} disabled={loading}>
        {loading ? "Thinking…" : "Ask"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
};

export default DocumentChat;
