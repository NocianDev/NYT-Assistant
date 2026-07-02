import { useEffect, useMemo, useRef, useState } from "react";
import {
  audioProviderConfig,
  type VoiceInputStatus,
  type VoiceMode,
} from "../audio/audioProvider";
import { BrowserSpeechRecognizer } from "../audio/voiceInput";
import {
  createVoiceCallController,
  type VoiceCallState,
} from "../audio/voiceCallController";
import { speakText, stopCurrentSpeech } from "../audio/voiceOutput";
import {
  buildAssistantIntro,
  fallbackPublicClientConfig,
  fetchPublicClientConfig,
  type PublicClientConfig,
} from "../config/clientConfig";

type Props = {
  assistantName?: string;
  assistantId?: string;
  assistantColor?: string;
};

type TranscriptCorrection = {
  correctedTranscript: string;
  confidence: "low" | "medium" | "high";
  detectedIntent: string;
  needsUserReview: boolean;
  providerUsed?: string;
};

type ChatResponse = {
  reply?: string;
  ttsText?: string;
  assistantId?: string;
  assistantName?: string;
  assistantColor?: string;
  providerUsed?: string;
  audio?: {
    elevenLabsActive?: boolean;
    multiAgentVoicesEnabled?: boolean;
  };
};

const statusLabel: Record<VoiceInputStatus, string> = {
  ready: "Listo",
  waiting_for_speech: "Esperando voz",
  listening: "Escuchando",
  processing: "Procesando",
  sending: "Pensando",
  transcript_ready: "Texto detectado",
  speaking: "Respondiendo",
  interrupted: "Interrumpido",
  "mic-error": "Error de microfono",
  unsupported: "Reconocimiento no soportado",
  disabled: "Desactivado",
};

function mapCallStateToVoiceStatus(state: VoiceCallState): VoiceInputStatus {
  switch (state) {
    case "idle":
      return "ready";
    case "starting":
    case "waiting_for_speech":
    case "cooldown":
      return "waiting_for_speech";
    case "listening":
      return "listening";
    case "ending_user_turn":
    case "correcting_transcript":
      return "processing";
    case "transcript_ready":
      return "transcript_ready";
    case "sending_to_ai":
      return "sending";
    case "speaking":
      return "speaking";
    case "interrupted":
      return "interrupted";
    case "error":
      return "mic-error";
    default:
      return "ready";
  }
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|mobile/i.test(navigator.userAgent);
}

function normalizeTranscript(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

async function safeFetchJson(url: string, options: RequestInit, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    return { res, data };
  } finally {
    window.clearTimeout(timer);
  }
}

