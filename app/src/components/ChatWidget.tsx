// =============================================================================
// SolarMonitor PV — SolarAI Chatbot Widget
// Floating chat widget with AI-powered responses
// =============================================================================

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

const API_BASE =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5000/api";

const SUGGESTIONS = [
  "Análisis del 14 de mayo",
  "¿Cómo está el sistema ahora?",
  "¿Cuál es la autonomía de la batería?",
  "¿Quiénes son los desarrolladores?",
  "¿Cuál es el voltaje máximo registrado?",
  "¿Cómo está el clima en Popayán?",
];

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "ai",
      text: "¡Hola! 👋 Soy **SolarAI**, el asistente de auditoría de este sistema fotovoltaico.\n\nEstoy conectado en tiempo real a Firebase y puedo realizar análisis profundos de cualquier fecha, calcular tu autonomía o decirte quiénes crearon este proyecto.\n\n💡 **¿Por dónde quieres empezar?**",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: data.answer || "No pude procesar tu pregunta.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "⚠️ Error conectando con el servidor. Verifica que el backend esté activo.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(167,139,250,0.4), 0 0 40px rgba(139,92,246,0.15)",
          transition: "all 0.3s ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        <span style={{ fontSize: "28px", lineHeight: 1 }}>
          {open ? "✕" : "🤖"}
        </span>
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            zIndex: 9998,
            width: "420px",
            maxWidth: "calc(100vw - 48px)",
            height: "600px",
            maxHeight: "calc(100vh - 140px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: "1.5rem",
            overflow: "hidden",
            background: "rgba(10,10,18,0.97)",
            border: "1px solid rgba(167,139,250,0.25)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.08)",
            backdropFilter: "blur(20px)",
            animation: "chatSlideIn 0.3s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(0,212,255,0.06) 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>
                SolarAI Assistant
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", margin: 0 }}>
                Inteligencia artificial · Datos en tiempo real
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 8px rgba(16,185,129,0.6)",
              }}
            />
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    borderRadius:
                      msg.role === "user"
                        ? "1rem 1rem 0.25rem 1rem"
                        : "1rem 1rem 1rem 0.25rem",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      msg.role === "ai"
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "none",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.text),
                  }}
                />
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "1rem 1rem 1rem 0.25rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    gap: "0.35rem",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#A78BFA",
                        animation: `chatDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions (only show if few messages) */}
          {messages.length <= 2 && !loading && (
            <div
              style={{
                padding: "0 1rem 0.5rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              {SUGGESTIONS.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: "rgba(167,139,250,0.08)",
                    border: "1px solid rgba(167,139,250,0.2)",
                    color: "#A78BFA",
                    fontSize: "0.72rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "2rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta algo sobre el sistema solar..."
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "2rem",
                padding: "0.6rem 1rem",
                color: "white",
                fontSize: "0.85rem",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background:
                  input.trim() && !loading
                    ? "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)"
                    : "rgba(255,255,255,0.06)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
