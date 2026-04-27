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
 *   - Panel is role=dialog, focus-trapped, Escape closes.
 *   - Live region announces assistant messages.
 *   - prefers-reduced-motion respected by highlight engine.
 */
export function GuiderWidget({
  apiKey,
  mapUrl, map: mapProp,
  model, endpoint, whisperUrl,
  proxyUrl,
  currentRoute,
  position = 'bottom-right',
  accent = '#f5d042',
  agent = true,
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
  const recorderRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);

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

  /* --- Focus management & keyboard --- */
  useEffect(() => {
    if (!open) { launcherRef.current?.focus(); return; }
    setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* --- Live region announcement --- */
  const announce = useCallback((text) => {
    if (liveRef.current) { liveRef.current.textContent = ''; setTimeout(() => liveRef.current.textContent = text, 30); }
  }, []);

  const route = currentRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');

  /* --- Plan + highlight one step --- */
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
    await showHighlight({
      element: found.el, title: step.title, body: step.body,
      stepIndex: idx, totalSteps: plan.steps.length, accent,
      onNext: () => {
        const next = idx + 1;
        if (next >= plan.steps.length) {
          cleanupHighlight();
          const done = 'Done. Anything else?';
          setMessages((m) => [...m, { role: 'assistant', text: done, status: 'done' }]);
          announce(done); setSteps(null);
        } else {
          setStepIdx(next); highlightStep(plan, next);
        }
      },
      onSkip: () => {
        cleanupHighlight(); setSteps(null);
        setMessages((m) => [...m, { role: 'assistant', text: 'Skipped.', status: 'skipped' }]);
      },
    });
  }, [accent, announce]);

  /* --- Ask flow --- */
  const ask = useCallback(async (question) => {
    if (!question?.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true); setSteps(null); setStepIdx(0); cleanupHighlight();
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const screenshotDataUrl = await captureViewport();
      let plan;
      if (proxyUrl) {
        // Stream from the proxy — first step shows up as soon as it's ready.
        const collected = { steps: [], confidence: 'medium', fallbackMessage: null };
        plan = await streamPlanGuidance({
          question, currentRoute: route, map, screenshotDataUrl,
          proxyUrl, signal: ctrl.signal,
          onStep: (s) => {
            collected.steps.push(s);
            // Highlight as soon as we have step 0
            if (collected.steps.length === 1 && !agentEnabled) {
              setSteps({ steps: collected.steps, confidence: 'streaming' });
              highlightStep({ steps: collected.steps }, 0);
            }
          },
        });
      } else {
        plan = await planGuidance({
          question, currentRoute: route, map, screenshotDataUrl,
          apiKey, model, endpoint, signal: ctrl.signal,
        });
      }

      if (plan.confidence === 'low' || !plan.steps?.length) {
        const t = plan.fallbackMessage || "I'm not confident about where to point you. Could you rephrase?";
        setMessages((m) => [...m, { role: 'assistant', text: t, status: 'low-confidence' }]);
        announce(t);
      } else {
        setSteps(plan);
        const summary = `${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} — ${agentEnabled ? 'I will execute them now.' : "I'll walk you through."}`;
        setMessages((m) => [...m, { role: 'assistant', text: summary, status: plan.confidence }]);
        announce(summary);
        if (agentEnabled) await runAgent(plan);
        else await highlightStep(plan, 0);
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      const t = `Sorry — ${String(e.message || e)}`;
      setMessages((m) => [...m, { role: 'assistant', text: t, status: 'error' }]);
      announce(t);
    } finally {
      setBusy(false);
    }
  }, [apiKey, map, model, endpoint, route, proxyUrl, agentEnabled, highlightStep, announce]);

  /* --- Agent execution --- */
  const runAgent = useCallback(async (plan) => {
    setAgentRunning(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const result = await agentMode.run({
      plan, signal: ctrl.signal, showHighlight: true,
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

  /* --- Voice --- */
  const onMicClick = useCallback(async () => {
    try {
      if (!recording) {
        const r = new VoiceRecorder(); await r.start();
        recorderRef.current = r; setRecording(true);
      } else {
        const r = recorderRef.current; recorderRef.current = null;
        setRecording(false); setBusy(true);
        const blob = await r.stop();
        const text = whisperUrl
          ? await transcribeViaProxy(blob, whisperUrl)
          : await transcribeWithWhisper(blob, apiKey);
        setBusy(false);
        if (text) { setInput(''); ask(text); }
        else setMessages((m) => [...m, { role: 'assistant', text: "I didn't catch that. Try again or type it.", status: 'low-confidence' }]);
      }
    } catch (e) {
      setRecording(false); setBusy(false);
      setMessages((m) => [...m, { role: 'assistant', text: `Voice error: ${e.message}. Type instead.`, status: 'error' }]);
    }
  }, [recording, apiKey, whisperUrl, ask]);

  const onSubmit = (e) => {
    e.preventDefault();
    const q = input.trim(); if (!q) return;
    setInput(''); ask(q);
  };

  const right = position === 'bottom-right';
  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const statusText = busy
    ? 'Thinking...'
    : agentRunning
      ? 'Agent is moving through the flow.'
      : recording
        ? 'Listening...'
        : latestAssistant?.text || greeting;

  return (
    <>
      <button
        ref={launcherRef}
        data-guider="guider-launcher"
        aria-label={open ? 'Close Guider' : 'Open Guider assistant'}
        aria-expanded={open}
        aria-controls="guider-panel"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 20, [right ? 'right' : 'left']: 20, zIndex: 2147483646,
          width: 20, height: 20, borderRadius: 999, border: `1px solid ${hexAlpha(accent, 0.5)}`,
          cursor: 'pointer', background: '#ffffff', color: '#111111',
          boxShadow: `0 0 0 6px ${hexAlpha(accent, 0.15)}, 0 14px 28px rgba(0,0,0,.18)`,
          display: 'grid', placeItems: 'center', padding: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'block' }}
        />
      </button>

      {open && (
        <div
          id="guider-panel"
          ref={panelRef}
          data-guider="guider-panel"
          role="dialog" aria-modal="false" aria-label="Guider assistant"
          style={{
            position: 'fixed', bottom: 54, [right ? 'right' : 'left']: 20, zIndex: 2147483646,
            width: 420, maxWidth: 'calc(100vw - 24px)',
            display: 'grid', gap: 8,
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
          }}
        >
          <div
            role="status"
            aria-live="polite"
            style={{
              justifySelf: right ? 'end' : 'start',
              maxWidth: 'min(420px, calc(100vw - 24px))',
              background: 'rgba(255,255,255,0.94)',
              color: '#111111',
              border: '1px solid rgba(17,17,17,0.08)',
              borderRadius: 18,
              padding: '10px 14px',
              boxShadow: '0 14px 32px rgba(0,0,0,.12)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flex: '0 0 auto' }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 2 }}>
                  {agentEnabled ? 'Agent ready' : 'Guide ready'}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {statusText}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', flex: '0 0 auto' }}>
                {map ? `${map.pages?.length || 0} pages` : 'loading'}
              </div>
            </div>
          </div>

          {/* Live region for screen readers */}
          <div ref={liveRef} aria-live="polite" aria-atomic="true" style={{ position: 'absolute', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', width: 1, height: 1, overflow: 'hidden', whiteSpace: 'nowrap' }} />

          <form
            onSubmit={onSubmit}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 8,
              background: 'rgba(255,255,255,0.98)', color: '#111111',
              border: '1px solid rgba(17,17,17,0.08)', borderRadius: 999,
              boxShadow: '0 18px 40px rgba(0,0,0,.14)',
              backdropFilter: 'blur(18px)',
            }}
          >
            {agent && (
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
                  fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '.12em', textTransform: 'uppercase', flex: '0 0 auto',
                }}
              >agent</button>
            )}
            <button
              type="button" data-guider="guider-mic"
              onClick={onMicClick}
              aria-label={recording ? 'Stop recording' : 'Start voice recording'}
              aria-pressed={recording}
              style={{
                background: recording ? '#111111' : 'transparent',
                color: recording ? '#ffffff' : '#6b7280', border: '1px solid rgba(17,17,17,0.08)', borderRadius: 999,
                width: 36, height: 36, cursor: 'pointer', fontSize: 13, flex: '0 0 auto',
              }}
            >{recording ? 'Stop' : 'Mic'}</button>
            <input
              ref={inputRef} data-guider="guider-input"
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? 'Recording...' : 'Ask where anything lives'}
              disabled={recording || busy || agentRunning}
              aria-label="Message Guider"
              style={{
                flex: 1, background: 'transparent', color: '#111111', border: 'none',
                padding: '0 6px', outline: 'none', fontSize: 14, minWidth: 0,
              }}
            />
            <button
              type="submit" data-guider="guider-send"
              disabled={!input.trim() || busy || agentRunning}
              style={{
                background: '#111111', color: '#ffffff', border: 'none',
                borderRadius: 999, padding: '0 14px', height: 36, fontWeight: 700, cursor: 'pointer',
                opacity: (!input.trim() || busy || agentRunning) ? 0.5 : 1,
              }}
            >Go</button>
            <button
              type="button"
              data-guider="guider-close"
              onClick={() => setOpen(false)}
              aria-label="Close Guider"
              style={{
                background: 'transparent', color: '#6b7280', border: 'none', cursor: 'pointer',
                width: 28, height: 28, borderRadius: '50%', fontSize: 16, flex: '0 0 auto',
              }}
            >×</button>
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
  if (!m) return `rgba(245,208,66,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
