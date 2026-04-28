import React, { useCallback, useEffect, useRef, useState } from 'react';
import { captureViewport } from './screenshot.js';
import { VoiceRecorder, transcribeWithWhisper } from './voice.js';
import { findElement } from './selectors.js';
import { show as showHighlight, cleanup as cleanupHighlight } from './highlight.js';
import { planGuidance, streamPlanGuidance } from './llm.js';

export function GuiderWidget({
  apiKey,
  mapUrl, map: mapProp,
  model, endpoint, whisperUrl,
  proxyUrl,
  currentRoute,
  accent = '#3080ff',
  speak = true,
}) {
  const [map, setMap] = useState(mapProp || null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cursor, setCursor] = useState(() => ({ x: 28, y: 28 }));
  const [statusText, setStatusText] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeValue, setComposeValue] = useState('');
  const recorderRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);
  const speechRef = useRef(null);
  const statusTimerRef = useRef(null);
  const composeInputRef = useRef(null);

  useEffect(() => {
    if (mapProp) { setMap(mapProp); return; }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => { if (!cancelled) setMap(json); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mapProp, mapUrl]);

  useEffect(() => () => {
    cleanupHighlight();
    abortRef.current?.abort();
    stopSpeaking();
    clearStatus(statusTimerRef);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setCursor({ x: event.clientX, y: event.clientY });
      });
    };
    document.addEventListener('mousemove', onMove, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousemove', onMove, true);
    };
  }, []);

  const route = currentRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const resolvedWhisperUrl = whisperUrl || inferWhisperUrl(proxyUrl);

  const announce = useCallback((text, duration = 2400) => {
    if (liveRef.current) {
      liveRef.current.textContent = '';
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = text;
      }, 30);
    }
    if (speak) speakText(text, speechRef);
    flashStatus(text, duration, setStatusText, statusTimerRef);
  }, [speak]);

  const highlightStep = useCallback(async (plan, index) => {
    cleanupHighlight();
    const step = plan?.steps?.[index];
    if (!step) return;
    const found = findElement(step.selectors);
    if (!found) {
      announce(`I couldn't find it. Look for ${step.visualHint || step.title}.`, 3200);
      return;
    }

    announce([step.title, step.body, step.visualHint ? `Look for ${step.visualHint}.` : ''].filter(Boolean).join(' '), 3200);
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
        highlightStep(plan, nextIndex);
      },
      onSkip: () => {
        cleanupHighlight();
        announce('Skipped.', 1600);
      },
    });
  }, [accent, announce]);

  const ask = useCallback(async (question) => {
    if (!question?.trim()) return;
    setBusy(true);
    setComposeOpen(false);
    setComposeValue('');
    cleanupHighlight();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const screenshotDataUrl = await captureViewport();
      let plan;
      if (proxyUrl) {
        const streamedSteps = [];
        plan = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: controller.signal,
          onStep: (step) => {
            streamedSteps.push(step);
            if (streamedSteps.length === 1) {
              highlightStep({ steps: streamedSteps }, 0);
            }
          },
        });
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
        });
      }

      if (plan.confidence === 'low' || !plan.steps?.length) {
        announce(plan.fallbackMessage || "I'm not confident about where to point you.", 3200);
        return;
      }

      announce(`${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} ready.`, 1800);
      await highlightStep(plan, 0);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        announce(`Sorry — ${String(error?.message || error)}`, 3600);
      }
    } finally {
      setBusy(false);
    }
  }, [apiKey, endpoint, highlightStep, map, model, proxyUrl, route, announce]);

  const openComposer = useCallback((initialValue = '') => {
    setComposeValue(initialValue);
    setComposeOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposeOpen(false);
    setComposeValue('');
  }, []);

  const onMicClick = useCallback(async () => {
    try {
      if (!recording) {
        const recorder = new VoiceRecorder();
        await recorder.start();
        recorderRef.current = recorder;
        setRecording(true);
        return;
      }

      const recorder = recorderRef.current;
      recorderRef.current = null;
      setRecording(false);
      setBusy(true);
      const blob = await recorder.stop();
      const text = resolvedWhisperUrl
        ? await transcribeViaProxy(blob, resolvedWhisperUrl)
        : await transcribeWithWhisper(blob, apiKey);

      if (text?.trim()) {
        await ask(text.trim());
      } else {
        announce("I didn't catch that.", 2200);
      }
    } catch (error) {
      setRecording(false);
      announce(`Voice error: ${error.message}.`, 3200);
    } finally {
      setBusy(false);
    }
  }, [apiKey, ask, recording, resolvedWhisperUrl, announce]);

  useEffect(() => {
    if (!composeOpen) return undefined;
    const timer = setTimeout(() => composeInputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [composeOpen]);

  useEffect(() => {
    const onGlobalKey = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) {
        return;
      }
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (event.shiftKey) {
        onMicClick();
        return;
      }
      openComposer();
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') closeComposer();
    };

    document.addEventListener('keydown', onGlobalKey);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', onGlobalKey);
      document.removeEventListener('keydown', onEscape);
    };
  }, [closeComposer, onMicClick, openComposer]);

  const onComposeSubmit = (event) => {
    event.preventDefault();
    const question = composeValue.trim();
    if (!question) return;
    ask(question);
  };

  const chrome = getCursorChrome(cursor);
  const activeStatus = recording
    ? 'Listening…'
    : busy
      ? 'Thinking…'
      : statusText;

  return (
    <>
      <div ref={liveRef} aria-live="polite" aria-atomic="true" style={{ position: 'absolute', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', width: 1, height: 1, overflow: 'hidden', whiteSpace: 'nowrap' }} />

      <button
        type="button"
        data-guider="guider-launcher"
        onClick={onMicClick}
        onContextMenu={(event) => {
          event.preventDefault();
          openComposer();
        }}
        aria-label={recording ? 'Stop Guider voice capture' : 'Start Guider voice capture'}
        aria-pressed={recording}
        title="Click to talk. Right-click or Cmd/Ctrl+K to type. Cmd/Ctrl+Shift+K starts voice."
        style={{
          position: 'fixed',
          left: chrome.cursorLeft,
          top: chrome.cursorTop,
          zIndex: 2147483646,
          width: 28,
          height: 36,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(0 0, 70% 55%, 46% 61%, 61% 100%, 47% 100%, 33% 66%, 0 0)',
            background: `linear-gradient(180deg, ${hexAlpha('#dff3ff', 0.98)} 0%, ${hexAlpha('#83d0ff', 0.98)} 42%, ${hexAlpha(accent, 0.98)} 100%)`,
            filter: `drop-shadow(0 12px 26px ${hexAlpha(accent, 0.24)})`,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.9)',
            opacity: recording ? 1 : 0.76,
            boxShadow: recording ? `0 0 0 8px ${hexAlpha(accent, 0.12)}` : 'none',
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
            left: chrome.statusLeft,
            top: chrome.statusTop,
            zIndex: 2147483646,
            maxWidth: 220,
            padding: '9px 12px',
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
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.16), rgba(15,23,42,0.28))',
            backdropFilter: 'blur(12px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <form
            data-guider="guider-compose-modal"
            onSubmit={onComposeSubmit}
            style={{
              width: 'min(520px, calc(100vw - 32px))',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,251,255,0.96))',
              border: `1px solid ${hexAlpha(accent, 0.14)}`,
              borderRadius: 28,
              boxShadow: `0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px ${hexAlpha('#ffffff', 0.5)} inset`,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                  Guider
                </div>
                <div style={{ fontSize: 22, lineHeight: 1.1, color: '#0f172a', fontWeight: 600 }}>
                  Ask where something lives
                </div>
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
                  background: 'rgba(255,255,255,0.74)',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <textarea
              ref={composeInputRef}
              value={composeValue}
              onChange={(event) => setComposeValue(event.target.value)}
              placeholder="Invite a teammate. Open API keys. Show me billing."
              rows={4}
              style={{
                width: '100%',
                resize: 'none',
                borderRadius: 20,
                border: `1px solid ${hexAlpha(accent, 0.16)}`,
                background: 'rgba(255,255,255,0.92)',
                color: '#0f172a',
                padding: '16px 18px',
                fontSize: 15,
                lineHeight: 1.5,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Press Enter to ask or click the blue cursor to use voice.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={closeComposer}
                  style={{
                    height: 40,
                    padding: '0 16px',
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
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: `linear-gradient(135deg, ${hexAlpha('#9ad9ff', 1)} 0%, ${hexAlpha(accent, 1)} 100%)`,
                    color: '#072033',
                    cursor: composeValue.trim() && !busy ? 'pointer' : 'default',
                    fontWeight: 700,
                    opacity: composeValue.trim() && !busy ? 1 : 0.5,
                    boxShadow: `0 18px 32px ${hexAlpha(accent, 0.22)}`,
                  }}
                >
                  Ask Guider
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

async function transcribeViaProxy(blob, url) {
  const fd = new FormData();
  fd.append('file', blob, 'voice.webm');
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`Whisper proxy failed (${res.status})`);
  const data = await res.json();
  return data.text || '';
}

function hexAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex || '');
  if (!m) return `rgba(48,128,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function speakText(text, speechRef) {
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

function getCursorChrome(cursor) {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const height = typeof window === 'undefined' ? 720 : window.innerHeight;
  const cursorLeft = clamp(cursor.x - 8, 8, width - 40);
  const cursorTop = clamp(cursor.y - 6, 8, height - 48);
  const statusLeft = clamp(cursor.x + 34, 12, width - 232);
  const statusTop = clamp(cursor.y + 22, 12, height - 64);
  return { cursorLeft, cursorTop, statusLeft, statusTop };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function flashStatus(text, duration, setStatusText, timerRef) {
  setStatusText(text || '');
  clearStatus(timerRef);
  if (!text || !duration) return;
  timerRef.current = setTimeout(() => {
    setStatusText('');
    timerRef.current = null;
  }, duration);
}

function clearStatus(timerRef) {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

function inferWhisperUrl(proxyUrl) {
  if (!proxyUrl) return undefined;
  return proxyUrl.replace(/\/api\/guider\/plan(?:\?.*)?$/, '/api/guider/transcribe');
}
