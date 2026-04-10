import { useEffect, useMemo, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type Props = {
  assistantName?: string;
  subtitle?: string;
};

const pulseKeyframes = `
@keyframes hmPulse {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}

@keyframes hmBars {
  0% { transform: scaleY(0.45); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(0.45); opacity: 0.6; }
}
`;

function VoiceBars({ active }: { active: boolean }) {
  const bars = new Array(7).fill(0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "6px",
        height: "56px",
      }}
    >
      {bars.map((_, i) => (
        <div
          key={i}
          style={{
            width: "8px",
            height: `${18 + (i % 3) * 8}px`,
            borderRadius: "999px",
            background: "linear-gradient(180deg, #facc15, #f59e0b)",
            transformOrigin: "bottom",
            animation: active
              ? `hmBars ${0.8 + i * 0.08}s ease-in-out infinite`
              : "none",
            opacity: active ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  );
}

function StatusText({ state }: { state: VoiceState }) {
  const text = useMemo(() => {
    switch (state) {
      case "listening":
        return "Escuchando...";
      case "thinking":
        return "Procesando solicitud...";
      case "speaking":
        return "Respondiendo...";
      default:
        return "Listo para iniciar";
    }
  }, [state]);

  return (
    <div
      style={{
        fontSize: "15px",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoiceAssistant({
  assistantName = "HoyMismo Assistant",
  subtitle = "Experiencia de voz / llamada",
}: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [callActive, setCallActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState(
    "Aquí aparecerá la respuesta del asistente cuando conectemos voz real."
  );
  const [unsupported, setUnsupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const conversationIdRef = useRef<string>(
    `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = pulseKeyframes;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setUnsupported(true);
    }
  }, []);

  useEffect(() => {
    if (!callActive) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callActive]);

  function formatTime(totalSeconds: number) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function endCall() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setCallActive(false);
    setSeconds(0);
    setVoiceState("idle");
    setTranscript("");
    setLastResponse("La llamada terminó.");
  }

  async function sendVoiceTextToAssistant(text: string) {
    setVoiceState("thinking");

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
        "http://localhost:3000";

      const tenantId = import.meta.env.VITE_TENANT_ID;

      const res = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          conversationId: conversationIdRef.current,
          tenantId,
          channel: "voice",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al conectar con el asistente");
      }

      const reply =
        data?.reply || "No se recibió una respuesta válida del asistente.";

      setVoiceState("speaking");
      setLastResponse(reply);

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          data?.ttsText || reply
        );
        utterance.lang = "es-MX";
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onend = () => {
          if (callActive) {
            setVoiceState("idle");
          }
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => {
          if (callActive) {
            setVoiceState("idle");
          }
        }, 1800);
      }
    } catch (error: any) {
      console.error(error);
      setVoiceState("idle");
      setLastResponse(
        error?.message || "Error conectando con el asistente."
      );
    }
  }

  function startCall() {
    if (!SpeechRecognitionAPI) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    setCallActive(true);
    setSeconds(0);
    setTranscript("");
    setLastResponse("La llamada ha comenzado. El asistente está listo.");

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "es-MX";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState("listening");
    };

    recognition.onresult = async (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      setTranscript(text);

      if (!text) {
        setVoiceState("idle");
        return;
      }

      await sendVoiceTextToAssistant(text);
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition error:", event);
      setVoiceState("idle");
      setLastResponse("No se pudo reconocer la voz. Intenta de nuevo.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (callActive) {
        setVoiceState((prev) => (prev === "speaking" ? prev : "idle"));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function listenAgain() {
    if (!callActive) return;
    startCall();
  }

  const orbColor =
    voiceState === "listening"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : voiceState === "thinking"
      ? "linear-gradient(135deg, #60a5fa, #2563eb)"
      : voiceState === "speaking"
      ? "linear-gradient(135deg, #facc15, #f59e0b)"
      : "linear-gradient(135deg, #e2e8f0, #cbd5e1)";

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "28px",
        padding: "28px",
        boxShadow: "0 22px 50px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(250, 204, 21, 0.16)",
              color: "#a16207",
              border: "1px solid rgba(250, 204, 21, 0.35)",
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            Modo voz
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.05,
              color: "#0f172a",
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            Interfaz tipo llamada
          </h3>

          <p
            style={{
              marginTop: "10px",
              color: "#64748b",
              lineHeight: 1.8,
              maxWidth: "700px",
            }}
          >
            Esta es la base visual para evolucionar de chat a una experiencia
            de voz más parecida a un asistente conversacional en tiempo real.
          </p>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            borderRadius: "16px",
            padding: "14px 18px",
            minWidth: "120px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            Duración
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {formatTime(seconds)}
          </div>
        </div>
      </div>

      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,253,247,1) 0%, rgba(255,250,242,1) 100%)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          borderRadius: "24px",
          padding: "28px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            justifyItems: "center",
            textAlign: "center",
            gap: "18px",
          }}
        >
          <div
            style={{
              width: "138px",
              height: "138px",
              borderRadius: "50%",
              background: orbColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#111827",
              fontSize: "42px",
              fontWeight: 900,
              boxShadow: "0 22px 45px rgba(15, 23, 42, 0.18)",
              animation:
                callActive && voiceState !== "idle"
                  ? "hmPulse 1.8s ease-in-out infinite"
                  : "none",
            }}
          >
            AI
          </div>

          <div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              {assistantName}
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "14px",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              {subtitle}
            </div>
          </div>

          <StatusText state={voiceState} />
          <VoiceBars active={callActive && voiceState !== "idle"} />

          {unsupported && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: "14px",
                padding: "12px 14px",
                maxWidth: "760px",
                width: "100%",
              }}
            >
              Tu navegador no soporta reconocimiento de voz. Prueba en Chrome o
              Edge.
            </div>
          )}

          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              display: "grid",
              gap: "14px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                borderRadius: "18px",
                padding: "16px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#64748b",
                  marginBottom: "8px",
                }}
              >
                Transcripción detectada
              </div>
              <div
                style={{
                  color: "#334155",
                  lineHeight: 1.7,
                  minHeight: "28px",
                }}
              >
                {transcript || "Aún no hay entrada de voz."}
              </div>
            </div>

            <div
              style={{
                background: "#fff7cc",
                border: "1px solid rgba(250, 204, 21, 0.3)",
                borderRadius: "18px",
                padding: "16px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#92400e",
                  marginBottom: "8px",
                }}
              >
                Respuesta del asistente
              </div>
              <div
                style={{
                  color: "#334155",
                  lineHeight: 1.7,
                }}
              >
                {lastResponse}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            {!callActive ? (
              <button
                onClick={startCall}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "14px 22px",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 14px 28px rgba(34, 197, 94, 0.22)",
                }}
              >
                Iniciar llamada
              </button>
            ) : (
              <>
                <button
                  onClick={listenAgain}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "14px 22px",
                    background: "linear-gradient(135deg, #facc15, #f59e0b)",
                    color: "#111827",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 14px 28px rgba(245, 158, 11, 0.22)",
                  }}
                >
                  Hablar otra vez
                </button>

                <button
                  onClick={endCall}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "14px 22px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 14px 28px rgba(239, 68, 68, 0.22)",
                  }}
                >
                  Colgar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}