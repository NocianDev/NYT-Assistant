import { audioProviderConfig } from "./audioProvider";
import { BrowserSpeechRecognizer } from "./voiceInput";
import { VoiceActivityDetector } from "./voiceActivityDetector";

export type VoiceCallState =
  | "idle"
  | "starting"
  | "waiting_for_speech"
  | "listening"
  | "ending_user_turn"
  | "correcting_transcript"
  | "sending_to_ai"
  | "speaking"
  | "interrupted"
  | "cooldown"
  | "error";

type CorrectionResult = {
  correctedTranscript: string;
  confidence: "low" | "medium" | "high";
  detectedIntent: string;
  needsUserReview: boolean;
};

type CurrentTurn = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  interimTranscript: string;
  finalTranscript: string;
  combinedTranscript: string;
  hasSpeech: boolean;
  sent: boolean;
  corrected: boolean;
  source: "conversation";
};

type VoiceCallControllerOptions = {
  onStatusChange: (state: VoiceCallState) => void;
  onTranscriptUpdate: (text: string, rawText: string) => void;
  onFinalTranscript: (text: string, correction: CorrectionResult | null) => void;
  onAssistantResponse: (text: string, meta?: unknown) => void;
  onCorrectionStatus?: (status: string) => void;
  onError: (message: string) => void;
  sendMessage: (
    text: string,
    options: { source: "conversation"; turnId: string },
  ) => Promise<{ replyText: string; speakText?: string; meta?: unknown }>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  correctTranscript: (text: string) => Promise<CorrectionResult>;
  getConfig: () => {
    autoSend: boolean;
    correctionEnabled: boolean;
    vadEnabled: boolean;
    bargeInEnabled: boolean;
    echoGuardEnabled: boolean;
    bargeInMinMs: number;
    postTtsCooldownMs: number;
    debug: boolean;
  };
};

function now() {
  return Date.now();
}

function makeTurnId() {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a = "", b = "") {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;

  const leftWords = new Set(left.split(" ").filter((word) => word.length > 2));
  const rightWords = new Set(right.split(" ").filter((word) => word.length > 2));
  if (!leftWords.size || !rightWords.size) return 0;

  let shared = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) shared += 1;
  });

  return shared / Math.max(leftWords.size, rightWords.size);
}

function dedupeWordRuns(text = "") {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length < 4) return words.join(" ");

  const cleaned: string[] = [];
  for (const word of words) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && normalizeText(previous) === normalizeText(word)) continue;
    cleaned.push(word);
  }

  return cleaned.join(" ");
}

function cleanCombinedTranscript(finalTranscript = "", interimTranscript = "") {
  const finalClean = dedupeWordRuns(finalTranscript);
  const interimClean = dedupeWordRuns(interimTranscript);

  if (!finalClean) return interimClean;
  if (!interimClean) return finalClean;
  if (finalClean.includes(interimClean)) return finalClean;
  if (interimClean.includes(finalClean)) return interimClean;

  return dedupeWordRuns(`${finalClean} ${interimClean}`);
}

function isValidUserText(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (normalized.length < 2) return false;
  return true;
}

