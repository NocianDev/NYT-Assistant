import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Message = {
  role: "user" | "bot";
  text: string;
};

type Props = {
  title?: string;
  welcomeMessage?: string;
  apiUrl?: string;
  primaryColor?: string;
};

function getOrCreateConversationId() {
  const existing = localStorage.getItem("assistant_conversation_id");
  if (existing) return existing;

  const newId =
    Date.now().toString() + "-" + Math.random().toString(36).slice(2);

  localStorage.setItem("assistant_conversation_id", newId);
  return newId;
}

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

export default function AssistantWidget({
  title = "HoyMismo Assistant",
  welcomeMessage = "Hola 👋 Soy HoyMismo Assistant. Estoy listo para ayudarte.",
  apiUrl = `${API_URL}/chat`,
  primaryColor = "#facc15",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef<string>(getOrCreateConversationId());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isSending]);

  async function sendMessage(customText?: string) {
    const messageText = (customText ?? input).trim();
    if (!messageText || isSending) return;

    const userMessage: Message = {
      role: "user",
      text: messageText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await axios.post(apiUrl, {
        message: messageText,
        conversationId: conversationIdRef.current,
        tenantId: TENANT_ID,
        channel: "chat",
      });

      const botMessage: Message = {
        role: "bot",
        text:
          res.data?.reply ||
          "Te respondí correctamente, pero el servidor no devolvió texto.",
      };

      setMessages([...newMessages, botMessage]);
    } catch (error: any) {
      console.error(error);

      const errorMessage: Message = {
        role: "bot",
        text:
          error?.response?.data?.error ||
          "Hubo un problema al conectar con el asistente.",
      };

      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }

  async function resetConversation() {
    try {
      await axios.post(`${API_URL}/chat/reset`, {
        conversationId: conversationIdRef.current,
        tenantId: TENANT_ID,
      });

      const newId =
        Date.now().toString() + "-" + Math.random().toString(36).slice(2);

      localStorage.setItem("assistant_conversation_id", newId);
      conversationIdRef.current = newId;

      setMessages([{ role: "bot", text: welcomeMessage }]);
      setInput("");
    } catch (error) {
      console.error("Error reiniciando conversación:", error);
      setMessages([{ role: "bot", text: welcomeMessage }]);
      setInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendMessage();
    }
  }

  const quickReplies = [
    "Quiero una página web",
    "Necesito automatizar WhatsApp",
    "¿Manejan asistentes con IA?",
    "Quiero información de precios",
  ];

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "90px",
            width: "min(380px, calc(100vw - 24px))",
            height: "min(620px, calc(100vh - 120px))",
            background: "#ffffff",
            borderRadius: "22px",
            boxShadow: "0 25px 70px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)`,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px" }}>{title}</div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>
                Atención automatizada en tiempo real
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.45)",
                border: "none",
                borderRadius: "10px",
                width: "34px",
                height: "34px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 700,
              }}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              background: "#fffdf7",
            }}
          >
            {quickReplies.map((item) => (
              <button
                key={item}
                onClick={() => void sendMessage(item)}
                style={{
                  border: "1px solid rgba(250, 204, 21, 0.45)",
                  background: "#fff7cc",
                  color: "#111827",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background:
                "linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    background: msg.role === "user" ? primaryColor : "#eef2f7",
                    color: "#111827",
                    padding: "11px 14px",
                    borderRadius: "16px",
                    maxWidth: "82%",
                    fontSize: "14px",
                    lineHeight: 1.45,
                    boxShadow:
                      msg.role === "user"
                        ? "0 8px 18px rgba(250, 204, 21, 0.22)"
                        : "0 6px 16px rgba(15, 23, 42, 0.06)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isSending && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "#eef2f7",
                    color: "#111827",
                    padding: "11px 14px",
                    borderRadius: "16px",
                    fontSize: "14px",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
                  }}
                >
                  Escribiendo...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div
            style={{
              display: "flex",
              padding: "12px",
              gap: "8px",
              borderTop: "1px solid #e5e7eb",
              background: "#ffffff",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #d1d5db",
                outline: "none",
                fontSize: "14px",
              }}
            />

            <button
              onClick={() => void sendMessage()}
              disabled={isSending}
              style={{
                background: primaryColor,
                border: "none",
                padding: "12px 14px",
                borderRadius: "12px",
                cursor: isSending ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: isSending ? 0.7 : 1,
              }}
            >
              ➤
            </button>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fffdf7",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Conversación activa
            </span>

            <button
              onClick={() => void resetConversation()}
              style={{
                border: "none",
                background: "transparent",
                color: "#92400e",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reiniciar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)`,
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 18px 40px rgba(245, 158, 11, 0.35)",
          zIndex: 9999,
        }}
        aria-label="Abrir chat"
      >
        💬
      </button>
    </>
  );
}