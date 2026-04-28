import { useCallback, useEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react';
import { captureViewport } from './screenshot.js';
import { VoiceRecorder, transcribeWithWhisper, type VoiceCaptureResult, type VoiceStopReason } from './voice';
import { findElement } from './selectors.js';
import { cleanup as cleanupHighlight, show as showHighlight } from './highlight.js';
import { planGuidance, streamPlanGuidance } from './llm.js';

type MapData = Record<string, unknown> | null;

type GuidanceSelector =
  | string
  | {
      kind?: string;
      value?: string;
      role?: string;
      name?: string;
      tag?: string;
    };

type GuidanceStep = {
  title: string;
  body?: string;
  visualHint?: string;
  selectors?: GuidanceSelector[];
  expectedRoute?: string | null;
};

type GuidancePlan = {
  steps: GuidanceStep[];
  confidence?: 'high' | 'medium' | 'low';
  fallbackMessage?: string | null;
};

type WidgetPhase = 'idle' | 'listening' | 'transcribing' | 'guiding';

export interface GuiderWidgetProps {
  apiKey?: string;
  mapUrl?: string;
  map?: MapData;
  model?: string;
  endpoint?: string;
  whisperUrl?: string;
  proxyUrl?: string;
  currentRoute?: string;
  accent?: string;
  speak?: boolean;
}

export function GuiderWidget({
  apiKey,
  mapUrl,
  map: mapProp,
  model,
  endpoint,
  whisperUrl,
  proxyUrl,
  currentRoute,
  accent = '#3080ff',
  speak = true,
}: GuiderWidgetProps) {
  const [map, setMap] = useState<MapData>(mapProp || null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<WidgetPhase>('idle');
  const [statusText, setStatusText] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeValue, setComposeValue] = useState('');
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const composeInputRef = useRef<HTMLInputElement | null>(null);
  const finishingVoiceRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (mapProp) {
      setMap(mapProp);
      return;
    }
    if (!mapUrl) return;

    let cancelled = false;
    fetch(mapUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!cancelled) {
          setMap(json as MapData);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mapProp, mapUrl]);

  const clearVoiceSession = useCallback(() => {
    recorderRef.current = null;
    finishingVoiceRef.current = null;
  }, []);

  useEffect(() => () => {
    cleanupHighlight();
    abortRef.current?.abort();
    void recorderRef.current?.stop('manual');
    stopSpeaking();
    clearStatus(statusTimerRef);
  }, []);

  const route = currentRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const resolvedWhisperUrl = whisperUrl || inferWhisperUrl(proxyUrl);

  const announce = useCallback((text: string, duration = 2400, shouldSpeak = speak) => {
    if (liveRef.current) {
      liveRef.current.textContent = '';
      window.setTimeout(() => {
        if (liveRef.current) {
          liveRef.current.textContent = text;
        }
      }, 30);
    }
    if (shouldSpeak) {
      speakText(text, speechRef);
    }
    flashStatus(text, duration, setStatusText, statusTimerRef);
  }, [speak]);

  const highlightStep = useCallback(async (plan: GuidancePlan, index: number) => {
    cleanupHighlight();
    const step = plan.steps[index];
    if (!step) return;

    const found = findElement(step.selectors);
    if (!found) {
      announce(`I couldn't verify that on this screen. Look for ${step.visualHint || step.title}.`, 3200);
      return;
    }

    announce(
      [step.title, step.body, step.visualHint ? `Look for ${step.visualHint}.` : '']
        .filter(Boolean)
        .join(' '),
      3200,
    );

    await showHighlight({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: index,
      totalSteps: plan.steps.length,
      accent,
      onNext: () => {
        const nextIndex = index + 1;
        if (nextIndex >= plan.steps.length) {
          cleanupHighlight();
          announce('Done.', 1800);
          return;
        }
        void highlightStep(plan, nextIndex);
      },
      onSkip: () => {
        cleanupHighlight();
        announce('Skipped.', 1600);
      },
    });
  }, [accent, announce]);

  const ask = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setBusy(true);
    setPhase('guiding');
    setComposeOpen(false);
    setComposeValue('');
    cleanupHighlight();
    abortRef.current?.abort();
    stopSpeaking();
    announce('Working on it.', 1200);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const screenshotDataUrl = await captureViewport();
      let plan: GuidancePlan;

      if (proxyUrl) {
        const streamedSteps: GuidanceStep[] = [];
        plan = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: controller.signal,
          onStep: (step: GuidanceStep) => {
            streamedSteps.push(step);
            if (streamedSteps.length === 1) {
              void highlightStep({ steps: streamedSteps }, 0);
            }
          },
        }) as GuidancePlan;
      } else {
        plan = await planGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          apiKey,
          model,
          endpoint,
          signal: controller.signal,
        }) as GuidancePlan;
      }

      if (plan.confidence === 'low' || !plan.steps?.length) {
        announce(plan.fallbackMessage || "I'm not confident about where to point you.", 3200);
        return;
      }

      await highlightStep(plan, 0);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        announce(`Sorry — ${String(error instanceof Error ? error.message : error)}`, 3600);
      }
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }, [apiKey, endpoint, highlightStep, map, model, proxyUrl, route, announce]);

  const finishVoiceCapture = useCallback((reason: VoiceStopReason) => {
    if (finishingVoiceRef.current) {
      return finishingVoiceRef.current;
    }

    const recorder = recorderRef.current;
    if (!recorder) {
      return Promise.resolve();
    }

    recorderRef.current = null;
    setPhase('transcribing');

    const task = (async () => {
      try {
        const capture = await recorder.stop(reason);
        if (!capture || shouldRejectCapture(capture)) {
          const message = capture?.stopReason === 'no-speech'
            ? "I didn't hear anything. Try again."
            : "I didn't catch that clearly. Try again.";
          announce(message, 2200);
          return;
        }

        const text = resolvedWhisperUrl
          ? await transcribeViaProxy(capture.blob, resolvedWhisperUrl)
          : await transcribeWithWhisper(capture.blob, apiKey);
        const question = sanitizeTranscript(text);
        if (!question) {
          announce("I didn't catch that.", 2200);
          return;
        }

        await ask(question);
      } catch (error) {
        announce(`Voice error: ${String(error instanceof Error ? error.message : error)}.`, 3200);
      } finally {
        clearVoiceSession();
        if (!busy) {
          setPhase('idle');
        }
      }
    })();

    finishingVoiceRef.current = task;
    return task;
  }, [announce, apiKey, ask, busy, clearVoiceSession, resolvedWhisperUrl]);

  const onMicClick = useCallback(async () => {
    try {
      if (phase === 'listening') {
        await finishVoiceCapture('manual');
        return;
      }

      cleanupHighlight();
      abortRef.current?.abort();
      stopSpeaking();
      const recorder = new VoiceRecorder({
        onAutoStop: (reason) => {
          void finishVoiceCapture(reason);
        },
      });
      await recorder.start();
      recorderRef.current = recorder;
      setPhase('listening');
      clearStatus(statusTimerRef);
      setStatusText('Listening…');
    } catch (error) {
      clearVoiceSession();
      setPhase('idle');
      announce(`Voice error: ${String(error instanceof Error ? error.message : error)}.`, 3200);
    }
  }, [announce, clearVoiceSession, finishVoiceCapture, phase]);

  const openComposer = useCallback((initialValue = '') => {
    setComposeValue(initialValue);
    setComposeOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposeOpen(false);
    setComposeValue('');
  }, []);

  useEffect(() => {
    if (!composeOpen) return undefined;
    const timer = window.setTimeout(() => composeInputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [composeOpen]);

  useEffect(() => {
    const onGlobalKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() !== 'k') return;

      event.preventDefault();
      if (event.shiftKey) {
        void onMicClick();
        return;
      }
      openComposer();
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeComposer();
      }
    };

    document.addEventListener('keydown', onGlobalKey);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', onGlobalKey);
      document.removeEventListener('keydown', onEscape);
    };
  }, [closeComposer, onMicClick, openComposer]);

  const onComposeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = composeValue.trim();
    if (!question) return;
    void ask(question);
  };

  const activeStatus = phase === 'listening'
    ? 'Listening…'
    : phase === 'transcribing'
      ? 'Transcribing…'
      : phase === 'guiding' || busy
        ? 'Working…'
        : statusText;

  return (
    <>
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          width: 1,
          height: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      />

      <button
        type="button"
        data-guider="guider-launcher"
        onClick={() => {
          void onMicClick();
        }}
        aria-label={phase === 'listening' ? 'Stop Guider voice capture' : 'Start Guider voice capture'}
        aria-pressed={phase === 'listening'}
        title="Click to talk. Press Cmd/Ctrl+K to type. Press Cmd/Ctrl+Shift+K for voice."
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 2147483646,
          width: 18,
          height: 18,
          padding: 0,
          border: 'none',
          borderRadius: 999,
          background: phase === 'listening' ? accent : 'rgba(17,17,17,0.92)',
          boxShadow: phase === 'listening'
            ? `0 0 0 8px ${hexAlpha(accent, 0.18)}, 0 14px 36px ${hexAlpha(accent, 0.24)}`
            : '0 14px 36px rgba(15,23,42,0.18)',
          cursor: 'pointer',
          transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.96)',
            opacity: phase === 'listening' ? 0.98 : 0.82,
          }}
        />
      </button>

      {activeStatus && (
        <div
          data-guider="guider-status"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 50,
            zIndex: 2147483646,
            maxWidth: 220,
            padding: '8px 11px',
            borderRadius: 999,
            border: '1px solid rgba(17,17,17,0.08)',
            background: 'rgba(255,255,255,0.92)',
            color: '#111111',
            fontSize: 12,
            lineHeight: 1.3,
            boxShadow: '0 20px 44px rgba(15,23,42,.12)',
            backdropFilter: 'blur(18px)',
            pointerEvents: 'none',
          }}
        >
          {activeStatus}
        </div>
      )}

      {composeOpen && (
        <div
          data-guider="guider-compose-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeComposer();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483645,
            background: 'rgba(15,23,42,0.12)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <form
            data-guider="guider-compose-modal"
            onSubmit={onComposeSubmit}
            style={{
              width: 'min(460px, calc(100vw - 28px))',
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(15,23,42,0.08)',
              borderRadius: 20,
              boxShadow: '0 24px 70px rgba(15,23,42,0.14)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#64748b' }}>
                Guider
              </div>
              <button
                type="button"
                onClick={closeComposer}
                aria-label="Close prompt"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(248,250,252,0.9)',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <input
              ref={composeInputRef}
              value={composeValue}
              onChange={(event) => setComposeValue(event.target.value)}
              placeholder="Ask a question about this page"
              style={{
                width: '100%',
                borderRadius: 14,
                border: `1px solid ${hexAlpha(accent, 0.14)}`,
                background: 'rgba(248,250,252,0.94)',
                color: '#0f172a',
                padding: '14px 15px',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Cmd/Ctrl+K to open. Shift+Cmd/Ctrl+K for voice.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={closeComposer}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(15,23,42,0.08)',
                    background: 'rgba(255,255,255,0.88)',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!composeValue.trim() || busy}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#111111',
                    color: '#ffffff',
                    cursor: composeValue.trim() && !busy ? 'pointer' : 'default',
                    fontWeight: 700,
                    opacity: composeValue.trim() && !busy ? 1 : 0.5,
                    boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
                  }}
                >
                  Ask
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

async function transcribeViaProxy(blob: Blob, url: string) {
  const formData = new FormData();
  const extension = (blob.type.split('/')[1] || 'webm').split(';')[0];
  formData.append('file', blob, `voice.${extension}`);
  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Whisper proxy failed (${response.status})`);
  const data = (await response.json()) as { text?: string };
  return data.text || '';
}

function shouldRejectCapture(capture: VoiceCaptureResult) {
  return !capture.hadSpeech || capture.durationMs < 500 || capture.peakLevel < 0.012;
}

function sanitizeTranscript(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  if (/^(um+|uh+|mm+|hmm+|ah+|er+)$/i.test(lower)) return '';
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 1 && cleaned.length < 4) return '';
  return cleaned;
}

function hexAlpha(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{3,8})$/i.exec(hex || '');
  if (!match) return `rgba(48,128,255,${alpha})`;
  let value = match[1];
  if (value.length === 3) {
    value = value.split('').map((part) => part + part).join('');
  }
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function speakText(text: string, speechRef: MutableRefObject<SpeechSynthesisUtterance | null>) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechRef.current = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

function flashStatus(
  text: string,
  duration: number,
  setStatusText: (text: string) => void,
  timerRef: MutableRefObject<number | null>,
) {
  setStatusText(text || '');
  clearStatus(timerRef);
  if (!text || !duration) return;
  timerRef.current = window.setTimeout(() => {
    setStatusText('');
    timerRef.current = null;
  }, duration);
}

function clearStatus(timerRef: MutableRefObject<number | null>) {
  if (!timerRef.current) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}

function inferWhisperUrl(proxyUrl?: string) {
  if (!proxyUrl) return undefined;
  return proxyUrl.replace(/\/api\/guider\/plan(?:\?.*)?$/, '/api/guider/transcribe');
}