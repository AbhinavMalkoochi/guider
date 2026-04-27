// src/widget/GuiderWidget.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";

// src/widget/screenshot.js
async function captureViewport() {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(document.body, {
    backgroundColor: null,
    useCORS: true,
    logging: false,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight
  });
  return canvas.toDataURL("image/jpeg", 0.7);
}

// src/widget/voice.js
var VoiceRecorder = class {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.stream = null;
  }
  async start() {
    var _a;
    if (!((_a = navigator.mediaDevices) == null ? void 0 : _a.getUserMedia))
      throw new Error("Microphone not supported in this browser.");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMime();
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : void 0);
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
        var _a;
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || "audio/webm" });
        (_a = this.stream) == null ? void 0 : _a.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        this.stream = null;
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
};
function pickMime() {
  var _a;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && ((_a = MediaRecorder.isTypeSupported) == null ? void 0 : _a.call(MediaRecorder, c))) return c;
  }
  return null;
}
async function transcribeWithWhisper(blob, apiKey, endpoint = "https://api.openai.com/v1/audio/transcriptions") {
  const fd = new FormData();
  const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
  fd.append("file", blob, `voice.${ext}`);
  fd.append("model", "whisper-1");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Whisper failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.text || "";
}

// src/widget/selectors.js
function findElement(candidates) {
  if (!Array.isArray(candidates)) return null;
  for (const c of candidates) {
    const el = resolveOne(c);
    if (el && isVisible(el)) return { el, matched: c };
  }
  return null;
}
function resolveOne(c) {
  var _a;
  if (!c) return null;
  if (typeof c === "string") {
    try {
      return document.querySelector(c);
    } catch {
      return null;
    }
  }
  if (c.kind === "css") {
    try {
      return document.querySelector(c.value);
    } catch {
      return null;
    }
  }
  if (c.kind === "data-guider") {
    return document.querySelector(`[data-guider="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "testid") {
    return document.querySelector(`[data-testid="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "aria") {
    return document.querySelector(`[aria-label="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "role-name") {
    const els = document.querySelectorAll(`[role="${cssEscape(c.role)}"]`);
    for (const el of els) {
      const name = el.getAttribute("aria-label") || ((_a = el.textContent) == null ? void 0 : _a.trim()) || "";
      if (name.toLowerCase().includes(String(c.name).toLowerCase())) return el;
    }
    return null;
  }
  if (c.kind === "text") {
    return findByText(c.value, c.tag);
  }
  return null;
}
function findByText(text, tag) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  const sel = tag || "a, button, [role=button], [role=link], [role=tab], summary, label";
  const els = document.querySelectorAll(sel);
  let best = null;
  let bestLen = Infinity;
  for (const el of els) {
    const txt = (el.textContent || "").trim().toLowerCase();
    if (!txt) continue;
    if (txt === t) return el;
    if (txt.includes(t) && txt.length < bestLen) {
      best = el;
      bestLen = txt.length;
    }
  }
  return best;
}
function isVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
  return true;
}
function cssEscape(s) {
  return String(s).replace(/["\\]/g, "\\$&");
}

// src/widget/highlight.js
var ROOT_ID = "guider-highlight-root";
var STYLE_ID = "guider-highlight-style";
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-mask { position: fixed; background: rgba(8, 10, 18, 0.55); pointer-events: auto; transition: all .2s ease; }
    #${ROOT_ID} .gd-ring {
      position: fixed; pointer-events: none; border: 2px solid #f5d042;
      box-shadow: 0 0 0 4px rgba(245, 208, 66, 0.25), 0 0 32px rgba(245, 208, 66, 0.6);
      border-radius: 10px; transition: all .25s cubic-bezier(.2,.8,.2,1);
      animation: gd-pulse 1.6s ease-in-out infinite;
    }
    @keyframes gd-pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(245,208,66,.25), 0 0 24px rgba(245,208,66,.55); }
      50%      { box-shadow: 0 0 0 8px rgba(245,208,66,.10), 0 0 40px rgba(245,208,66,.85); }
    }
    #${ROOT_ID} .gd-tip {
      position: fixed; max-width: 320px; padding: 10px 12px;
      background: #0e1118; color: #f3f4f6; border: 1px solid #f5d042;
      border-radius: 10px; font: 500 13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto;
      box-shadow: 0 18px 48px rgba(0,0,0,.55);
      pointer-events: auto;
    }
    #${ROOT_ID} .gd-tip .gd-tip-step { color: #f5d042; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
    #${ROOT_ID} .gd-tip .gd-tip-actions { margin-top: 10px; display: flex; gap: 8px; justify-content: flex-end; }
    #${ROOT_ID} .gd-tip button {
      background: #f5d042; color: #0e1118; border: 0; padding: 6px 10px;
      border-radius: 6px; font: 600 12px ui-sans-serif, system-ui; cursor: pointer;
    }
    #${ROOT_ID} .gd-tip button.gd-secondary { background: transparent; color: #f3f4f6; border: 1px solid #2a2f3a; }
    #${ROOT_ID} .gd-arrow {
      position: fixed; width: 0; height: 0; border-style: solid;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,.5));
    }
  `;
  document.head.appendChild(style);
}
function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}
function cleanup() {
  var _a, _b;
  (_a = document.getElementById(ROOT_ID)) == null ? void 0 : _a.remove();
  (_b = document.getElementById(STYLE_ID)) == null ? void 0 : _b.remove();
  window.removeEventListener("resize", onReposition, true);
  window.removeEventListener("scroll", onReposition, true);
}
var activeShow = null;
function onReposition() {
  if (activeShow) activeShow();
}
async function show({ element, title, body, stepIndex, totalSteps, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot();
  root.innerHTML = "";
  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  await new Promise((r) => setTimeout(r, 250));
  const masks = [
    Object.assign(document.createElement("div"), { className: "gd-mask" }),
    Object.assign(document.createElement("div"), { className: "gd-mask" }),
    Object.assign(document.createElement("div"), { className: "gd-mask" }),
    Object.assign(document.createElement("div"), { className: "gd-mask" })
  ];
  for (const m of masks) root.appendChild(m);
  const ring = document.createElement("div");
  ring.className = "gd-ring";
  root.appendChild(ring);
  const tip = document.createElement("div");
  tip.className = "gd-tip";
  tip.innerHTML = `
    <div class="gd-tip-step">Step ${stepIndex + 1} of ${totalSteps}</div>
    <div class="gd-tip-title" style="font-weight:700;margin-bottom:4px;">${escapeHtml(title || "")}</div>
    <div class="gd-tip-body">${escapeHtml(body || "")}</div>
    <div class="gd-tip-actions">
      <button class="gd-secondary" data-act="skip">Skip</button>
      <button data-act="next">${stepIndex + 1 === totalSteps ? "Done" : "Next"}</button>
    </div>
  `;
  root.appendChild(tip);
  tip.querySelector("[data-act=next]").onclick = () => onNext == null ? void 0 : onNext();
  tip.querySelector("[data-act=skip]").onclick = () => onSkip == null ? void 0 : onSkip();
  const arrow = document.createElement("div");
  arrow.className = "gd-arrow";
  root.appendChild(arrow);
  const reposition = () => {
    const r = element.getBoundingClientRect();
    const pad = 6;
    const W = window.innerWidth;
    const H = window.innerHeight;
    masks[0].style.cssText = `top:0;left:0;width:${W}px;height:${Math.max(0, r.top - pad)}px;`;
    masks[1].style.cssText = `top:${r.bottom + pad}px;left:0;width:${W}px;height:${Math.max(0, H - r.bottom - pad)}px;`;
    masks[2].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:0;width:${Math.max(0, r.left - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    masks[3].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:${r.right + pad}px;width:${Math.max(0, W - r.right - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    ring.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;
    const tipW = 320;
    const tipH = tip.offsetHeight || 110;
    let tx, ty, arrowSide;
    if (r.right + tipW + 24 < W) {
      tx = r.right + 18;
      ty = Math.max(8, Math.min(H - tipH - 8, r.top));
      arrowSide = "left";
    } else if (r.bottom + tipH + 24 < H) {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = r.bottom + 18;
      arrowSide = "top";
    } else {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = Math.max(8, r.top - tipH - 18);
      arrowSide = "bottom";
    }
    tip.style.left = `${tx}px`;
    tip.style.top = `${ty}px`;
    const ax = arrowSide === "left" ? r.right + 4 : r.left + r.width / 2 - 8;
    const ay = arrowSide === "top" ? r.bottom + 4 : arrowSide === "bottom" ? r.top - 12 : r.top + r.height / 2 - 8;
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    arrow.style.borderWidth = arrowSide === "left" ? "8px 14px 8px 0" : arrowSide === "top" ? "0 8px 14px 8px" : arrowSide === "bottom" ? "14px 8px 0 8px" : "8px 0 8px 14px";
    arrow.style.borderColor = arrowSide === "left" ? "transparent #f5d042 transparent transparent" : arrowSide === "top" ? "transparent transparent #f5d042 transparent" : arrowSide === "bottom" ? "#f5d042 transparent transparent transparent" : "transparent transparent transparent #f5d042";
  };
  reposition();
  activeShow = reposition;
  window.addEventListener("resize", onReposition, true);
  window.addEventListener("scroll", onReposition, true);
}
function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// src/widget/llm.js
var SYSTEM = `You are Guider, a navigation assistant embedded in a Next.js app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: produce a step-by-step plan that points the user to the exact element(s) they need.

Strict rules:
- Use the screenshot to verify what is currently visible AND the map to know what exists.
- For each step, return:
    - "title": short imperative (e.g., "Open the Settings menu")
    - "body": one-sentence user-facing explanation
    - "selectors": ranked candidates (most stable first). Each is one of:
        { "kind": "data-guider", "value": "..." }
        { "kind": "testid",      "value": "..." }
        { "kind": "aria",        "value": "..." }
        { "kind": "role-name",   "role": "button"|"link"|"tab"|..., "name": "..." }
        { "kind": "text",        "value": "...", "tag": "button|a|..." }
        { "kind": "css",         "value": "..." }
    - "visualHint": describe the element visually (color, position on screen, surrounding text)
      so we can guide the user even if selectors fail.
    - "expectedRoute": if clicking navigates the user, the route they land on (else null).
- If you are NOT confident the element exists or you cannot infer it from map+screenshot,
  return confidence "low" and a "fallbackMessage" explaining what to do instead.
- Do not invent UI that is not in the map.
- Steps must be sequential \u2014 only the next-needed step's selectors matter at any moment, but
  you should plan the full path.

Output JSON shape:
{
  "steps": [
    { "title": "...", "body": "...", "selectors": [...], "visualHint": "...", "expectedRoute": "..." | null }
  ],
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}`;
async function planGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  apiKey,
  model = "gpt-5-nano-2025-08-07",
  endpoint = "https://api.openai.com/v1/chat/completions"
}) {
  var _a, _b, _c;
  if (!apiKey) throw new Error("No OpenAI API key configured for the widget.");
  const compactMap = compactMap_(map, currentRoute);
  const body = {
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Current route: ${currentRoute}

User question: ${question}

Site map (compacted):
${JSON.stringify(compactMap)}

Use the attached screenshot of the user's current viewport.`
          },
          { type: "image_url", image_url: { url: screenshotDataUrl } }
        ]
      }
    ]
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Guider LLM failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {
      steps: [],
      confidence: "low",
      fallbackMessage: "I'm not sure where to point you. Try rephrasing \u2014 e.g. 'How do I add a teammate?'"
    };
  }
}
function compactMap_(map, currentRoute) {
  if (!(map == null ? void 0 : map.pages)) return { pages: [] };
  return {
    pages: map.pages.map((p) => {
      const isCurrent = p.route === currentRoute;
      return {
        route: p.route,
        purpose: p.purpose || null,
        categories: p.categories || [],
        ...isCurrent ? {
          summary: p.summary,
          interactive: p.interactive,
          visuals: p.visuals,
          modals: p.modals,
          dropdowns: p.dropdowns,
          conditions: p.conditions
        } : {
          interactiveCount: (p.interactive || []).length,
          keyActions: (p.interactive || []).slice(0, 6).map((x) => x.label || x.purpose || x.tag)
        }
      };
    })
  };
}

// src/widget/GuiderWidget.jsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function GuiderWidget({
  apiKey,
  mapUrl,
  map: mapProp,
  model,
  endpoint,
  whisperEndpoint,
  currentRoute,
  position = "bottom-right",
  accent = "#f5d042",
  onAgentMode
}) {
  var _a;
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState(mapProp || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const recorderRef = useRef(null);
  useEffect(() => {
    if (mapProp) {
      setMap(mapProp);
      return;
    }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl).then((r) => r.ok ? r.json() : null).then((j) => {
      if (!cancelled) setMap(j);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [mapUrl, mapProp]);
  useEffect(() => {
    if (!open) {
      cleanup();
      setSteps(null);
      setStepIdx(0);
    }
  }, [open]);
  useEffect(() => () => cleanup(), []);
  const route = currentRoute || (typeof window !== "undefined" ? window.location.pathname : "/");
  const ask = useCallback(async (question) => {
    var _a2;
    if (!(question == null ? void 0 : question.trim())) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    setSteps(null);
    setStepIdx(0);
    cleanup();
    try {
      const screenshotDataUrl = await captureViewport();
      const plan = await planGuidance({
        question,
        currentRoute: route,
        map,
        screenshotDataUrl,
        apiKey,
        model,
        endpoint
      });
      if (plan.confidence === "low" || !((_a2 = plan.steps) == null ? void 0 : _a2.length)) {
        setMessages((m) => [...m, {
          role: "assistant",
          text: plan.fallbackMessage || "I'm not confident about where to point you. Could you rephrase?",
          status: "low-confidence"
        }]);
      } else {
        setSteps(plan);
        setMessages((m) => [...m, {
          role: "assistant",
          text: `${plan.steps.length} step${plan.steps.length > 1 ? "s" : ""} \u2014 I'll walk you through.`,
          status: plan.confidence
        }]);
        await highlightStep(plan, 0);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Sorry \u2014 ${String(e.message || e)}`, status: "error" }]);
    } finally {
      setBusy(false);
    }
  }, [apiKey, map, model, endpoint, route]);
  const highlightStep = useCallback(async (plan, idx) => {
    var _a2;
    cleanup();
    if (!((_a2 = plan == null ? void 0 : plan.steps) == null ? void 0 : _a2[idx])) return;
    const step = plan.steps[idx];
    const found = findElement(step.selectors);
    if (!found) {
      setMessages((m) => [...m, {
        role: "assistant",
        text: `I couldn't find the exact element. Look for: ${step.visualHint || step.title}.`,
        status: "visual-only"
      }]);
      return;
    }
    await show({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: idx,
      totalSteps: plan.steps.length,
      onNext: () => {
        const next = idx + 1;
        if (next >= plan.steps.length) {
          cleanup();
          setMessages((m) => [...m, { role: "assistant", text: "Done. Anything else?", status: "done" }]);
          setSteps(null);
        } else {
          setStepIdx(next);
          highlightStep(plan, next);
        }
      },
      onSkip: () => {
        cleanup();
        setSteps(null);
        setMessages((m) => [...m, { role: "assistant", text: "Skipped.", status: "skipped" }]);
      }
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
          setInput("");
          ask(text);
        } else {
          setMessages((m) => [...m, { role: "assistant", text: "I didn't catch that. Try again or type it.", status: "low-confidence" }]);
        }
      }
    } catch (e) {
      setRecording(false);
      setBusy(false);
      setMessages((m) => [...m, { role: "assistant", text: `Voice error: ${e.message}. Type instead.`, status: "error" }]);
    }
  }, [recording, apiKey, whisperEndpoint, ask]);
  const onSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    ask(q);
  };
  const right = position === "bottom-right";
  const launcherStyle = {
    position: "fixed",
    bottom: 20,
    [right ? "right" : "left"]: 20,
    zIndex: 2147483646,
    width: 56,
    height: 56,
    borderRadius: 28,
    border: "none",
    cursor: "pointer",
    background: accent,
    color: "#0e1118",
    boxShadow: "0 12px 32px rgba(0,0,0,.35), 0 0 0 4px rgba(245,208,66,.18)",
    fontWeight: 700,
    fontSize: 22
  };
  const panelStyle = {
    position: "fixed",
    bottom: 88,
    [right ? "right" : "left"]: 20,
    zIndex: 2147483646,
    width: 380,
    maxWidth: "calc(100vw - 40px)",
    height: 540,
    maxHeight: "calc(100vh - 120px)",
    background: "#0e1118",
    color: "#f3f4f6",
    border: `1px solid ${accent}33`,
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 30px 80px rgba(0,0,0,.6)",
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto'
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        "data-guider": "guider-launcher",
        "aria-label": "Open Guider",
        style: launcherStyle,
        onClick: () => setOpen((v) => !v),
        children: open ? "\xD7" : "?"
      }
    ),
    open && /* @__PURE__ */ jsxs("div", { "data-guider": "guider-panel", style: panelStyle, role: "dialog", "aria-label": "Guider assistant", children: [
      /* @__PURE__ */ jsxs("div", { style: { padding: "14px 16px", borderBottom: "1px solid #1c2230", display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsx("div", { style: { width: 8, height: 8, borderRadius: 4, background: accent, boxShadow: `0 0 12px ${accent}` } }),
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, letterSpacing: ".02em" }, children: "Guider" }),
        /* @__PURE__ */ jsx("div", { style: { marginLeft: "auto", fontSize: 11, color: "#8b93a7" }, children: map ? `${((_a = map.pages) == null ? void 0 : _a.length) || 0} pages mapped` : "loading map\u2026" }),
        onAgentMode && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => onAgentMode == null ? void 0 : onAgentMode(),
            title: "Agent mode (preview)",
            style: { background: "transparent", color: "#8b93a7", border: "1px solid #2a2f3a", borderRadius: 6, padding: "3px 7px", fontSize: 11, cursor: "pointer" },
            children: "agent"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }, children: [
        messages.length === 0 && /* @__PURE__ */ jsxs("div", { style: { color: "#8b93a7", fontSize: 13, lineHeight: 1.5 }, children: [
          "Ask me where to find something \u2014 e.g., ",
          /* @__PURE__ */ jsx("em", { style: { color: accent }, children: '"How do I invite a teammate?"' }),
          " or",
          /* @__PURE__ */ jsx("em", { style: { color: accent }, children: ' "Where do I update my billing email?"' }),
          /* @__PURE__ */ jsx("div", { style: { marginTop: 14, fontSize: 11, color: "#5e6675" }, children: "Tap the mic to speak." })
        ] }),
        messages.map((m, i) => /* @__PURE__ */ jsx("div", { style: {
          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
          maxWidth: "85%",
          padding: "8px 12px",
          borderRadius: 10,
          background: m.role === "user" ? accent : "#1a2030",
          color: m.role === "user" ? "#0e1118" : "#f3f4f6",
          fontSize: 13,
          lineHeight: 1.45,
          border: m.status === "low-confidence" ? "1px dashed #ef9b3b" : m.status === "error" ? "1px solid #f56565" : "none"
        }, children: m.text }, i)),
        busy && /* @__PURE__ */ jsx("div", { style: { color: "#8b93a7", fontSize: 12 }, children: "thinking\u2026" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit, style: { display: "flex", gap: 8, padding: 12, borderTop: "1px solid #1c2230", background: "#0a0d14" }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "data-guider": "guider-mic",
            onClick: onMicClick,
            "aria-label": recording ? "Stop recording" : "Start recording",
            style: {
              background: recording ? "#ef4444" : "#1a2030",
              color: "#f3f4f6",
              border: "none",
              borderRadius: 8,
              padding: "0 12px",
              cursor: "pointer",
              fontSize: 16
            },
            children: recording ? "\u25A0" : "\u{1F399}"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            "data-guider": "guider-input",
            value: input,
            onChange: (e) => setInput(e.target.value),
            placeholder: recording ? "Recording\u2026" : "Ask Guider\u2026",
            disabled: recording || busy,
            style: {
              flex: 1,
              background: "#1a2030",
              color: "#f3f4f6",
              border: "none",
              borderRadius: 8,
              padding: "0 12px",
              outline: "none",
              fontSize: 14
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            "data-guider": "guider-send",
            type: "submit",
            disabled: !input.trim() || busy,
            style: {
              background: accent,
              color: "#0e1118",
              border: "none",
              borderRadius: 8,
              padding: "0 14px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: !input.trim() || busy ? 0.5 : 1
            },
            children: "Send"
          }
        )
      ] })
    ] })
  ] });
}

// src/widget/context.js
import React2, { createContext, useContext, useState as useState2, useCallback as useCallback2 } from "react";
var Ctx = createContext(null);
function GuiderProvider({ children, value }) {
  return React2.createElement(Ctx.Provider, { value }, children);
}
function useGuider() {
  return useContext(Ctx);
}

// src/agent/index.js
var agentMode = {
  /** Whether agent mode is wired up (always false until implemented). */
  available: false,
  /**
   * Future entry point.
   * @param {{ plan: object, controls?: { abort?: AbortController } }} args
   * @returns {Promise<{ status: 'completed'|'failed'|'aborted', steps: object[] }>}
   */
  async run(args) {
    throw new Error("Guider Agent Mode is not implemented yet. This is a scaffold for a future release.");
  }
};
export {
  GuiderProvider,
  GuiderWidget,
  agentMode,
  useGuider
};