export default function VoiceWidgetPanel({
  assistantName = "NYT Assistant",
  assistantId = "main",
  assistantColor = "#facc15",
}: Props) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(
    audioProviderConfig.voiceConversationMode ? "conversation" : "manual",
  );
  const [conversationActive, setConversationActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>("ready");
  const [transcript, setTranscript] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState(
    buildAssistantIntro(fallbackPublicClientConfig),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [audioEngine, setAudioEngine] = useState(
    "Fallback de voz del navegador activo",
  );
  const [activeAssistantId, setActiveAssistantId] = useState(assistantId);
  const [activeAssistantName, setActiveAssistantName] = useState(assistantName);
  const [activeAssistantColor, setActiveAssistantColor] = useState(assistantColor);
  const [providerUsed, setProviderUsed] = useState("demo-local");
  const [correction, setCorrection] = useState<TranscriptCorrection | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState("disabled");
  const [callState, setCallState] = useState<VoiceCallState>("idle");
  const [publicConfig, setPublicConfig] = useState<PublicClientConfig>(
    fallbackPublicClientConfig,
  );
  const [isMobileLayout, setIsMobileLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false,
  );

  const manualRecognizerRef = useRef<BrowserSpeechRecognizer | null>(null);
  const controllerRef = useRef<ReturnType<typeof createVoiceCallController> | null>(
    null,
  );
  const publicConfigRef = useRef(publicConfig);
  const activeAssistantIdRef = useRef(activeAssistantId);
  const conversationIdRef = useRef(
    `voice-widget-${audioProviderConfig.clientId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
  );

  useEffect(() => {
    publicConfigRef.current = publicConfig;
  }, [publicConfig]);

  useEffect(() => {
    activeAssistantIdRef.current = activeAssistantId;
  }, [activeAssistantId]);

  useEffect(() => {
    function handleResize() {
      setIsMobileLayout(window.innerWidth < 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchPublicClientConfig(audioProviderConfig.clientId)
      .then((config) => {
        if (!mounted) return;
        setPublicConfig(config);
        setLastResponse(buildAssistantIntro(config));
      })
      .catch((error) => {
        console.error("No se pudo cargar config publica:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setActiveAssistantId(assistantId);
    setActiveAssistantName(assistantName);
    setActiveAssistantColor(assistantColor);
  }, [assistantId, assistantName, assistantColor]);

  useEffect(() => {
    return () => {
      manualRecognizerRef.current?.abort();
      controllerRef.current?.stopCall();
      stopCurrentSpeech();
    };
  }, []);

  async function correctTranscript(raw: string) {
    const clean = normalizeTranscript(raw);

    if (!audioProviderConfig.enableTranscriptCorrection || !clean) {
      const fallback: TranscriptCorrection = {
        correctedTranscript: clean,
        confidence: clean.split(/\s+/).length < 3 ? "low" : "medium",
        detectedIntent: "uncorrected",
        needsUserReview: clean.split(/\s+/).length < 3,
      };
      setCorrection(fallback);
      setCorrectionStatus("disabled");
      return fallback;
    }

    setCorrectionStatus("pending");

    try {
      const { res, data } = await safeFetchJson(
        `${audioProviderConfig.apiUrl}/voice/correct-transcript`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id":
              publicConfigRef.current.clientId || audioProviderConfig.clientId,
          },
          body: JSON.stringify({
            clientId:
              publicConfigRef.current.clientId || audioProviderConfig.clientId,
            rawTranscript: clean,
          }),
        },
        audioProviderConfig.transcriptCorrectionTimeoutMs,
      );

      if (!res.ok) throw new Error(data?.error || "Error corrigiendo texto");

      const result = data as TranscriptCorrection;
      setCorrection(result);
      setCorrectionStatus("completed");
      return result;
    } catch (error: any) {
      console.error("No se pudo corregir transcripcion:", error);
      const fallback: TranscriptCorrection = {
        correctedTranscript: clean,
        confidence: "medium",
        detectedIntent:
          error?.name === "AbortError"
            ? "correction_timeout"
            : "correction_failed",
        needsUserReview: false,
      };
      setCorrection(fallback);
      setCorrectionStatus(
        error?.name === "AbortError"
          ? "timeout_original_used"
          : "error_original_used",
      );
      return fallback;
    }
  }

  async function sendMessage(
    text: string,
    options: { source: "manual" | "voice" | "conversation"; turnId?: string },
  ) {
    const clean = normalizeTranscript(text);
    if (!clean) {
      return { replyText: "", speakText: "" };
    }

    const clientType = isMobileDevice() ? "mobile" : "desktop";
    setVoiceStatus("sending");
    setErrorMessage("");

    if (audioProviderConfig.callDebug) {
      console.log("[voice-widget] sendMessage", {
        source: options.source,
        turnId: options.turnId || null,
        text: clean,
      });
    }

    const { res, data } = await safeFetchJson(
      `${audioProviderConfig.apiUrl}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id":
            publicConfigRef.current.clientId || audioProviderConfig.clientId,
          "x-client-type": clientType,
        },
        body: JSON.stringify({
          clientId:
            publicConfigRef.current.clientId || audioProviderConfig.clientId,
          message: clean,
          conversationId: conversationIdRef.current,
          channel: "voice",
          source: options.source,
          turnId: options.turnId,
          assistantId:
            publicConfigRef.current.enabledFeatures.multiAgentVoices &&
            publicConfigRef.current.audio?.elevenLabsActive
              ? activeAssistantIdRef.current
              : "main",
          clientType,
        }),
      },
      35000,
    );

    if (!res.ok) {
      throw new Error(data?.error || `Error /chat (${res.status})`);
    }

    const response = data as ChatResponse;
    const reply = response.reply || "No se recibio una respuesta valida.";
    const speakableText = response.ttsText || reply;

    setLastResponse(reply);
    setProviderUsed(response.providerUsed || "desconocido");

    if (response.audio?.multiAgentVoicesEnabled && response.assistantId) {
      setActiveAssistantId(response.assistantId);
      setActiveAssistantName(response.assistantName || response.assistantId);
      setActiveAssistantColor(response.assistantColor || assistantColor);
    } else {
      setActiveAssistantId("main");
      setActiveAssistantName(publicConfigRef.current.assistantName || "NYT Assistant");
    }

    return {
      replyText: reply,
      speakText: speakableText,
      meta: response,
    };
  }

  function getController() {
    if (controllerRef.current) return controllerRef.current;

    controllerRef.current = createVoiceCallController({
      onStatusChange: (state) => {
        setCallState(state);
        setVoiceStatus(mapCallStateToVoiceStatus(state));
      },
      onTranscriptUpdate: (text, rawText) => {
        setTranscript(text);
        setRawTranscript(rawText);
      },
      onFinalTranscript: (text, result) => {
        setTranscript(text);
        setRawTranscript(text);
        if (result) setCorrection(result);
      },
      onAssistantResponse: (text) => {
        setLastResponse(text);
      },
      onCorrectionStatus: setCorrectionStatus,
      onError: (message) => {
        setErrorMessage(message);
      },
      sendMessage: (text, options) =>
        sendMessage(text, {
          source: options.source,
          turnId: options.turnId,
        }),
      speak: async (text) => {
        if (!text.trim()) return;
        await speakText({
          text,
          assistantId: activeAssistantIdRef.current,
          clientType: isMobileDevice() ? "mobile" : "desktop",
          onEngineChange: setAudioEngine,
        });
      },
      stopSpeaking: stopCurrentSpeech,
      correctTranscript,
      getConfig: () => ({
        autoSend: audioProviderConfig.autoSendAfterSilence,
        correctionEnabled: audioProviderConfig.enableTranscriptCorrection,
        vadEnabled: audioProviderConfig.vadEnabled,
        bargeInEnabled: audioProviderConfig.bargeInEnabled,
        echoGuardEnabled: audioProviderConfig.echoGuardEnabled,
        bargeInMinMs: audioProviderConfig.bargeInMinMs,
        postTtsCooldownMs: audioProviderConfig.postTtsCooldownMs,
        debug: audioProviderConfig.callDebug,
      }),
    });

    return controllerRef.current;
  }

  function startConversationMode() {
    setVoiceMode("conversation");
    setConversationActive(true);
    setTranscript("");
    setRawTranscript("");
    setCorrection(null);
    setCorrectionStatus("disabled");
    setErrorMessage("");
    manualRecognizerRef.current?.abort();
    getController().startCall();
  }

  function stopConversationMode() {
    setConversationActive(false);
    setVoiceMode("manual");
    getController().stopCall();
    setVoiceStatus("ready");
  }

  function startManualListening() {
    stopCurrentSpeech();
    setErrorMessage("");
    setTranscript("");
    setRawTranscript("");
    setCorrection(null);
    setCorrectionStatus("disabled");

    const recognizer = new BrowserSpeechRecognizer({
      language: audioProviderConfig.sttLanguage,
      timeoutMs: audioProviderConfig.sttTimeoutMs,
      onTranscript: (text, isFinal) => {
        setTranscript(text);
        setRawTranscript(text);

        if (isFinal) {
          setVoiceStatus("processing");
          void correctTranscript(text).then((result) => {
            const nextText = result.correctedTranscript || text;
            setTranscript(nextText);
            setVoiceStatus("transcript_ready");
          });
        }
      },
      onStatusChange: setVoiceStatus,
      onError: (message) => {
        setErrorMessage(message);
        setVoiceStatus("mic-error");
      },
    });

    manualRecognizerRef.current = recognizer;

    if (!recognizer.isSupported()) {
      setVoiceStatus("unsupported");
      setErrorMessage("Este navegador no soporta SpeechRecognition. Puedes escribir manualmente.");
      return;
    }

    recognizer.start();
  }

  function stopListening() {
    manualRecognizerRef.current?.abort();
    manualRecognizerRef.current = null;
    setVoiceStatus("ready");
  }

  async function sendTranscript() {
    const clean = normalizeTranscript(transcript);
    if (!clean || voiceStatus === "processing" || voiceStatus === "sending") return;

    try {
      const response = await sendMessage(clean, {
        source: "manual",
      });

      setVoiceStatus("speaking");
      await speakText({
        text: response.speakText || response.replyText,
        assistantId: activeAssistantIdRef.current,
        clientType: isMobileDevice() ? "mobile" : "desktop",
        onEngineChange: setAudioEngine,
      });
      if (conversationActive) {
        getController().resumeCall();
      } else {
        setVoiceStatus("ready");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Error conectando con el asistente.");
      if (conversationActive) {
        getController().resumeCall();
      } else {
        setVoiceStatus("ready");
      }
    }
  }

  const initials = activeAssistantName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const orbColor =
    voiceStatus === "listening"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : voiceStatus === "processing" || voiceStatus === "sending"
        ? "linear-gradient(135deg, #60a5fa, #2563eb)"
        : voiceStatus === "speaking"
          ? "linear-gradient(135deg, #facc15, #f59e0b)"
          : voiceStatus === "mic-error" || voiceStatus === "unsupported"
            ? "linear-gradient(135deg, #ef4444, #991b1b)"
            : `linear-gradient(135deg, ${activeAssistantColor}, #ffffff33)`;

  const statusColor = useMemo(() => {
    if (voiceStatus === "listening") return "#22c55e";
    if (voiceStatus === "processing" || voiceStatus === "sending") return "#60a5fa";
    if (voiceStatus === "speaking") return "#facc15";
    if (voiceStatus === "mic-error" || voiceStatus === "unsupported") return "#fca5a5";
    return activeAssistantColor;
  }, [activeAssistantColor, voiceStatus]);

  const multiAgentLabel =
    publicConfig.enabledFeatures.multiAgentVoices && publicConfig.audio?.elevenLabsActive
      ? "Multiagentes con ElevenLabs disponibles"
      : "Multiagentes de voz desactivados";

  return (
    <div style={{ width: "100%", display: "grid", gap: isMobileLayout ? "14px" : "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(320px, 1.05fr) minmax(320px, 0.95fr)",
          gap: isMobileLayout ? "14px" : "20px",
        }}
      >
        <section
          style={{
            borderRadius: isMobileLayout ? "22px" : "28px",
            minHeight: isMobileLayout ? "auto" : "500px",
            padding: isMobileLayout ? "20px" : "28px",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            border: `1px solid ${voiceStatus === "ready" ? "rgba(255,255,255,0.08)" : statusColor}`,
            background: "rgba(255,255,255,0.06)",
            boxShadow: voiceStatus === "ready" ? "0 22px 45px rgba(15, 23, 42, 0.12)" : `0 0 34px ${statusColor}44`,
            backdropFilter: "blur(16px)",
            transition: "0.25s ease",
          }}
        >
          <div style={{ width: "100%", maxWidth: "440px" }}>
            <div
              style={{
                color: statusColor,
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              {statusLabel[voiceStatus]}
            </div>

            <h3
              style={{
                margin: "0 0 10px",
                color: "#ffffff",
                fontSize: isMobileLayout ? "28px" : "34px",
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              {publicConfig.enabledFeatures.multiAgentVoices ? activeAssistantName : "NYT Assistant"}
            </h3>

            <div
              style={{
                width: isMobileLayout ? "130px" : "172px",
                height: isMobileLayout ? "130px" : "172px",
                borderRadius: "50%",
                background: orbColor,
                display: "grid",
                placeItems: "center",
                color: "#111827",
                fontSize: isMobileLayout ? "32px" : "44px",
                fontWeight: 900,
                margin: "20px auto",
                boxShadow: `0 0 38px ${statusColor}55`,
              }}
            >
              {initials || "NY"}
            </div>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, fontSize: "14px" }}>
              {voiceMode === "conversation"
                ? "Modo llamada: escucha, entiende, responde y vuelve a escuchar."
                : "Modo manual: dicta, revisa la transcripcion y envia cuando este lista."}
            </p>
          </div>
        </section>

        <section style={{ display: "grid", gap: isMobileLayout ? "12px" : "16px", alignContent: "start" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: isMobileLayout ? "14px" : "16px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontWeight: 800, fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={conversationActive}
                  onChange={(event) => {
                    if (event.target.checked) {
                      startConversationMode();
                    } else {
                      stopConversationMode();
                    }
                  }}
                />
                Modo conversacion
              </label>
            </div>

            <div
              style={{
                fontSize: "12px",
                fontWeight: 900,
                color: activeAssistantColor,
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Transcripcion editable
            </div>

            <textarea
              value={transcript}
              onChange={(event) => {
                setTranscript(event.target.value);
                setVoiceStatus(event.target.value.trim() ? "transcript_ready" : "ready");
              }}
              placeholder="Presiona Escuchar o escribe tu mensaje..."
              style={{
                width: "100%",
                minHeight: isMobileLayout ? "92px" : "120px",
                resize: "vertical",
                boxSizing: "border-box",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.2)",
                color: "#e2e8f0",
                padding: "12px",
                lineHeight: 1.6,
                outline: "none",
                fontSize: "15px",
              }}
            />

            {rawTranscript && rawTranscript !== transcript && (
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px" }}>
                Original: {rawTranscript}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobileLayout ? "1fr" : "repeat(3, 1fr)",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <button
                onClick={voiceStatus === "listening" ? stopListening : startManualListening}
                disabled={voiceStatus === "processing" || voiceStatus === "sending" || conversationActive}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "14px 18px",
                  background:
                    voiceStatus === "listening"
                      ? "#ef4444"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor:
                    voiceStatus === "processing" || voiceStatus === "sending" || conversationActive
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    voiceStatus === "processing" || voiceStatus === "sending" || conversationActive
                      ? 0.65
                      : 1,
                }}
              >
                {voiceStatus === "listening" ? "Detener" : "Escuchar"}
              </button>

              <button
                onClick={conversationActive ? stopConversationMode : startConversationMode}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "14px 18px",
                  background: conversationActive ? "#ef4444" : "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {conversationActive ? "Terminar llamada" : "Iniciar llamada"}
              </button>

              <button
                onClick={() => void sendTranscript()}
                disabled={!transcript.trim() || voiceStatus === "processing" || voiceStatus === "sending"}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #facc15, #f59e0b)",
                  color: "#111827",
                  fontWeight: 900,
                  cursor:
                    !transcript.trim() || voiceStatus === "processing" || voiceStatus === "sending"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !transcript.trim() || voiceStatus === "processing" || voiceStatus === "sending"
                      ? 0.65
                      : 1,
                }}
              >
                Enviar
              </button>
            </div>
          </div>

          <div
            style={{
              background: "rgba(250, 204, 21, 0.08)",
              border: "1px solid rgba(250, 204, 21, 0.2)",
              borderRadius: "20px",
              padding: isMobileLayout ? "14px" : "16px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 900, color: "#facc15", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Respuesta de la IA
            </div>
            <div style={{ color: "#f8fafc", lineHeight: 1.7, minHeight: isMobileLayout ? "64px" : "90px", fontSize: "15px", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
              {lastResponse}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: isMobileLayout ? "14px" : "16px",
              display: "grid",
              gap: "8px",
              color: "#cbd5e1",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            <div>Estado de llamada: {callState}</div>
            <div>Motor activo: {audioEngine}</div>
            <div>{multiAgentLabel}</div>
            <div>Proveedor de respuesta: {providerUsed}</div>
            <div>
              Correccion: {correction ? `${correctionStatus} / ${correction.confidence} / ${correction.detectedIntent}` : correctionStatus}
            </div>
            <div>Idioma STT/TTS: {audioProviderConfig.sttLanguage} / {audioProviderConfig.ttsLanguage}</div>
            {errorMessage && <div style={{ color: "#fca5a5" }}>{errorMessage}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
