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
          width: 56, height: 56, borderRadius: 28, border: 'none', cursor: 'pointer',
          background: accent, color: '#0e1118',
          boxShadow: `0 12px 32px rgba(0,0,0,.35), 0 0 0 4px ${hexAlpha(accent, 0.18)}`,
          fontWeight: 700, fontSize: 22, display: 'grid', placeItems: 'center',
        }}
      >{open ? '×' : '?'}</button>

      {open && (
        <div
          id="guider-panel"
          ref={panelRef}
          data-guider="guider-panel"
          role="dialog" aria-modal="false" aria-label="Guider assistant"
          style={{
            position: 'fixed', bottom: 88, [right ? 'right' : 'left']: 20, zIndex: 2147483646,
            width: 380, maxWidth: 'calc(100vw - 40px)', height: 540, maxHeight: 'calc(100vh - 120px)',
            background: '#0e1118', color: '#f3f4f6', border: `1px solid ${hexAlpha(accent, 0.25)}`,
            borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 30px 80px rgba(0,0,0,.6)',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
          }}
        >
          <header style={{ padding: '14px 16px', borderBottom: '1px solid #1c2230', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: accent, boxShadow: `0 0 12px ${accent}` }} />
            <div style={{ fontWeight: 700, letterSpacing: '.02em' }}>Guider</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#8b93a7' }}>
              {map ? `${map.pages?.length || 0} pages mapped` : 'loading map…'}
            </div>
            {agent && (
              <button
                data-guider="guider-agent-toggle"
                onClick={() => setAgentEnabled((v) => !v)}
                aria-pressed={agentEnabled}
                title={agentEnabled ? 'Agent will execute steps' : 'Agent disabled — guided mode'}
                style={{
                  background: agentEnabled ? accent : 'transparent',
                  color: agentEnabled ? '#0e1118' : '#8b93a7',
                  border: `1px solid ${agentEnabled ? accent : '#2a2f3a'}`,
                  borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '.04em', textTransform: 'uppercase',
                }}
              >agent</button>
            )}
            <button
              data-guider="guider-close"
              onClick={() => setOpen(false)} aria-label="Close Guider"
              style={{ background: 'transparent', color: '#8b93a7', border: 0, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
            >×</button>
          </header>

          <div role="log" aria-label="Conversation" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ color: '#8b93a7', fontSize: 13, lineHeight: 1.55 }}>
                {greeting}
                <div style={{ marginTop: 14, fontSize: 11, color: '#5e6675' }}>
                  Tap the mic to speak · {agentEnabled ? 'Agent mode on — I will click for you' : 'Press Escape to close'}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
                background: m.role === 'user' ? accent : '#1a2030',
                color: m.role === 'user' ? '#0e1118' : '#f3f4f6',
                fontSize: 13, lineHeight: 1.45,
                border: m.status === 'low-confidence' ? '1px dashed #ef9b3b' :
                        m.status === 'error' ? '1px solid #f56565' :
                        m.status === 'agent-step' ? `1px solid ${hexAlpha(accent, 0.5)}` : 'none',
              }}>{m.text}</div>
            ))}
            {(busy || agentRunning) && <div style={{ color: '#8b93a7', fontSize: 12 }}>{agentRunning ? 'agent running…' : 'thinking…'}</div>}
          </div>

          {/* Live region for screen readers */}
          <div ref={liveRef} aria-live="polite" aria-atomic="true" style={{ position: 'absolute', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', width: 1, height: 1, overflow: 'hidden', whiteSpace: 'nowrap' }} />

          <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #1c2230', background: '#0a0d14' }}>
            <button
              type="button" data-guider="guider-mic"
              onClick={onMicClick}
              aria-label={recording ? 'Stop recording' : 'Start voice recording'}
              aria-pressed={recording}
              style={{
                background: recording ? '#ef4444' : '#1a2030',
                color: '#f3f4f6', border: 'none', borderRadius: 8,
                padding: '0 12px', cursor: 'pointer', fontSize: 16,
                minWidth: 40,
              }}
            >{recording ? '■' : '●'}</button>
            <input
              ref={inputRef} data-guider="guider-input"
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? 'Recording…' : 'Ask Guider…'}
              disabled={recording || busy || agentRunning}
              aria-label="Message Guider"
              style={{
                flex: 1, background: '#1a2030', color: '#f3f4f6', border: 'none',
                borderRadius: 8, padding: '0 12px', outline: 'none', fontSize: 14,
              }}
            />
            <button
              type="submit" data-guider="guider-send"
              disabled={!input.trim() || busy || agentRunning}
              style={{
                background: accent, color: '#0e1118', border: 'none',
                borderRadius: 8, padding: '0 14px', fontWeight: 700, cursor: 'pointer',
                opacity: (!input.trim() || busy || agentRunning) ? 0.5 : 1,
              }}
            >Send</button>
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