export function createVoiceCallController(options: VoiceCallControllerOptions) {
  let callState: VoiceCallState = "idle";
  let active = false;
  let paused = false;
  let recognitionRunning = false;
  let recognitionStarting = false;
  let shouldRestartRecognition = false;
  let recognitionRestartAttempts = 0;
  let lastRecognitionStartAt = 0;
  let recognizer: BrowserSpeechRecognizer | null = null;
  let vad: VoiceActivityDetector | null = null;
  let currentTurn: CurrentTurn | null = null;
  let silenceTimer: number | null = null;
  let maxTurnTimer: number | null = null;
  let restartTimer: number | null = null;
  let cooldownTimer: number | null = null;
  let lastTranscriptAt = 0;
  let lastSentUserText = "";
  let lastSentUserTextAt = 0;
  let lastAssistantText = "";
  let lastProcessedTurnId = "";
  let recentTurnHashes: string[] = [];
  let bargeInStartedAt = 0;

  function debug(...args: unknown[]) {
    if (options.getConfig().debug) {
      console.log("[voice-call]", ...args);
    }
  }

  function clearWindowTimer(id: number | null) {
    if (id) window.clearTimeout(id);
  }

  function clearTurnTimers() {
    clearWindowTimer(silenceTimer);
    clearWindowTimer(maxTurnTimer);
    silenceTimer = null;
    maxTurnTimer = null;
  }

  function clearControlTimers() {
    clearWindowTimer(restartTimer);
    clearWindowTimer(cooldownTimer);
    restartTimer = null;
    cooldownTimer = null;
  }

  function transition(next: VoiceCallState) {
    if (callState === next) return;
    debug(`${callState} -> ${next}`);
    callState = next;
    options.onStatusChange(next);
  }

  function createTurn() {
    currentTurn = {
      id: makeTurnId(),
      startedAt: now(),
      endedAt: null,
      interimTranscript: "",
      finalTranscript: "",
      combinedTranscript: "",
      hasSpeech: false,
      sent: false,
      corrected: false,
      source: "conversation",
    };
    clearTurnTimers();
    return currentTurn;
  }

  function resetTurn(clearUi = true) {
    clearTurnTimers();
    currentTurn = null;
    bargeInStartedAt = 0;
    lastTranscriptAt = 0;
    if (clearUi) options.onTranscriptUpdate("", "");
  }

  function ensureTurn() {
    return currentTurn || createTurn();
  }

  function canRecognitionRun() {
    return (
      active &&
      !paused &&
      ["waiting_for_speech", "listening", "interrupted"].includes(callState)
    );
  }

  function scheduleRecognitionRestart(delayMs = 220) {
    if (!active || paused || !shouldRestartRecognition) return;
    clearWindowTimer(restartTimer);
    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (canRecognitionRun()) startRecognition();
    }, delayMs);
  }

  function pauseRecognition() {
    shouldRestartRecognition = false;
    recognitionRunning = false;
    recognitionStarting = false;
    clearWindowTimer(restartTimer);
    restartTimer = null;
    recognizer?.abort();
    recognizer = null;
  }

  function stopRecognition() {
    shouldRestartRecognition = false;
    pauseRecognition();
  }

  function returnToWaiting(delayMs = options.getConfig().postTtsCooldownMs) {
    if (!active || paused) return;
    transition("cooldown");
    clearWindowTimer(cooldownTimer);
    cooldownTimer = window.setTimeout(() => {
      cooldownTimer = null;
      if (!active || paused) return;
      resetTurn(true);
      transition("waiting_for_speech");
      shouldRestartRecognition = true;
      startRecognition();
    }, Math.max(150, delayMs));
  }

  async function finishUserTurn(reason = "silence") {
    if (!active || paused || !currentTurn || currentTurn.sent) return;
    if (!["listening", "interrupted", "waiting_for_speech"].includes(callState)) {
      return;
    }

    clearTurnTimers();
    currentTurn.endedAt = now();
    currentTurn.combinedTranscript = cleanCombinedTranscript(
      currentTurn.finalTranscript,
      currentTurn.interimTranscript,
    );

    const rawText = currentTurn.combinedTranscript;
    debug("finish turn", reason, rawText);

    transition("ending_user_turn");
    pauseRecognition();

    if (!isValidUserText(rawText)) {
      debug("empty/invalid turn");
      options.onCorrectionStatus?.("omitted_empty");
      resetTurn(true);
      returnToWaiting(350);
      return;
    }

    let finalText = rawText;
    let correction: CorrectionResult | null = null;

    if (options.getConfig().correctionEnabled) {
      transition("correcting_transcript");
      options.onCorrectionStatus?.("pending");
      try {
        correction = await options.correctTranscript(rawText);
        finalText = correction.correctedTranscript || rawText;
        options.onCorrectionStatus?.("completed");
      } catch (error) {
        debug("correction failed", error);
        options.onCorrectionStatus?.("error_original_used");
        finalText = rawText;
      }
    } else {
      options.onCorrectionStatus?.("disabled");
    }

    finalText = cleanCombinedTranscript(finalText, "");
    options.onFinalTranscript(finalText, correction);

    if (!options.getConfig().autoSend) {
      debug("auto-send disabled; transcript ready for manual review");
      transition("waiting_for_speech");
      return;
    }

    if (correction && (correction.confidence === "low" || correction.needsUserReview)) {
      debug("low confidence; leaving transcript for manual review");
      transition("waiting_for_speech");
      options.onError("La transcripcion necesita revision. Corrige el texto y envia manualmente.");
      return;
    }

    const turnId = currentTurn.id;
    const dropReason = shouldDropText(finalText, turnId);
    if (dropReason) {
      debug("drop turn", dropReason, finalText);
      resetTurn(true);
      returnToWaiting(450);
      return;
    }

    currentTurn.sent = true;
    lastProcessedTurnId = turnId;
    lastSentUserText = finalText;
    lastSentUserTextAt = now();
    recentTurnHashes = [normalizeText(finalText).slice(0, 120), ...recentTurnHashes].slice(0, 10);

    transition("sending_to_ai");

    try {
      const response = await options.sendMessage(finalText, {
        source: "conversation",
        turnId,
      });

      const assistantText = response.speakText || response.replyText || "";
      lastAssistantText = assistantText || response.replyText || "";
      options.onAssistantResponse(response.replyText, response.meta);

      if (!active || paused) return;

      transition("speaking");
      await options.speak(assistantText);

      if (!active || paused) return;
      resetTurn(true);
      returnToWaiting();
    } catch (error: any) {
      debug("send/speak failed", error);
      transition("error");
      options.onError(error?.message || "Error en la llamada de voz.");
      resetTurn(true);
      returnToWaiting(900);
    }
  }

  function shouldDropText(text: string, turnId: string) {
    const normalized = normalizeText(text);
    const normalizedLastUser = normalizeText(lastSentUserText);
    const normalizedAssistant = normalizeText(lastAssistantText);

    if (!normalized) return "empty";
    if (currentTurn?.sent) return "turn already sent";
    if (turnId === lastProcessedTurnId) return "turn already processed";

    if (
      normalizedLastUser &&
      now() - lastSentUserTextAt < 9000 &&
      similarity(normalized, normalizedLastUser) > 0.86
    ) {
      return "recent duplicate user text";
    }

    if (normalizedAssistant && similarity(normalized, normalizedAssistant) > 0.62) {
      return "assistant echo";
    }

    const hash = normalized.slice(0, 120);
    if (recentTurnHashes.includes(hash)) return "recent turn hash";

    return "";
  }

  function scheduleSilenceFinish() {
    clearWindowTimer(silenceTimer);
    silenceTimer = window.setTimeout(() => {
      silenceTimer = null;
      if (!active || paused || callState !== "listening" || !currentTurn) return;

      const elapsedSinceTranscript = now() - lastTranscriptAt;
      if (elapsedSinceTranscript < audioProviderConfig.vadSilenceMs - 80) {
        scheduleSilenceFinish();
        return;
      }

      void finishUserTurn("transcript_silence");
    }, Math.max(650, audioProviderConfig.vadSilenceMs));
  }

  function scheduleMaxTurnFinish() {
    if (maxTurnTimer) return;
    maxTurnTimer = window.setTimeout(() => {
      maxTurnTimer = null;
      if (!active || paused || callState !== "listening") return;
      void finishUserTurn("max_turn_timeout");
    }, audioProviderConfig.vadMaxListeningMs);
  }

  function handleTranscriptUpdate(parts?: { finalTranscript: string; interimTranscript: string }) {
    if (!active || paused) return;

    if (["ending_user_turn", "correcting_transcript", "sending_to_ai"].includes(callState)) {
      return;
    }

    const nextText = cleanCombinedTranscript(
      parts?.finalTranscript || currentTurn?.finalTranscript || "",
      parts?.interimTranscript || "",
    );

    if (!nextText) return;

    if (callState === "speaking") {
      if (
        options.getConfig().echoGuardEnabled &&
        similarity(nextText, lastAssistantText) > 0.55
      ) {
        debug("discard assistant echo transcript while speaking");
        return;
      }
      return;
    }

    if (["waiting_for_speech", "interrupted", "cooldown"].includes(callState)) {
      clearWindowTimer(cooldownTimer);
      cooldownTimer = null;
      transition("listening");
    }

    const turn = ensureTurn();
    turn.finalTranscript = parts?.finalTranscript || turn.finalTranscript;
    turn.interimTranscript = parts?.interimTranscript || "";
    turn.combinedTranscript = nextText;
    turn.hasSpeech = true;
    lastTranscriptAt = now();

    options.onTranscriptUpdate(turn.combinedTranscript, turn.combinedTranscript);
    scheduleMaxTurnFinish();
    scheduleSilenceFinish();
  }

  function startRecognition() {
    if (!active || paused || recognitionRunning || recognitionStarting) return;
    if (!canRecognitionRun()) return;

    const elapsed = now() - lastRecognitionStartAt;
    if (elapsed < 220) {
      scheduleRecognitionRestart(240 - elapsed);
      return;
    }

    recognizer = new BrowserSpeechRecognizer({
      language: audioProviderConfig.sttLanguage,
      timeoutMs: 0,
      continuous: true,
      autoRestart: true,
      shouldAutoRestart: () => active && !paused && canRecognitionRun(),
      onTranscript: (_text, _isFinal, parts) => handleTranscriptUpdate(parts),
      onStatusChange: () => undefined,
      onError: (message) => {
        debug("recognition error", message);
        recognitionRunning = false;
        recognitionStarting = false;
        if (!active || paused) return;

        recognitionRestartAttempts += 1;
        if (recognitionRestartAttempts <= 4 && canRecognitionRun()) {
          scheduleRecognitionRestart(350);
          return;
        }

        transition("error");
        options.onError(message);
      },
      onEnd: () => {
        recognitionRunning = false;
        recognitionStarting = false;
        if (active && !paused && shouldRestartRecognition && canRecognitionRun()) {
          scheduleRecognitionRestart(220);
        }
      },
    });

    if (!recognizer.isSupported()) {
      transition("error");
      options.onError("Este navegador no soporta SpeechRecognition. Usa modo manual.");
      return;
    }

    try {
      recognitionStarting = true;
      recognitionRunning = true;
      lastRecognitionStartAt = now();
      recognitionRestartAttempts = 0;
      recognizer.start();
    } catch (error) {
      debug("recognition start failed", error);
      recognitionRunning = false;
      recognitionStarting = false;
      scheduleRecognitionRestart(500);
    }
  }

  function handleVadSpeechStart() {
    if (!active || paused) return;

    if (callState === "speaking") {
      if (!options.getConfig().bargeInEnabled) return;

      if (!bargeInStartedAt) bargeInStartedAt = now();
      if (now() - bargeInStartedAt < options.getConfig().bargeInMinMs) return;

      debug("barge-in detected");
      options.stopSpeaking();
      transition("interrupted");
      resetTurn(true);
      createTurn();
      shouldRestartRecognition = true;
      startRecognition();
      transition("listening");
      return;
    }

    if (callState === "waiting_for_speech") {
      transition("listening");
      ensureTurn();
      shouldRestartRecognition = true;
      startRecognition();
    }
  }

  function handleVadSilence() {
    bargeInStartedAt = 0;
    if (!active || paused) return;
    if (callState !== "listening") return;
    if (!currentTurn?.combinedTranscript) return;

    // Give SpeechRecognition a small grace window to flush the latest final result.
    window.setTimeout(() => {
      if (active && !paused && callState === "listening") {
        void finishUserTurn("vad_silence");
      }
    }, 220);
  }

  function startVad() {
    if (!options.getConfig().vadEnabled) {
      debug("VAD disabled; using transcript silence only");
      return;
    }

    vad?.stop();
    vad = new VoiceActivityDetector({
      onEvent: (event) => {
        if (event === "speechStart") handleVadSpeechStart();
        if (event === "silenceTimeout") handleVadSilence();
        if (event === "maxListeningTimeout" && callState === "listening") {
          void finishUserTurn("vad_max_timeout");
        }
        if (event === "microphoneError") {
          debug("VAD microphone error; continuing with SpeechRecognition only");
          options.onError("VAD no pudo acceder al microfono. Sigo con reconocimiento del navegador.");
        }
        if (event === "unsupported") {
          debug("VAD unsupported; continuing with SpeechRecognition only");
        }
      },
    });

    void vad.start();
  }

  return {
    startCall() {
      if (active) return;
      active = true;
      paused = false;
      shouldRestartRecognition = true;
      clearControlTimers();
      resetTurn(true);
      transition("starting");
      transition("waiting_for_speech");
      startRecognition();
      startVad();
    },

    stopCall() {
      active = false;
      paused = false;
      shouldRestartRecognition = false;
      clearTurnTimers();
      clearControlTimers();
      options.stopSpeaking();
      stopRecognition();
      vad?.stop();
      vad = null;
      resetTurn(true);
      transition("idle");
    },

    pauseCall() {
      paused = true;
      shouldRestartRecognition = false;
      clearTurnTimers();
      pauseRecognition();
    },

    resumeCall() {
      if (!active) return;
      paused = false;
      shouldRestartRecognition = true;
      transition("waiting_for_speech");
      startRecognition();
    },

    interruptAssistant() {
      if (callState !== "speaking") return;
      options.stopSpeaking();
      transition("interrupted");
      resetTurn(true);
      createTurn();
      shouldRestartRecognition = true;
      startRecognition();
      transition("listening");
    },

    isActive() {
      return active;
    },

    getState() {
      return callState;
    },
  };
}
