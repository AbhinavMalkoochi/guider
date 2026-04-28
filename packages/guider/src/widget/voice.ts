export type VoiceStopReason = 'manual' | 'silence' | 'max-duration' | 'no-speech';

export interface VoiceRecorderOptions {
  silenceDurationMs?: number;
  noSpeechTimeoutMs?: number;
  maxDurationMs?: number;
  minSpeechLevel?: number;
  sampleIntervalMs?: number;
  timesliceMs?: number;
  onAutoStop?: (reason: VoiceStopReason) => void;
}

export interface VoiceCaptureResult {
  blob: Blob;
  durationMs: number;
  hadSpeech: boolean;
  peakLevel: number;
  stopReason: VoiceStopReason;
}

const DEFAULT_OPTIONS: Required<Omit<VoiceRecorderOptions, 'onAutoStop'>> = {
  silenceDurationMs: 1400,
  noSpeechTimeoutMs: 2800,
  maxDurationMs: 12000,
  minSpeechLevel: 0.018,
  sampleIntervalMs: 120,
  timesliceMs: 250,
};

/**
 * Voice input via MediaRecorder with lightweight silence detection.
 * Auto-stops after a pause, rejects no-speech captures, and keeps the capture
 * settings conservative so transcription quality is more stable across browsers.
 */
export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private monitorTimer: number | null = null;
  private startedAt = 0;
  private lastSpeechAt = 0;
  private peakLevel = 0;
  private hadSpeech = false;
  private stopReason: VoiceStopReason = 'manual';
  private stopPromise: Promise<VoiceCaptureResult | null> | null = null;
  private resolveStop: ((result: VoiceCaptureResult | null) => void) | null = null;
  private readonly options: Required<Omit<VoiceRecorderOptions, 'onAutoStop'>> & Pick<VoiceRecorderOptions, 'onAutoStop'>;

  constructor(options: VoiceRecorderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.setupLevelMonitor();

    const mimeType = pickMime();
    this.recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 },
    );
    this.chunks = [];
    this.startedAt = Date.now();
    this.lastSpeechAt = this.startedAt;
    this.peakLevel = 0;
    this.hadSpeech = false;
    this.stopReason = 'manual';

    this.stopPromise = new Promise((resolve) => {
      this.resolveStop = resolve;
    });

    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.recorder.onstop = () => {
      const recorder = this.recorder;
      const blob = new Blob(this.chunks, { type: recorder?.mimeType || 'audio/webm' });
      const result: VoiceCaptureResult = {
        blob,
        durationMs: Math.max(0, Date.now() - this.startedAt),
        hadSpeech: this.hadSpeech,
        peakLevel: this.peakLevel,
        stopReason: this.stopReason,
      };
      this.cleanup();
      this.resolveStop?.(result);
      this.resolveStop = null;
      this.stopPromise = null;
    };

    this.recorder.start(this.options.timesliceMs);
    this.startMonitor();
  }

  async stop(reason: VoiceStopReason = 'manual') {
    if (!this.recorder) return null;
    if (this.recorder.state === 'inactive') {
      return this.stopPromise;
    }
    this.stopReason = reason;
    this.recorder.stop();
    return this.stopPromise;
  }

  private setupLevelMonitor() {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor || !this.stream) return;
    this.audioContext = new AudioContextCtor();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
  }

  private startMonitor() {
    this.monitorTimer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.startedAt;
      const level = this.sampleLevel();

      if (level >= this.options.minSpeechLevel) {
        this.hadSpeech = true;
        this.lastSpeechAt = now;
      }

      if (elapsed >= this.options.maxDurationMs) {
        this.triggerAutoStop('max-duration');
        return;
      }

      if (!this.analyser) return;

      if (!this.hadSpeech && elapsed >= this.options.noSpeechTimeoutMs) {
        this.triggerAutoStop('no-speech');
        return;
      }

      if (this.hadSpeech && now - this.lastSpeechAt >= this.options.silenceDurationMs) {
        this.triggerAutoStop('silence');
      }
    }, this.options.sampleIntervalMs);
  }

  private sampleLevel() {
    if (!this.analyser) return 0;
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    let total = 0;
    for (const value of buffer) {
      total += value * value;
    }
    const rms = Math.sqrt(total / buffer.length);
    this.peakLevel = Math.max(this.peakLevel, rms);
    return rms;
  }

  private triggerAutoStop(reason: VoiceStopReason) {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    this.options.onAutoStop?.(reason);
    void this.stop(reason);
  }

  private cleanup() {
    if (this.monitorTimer !== null) {
      window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.audioContext?.close().catch(() => {});
    this.stream?.getTracks().forEach((track) => track.stop());

    this.source = null;
    this.analyser = null;
    this.audioContext = null;
    this.stream = null;
    this.recorder = null;
  }
}

function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function transcribeWithWhisper(
  blob: Blob,
  apiKey?: string,
  endpoint = 'https://api.openai.com/v1/audio/transcriptions',
) {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key for direct transcription.');
  }

  const formData = new FormData();
  const extension = (blob.type.split('/')[1] || 'webm').split(';')[0];
  formData.append('file', blob, `voice.${extension}`);
  formData.append('model', 'gpt-4o-mini-transcribe');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Transcription failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text || '';
}