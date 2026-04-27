import React, { useEffect, useRef, useState, useCallback } from 'react';
import { captureViewport } from './screenshot.js';
import { VoiceRecorder, transcribeWithWhisper } from './voice.js';
import { findElement } from './selectors.js';
import { show as showHighlight, cleanup as cleanupHighlight } from './highlight.js';
import { planGuidance } from './llm.js';

/**
 * <GuiderWidget />
 *
 * Required props:
 *   - apiKey: OpenAI API key (browser-callable). For production, prefer routing through
 *             your own proxy and pass an endpoint instead.
 *   - mapUrl OR map: URL to fetch guider.map.json, or the parsed map object directly.
 *
 * Optional props:
 *   - model: OpenAI model (default: 'gpt-5-nano-2025-08-07')
 *   - endpoint: chat completions URL (default: OpenAI's)
 *   - whisperEndpoint: Whisper URL (default: OpenAI's)
 *   - currentRoute: override route detection (default: window.location.pathname)
 *   - position: 'bottom-right' | 'bottom-left' (default: 'bottom-right')
 *   - accent: hex color (default: '#f5d042')
 *   - onAgentMode: callback when user toggles agent mode (currently scaffold only)
 */
export function GuiderWidget({
  apiKey,
  mapUrl,
  map: mapProp,
  model,
  endpoint,
  whisperEndpoint,
  currentRoute,
  position = 'bottom-right',
  accent = '#f5d042',
  onAgentMode,
}) {
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState(mapProp || null);
  const [messages, setMessages] = useState([]); // {role, text, status}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState(null); // {steps:[], confidence, fallbackMessage}
  const [stepIdx, setStepIdx] = useState(0);
  const recorderRef = useRef(null);

  // Lazy-load map once
  useEffect(() => {
    if (mapProp) { setMap(mapProp); return; }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!cancelled) setMap(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mapUrl, mapProp]);

  // Cleanup all overlays when widget closes
  useEffect(() => {
    if (!open) {
      cleanupHighlight();
      setSteps(null);
      setStepIdx(0);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => () => cleanupHighlight(), []);

  const route = currentRoute ||
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  const ask = useCallback(async (question) => {
    if (!question?.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    setSteps(null);
    setStepIdx(0);
    cleanupHighlight();
    try {
      const screenshotDataUrl = await captureViewport();
      const plan = await planGuidance({
        question, currentRoute: route, map, screenshotDataUrl,
        apiKey, model, endpoint,
      });

      if (plan.confidence === 'low' || !plan.steps?.length) {
        setMessages((m) => [...m, {
          role: 'assistant',
          text: plan.fallbackMessage || "I'm not confident about where to point you. Could you rephrase?",
          status: 'low-confidence',
        }]);
      } else {
        setSteps(plan);
        setMessages((m) => [...m, {
          role: 'assistant',
          text: `${plan.steps.length} step${plan.steps.length > 1 ? 's' : ''} — I'll walk you through.`,
          status: plan.confidence,
        }]);
        await highlightStep(plan, 0);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry — ${String(e.message || e)}`, status: 'error' }]);
    } finally {
      setBusy(false);
    }
  }, [apiKey, map, model, endpoint, route]);

  const highlightStep = useCallback(async (plan, idx) => {
    cleanupHighlight();
    if (!plan?.steps?.[idx]) return;
    const step = plan.steps[idx];
    const found = findElement(step.selectors);
    if (!found) {
      // Fallback — describe visually instead of pointing
      setMessages((m) => [...m, {
        role: 'assistant',
        text: `I couldn't find the exact element. Look for: ${step.visualHint || step.title}.`,
        status: 'visual-only',
      }]);
      return;
    }
    await showHighlight({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: idx,
      totalSteps: plan.steps.length,
      onNext: () => {
        const next = idx + 1;
        if (next >= plan.steps.length) {
          cleanupHighlight();
          setMessages((m) => [...m, { role: 'assistant', text: 'Done. Anything else?', status: 'done' }]);
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
  }, []);

  const onMicClick = useCallback(async () => {
    try {
      if (!recording) {
        const r = new VoiceRecorder();
        await r.start();
        recorderRef.current = r;
        setRecording(true);
      } else {
        const r = recorderRef.current;
        recorderRef.current = null;
        setRecording(false);
        setBusy(true);
        const blob = await r.stop();
        const text = await transcribeWithWhisper(blob, apiKey, whisperEndpoint);
        setBusy(false);
        if (text) {
          setInput('');
          ask(text);
        } else {
          setMessages((m) => [...m, { role: 'assistant', text: "I didn't catch that. Try again or type it.", status: 'low-confidence' }]);
        }
      }
    } catch (e) {
      setRecording(false);
      setBusy(false);
      setMessages((m) => [...m, { role: 'assistant', text: `Voice error: ${e.message}. Type instead.`, status: 'error' }]);
    }
  }, [recording, apiKey, whisperEndpoint, ask]);

  const onSubmit = (e) => { e.preventDefault(); const q = input.trim(); if (!q) return; setInput(''); ask(q); };

  const right = position === 'bottom-right';
  const launcherStyle = {
    position: 'fixed', bottom: 20, [right ? 'right' : 'left']: 20, zIndex: 2147483646,
    width: 56, height: 56, borderRadius: 28, border: 'none', cursor: 'pointer',
    background: accent, color: '#0e1118',
    boxShadow: '0 12px 32px rgba(0,0,0,.35), 0 0 0 4px rgba(245,208,66,.18)',
    fontWeight: 700, fontSize: 22,
  };
  const panelStyle = {
    position: 'fixed', bottom: 88, [right ? 'right' : 'left']: 20, zIndex: 2147483646,
    width: 380, maxWidth: 'calc(100vw - 40px)', height: 540, maxHeight: 'calc(100vh - 120px)',
    background: '#0e1118', color: '#f3f4f6', border: `1px solid ${accent}33`,
    borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 30px 80px rgba(0,0,0,.6)',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
  };

  return (
    <>
      <button
        data-guider="guider-launcher"
        aria-label="Open Guider"
        style={launcherStyle}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '×' : '?'}
      </button>

      {open && (
        <div data-guider="guider-panel" style={panelStyle} role="dialog" aria-label="Guider assistant">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1c2230', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: accent, boxShadow: `0 0 12px ${accent}` }} />
            <div style={{ fontWeight: 700, letterSpacing: '.02em' }}>Guider</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#8b93a7' }}>
              {map ? `${map.pages?.length || 0} pages mapped` : 'loading map…'}
            </div>
            {onAgentMode && (
              <button
                onClick={() => onAgentMode?.()}
                title="Agent mode (preview)"
                style={{ background: 'transparent', color: '#8b93a7', border: '1px solid #2a2f3a', borderRadius: 6, padding: '3px 7px', fontSize: 11, cursor: 'pointer' }}
              >
                agent
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ color: '#8b93a7', fontSize: 13, lineHeight: 1.5 }}>
                Ask me where to find something — e.g., <em style={{ color: accent }}>"How do I invite a teammate?"</em> or
                <em style={{ color: accent }}> "Where do I update my billing email?"</em>
                <div style={{ marginTop: 14, fontSize: 11, color: '#5e6675' }}>Tap the mic to speak.</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 10,
                background: m.role === 'user' ? accent : '#1a2030',
                color: m.role === 'user' ? '#0e1118' : '#f3f4f6',
                fontSize: 13, lineHeight: 1.45,
                border: m.status === 'low-confidence' ? '1px dashed #ef9b3b' :
                        m.status === 'error' ? '1px solid #f56565' : 'none',
              }}>
                {m.text}
              </div>
            ))}
            {busy && <div style={{ color: '#8b93a7', fontSize: 12 }}>thinking…</div>}
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #1c2230', background: '#0a0d14' }}>
            <button
              type="button"
              data-guider="guider-mic"
              onClick={onMicClick}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              style={{
                background: recording ? '#ef4444' : '#1a2030',
                color: '#f3f4f6', border: 'none', borderRadius: 8,
                padding: '0 12px', cursor: 'pointer', fontSize: 16,
              }}
            >{recording ? '■' : '🎙'}</button>
            <input
              data-guider="guider-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? 'Recording…' : 'Ask Guider…'}
              disabled={recording || busy}
              style={{
                flex: 1, background: '#1a2030', color: '#f3f4f6', border: 'none',
                borderRadius: 8, padding: '0 12px', outline: 'none', fontSize: 14,
              }}
            />
            <button
              data-guider="guider-send"
              type="submit"
              disabled={!input.trim() || busy}
              style={{
                background: accent, color: '#0e1118', border: 'none',
                borderRadius: 8, padding: '0 14px', fontWeight: 700, cursor: 'pointer',
                opacity: !input.trim() || busy ? 0.5 : 1,
              }}
            >Send</button>
          </form>
        </div>
      )}
    </>
  );
}
