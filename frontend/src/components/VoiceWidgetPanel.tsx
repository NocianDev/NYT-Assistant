import { useEffect, useMemo, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "recording" | "thinking" | "speaking";
type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

type Props = {
  assistantName?: string;
  assistantId?: string;
  assistantColor?: string;
};


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

@keyframes hmPanelGlow {
  0% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0); }
  50% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 36px rgba(255,255,255,0.12); }
  100% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0); }
}

@keyframes hmLiveRing {
  0% { transform: scale(0.92); opacity: 0.65; }
  70% { transform: scale(1.22); opacity: 0; }
  100% { transform: scale(1.22); opacity: 0; }
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
        return "Pensando la respuesta...";
      case "speaking":
        return "Respondiendo...";
      default:
        return "Lista para iniciar";
    }
  }, [state]);

  return (
    <div
      style={{
        fontSize: "14px",
        color: "rgba(255,255,255,0.72)",
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

export default function VoiceWidgetPanel({
  assistantName = "Isis",
  assistantId = "isis",
  assistantColor = "#facc15",
}: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [callActive, setCallActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState(
    `Hola, soy ${assistantName}. Puedo atender por voz y ayudarte a captar un prospecto.`
  );
  const [unsupported, setUnsupported] = useState(false);

  const [autoContinue, setAutoContinue] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("unknown");
  const [showPermissionScreen, setShowPermissionScreen] = useState(true);

  const [activeAssistantId, setActiveAssistantId] = useState(assistantId);
  const [activeAssistantName, setActiveAssistantName] = useState(assistantName);
  const [activeAssistantColor, setActiveAssistantColor] =
    useState(assistantColor);
  const [transitionText, setTransitionText] = useState("");
  const [isSwitchingAssistant, setIsSwitchingAssistant] = useState(false);

  const [isMobileLayout, setIsMobileLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const speakingRef = useRef(false);
  const stoppedRef = useRef(false);
  const callActiveRef = useRef(false);
  const autoContinueRef = useRef(true);
  const busyRef = useRef(false);
  const lastAcceptedTranscriptRef = useRef("");
  const relistenTimerRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const silenceMonitorRafRef = useRef<number | null>(null);
  const analyserContextRef = useRef<AudioContext | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  const conversationIdRef = useRef<string>(
    `voice-widget-${assistantId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
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
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setUnsupported(true);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobileLayout(window.innerWidth < 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
        } as unknown as PermissionDescriptor);

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
        //
      }
    }

    checkPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasStartedRef.current) return;

    setActiveAssistantId(assistantId);
    setActiveAssistantName(assistantName);
    setActiveAssistantColor(assistantColor);
    setLastResponse(`Hola, soy ${assistantName}.`);
  }, [assistantId, assistantName, assistantColor]);

  function formatTime(totalSeconds: number) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function clearSilenceMonitor() {
    if (silenceMonitorRafRef.current) {
      cancelAnimationFrame(silenceMonitorRafRef.current);
      silenceMonitorRafRef.current = null;
    }

    try {
      analyserSourceRef.current?.disconnect();
    } catch {}

    try {
      analyserNodeRef.current?.disconnect();
    } catch {}

    try {
      analyserContextRef.current?.close();
    } catch {}

    analyserSourceRef.current = null;
    analyserNodeRef.current = null;
    analyserContextRef.current = null;
  }

  function stopRecorder() {
    clearSilenceMonitor();

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
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
    } catch {}

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    audioElementRef.current = null;
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

  function scheduleRelisten(delay = 550) {
    clearRelistenTimer();

    relistenTimerRef.current = window.setTimeout(() => {
      if (stoppedRef.current) return;
      if (!callActiveRef.current) return;
      if (!autoContinueRef.current) return;
      if (speakingRef.current) return;
      if (busyRef.current) return;

      setVoiceState("listening");
      void startAudioRecording();
    }, delay);
  }

  function endCall() {
    stoppedRef.current = true;
    callActiveRef.current = false;
    hardStopEverything();
    setCallActive(false);
    setSeconds(0);
    setTranscript("");
    setTransitionText("");
    setIsSwitchingAssistant(false);
    setLastResponse("La llamada terminó.");
  }

  function shouldIgnoreTranscript(rawText: string) {
    const normalized = normalizeSpokenText(rawText);

    if (!normalized || normalized.length < 2) {
      return true;
    }

    const previous = lastAcceptedTranscriptRef.current;

    if (normalized === previous) {
      return true;
    }

    if (
      previous &&
      (normalized.includes(previous) || previous.includes(normalized)) &&
      normalized.length < 10
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

  async function speakText(text: string) {
    if (!text?.trim()) return;

    const apiUrl =
      import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
      "http://localhost:3000";

    const tenantId = import.meta.env.VITE_TENANT_ID;
    const clientType = isMobileDevice() ? "mobile" : "desktop";

    speakingRef.current = true;
    setVoiceState("speaking");

    try {
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        } catch {}
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const response = await fetch(`${apiUrl}/voice/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId || "",
          "x-client-type": clientType,
        },
        body: JSON.stringify({
          text,
          tenantId,
          assistantId: activeAssistantId,
          clientType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error /voice/speak (${response.status})`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () =>
          reject(new Error("No se pudo reproducir el audio."));
        audio.play().catch(reject);
      });
    } finally {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      audioElementRef.current = null;
      speakingRef.current = false;
    }
  }

  async function sendVoiceTextToAssistant(text: string) {
    if (busyRef.current) return;

    setIsBusy(true);
    busyRef.current = true;
    setVoiceState("thinking");
    setTransitionText("");

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
        "http://localhost:3000";

      const tenantId = import.meta.env.VITE_TENANT_ID;
      const clientType = isMobileDevice() ? "mobile" : "desktop";

      const { res, data } = await safeFetchJson(
        `${apiUrl}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-type": clientType,
          },
          body: JSON.stringify({
            message: text,
            conversationId: conversationIdRef.current,
            tenantId,
            channel: "voice",
            assistantId: activeAssistantId,
            clientType,
          }),
        },
        35000
      );

      if (!res.ok) {
        throw new Error(data?.error || `Error /chat (${res.status})`);
      }

      if (data?.switched && data?.assistantId) {
        setIsSwitchingAssistant(true);
        setActiveAssistantId(data.assistantId);
        setActiveAssistantName(data.assistantName || data.assistantId);
        setActiveAssistantColor(data.assistantColor || "#facc15");
        setTransitionText(data.transitionText || "");
      } else {
        setIsSwitchingAssistant(false);
        setTransitionText("");
      }

      const reply =
        data?.reply || "No se recibió una respuesta válida del asistente.";

      setLastResponse(reply);

      await speakText(data?.ttsText || reply);

      setIsBusy(false);
      busyRef.current = false;

      if (
        callActiveRef.current &&
        autoContinueRef.current &&
        !stoppedRef.current
      ) {
        scheduleRelisten(isMobileDevice() ? 700 : 550);
      } else {
        setVoiceState("idle");
      }

      window.setTimeout(() => {
        setIsSwitchingAssistant(false);
      }, 1600);
    } catch (error: any) {
      console.error(error);
      setVoiceState("idle");
      setIsBusy(false);
      busyRef.current = false;
      setIsSwitchingAssistant(false);

      setLastResponse(
        error?.name === "AbortError"
          ? "La respuesta tardó demasiado."
          : error?.message || "Error conectando con el asistente."
      );

      if (
        callActiveRef.current &&
        autoContinueRef.current &&
        !stoppedRef.current
      ) {
        scheduleRelisten(isMobileDevice() ? 850 : 700);
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
      const clientType = isMobileDevice() ? "mobile" : "desktop";

      const formData = new FormData();
      formData.append(
        "audio",
        blob,
        `voice.${blob.type.includes("mp4") ? "m4a" : "webm"}`
      );
      formData.append("tenantId", tenantId || "");
      formData.append("assistantId", activeAssistantId);
      formData.append("clientType", clientType);

      const { res, data } = await safeFetchJson(
        `${apiUrl}/voice/transcribe`,
        {
          method: "POST",
          headers: {
            "x-tenant-id": tenantId || "",
            "x-client-type": clientType,
          },
          body: formData,
        },
        60000
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

        if (
          callActiveRef.current &&
          autoContinueRef.current &&
          !stoppedRef.current
        ) {
          scheduleRelisten(isMobileDevice() ? 650 : 500);
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

      if (
        callActiveRef.current &&
        autoContinueRef.current &&
        !stoppedRef.current
      ) {
        scheduleRelisten(isMobileDevice() ? 700 : 550);
      }
    }
  }

  async function startAudioRecording() {
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
          channelCount: 1,
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

      const AudioContextCtor =
        window.AudioContext || (window as any).webkitAudioContext;

      let audioContext: AudioContext | null = null;
      let source: MediaStreamAudioSourceNode | null = null;
      let analyser: AnalyserNode | null = null;
      let dataArray: Uint8Array | null = null;

      if (AudioContextCtor) {
        audioContext = new AudioContextCtor();
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.fftSize);

        analyserContextRef.current = audioContext;
        analyserSourceRef.current = source;
        analyserNodeRef.current = analyser;
      }

      let startedAt = 0;
      let silenceStartedAt: number | null = null;

      const MIN_RECORD_MS = isMobileLayout ? 900 : 750;
      const MAX_RECORD_MS = isMobileLayout ? 12000 : 9500;
      const END_SILENCE_MS = isMobileLayout ? 720 : 620;
      const SILENCE_THRESHOLD = isMobileLayout ? 5.2 : 5.8;

      function stopAndCleanup() {
        clearSilenceMonitor();

        try {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        } catch {}
      }

      function monitorSilence() {
        if (!callActiveRef.current || stoppedRef.current) {
          stopAndCleanup();
          return;
        }

        if (recorder.state !== "recording") return;

        const now = Date.now();
        const elapsed = now - startedAt;

        if (elapsed >= MAX_RECORD_MS) {
          stopAndCleanup();
          return;
        }

        if (analyser && dataArray) {
          analyser.getByteTimeDomainData(dataArray as any);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i += 1) {
            sum += Math.abs(dataArray[i] - 128);
          }

          const average = sum / dataArray.length;

          if (average < SILENCE_THRESHOLD) {
            if (silenceStartedAt === null) {
              silenceStartedAt = now;
            }

            const silenceElapsed = now - silenceStartedAt;

            if (elapsed >= MIN_RECORD_MS && silenceElapsed >= END_SILENCE_MS) {
              stopAndCleanup();
              return;
            }
          } else {
            silenceStartedAt = null;
          }
        }

        silenceMonitorRafRef.current = requestAnimationFrame(monitorSilence);
      }

      recorder.onstart = () => {
        startedAt = Date.now();
        silenceStartedAt = null;
        setVoiceState("recording");

        window.setTimeout(() => {
          silenceMonitorRafRef.current = requestAnimationFrame(monitorSilence);
        }, 250);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearSilenceMonitor();

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        stopStream();

        if (!chunks.length) {
          setVoiceState("idle");
          scheduleRelisten(650);
          return;
        }

        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        await transcribeAudioBlob(blob);
      };

      recorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        clearSilenceMonitor();
        stopStream();
        setVoiceState("idle");
        setLastResponse("El navegador falló al grabar el audio.");
        scheduleRelisten(850);
      };

      recorder.start(250);
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

  async function talkNow() {
    if (!callActiveRef.current) {
      startCall();
      return;
    }

    clearRelistenTimer();
    cleanupSpeech();
    stopRecorder();
    stopStream();
    setIsBusy(false);
    busyRef.current = false;
    speakingRef.current = false;
    setTransitionText("");
    setVoiceState("listening");
    window.setTimeout(() => {
      if (!stoppedRef.current && callActiveRef.current) {
        void startAudioRecording();
      }
    }, 120);
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

    hasStartedRef.current = true;
    stoppedRef.current = false;
    callActiveRef.current = true;
    setCallActive(true);
    setSeconds(0);
    setTranscript("");
    setTransitionText("");
    setLastResponse(`${activeAssistantName} está escuchando. Habla como en una llamada normal.`);
    setShowPermissionScreen(false);

    void startAudioRecording();
  }

  const permissionHelp =
    micPermission === "denied"
      ? "Tu navegador bloqueó el micrófono. Actívalo en la configuración del sitio y vuelve a abrir esta ventana."
      : `Permite el micrófono para iniciar una llamada real con ${activeAssistantName}. Podrás hablar, interrumpir y continuar sin repetir pasos.`;

  const orbColor =
    voiceState === "listening" || voiceState === "recording"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : voiceState === "thinking"
      ? "linear-gradient(135deg, #60a5fa, #2563eb)"
      : voiceState === "speaking"
      ? "linear-gradient(135deg, #facc15, #f59e0b)"
      : `linear-gradient(135deg, ${activeAssistantColor}, #ffffff33)`;

  const activePanelGlow = useMemo(() => {
    if (voiceState === "recording" || voiceState === "listening") {
      return {
        border: "1px solid rgba(34,197,94,0.58)",
        background:
          "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(255,255,255,0.06))",
        boxShadow:
          "0 0 0 1px rgba(34,197,94,0.12), 0 0 34px rgba(34,197,94,0.28), inset 0 0 26px rgba(34,197,94,0.08)",
      };
    }

    if (voiceState === "speaking") {
      return {
        border: "1px solid rgba(250,204,21,0.58)",
        background:
          "linear-gradient(180deg, rgba(250,204,21,0.12), rgba(255,255,255,0.06))",
        boxShadow:
          "0 0 0 1px rgba(250,204,21,0.12), 0 0 36px rgba(250,204,21,0.30), inset 0 0 30px rgba(250,204,21,0.08)",
      };
    }

    if (voiceState === "thinking") {
      return {
        border: "1px solid rgba(96,165,250,0.55)",
        background:
          "linear-gradient(180deg, rgba(96,165,250,0.11), rgba(255,255,255,0.06))",
        boxShadow:
          "0 0 0 1px rgba(96,165,250,0.10), 0 0 30px rgba(96,165,250,0.26), inset 0 0 24px rgba(96,165,250,0.08)",
      };
    }

    return {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 22px 45px rgba(15, 23, 42, 0.12)",
    };
  }, [voiceState]);

  const initials = activeAssistantName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const outerGap = isMobileLayout ? "14px" : "20px";
  const mainGridColumns = isMobileLayout
    ? "1fr"
    : "minmax(320px, 1.1fr) minmax(320px, 0.9fr)";
  const mainCardPadding = isMobileLayout ? "20px" : "28px";
  const mainCardMinHeight = isMobileLayout ? "auto" : "560px";
  const orbSize = isMobileLayout ? 124 : 172;
  const orbFontSize = isMobileLayout ? "30px" : "42px";
  const titleFontSize = isMobileLayout ? "26px" : "32px";
  const timerFontSize = isMobileLayout ? "24px" : "28px";
  const buttonWidth = isMobileLayout ? "100%" : "auto";

  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gap: outerGap,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mainGridColumns,
          gap: outerGap,
        }}
      >
        <div
          style={{
            borderRadius: isMobileLayout ? "22px" : "28px",
            minHeight: mainCardMinHeight,
            padding: mainCardPadding,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            backdropFilter: "blur(16px)",
            transition:
              "background 0.25s ease, border 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease",
            animation:
              voiceState !== "idle" ? "hmPanelGlow 1.8s ease-in-out infinite" : "none",
            ...activePanelGlow,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: isMobileLayout ? "100%" : "420px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: activeAssistantColor,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "12px",
              }}
            >
              {isSwitchingAssistant ? "Cambiando asistente" : "Llamada activa"}
            </div>

            <div
              style={{
                fontSize: titleFontSize,
                fontWeight: 900,
                color: "#ffffff",
                marginBottom: "10px",
                lineHeight: 1.05,
              }}
            >
              {activeAssistantName}
            </div>

            <div
              style={{
                fontSize: timerFontSize,
                fontWeight: 900,
                color: "#ffffff",
                marginBottom: "18px",
              }}
            >
              {formatTime(seconds)}
            </div>

            <div
              style={{
                width: `${orbSize}px`,
                height: `${orbSize}px`,
                borderRadius: "50%",
                background: orbColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#111827",
                fontSize: orbFontSize,
                fontWeight: 900,
                boxShadow:
                  voiceState === "recording" || voiceState === "listening"
                    ? "0 0 34px rgba(34,197,94,0.30)"
                    : voiceState === "speaking"
                    ? "0 0 36px rgba(250,204,21,0.32)"
                    : voiceState === "thinking"
                    ? "0 0 30px rgba(96,165,250,0.28)"
                    : "0 22px 45px rgba(15, 23, 42, 0.24)",
                animation:
                  callActive && voiceState !== "idle"
                    ? "hmVoicePulse 1.8s ease-in-out infinite"
                    : "none",
                margin: "0 auto 16px",
                transition: "all 0.35s ease",
              }}
            >
              {initials}
            </div>

            <StatusText state={voiceState} />
            <div style={{ marginTop: "14px" }}>
              <VoiceBars active={callActive && voiceState !== "idle"} />
            </div>

            {transitionText && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#f8fafc",
                  lineHeight: 1.6,
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                {transitionText}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: isMobileLayout ? "12px" : "16px",
            alignContent: "start",
          }}
        >
          {showPermissionScreen ? (
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: isMobileLayout ? "22px" : "28px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: isMobileLayout ? "18px" : "24px",
                display: "grid",
                gap: "14px",
                backdropFilter: "blur(16px)",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #facc15, #f59e0b)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "30px",
                  boxShadow: "0 18px 36px rgba(245, 158, 11, 0.24)",
                }}
              >
                🎙️
              </div>

              <div>
                <div
                  style={{
                    fontSize: isMobileLayout ? "24px" : "28px",
                    fontWeight: 900,
                    color: "#ffffff",
                    marginBottom: "10px",
                    lineHeight: 1.05,
                  }}
                >
                  Activa el micrófono
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.76)",
                    lineHeight: 1.7,
                    fontSize: isMobileLayout ? "14px" : "15px",
                  }}
                >
                  {permissionHelp}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "14px",
                  textAlign: "left",
                  color: "#e2e8f0",
                  lineHeight: 1.6,
                  fontSize: "14px",
                }}
              >
                <strong>Modo llamada:</strong> habla normal. Si la IA está respondiendo y quieres cortar, usa <strong>Hablar ahora</strong>.
              </div>

              <button
                onClick={activateMicrophone}
                style={{
                  width: buttonWidth,
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
                    width: buttonWidth,
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
              {unsupported ? (
                <div
                  style={{
                    width: "100%",
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                    borderRadius: "16px",
                    padding: "14px 16px",
                  }}
                >
                  Tu dispositivo no soporta esta experiencia de voz.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      padding: isMobileLayout ? "14px" : "16px",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: activeAssistantColor,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Transcripción
                    </div>

                    <div
                      style={{
                        color: "#e2e8f0",
                        lineHeight: 1.7,
                        minHeight: isMobileLayout ? "56px" : "78px",
                        fontSize: isMobileLayout ? "14px" : "15px",
                        wordBreak: "break-word",
                      }}
                    >
                      {transcript || "Habla cuando el indicador esté en verde."}
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
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#facc15",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Respuesta de la IA
                    </div>

                    <div
                      style={{
                        color: "#f8fafc",
                        lineHeight: 1.7,
                        minHeight: isMobileLayout ? "56px" : "78px",
                        fontSize: isMobileLayout ? "14px" : "15px",
                        wordBreak: "break-word",
                      }}
                    >
                      {lastResponse}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      display: "grid",
                      gap: "12px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                      padding: isMobileLayout ? "14px" : "16px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        color: "#e2e8f0",
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={autoContinue}
                        onChange={(e) => setAutoContinue(e.target.checked)}
                      />
                      Escucha automática
                    </label>

                    {!callActive ? (
                      <button
                        onClick={startCall}
                        disabled={isBusy}
                        style={{
                          width: buttonWidth,
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobileLayout ? "1fr" : "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <button
                          onClick={talkNow}
                          style={{
                            width: "100%",
                            border: "none",
                            borderRadius: "999px",
                            padding: "14px 18px",
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            color: "#ffffff",
                            fontWeight: 900,
                            cursor: "pointer",
                            boxShadow: "0 14px 28px rgba(34, 197, 94, 0.24)",
                          }}
                        >
                          Hablar ahora
                        </button>
                        <button
                          onClick={endCall}
                          style={{
                            width: "100%",
                            border: "none",
                            borderRadius: "999px",
                            padding: "14px 18px",
                            background: "#ef4444",
                            color: "#ffffff",
                            fontWeight: 900,
                            cursor: "pointer",
                            boxShadow: "0 14px 28px rgba(239, 68, 68, 0.22)",
                          }}
                        >
                          Finalizar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}