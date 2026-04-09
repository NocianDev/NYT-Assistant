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
  welcomeMessage = "Hola 👋 ¿En qué puedo ayudarte?",
  apiUrl = `${API_URL}/chat`,
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
  }, [messages, isOpen]);

  async function sendMessage() {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      role: "user",
      text: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await axios.post(apiUrl, {
        message: input,
        conversationId: conversationIdRef.current,
        tenantId: TENANT_ID, // 🔥 CLAVE
      });

      const botMessage: Message = {
        role: "bot",
        text: res.data.reply,
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

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "90px",
            width: "380px",
            height: "600px",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "16px",
              background: "linear-gradient(135deg,#facc15,#f59e0b)",
              color: "#111",
              fontWeight: "bold",
            }}
          >
            {title}
          </div>

          {/* CHAT */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  background:
                    msg.role === "user"
                      ? "#facc15"
                      : "#f1f5f9",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  maxWidth: "75%",
                }}
              >
                {msg.text}
              </div>
            ))}

            {isSending && <div>Escribiendo...</div>}

            <div ref={chatEndRef} />
          </div>

          {/* INPUT */}
          <div style={{ display: "flex", padding: "10px", gap: "8px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ccc",
              }}
            />

            <button
              onClick={sendMessage}
              style={{
                background: "#facc15",
                border: "none",
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#facc15",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
        }}
      >
        💬
      </button>
    </>
  );
}