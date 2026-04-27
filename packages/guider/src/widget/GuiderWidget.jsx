import React, { useEffect, useRef, useState, useCallback } from 'react';
import { captureViewport } from './screenshot.js';
import { VoiceRecorder, transcribeWithWhisper } from './voice.js';
import { findElement } from './selectors.js';
import { show as showHighlight, cleanup as cleanupHighlight } from './highlight.js';
import { planGuidance, streamPlanGuidance } from './llm.js';
import { agentMode } from '../agent/index.js';

/**
 * <GuiderWidget />
 *
 * Required (one of):
 *   - apiKey + (mapUrl|map)            → direct OpenAI calls (dev / preview)
 *   - proxyUrl + (mapUrl|map)          → all calls go through your server (prod)
 *
 * Optional:
 *   - whisperUrl                       → set if voice goes through your proxy
 *   - model, endpoint                  → override OpenAI model / chat endpoint
 *   - position, accent, currentRoute   → cosmetics
 *   - agent                            → enable Agent Mode toggle (default true)
 *
 * A11y:
 *   - Composer is role=dialog when open.
 *   - Live region announces assistant messages.
 *   - prefers-reduced-motion respected by highlight engine.
 */
export function GuiderWidget({
  apiKey,
  mapUrl, map: mapProp,
  model, endpoint, whisperUrl,
  proxyUrl,
  currentRoute,
  accent = '#3080ff',
  agent = true,
  speak = true,
  greeting = "Ask me where to find something — e.g. \"How do I invite a teammate?\"",
}) {
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState(mapProp || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [cursor, setCursor] = useState(() => ({ x: 28, y: 28 }));
  const recorderRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);
  const speechRef = useRef(null);

  /* --- Map fetch --- */
  useEffect(() => {
    if (mapProp) { setMap(mapProp); return; }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl).then((r) => r.ok ? r.json() : null).then((j) => { if (!cancelled) setMap(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [mapUrl, mapProp]);

  /* --- Cleanup on close --- */
  useEffect(() => {
    if (!open) {
      cleanupHighlight();
      setSteps(null); setStepIdx(0);
      abortRef.current?.abort();
    }
  }, [open]);

  useEffect(() => () => { cleanupHighlight(); abortRef.current?.abort(); }, []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setCursor({ x: e.clientX, y: e.clientY });
      });
    };
    document.addEventListener('mousemove', onMove, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousemove', onMove, true);
    };
  }, []);

  const route = currentRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');

  const announce = useCallback((text) => {
    if (liveRef.current) { liveRef.current.textContent = ''; setTimeout(() => { if (liveRef.current) liveRef.current.textContent = text; }, 30); }
    if (speak) speakText(text, speechRef);
  }, [speak]);

  const highlightStep = useCallback(async (plan, idx) => {
    cleanupHighlight();
    if (!plan?.steps?.[idx]) return;
    const step = plan.steps[idx];
    const found = findElement(step.selectors);
    if (!found) {
      const msg = `I couldn't find the exact element. Look for: ${step.visualHint || step.title}.`;
      setMessages((m) => [...m, { role: 'assistant', text: msg, status: 'visual-only' }]);
      announce(msg);
      return;
    }
    announce([step.title, step.body, step.visualHint ? `Look for ${step.visualHint}.` : ''].filter(Boolean).join(' '));
    await showHighlight({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: idx,
      totalSteps: plan.steps.length,
      accent,
      onNext: () => {
        const next = idx + 1;
        if (next >= plan.steps.length) {
          cleanupHighlight();
          const done = 'Done. Anything else?';
          setMessages((m) => [...m, { role: 'assistant', text: done, status: 'done' }]);
          announce(done);
          setSteps(null);
        } else {
          setStepIdx(next);
          highlightStep(plan, next);
        }
      },
      onSkip: () => {
        cleanupHighlight();
        setSteps(null);
        setMessages((m) => [...m, { role: 'assistant', text: 'Skipped.', status: 'skipped' }]);
      },
    });
  }, [accent, announce]);

  const runAgent = useCallback(async (plan) => {
    setAgentRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const result = await agentMode.run({
      plan,
      signal: ctrl.signal,
      showHighlight: true,
      onProgress: ({ phase, index, step, error }) => {
        if (phase === 'completed') {
          setMessages((m) => [...m, { role: 'assistant', text: `✓ ${step.title}`, status: 'agent-step' }]);
          announce(`Step ${index + 1} done`);
        } else if (phase === 'failed') {
          setMessages((m) => [...m, { role: 'assistant', text: `Stopped: ${error}`, status: 'error' }]);
          announce('Agent stopped');
        }
      },
    });
    cleanupHighlight();
    setAgentRunning(false);
    if (result.status === 'completed') {
      setMessages((m) => [...m, { role: 'assistant', text: 'All done.', status: 'done' }]);
    }
  }, [announce]);

  const ask = useCallback(async (question) => {
    if (!question?.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    setSteps(null);
    setStepIdx(0);
    cleanupHighlight();
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const screenshotDataUrl = await captureViewport();
      let plan;
      if (proxyUrl) {
        plan = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: ctrl.signal,
          onStep: (step) => {
            setSteps((current) => {
              const nextSteps = [...(current?.steps || []), step];
              if (nextSteps.length === 1 && !agentEnabled) {
                highlightStep({ steps: nextSteps }, 0);
              }
              return { steps: nextSteps, confidence: 'streaming' };
            });
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
          signal: ctrl.signal,
        });
      }

      if (plan.confidence === 'low' || !plan.steps?.length) {
        const message = plan.fallbackMessage || "I'm not confident about where to point you. Could you rephrase?";
        setMessages((m) => [...m, { role: 'assistant', text: message, status: 'low-confidence' }]);
        announce(message);
        return;
      }

      setSteps(plan);
      const summary = `${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} ready.`;
      setMessages((m) => [...m, { role: 'assistant', text: summary, status: plan.confidence }]);
      announce(summary);
      if (agentEnabled) await runAgent(plan);
      else await highlightStep(plan, 0);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      const message = `Sorry — ${String(e?.message || e)}`;
      setMessages((m) => [...m, { role: 'assistant', text: message, status: 'error' }]);
      announce(message);
    } finally {
      setBusy(false);
    }
  }, [agentEnabled, apiKey, announce, endpoint, highlightStep, map, model, proxyUrl, route, runAgent]);

  const onMicClick = useCallback(async () => {
    try {
      if (!recording) {
        setOpen(true);
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
      setBusy(false);
      if (text) {
        setInput('');
        ask(text);
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: "I didn't catch that. Try again or type it.", status: 'low-confidence' }]);
      }
    } catch (e) {
      setRecording(false);
      setBusy(false);
      setMessages((m) => [...m, { role: 'assistant', text: `Voice error: ${e.message}. Type instead.`, status: 'error' }]);
    }
  }, [recording, whisperUrl, apiKey, ask]);

  useEffect(() => {
    const onGlobalKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.altKey || e.repeat) return;
      if (e.key.toLowerCase() !== 'k') return;
      e.preventDefault();
      if (e.shiftKey) {
        setOpen(true);
        onMicClick();
        return;
      }
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 30);
    };

    document.addEventListener('keydown', onGlobalKey);
    return () => document.removeEventListener('keydown', onGlobalKey);
  }, [onMicClick]);

  const onSubmit = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput('');
    ask(question);
  };

  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const statusText = busy
    ? 'Thinking…'
    : agentRunning
      ? 'Guiding you…'
      : recording
        ? 'Listening…'
        : latestAssistant?.text || greeting;
  const chrome = getCursorChrome(cursor);

  return (
    <>
      <div
        ref={launcherRef}
        data-guider="guider-cursor"
        style={{
          position: 'fixed',
          left: chrome.cursorLeft,
          top: chrome.cursorTop,
          zIndex: 2147483646,
          pointerEvents: 'none',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            border: `1px solid ${hexAlpha(accent, 0.22)}`,
            background: 'rgba(255,255,255,0.96)',
            boxShadow: `0 10px 24px rgba(15,23,42,.16), 0 0 0 8px ${hexAlpha(accent, 0.06)}`,
            display: 'grid',
            placeItems: 'center',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accent,
            }}
          />
        </div>

        <button
          type="button"
          data-guider="guider-launcher"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close Guider assistant' : 'Open Guider assistant'}
          aria-expanded={open}
          style={{
            position: 'fixed',
            left: chrome.cursorLeft - 10,
            top: chrome.cursorTop - 10,
            width: 38,
            height: 38,
            borderRadius: 999,
            opacity: 0,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        />

        <div ref={liveRef} aria-live="polite" aria-atomic="true" style={{ position: 'absolute', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', width: 1, height: 1, overflow: 'hidden', whiteSpace: 'nowrap' }} />

        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: chrome.bubbleLeft,
            top: chrome.bubbleTop,
            maxWidth: open ? 340 : 240,
            pointerEvents: open ? 'auto' : 'none',
            opacity: open || busy || recording || agentRunning ? 1 : 0.92,
            transition: 'opacity 160ms ease',
          }}
        >
          <form
            id="guider-panel"
            data-guider="guider-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Guider assistant"
            onSubmit={onSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: open ? 8 : '10px 12px',
              minHeight: 52,
              background: 'rgba(255,255,255,0.98)', color: '#111111',
              border: '1px solid rgba(17,17,17,0.08)', borderRadius: 999,
              boxShadow: '0 24px 54px rgba(15,23,42,.14)',
              backdropFilter: 'blur(18px)',
            }}
          >
            {open && agent && (
              <button
                type="button"
                data-guider="guider-agent-toggle"
                onClick={() => setAgentEnabled((v) => !v)}
                aria-pressed={agentEnabled}
                title={agentEnabled ? 'Agent will execute steps' : 'Agent disabled — guided mode'}
                style={{
                  background: agentEnabled ? '#111111' : 'transparent',
                  color: agentEnabled ? '#ffffff' : '#6b7280',
                  border: '1px solid rgba(17,17,17,0.08)',
                  borderRadius: 999, padding: '0 10px', height: 36,
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '.12em', textTransform: 'uppercase', flex: '0 0 auto',
                }}
              >auto</button>
            )}
            {open ? (
              <>
                <button
                  type="button"
                  data-guider="guider-mic"
                  onClick={onMicClick}
                  aria-label={recording ? 'Stop recording' : 'Start voice recording'}
                  aria-pressed={recording}
                  style={{
                    background: recording ? '#111111' : 'transparent',
                    color: recording ? '#ffffff' : '#6b7280',
                    border: '1px solid rgba(17,17,17,0.08)',
                    borderRadius: 999,
                    width: 36,
                    height: 36,
                    cursor: 'pointer',
                    fontSize: 12,
                    flex: '0 0 auto',
                  }}
                >{recording ? 'Stop' : 'Mic'}</button>
                <input
                  ref={inputRef}
                  data-guider="guider-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={recording ? 'Recording…' : 'Ask where anything lives'}
                  disabled={recording || busy || agentRunning}
                  aria-label="Message Guider"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#111111',
                    border: 'none',
                    padding: '0 6px',
                    outline: 'none',
                    fontSize: 14,
                    minWidth: 0,
                  }}
                />
                <button
                  type="submit"
                  data-guider="guider-send"
                  disabled={!input.trim() || busy || agentRunning}
                  style={{
                    background: '#111111',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '0 14px',
                    height: 36,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: (!input.trim() || busy || agentRunning) ? 0.5 : 1,
                  }}
                >Ask</button>
                <button
                  type="button"
                  data-guider="guider-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close Guider"
                  style={{
                    background: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    cursor: 'pointer',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    fontSize: 16,
                    flex: '0 0 auto',
                  }}
                >×</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  margin: 0,
                  color: '#111111',
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {statusText}
              </button>
            )}
          </form>
        </div>
      </div>
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
  const cursorLeft = clamp(cursor.x - 9, 10, width - 28);
  const cursorTop = clamp(cursor.y - 9, 10, height - 28);
  const bubbleLeft = clamp(cursor.x + 22, 12, width - 352);
  const bubbleTop = clamp(cursor.y + 18, 12, height - 84);
  return { cursorLeft, cursorTop, bubbleLeft, bubbleTop };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
