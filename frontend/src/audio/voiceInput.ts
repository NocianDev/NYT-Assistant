import {
  audioProviderConfig,
  isBrowserSttEnabled,
  type VoiceInputStatus,
} from "./audioProvider";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionLike = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type BrowserSpeechRecognizerOptions = {
  language?: string;
  timeoutMs?: number;
  continuous?: boolean;
  autoRestart?: boolean;
  shouldAutoRestart?: () => boolean;
  onTranscript: (
    text: string,
    isFinal: boolean,
    parts?: { finalTranscript: string; interimTranscript: string },
  ) => void;
  onStatusChange?: (status: VoiceInputStatus) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

export function getSpeechRecognitionSupport() {
  if (!isBrowserSttEnabled() || typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export class BrowserSpeechRecognizer {
  private recognition: SpeechRecognitionLike | null = null;
  private timeoutId: number | null = null;
  private manuallyStopped = false;
  private isRunning = false;
  private options: Required<
    Pick<
      BrowserSpeechRecognizerOptions,
      "language" | "timeoutMs" | "continuous" | "autoRestart"
    >
  > &
    Omit<
      BrowserSpeechRecognizerOptions,
      "language" | "timeoutMs" | "continuous" | "autoRestart"
    >;

  constructor(options: BrowserSpeechRecognizerOptions) {
    this.options = {
      language: options.language || audioProviderConfig.sttLanguage || "es-MX",
      timeoutMs: options.timeoutMs || audioProviderConfig.sttTimeoutMs,
      continuous: options.continuous || false,
      autoRestart: options.autoRestart || false,
      shouldAutoRestart: options.shouldAutoRestart,
      onTranscript: options.onTranscript,
      onStatusChange: options.onStatusChange,
      onError: options.onError,
      onEnd: options.onEnd,
    };
  }

  isSupported() {
    return Boolean(getSpeechRecognitionSupport());
  }

  start() {
    if (this.isRunning) return;

    const Recognition = getSpeechRecognitionSupport();

    if (!Recognition) {
      this.options.onStatusChange?.("unsupported");
      this.options.onError?.("Reconocimiento de voz no soportado");
      return;
    }

    this.stop();
    this.manuallyStopped = false;

    const recognition = new Recognition();
    recognition.lang = this.options.language || "es-MX";
    recognition.continuous = this.options.continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.isRunning = true;
      this.options.onStatusChange?.("listening");
      if (this.options.timeoutMs > 0) {
        this.timeoutId = window.setTimeout(() => {
          this.options.onStatusChange?.("processing");
          this.stop();
        }, this.options.timeoutMs);
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      let finalAll = "";
      let interimAll = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalAll += `${result[0].transcript} `;
          if (i >= event.resultIndex) {
            finalText += `${result[0].transcript} `;
          }
        } else {
          interimAll += `${result[0].transcript} `;
          if (i >= event.resultIndex) {
            interim += `${result[0].transcript} `;
          }
        }
      }

      const text = `${finalAll} ${interimAll}`.replace(/\s+/g, " ").trim();
      if (text) {
        this.options.onTranscript(text, Boolean(finalText.trim()), {
          finalTranscript: finalAll.replace(/\s+/g, " ").trim(),
          interimTranscript: interimAll.replace(/\s+/g, " ").trim(),
        });
      }

      if (finalText) {
        this.options.onStatusChange?.("processing");
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event.error || "unknown";
      const isMicError =
        errorCode === "not-allowed" ||
        errorCode === "service-not-allowed" ||
        errorCode === "audio-capture";

      const isRecoverable =
        errorCode === "no-speech" ||
        errorCode === "aborted" ||
        errorCode === "network";

      // In conversation mode Chrome often emits transient no-speech/network
      // errors while the recognizer is being restarted. Treat them as
      // recoverable so the call controller does not get stuck in an error loop.
      if (isRecoverable && this.options.autoRestart) {
        this.options.onStatusChange?.("waiting_for_speech");
        return;
      }

      this.options.onStatusChange?.(isMicError ? "mic-error" : "ready");
      this.options.onError?.(
        isMicError
          ? "Error de microfono. Revisa permisos o dispositivo."
          : `No se pudo completar el reconocimiento de voz (${errorCode}).`,
      );
    };

    recognition.onend = () => {
      this.isRunning = false;
      this.clearTimeout();
      this.options.onEnd?.();

      if (
        !this.manuallyStopped &&
        this.options.autoRestart &&
        this.options.shouldAutoRestart?.()
      ) {
        window.setTimeout(() => this.start(), 180);
        return;
      }

      if (!this.manuallyStopped) {
        this.options.onStatusChange?.("ready");
      }
    };

    this.recognition = recognition;

    try {
      recognition.start();
    } catch {
      recognition.lang = "es-ES";
      recognition.start();
    }
  }

  stop() {
    this.manuallyStopped = true;
    this.clearTimeout();

    if (!this.recognition) return;

    try {
      this.recognition.stop();
    } catch {
      try {
        this.recognition.abort();
      } catch {
        // noop
      }
    }

    this.recognition = null;
    this.isRunning = false;
    this.options.onStatusChange?.("ready");
  }

  abort() {
    this.manuallyStopped = true;
    this.clearTimeout();

    if (!this.recognition) return;

    try {
      this.recognition.abort();
    } catch {
      // noop
    }

    this.recognition = null;
    this.isRunning = false;
    this.options.onStatusChange?.("ready");
  }

  private clearTimeout() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
