import React, { useCallback, useEffect, useRef, useState } from 'react';
import { captureViewport } from './screenshot.js';
import { VoiceRecorder, transcribeWithWhisper } from './voice.js';
import { findElement } from './selectors.js';
import { show as showHighlight, cleanup as cleanupHighlight } from './highlight.js';
import { planGuidance, streamPlanGuidance } from './llm.js';
import { agentMode } from '../agent/index.js';

export function GuiderWidget({
  apiKey,
  mapUrl, map: mapProp,
  model, endpoint, whisperUrl,
  proxyUrl,
  currentRoute,
  accent = '#3080ff',
  agent = true,
  speak = true,
}) {
  const [map, setMap] = useState(mapProp || null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [cursor, setCursor] = useState(() => ({ x: 28, y: 28 }));
  const [statusText, setStatusText] = useState('');
  const recorderRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);
  const speechRef = useRef(null);
  const statusTimerRef = useRef(null);

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

  const runAgent = useCallback(async (plan) => {
    setAgentRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await agentMode.run({
      plan,
      signal: controller.signal,
      showHighlight: true,
      onProgress: ({ phase, index, step, error }) => {
        if (phase === 'completed') {
          announce(`Step ${index + 1}: ${step.title}`, 1800);
        } else if (phase === 'failed') {
          announce(`Stopped: ${error}`, 3200);
        }
      },
    });
    cleanupHighlight();
    setAgentRunning(false);
    if (result.status === 'completed') {
      announce('All done.', 2000);
    }
  }, [announce]);

  const ask = useCallback(async (question) => {
    if (!question?.trim()) return;
    setBusy(true);
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
            if (streamedSteps.length === 1 && !agentEnabled) {
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

      if (agentEnabled) {
        announce(`Running ${plan.steps.length} steps.`, 2200);
        await runAgent(plan);
      } else {
        announce(`${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} ready.`, 1800);
        await highlightStep(plan, 0);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        announce(`Sorry — ${String(error?.message || error)}`, 3600);
      }
    } finally {
      setBusy(false);
    }
  }, [agentEnabled, apiKey, endpoint, highlightStep, map, model, proxyUrl, route, runAgent, announce]);

  const requestTypedQuestion = useCallback(() => {
    if (typeof window === 'undefined') return;
    const response = window.prompt('Ask Guider where anything lives');
    if (response?.trim()) ask(response.trim());
  }, [ask]);

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
      const text = whisperUrl
        ? await transcribeViaProxy(blob, whisperUrl)
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
  }, [apiKey, ask, recording, whisperUrl, announce]);

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
      requestTypedQuestion();
    };

    document.addEventListener('keydown', onGlobalKey);
    return () => document.removeEventListener('keydown', onGlobalKey);
  }, [onMicClick, requestTypedQuestion]);

  const chrome = getCursorChrome(cursor);
  const activeStatus = recording
    ? 'Listening…'
    : busy
      ? 'Thinking…'
      : agentRunning
        ? 'Guiding you…'
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
          requestTypedQuestion();
        }}
        aria-label={recording ? 'Stop Guider voice capture' : 'Start Guider voice capture'}
        aria-pressed={recording}
        title="Click to talk. Right-click or Cmd/Ctrl+K to type. Cmd/Ctrl+Shift+K starts voice."
        style={{
          position: 'fixed',
          left: chrome.cursorLeft,
          top: chrome.cursorTop,
          zIndex: 2147483646,
          width: 22,
          height: 22,
          padding: 0,
          borderRadius: 999,
          border: `1px solid ${hexAlpha(accent, 0.18)}`,
          background: 'rgba(255,255,255,0.94)',
          boxShadow: `0 12px 28px rgba(15,23,42,.14), 0 0 0 8px ${hexAlpha(accent, 0.05)}`,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(18px)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: recording ? 8 : 6,
            height: recording ? 8 : 6,
            borderRadius: 999,
            background: accent,
            boxShadow: recording ? `0 0 0 6px ${hexAlpha(accent, 0.12)}` : 'none',
          }}
        />
      </button>

      {agent && (
        <button
          type="button"
          data-guider="guider-agent-toggle"
          onClick={() => setAgentEnabled((value) => !value)}
          aria-pressed={agentEnabled}
          title={agentEnabled ? 'Auto guide enabled' : 'Auto guide disabled'}
          style={{
            position: 'fixed',
            left: chrome.cursorLeft + 28,
            top: chrome.cursorTop - 2,
            zIndex: 2147483646,
            height: 26,
            padding: '0 10px',
            borderRadius: 999,
            border: '1px solid rgba(17,17,17,0.08)',
            background: agentEnabled ? '#111111' : 'rgba(255,255,255,0.88)',
            color: agentEnabled ? '#ffffff' : '#6b7280',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(18px)',
            cursor: 'pointer',
          }}
        >
          auto
        </button>
      )}

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
  const cursorLeft = clamp(cursor.x - 11, 10, width - 32);
  const cursorTop = clamp(cursor.y - 11, 10, height - 32);
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
