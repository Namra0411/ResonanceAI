import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOrCreateChatSession,
  fetchChatMessages,
  streamChatMessage,
} from "../api/chat";
import "./DocumentChat.css";

const DocumentChat = ({ documentId: propDocumentId, onPageClick, embedded }) => {
  const params = useParams();
  const navigate = useNavigate();

  const documentId = propDocumentId || params.id;

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answerMode, setAnswerMode] = useState("general"); // "strict" | "general"

  const bottomRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const session = await getOrCreateChatSession(documentId);
        setSessionId(session);

        const history = await fetchChatMessages(session);
        setMessages(history);
      } catch (err) {
        setError("Failed to load chat");
      }
    };

    initChat();
  }, [documentId]);

  /* AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleAsk = async () => {
    if (!query.trim() || !sessionId) return;

    setLoading(true);
    setError("");

    const userMessage = {
      role: "user",
      content: query,
    };

    // Placeholder assistant message we'll mutate as tokens/status arrive
    const assistantIndex = { current: null };

    setMessages((prev) => {
      const next = [
        ...prev,
        userMessage,
        { role: "assistant", content: "", status: "retrieving" },
      ];
      assistantIndex.current = next.length - 1;
      return next;
    });
    setQuery("");

    const updateAssistant = (patch) => {
      setMessages((prev) => {
        const next = [...prev];
        const idx = assistantIndex.current;
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    };

    await streamChatMessage(
      { sessionId, documentId, query: userMessage.content, answerMode },
      {
        onStatus: (status) => updateAssistant({ status }),
        onToken: (token) =>
          setMessages((prev) => {
            const next = [...prev];
            const idx = assistantIndex.current;
            next[idx] = {
              ...next[idx],
              status: undefined,
              content: (next[idx].content || "") + token,
            };
            return next;
          }),
        onDone: (meta) =>
          updateAssistant({
            confidence: meta.confidence,
            topPages: meta.topPages,
            sources: meta.sources,
            answerMode: meta.answerMode,
          }),
        onError: () => setError("Failed to get answer"),
      }
    );

    setLoading(false);
  };

  return (
    <div className="docchat-root">
      {!embedded && (
        <button
          className="docchat-back"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      )}

      <div className="docchat-header">
        Chat
        <div className="docchat-mode-toggle" role="radiogroup" aria-label="Answer mode">
          <button
            type="button"
            role="radio"
            aria-checked={answerMode === "general"}
            className={`docchat-mode-btn ${answerMode === "general" ? "docchat-mode-active" : ""}`}
            onClick={() => setAnswerMode("general")}
            title="Can reason beyond the document when clearly related"
          >
            General
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={answerMode === "strict"}
            className={`docchat-mode-btn ${answerMode === "strict" ? "docchat-mode-active" : ""}`}
            onClick={() => setAnswerMode("strict")}
            title="Answers only from what's explicitly in the document"
          >
            Strict
          </button>
        </div>
      </div>

      <div className="docchat-messages">
        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={`docchat-message ${
              m.role === "user"
                ? "docchat-user"
                : "docchat-assistant"
            }`}
          >
            <div className="docchat-bubble">
              <div className="docchat-role">
                {m.role === "user"
                  ? "You"
                  : "Assistant"}
              </div>

              <div className="docchat-content">
                {m.status === "retrieving"
                  ? "Retrieving relevant context…"
                  : m.status === "generating"
                  ? "Generating answer…"
                  : m.content}
              </div>

              {m.role === "assistant" && (
                <div className="docchat-meta">
                  {m.answerMode && (
                    <span className="docchat-mode-badge">
                      {m.answerMode === "strict" ? "Strict" : "General"}
                    </span>
                  )}

                  {m.confidence !== undefined && (
                    <span className="docchat-confidence">
                      Confidence: {m.confidence}
                    </span>
                  )}

                  {m.topPages?.length > 0 && (
                    <div className="docchat-pages">
                      {m.topPages.map((p) => (
                        <button
                          key={p.pageNumber}
                          className="docchat-page-chip"
                          onClick={() =>
                            onPageClick &&
                            onPageClick(p.pageNumber)
                          }
                        >
                          Page {p.pageNumber}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="docchat-input">
        <textarea
          rows={2}
          placeholder="Ask a question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />

        <button
          className="docchat-send"
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {error && (
        <div className="docchat-error">{error}</div>
      )}
    </div>
  );
};

export default DocumentChat;