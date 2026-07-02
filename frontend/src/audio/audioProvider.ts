export type VoiceInputStatus =
  | "ready"
  | "waiting_for_speech"
  | "listening"
  | "processing"
  | "sending"
  | "transcript_ready"
  | "speaking"
  | "interrupted"
  | "mic-error"
  | "unsupported"
  | "disabled";

export type VoiceMode = "manual" | "conversation";

export type TtsStatus = "elevenlabs" | "browser" | "text_only" | "disabled";

export type AudioEngineStatus =
  | "ElevenLabs activo"
  | "Fallback de voz del navegador activo"
  | "Audio desactivado";

export const audioProviderConfig = {
  audioProvider: import.meta.env.VITE_AUDIO_PROVIDER || "auto",
  sttProvider: import.meta.env.VITE_STT_PROVIDER || "browser",
  ttsProvider: import.meta.env.VITE_TTS_PROVIDER || "auto",
  sttLanguage: import.meta.env.VITE_STT_LANGUAGE || "es-MX",
  ttsLanguage: import.meta.env.VITE_TTS_LANGUAGE || "es-MX",
  sttTimeoutMs: Number(import.meta.env.VITE_STT_TIMEOUT_MS || 12000),
  clientId:
    import.meta.env.VITE_CLIENT_ID ||
    import.meta.env.VITE_TENANT_ID ||
    "nyt-general",
  enableTranscriptCorrection:
    import.meta.env.VITE_ENABLE_TRANSCRIPT_CORRECTION !== "false",
  transcriptCorrectionTimeoutMs: Number(
    import.meta.env.VITE_TRANSCRIPT_CORRECTION_TIMEOUT_MS || 4000,
  ),
  voiceConversationMode:
    import.meta.env.VITE_VOICE_CONVERSATION_MODE === "true",
  vadEnabled: import.meta.env.VITE_VAD_ENABLED !== "false",
  vadSilenceMs: Number(import.meta.env.VITE_VAD_SILENCE_MS || 1400),
  vadMinSpeechMs: Number(import.meta.env.VITE_VAD_MIN_SPEECH_MS || 400),
  vadMaxListeningMs: Number(import.meta.env.VITE_VAD_MAX_LISTENING_MS || 15000),
  vadEnergyThreshold: Number(import.meta.env.VITE_VAD_ENERGY_THRESHOLD || 0.025),
  interruptAssistantOnSpeech:
    import.meta.env.VITE_INTERRUPT_ASSISTANT_ON_SPEECH !== "false",
  autoSendAfterSilence:
    import.meta.env.VITE_AUTO_SEND_AFTER_SILENCE === "true",
  echoGuardEnabled: import.meta.env.VITE_ECHO_GUARD_ENABLED !== "false",
  bargeInEnabled: import.meta.env.VITE_BARGE_IN_ENABLED !== "false",
  bargeInMinMs: Number(import.meta.env.VITE_BARGE_IN_MIN_MS || 450),
  postTtsCooldownMs: Number(import.meta.env.VITE_POST_TTS_COOLDOWN_MS || 700),
  callDebug: import.meta.env.VITE_CALL_DEBUG === "true",
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || "",
  elevenLabsVoiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || "",
  apiUrl:
    import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000",
  tenantId: import.meta.env.VITE_TENANT_ID || "",
};

export function isBrowserSttEnabled() {
  return audioProviderConfig.sttProvider === "browser";
}

export function isTtsEnabled() {
  return audioProviderConfig.ttsProvider !== "off";
}
