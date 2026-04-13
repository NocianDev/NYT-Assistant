import { useEffect, useMemo, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "recording" | "thinking" | "speaking";
type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

type Props = {
  assistantName?: string;
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }

  interface PermissionDescriptor {
    name: PermissionName | "microphone";
  }
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const pulseKeyframes = `
@keyframes hmVoicePulse {
  0% { transform: scale(1); opacity: 0.92; }
  50% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 0.92; }
}

@keyframes hmVoiceBars {
  0% { transform: scaleY(0.4); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(0.4); opacity: 0.6; }
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
        gap: "5px",
        height: "48px",
      }}
    >
      {bars.map((_, i) => (
        <div
          key={i}
          style={{
            width: "7px",
            height: `${16 + (i % 3) * 8}px`,
            borderRadius: "999px",
            background: "linear-gradient(180deg, #facc15, #f59e0b)",
            transformOrigin: "bottom",
            animation: active
              ? `hmVoiceBars ${0.85 + i * 0.08}s ease-in-out infinite`
              : "none",
            opacity: active ? 1 : 0.4,
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
      case "recording":
        return "Grabando...";
      case "thinking":
        return "Procesando...";
      case "speaking":
        return "Hablando...";
      default:
        return "Lista para hablar";
    }
  }, [state]);

  return (
    <div
      style={{
        fontSize: "14px",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function normalizeSpokenText(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!]/g, "")
    .replace(/\s+/g, " ");
}

export default function VoiceWidget({
  assistantName = "NYT Voice",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [callActive, setCallActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState(
    "Aquí aparecerá la respuesta por voz."
  );
  const [unsupported, setUnsupported] = useState(false);

  const [autoContinue, setAutoContinue] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("unknown");
  const [showPermissionScreen, setShowPermissionScreen] = useState(true);

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const speakingRef = useRef(false);
  const stoppedRef = useRef(false);
  const callActiveRef = useRef(false);
  const autoContinueRef = useRef(true);
  const busyRef = useRef(false);
  const relistenCooldownRef = useRef(0);
  const lastAcceptedTranscriptRef = useRef("");
  const relistenTimerRef = useRef<number | null>(null);

  const conversationIdRef = useRef<string>(
    `voice-widget-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const mobileModeRef = useRef<boolean>(false);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = pulseKeyframes;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    const mobile = isMobileDevice();
    mobileModeRef.current = mobile;

    if (!mobile && !SpeechRecognitionAPI) {
      setUnsupported(true);
    }

    if (mobile && !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
    }
  }, []);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    autoContinueRef.current = autoContinue;
  }, [autoContinue]);

  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    if (!callActive) return;

    const timer = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callActive]);

  useEffect(() => {
    let mounted = true;

    async function checkPermission() {
      try {
        if (!navigator.permissions?.query) return;

        const status = await navigator.permissions.query({
          name: "microphone",
        } as PermissionDescriptor);

        if (!mounted) return;

        const state = status.state as MicPermissionState;
        setMicPermission(
          state === "granted" || state === "denied" || state === "prompt"
            ? state
            : "unknown"
        );

        status.onchange = () => {
          const next = status.state as MicPermissionState;
          setMicPermission(
            next === "granted" || next === "denied" || next === "prompt"
              ? next
              : "unknown"
          );
        };
      } catch {
        // ignore
      }
    }

    checkPermission();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  function formatTime(totalSeconds: number) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function stopRecognition() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }

  function stopRecorder() {
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {}
      recorderRef.current = null;
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function cleanupSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
  }

  function clearRelistenTimer() {
    if (relistenTimerRef.current) {
      window.clearTimeout(relistenTimerRef.current);
      relistenTimerRef.current = null;
    }
  }

  function hardStopEverything() {
    clearRelistenTimer();
    stopRecognition();
    stopRecorder();
    stopStream();
    cleanupSpeech();
    setIsBusy(false);
    busyRef.current = false;
    speakingRef.current = false;
    setVoiceState("idle");
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        hardStopEverything();
        setCallActive(false);
        callActiveRef.current = false;
      }
    }

    function handlePageHide() {
      hardStopEverything();
      setCallActive(false);
      callActiveRef.current = false;
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      hardStopEverything();
    };
  }, []);

  function scheduleRelisten(delay = 1200) {
    clearRelistenTimer();

    relistenTimerRef.current = window.setTimeout(() => {
      if (stoppedRef.current) return;
      if (!callActiveRef.current) return;
      if (!autoContinueRef.current) return;
      if (speakingRef.current) return;
      if (busyRef.current) return;

      relistenCooldownRef.current = 0;

      if (mobileModeRef.current) {
        void startMobileRecording();
      } else {
        startDesktopListening();
      }
    }, delay);
  }

  function endCall() {
    stoppedRef.current = true;
    callActiveRef.current = false;
    hardStopEverything();
    setCallActive(false);
    setSeconds(0);
    setTranscript("");
    setLastResponse("La llamada terminó.");
  }

  function shouldIgnoreTranscript(rawText: string) {
    const normalized = normalizeSpokenText(rawText);

    if (!normalized || normalized.length < 3) {
      return true;
    }

    const previous = lastAcceptedTranscriptRef.current;
    if (normalized === previous) {
      return true;
    }

    if (
      previous &&
      (normalized.includes(previous) || previous.includes(normalized)) &&
      normalized.length < 12
    ) {
      return true;
    }

    lastAcceptedTranscriptRef.current = normalized;
    return false;
  }

  async function safeFetchJson(
    url: string,
    options: RequestInit,
    timeoutMs = 30000
  ) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      return { res, data };
    } finally {
      clearTimeout(timer);
    }
  }

  function speakText(text: string) {
    return new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-MX";
      utterance.rate = 1;
      utterance.pitch = 1;

      speakingRef.current = true;
      setVoiceState("speaking");
      relistenCooldownRef.current = Date.now() + 1800;

      utterance.onend = () => {
        speakingRef.current = false;
        relistenCooldownRef.current = 0;
        resolve();
      };

      utterance.onerror = () => {
        speakingRef.current = false;
        relistenCooldownRef.current = 0;
        resolve();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  async function sendVoiceTextToAssistant(text: string) {
    if (busyRef.current) return;

    setIsBusy(true);
    busyRef.current = true;
    setVoiceState("thinking");

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
        "http://localhost:3000";

      const tenantId = import.meta.env.VITE_TENANT_ID;

      const { res, data } = await safeFetchJson(
        `${apiUrl}/chat`,
        {
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
        },
        35000
      );

      if (!res.ok) {
        throw new Error(data?.error || `Error /chat (${res.status})`);
      }

      const reply =
        data?.reply || "No se recibió una respuesta válida del asistente.";

      setLastResponse(reply);

      await speakText(data?.ttsText || reply);

      setIsBusy(false);
      busyRef.current = false;

      if (callActiveRef.current && autoContinueRef.current && !stoppedRef.current) {
        scheduleRelisten(1200);
      } else {
        setVoiceState("idle");
      }
    } catch (error: any) {
      console.error(error);
      setVoiceState("idle");
      setIsBusy(false);
      busyRef.current = false;

      setLastResponse(
        error?.name === "AbortError"
          ? "La respuesta tardó demasiado."
          : error?.message || "Error conectando con el asistente."
      );

      if (callActiveRef.current && autoContinueRef.current && !stoppedRef.current) {
        scheduleRelisten(1500);
      }
    }
  }

  async function transcribeAudioBlob(blob: Blob) {
    if (busyRef.current) return;

    setIsBusy(true);
    busyRef.current = true;
    setVoiceState("thinking");

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
        "http://localhost:3000";

      const tenantId = import.meta.env.VITE_TENANT_ID;
      const formData = new FormData();
      formData.append(
        "audio",
        blob,
        `voice.${blob.type.includes("mp4") ? "m4a" : "webm"}`
      );
      formData.append("tenantId", tenantId || "");

      const { res, data } = await safeFetchJson(
        `${apiUrl}/voice/transcribe`,
        {
          method: "POST",
          headers: {
            "x-tenant-id": tenantId || "",
          },
          body: formData,
        },
        40000
      );

      if (!res.ok) {
        throw new Error(data?.error || `Error /voice/transcribe (${res.status})`);
      }

      const text = data?.transcript?.trim() || "";
      setTranscript(text);

      if (!text || shouldIgnoreTranscript(text)) {
        setIsBusy(false);
        busyRef.current = false;
        setVoiceState("idle");

        if (callActiveRef.current && autoContinueRef.current && !stoppedRef.current) {
          scheduleRelisten(1000);
        }
        return;
      }

      setIsBusy(false);
      busyRef.current = false;

      await sendVoiceTextToAssistant(text);
    } catch (error: any) {
      console.error("Error transcribiendo audio:", error);
      setIsBusy(false);
      busyRef.current = false;
      setVoiceState("idle");
      setLastResponse(error?.message || "No se pudo transcribir el audio.");

      if (callActiveRef.current && autoContinueRef.current && !stoppedRef.current) {
        scheduleRelisten(1500);
      }
    }
  }

  function startDesktopListening() {
    if (!SpeechRecognitionAPI || busyRef.current || speakingRef.current) return;

    stopRecognition();

    const recognition = new SpeechRecognitionAPI();
    let gotResult = false;

    recognition.lang = "es-MX";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState("listening");
    };

    recognition.onresult = async (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      gotResult = true;
      setTranscript(text);

      if (!text || shouldIgnoreTranscript(text)) {
        setVoiceState("idle");
        scheduleRelisten(900);
        return;
      }

      await sendVoiceTextToAssistant(text);
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition error:", event);
      setVoiceState("idle");

      if (
        event?.error === "no-speech" ||
        event?.error === "aborted" ||
        event?.error === "network"
      ) {
        if (callActiveRef.current && autoContinueRef.current && !stoppedRef.current) {
          scheduleRelisten(1000);
        }
        return;
      }

      setLastResponse("No se pudo reconocer la voz. Intenta de nuevo.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (!callActiveRef.current || stoppedRef.current) {
        setVoiceState("idle");
        return;
      }

      if (!gotResult && autoContinueRef.current && !busyRef.current && !speakingRef.current) {
        scheduleRelisten(700);
        return;
      }

      if (!busyRef.current && !speakingRef.current) {
        setVoiceState("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Error iniciando SpeechRecognition:", error);
      setVoiceState("idle");
      scheduleRelisten(1200);
    }
  }

  async function startMobileRecording() {
    if (busyRef.current || speakingRef.current) return;

    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }

      stopRecorder();
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setMicPermission("granted");
      setShowPermissionScreen(false);

      audioChunksRef.current = [];

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported?.("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported?.("audio/webm")) {
          mimeType = "audio/webm";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.onstart = () => {
        setVoiceState("recording");
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        stopStream();

        if (!chunks.length) {
          setVoiceState("idle");
          scheduleRelisten(1200);
          return;
        }

        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        await transcribeAudioBlob(blob);
      };

      recorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        stopStream();
        setVoiceState("idle");
        setLastResponse("El navegador falló al grabar el audio.");
        scheduleRelisten(1400);
      };

      recorder.start();

      window.setTimeout(() => {
        if (
          recorderRef.current &&
          recorderRef.current.state === "recording" &&
          callActiveRef.current &&
          !stoppedRef.current
        ) {
          recorderRef.current.stop();
        }
      }, 5000);
    } catch (error: any) {
      console.error("Error al acceder al micrófono:", error);

      if (error?.name === "NotAllowedError") {
        setMicPermission("denied");
        setLastResponse(
          "El micrófono está bloqueado. Permítelo en la configuración del navegador."
        );
      } else if (error?.name === "NotFoundError") {
        setLastResponse("No se encontró un micrófono disponible.");
      } else {
        setLastResponse("No se pudo acceder al micrófono.");
      }

      setVoiceState("idle");
      setShowPermissionScreen(true);
    }
  }

  async function activateMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      setShowPermissionScreen(false);
    } catch (error: any) {
      if (error?.name === "NotAllowedError") {
        setMicPermission("denied");
      }
      setShowPermissionScreen(true);
    }
  }

  function startCall() {
    if (unsupported) {
      alert("Tu dispositivo no soporta esta experiencia de voz.");
      return;
    }

    stoppedRef.current = false;
    callActiveRef.current = true;
    setCallActive(true);
    setSeconds(0);
    setTranscript("");
    setLastResponse("La llamada ha comenzado. El asistente está listo.");
    setShowPermissionScreen(false);
    relistenCooldownRef.current = Date.now() + 300;

    if (mobileModeRef.current) {
      void startMobileRecording();
    } else {
      startDesktopListening();
    }
  }

  const permissionHelp =
    micPermission === "denied"
      ? "Tu navegador bloqueó el micrófono. Actívalo en la configuración del sitio y vuelve a abrir esta ventana."
      : "Para comenzar, permite el uso del micrófono. Después podrás hablar con el asistente y, si dejas la conversación continua encendida, seguirá escuchando automáticamente.";

  const orbColor =
    voiceState === "listening" || voiceState === "recording"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : voiceState === "thinking"
      ? "linear-gradient(135deg, #60a5fa, #2563eb)"
      : voiceState === "speaking"
      ? "linear-gradient(135deg, #facc15, #f59e0b)"
      : "linear-gradient(135deg, #e2e8f0, #cbd5e1)";

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "96px",
            width: "min(92vw, 380px)",
            background: "#ffffff",
            borderRadius: "28px",
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              color: "#ffffff",
              padding: "18px 18px 16px",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: "18px" }}>
                {assistantName}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                Asistente de voz
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.12)",
                color: "#ffffff",
                width: "36px",
                height: "36px",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "18px",
              display: "grid",
              gap: "16px",
              justifyItems: "center",
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(255,253,247,1) 0%, rgba(255,250,242,1) 100%)",
            }}
          >
            {showPermissionScreen ? (
              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #facc15, #f59e0b)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "36px",
                    boxShadow: "0 18px 36px rgba(245, 158, 11, 0.24)",
                    margin: "0 auto",
                  }}
                >
                  🎙️
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: 900,
                      color: "#0f172a",
                      marginBottom: "10px",
                    }}
                  >
                    Activa el micrófono
                  </div>
                  <div
                    style={{
                      color: "#475569",
                      lineHeight: 1.7,
                    }}
                  >
                    {permissionHelp}
                  </div>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    borderRadius: "16px",
                    padding: "14px",
                    textAlign: "left",
                    color: "#334155",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Consejo:</strong> usa audífonos o mantén el volumen bajo
                  si activas conversación continua.
                </div>

                <button
                  onClick={activateMicrophone}
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
                  Activar micrófono
                </button>

                {micPermission === "granted" && (
                  <button
                    onClick={startCall}
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
                    Iniciar llamada
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {formatTime(seconds)}
                </div>

                <div
                  style={{
                    width: "132px",
                    height: "132px",
                    borderRadius: "50%",
                    background: orbColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#111827",
                    fontSize: "40px",
                    fontWeight: 900,
                    boxShadow: "0 22px 45px rgba(15, 23, 42, 0.18)",
                    animation:
                      callActive && voiceState !== "idle"
                        ? "hmVoicePulse 1.8s ease-in-out infinite"
                        : "none",
                  }}
                >
                  AI
                </div>

                <StatusText state={voiceState} />
                <VoiceBars active={callActive && voiceState !== "idle"} />

                {unsupported ? (
                  <div
                    style={{
                      width: "100%",
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                      borderRadius: "14px",
                      padding: "12px 14px",
                    }}
                  >
                    Tu dispositivo no soporta esta experiencia de voz.
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      display: "grid",
                      gap: "12px",
                      alignSelf: "start",
                    }}
                  >
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid rgba(15, 23, 42, 0.06)",
                        borderRadius: "16px",
                        padding: "14px",
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
                        Transcripción
                      </div>
                      <div
                        style={{
                          color: "#334155",
                          lineHeight: 1.6,
                          minHeight: "24px",
                        }}
                      >
                        {transcript || "Aún no hay voz detectada."}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff7cc",
                        border: "1px solid rgba(250, 204, 21, 0.3)",
                        borderRadius: "16px",
                        padding: "14px",
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
                        Respuesta
                      </div>
                      <div
                        style={{
                          color: "#334155",
                          lineHeight: 1.6,
                          minHeight: "24px",
                        }}
                      >
                        {lastResponse}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    width: "100%",
                    display: "grid",
                    gap: "10px",
                    paddingBottom: "6px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#475569",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoContinue}
                      onChange={(e) => setAutoContinue(e.target.checked)}
                    />
                    Conversación continua
                  </label>

                  {!callActive ? (
                    <button
                      onClick={startCall}
                      disabled={isBusy}
                      style={{
                        border: "none",
                        borderRadius: "999px",
                        padding: "14px 22px",
                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                        color: "#ffffff",
                        fontWeight: 800,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        opacity: isBusy ? 0.7 : 1,
                        boxShadow: "0 14px 28px rgba(34, 197, 94, 0.22)",
                      }}
                    >
                      Iniciar llamada
                    </button>
                  ) : (
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
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          right: "92px",
          bottom: "20px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 18px 40px rgba(34, 197, 94, 0.35)",
          zIndex: 10000,
        }}
        aria-label="Abrir voz"
        title="Abrir asistente de voz"
      >
        🎙️
      </button>
    </>
  );
}