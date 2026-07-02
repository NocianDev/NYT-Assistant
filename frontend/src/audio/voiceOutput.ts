import {
  audioProviderConfig,
  type AudioEngineStatus,
  isTtsEnabled,
} from "./audioProvider";
import {
  speakWithBackendElevenLabs,
  speakWithDirectElevenLabs,
} from "./elevenLabsClient";

type SpeakParams = {
  text: string;
  assistantId?: string;
  clientType?: "mobile" | "desktop";
  onEngineChange?: (engine: AudioEngineStatus) => void;
};

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

function pickSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === audioProviderConfig.ttsLanguage) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ||
    null
  );
}

async function speakWithBrowser(text: string) {
  if (!("speechSynthesis" in window)) {
    throw new Error("speechSynthesis no soportado");
  }

  window.speechSynthesis.cancel();

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = audioProviderConfig.ttsLanguage;
    utterance.voice = pickSpanishVoice();
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Fallo speechSynthesis"));
    window.speechSynthesis.speak(utterance);
  });
}

async function playManagedAudioBlob(blob: Blob) {
  stopCurrentSpeech();

  currentAudioUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(currentAudioUrl);

  try {
    await new Promise<void>((resolve, reject) => {
      if (!currentAudio) {
        reject(new Error("Audio no disponible"));
        return;
      }

      currentAudio.onended = () => resolve();
      currentAudio.onerror = () => reject(new Error("No se pudo reproducir audio"));
      currentAudio.play().catch(reject);
    });
  } finally {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }
    currentAudioUrl = null;
    currentAudio = null;
  }
}

export async function speakText({
  text,
  assistantId,
  clientType,
  onEngineChange,
}: SpeakParams): Promise<AudioEngineStatus> {
  if (!text.trim() || !isTtsEnabled()) {
    onEngineChange?.("Audio desactivado");
    return "Audio desactivado";
  }

  const provider = audioProviderConfig.ttsProvider;
  const canTryElevenLabs = provider === "auto" || provider === "elevenlabs";

  if (canTryElevenLabs) {
    try {
      const blob = audioProviderConfig.elevenLabsApiKey
        ? await speakWithDirectElevenLabs(text)
        : await speakWithBackendElevenLabs({ text, assistantId, clientType });

      onEngineChange?.("ElevenLabs activo");
      await playManagedAudioBlob(blob);
      return "ElevenLabs activo";
    } catch (error) {
      console.warn("ElevenLabs no disponible, usando fallback:", error);
    }
  }

  try {
    await speakWithBrowser(text);
    onEngineChange?.("Fallback de voz del navegador activo");
    return "Fallback de voz del navegador activo";
  } catch (error) {
    console.warn("speechSynthesis no disponible:", error);
    onEngineChange?.("Audio desactivado");
    return "Audio desactivado";
  }
}

export function stopCurrentSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export const stopSpeaking = stopCurrentSpeech;
