import { audioProviderConfig } from "./audioProvider";

export type VadEvent =
  | "speechStart"
  | "speechEnd"
  | "silenceTimeout"
  | "maxListeningTimeout"
  | "microphoneError"
  | "unsupported";

type VoiceActivityDetectorOptions = {
  onEvent: (event: VadEvent) => void;
  silenceMs?: number;
  minSpeechMs?: number;
  maxListeningMs?: number;
  energyThreshold?: number;
};

/**
 * Browser VAD for call mode.
 *
 * Important design decision: this detector stays alive after silence.
 * It does NOT stop the microphone automatically after every phrase. The call
 * controller owns the turn lifecycle. This prevents the old bug where the first
 * turn worked and the next turns got stuck because VAD had stopped itself.
 */
export class VoiceActivityDetector {
  private options: Required<VoiceActivityDetectorOptions>;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private speechCandidateStartedAt = 0;
  private activeSpeechStartedAt = 0;
  private silenceStartAt = 0;
  private isSpeaking = false;
  private stopped = true;

  constructor(options: VoiceActivityDetectorOptions) {
    this.options = {
      onEvent: options.onEvent,
      silenceMs: options.silenceMs || audioProviderConfig.vadSilenceMs,
      minSpeechMs: options.minSpeechMs || audioProviderConfig.vadMinSpeechMs,
      maxListeningMs:
        options.maxListeningMs || audioProviderConfig.vadMaxListeningMs,
      energyThreshold:
        options.energyThreshold || audioProviderConfig.vadEnergyThreshold,
    };
  }

  async start() {
    if (typeof navigator === "undefined") {
      this.options.onEvent("unsupported");
      return;
    }

    const BrowserAudioContext =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!navigator.mediaDevices?.getUserMedia || !BrowserAudioContext) {
      this.options.onEvent("unsupported");
      return;
    }

    this.stop();
    this.stopped = false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new BrowserAudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      this.tick();
    } catch (error) {
      console.error("VAD microphone error:", error);
      this.options.onEvent("microphoneError");
      this.stop();
    }
  }

  stop() {
    this.stopped = true;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // noop
    }

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.analyser = null;

    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.isSpeaking = false;
    this.speechCandidateStartedAt = 0;
    this.activeSpeechStartedAt = 0;
    this.silenceStartAt = 0;
  }

  private resetSpeechWindow() {
    this.isSpeaking = false;
    this.speechCandidateStartedAt = 0;
    this.activeSpeechStartedAt = 0;
    this.silenceStartAt = 0;
  }

  private tick = () => {
    if (this.stopped || !this.analyser) return;

    const now = performance.now();
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (const value of data) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / data.length);
    const hasEnergy = rms >= this.options.energyThreshold;

    if (
      this.isSpeaking &&
      this.activeSpeechStartedAt &&
      now - this.activeSpeechStartedAt > this.options.maxListeningMs
    ) {
      this.options.onEvent("maxListeningTimeout");
      this.resetSpeechWindow();
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    if (hasEnergy) {
      if (!this.speechCandidateStartedAt) {
        this.speechCandidateStartedAt = now;
      }

      this.silenceStartAt = 0;

      if (
        !this.isSpeaking &&
        now - this.speechCandidateStartedAt >= this.options.minSpeechMs
      ) {
        this.isSpeaking = true;
        this.activeSpeechStartedAt = now;
        this.options.onEvent("speechStart");
      }
    } else {
      this.speechCandidateStartedAt = 0;

      if (this.isSpeaking) {
        if (!this.silenceStartAt) {
          this.silenceStartAt = now;
        }

        if (now - this.silenceStartAt >= this.options.silenceMs) {
          this.options.onEvent("speechEnd");
          this.options.onEvent("silenceTimeout");
          this.resetSpeechWindow();
        }
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
