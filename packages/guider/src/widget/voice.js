/**
 * Voice input via MediaRecorder + OpenAI Whisper.
 * Falls back gracefully if the browser denies mic access — caller catches and shows text input.
 */
export class VoiceRecorder {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.stream = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error('Microphone not supported in this browser.');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMime();
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  async stop() {
    if (!this.recorder) return null;
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' });
        this.stream?.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        this.stream = null;
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
}

function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return null;
}

export async function transcribeWithWhisper(blob, apiKey, endpoint = 'https://api.openai.com/v1/audio/transcriptions') {
  const fd = new FormData();
  const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
  fd.append('file', blob, `voice.${ext}`);
  fd.append('model', 'whisper-1');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Whisper failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.text || '';
}
