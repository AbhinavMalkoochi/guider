"use client";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/widget/index.js
var index_exports = {};
__export(index_exports, {
  GuiderProvider: () => GuiderProvider,
  GuiderWidget: () => GuiderWidget,
  agentMode: () => agentMode,
  useGuider: () => useGuider
});
module.exports = __toCommonJS(index_exports);

// src/widget/GuiderWidget.jsx
var import_react = __toESM(require("react"), 1);

// src/widget/screenshot.js
async function captureViewport() {
  const { default: html2canvas } = await import("html2canvas");
  const options = {
    backgroundColor: null,
    useCORS: true,
    logging: false,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    onclone: (clonedDoc) => sanitizeClonedDocument(document, clonedDoc)
  };
  let canvas;
  try {
    canvas = await html2canvas(document.body, options);
  } catch {
    canvas = await html2canvas(document.documentElement, options);
  }
  return canvas.toDataURL("image/jpeg", 0.7);
}
var UNSUPPORTED_COLOR_FN = /(oklch|oklab|lch|lab|color-mix)\(/i;
var COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "fill",
  "stroke",
  "boxShadow",
  "textShadow"
];
function sanitizeClonedDocument(sourceDoc, clonedDoc) {
  const sourceRootStyle = getComputedStyle(sourceDoc.documentElement);
  const cloneRootStyle = clonedDoc.documentElement.style;
  for (const name of sourceRootStyle) {
    if (!name.startsWith("--")) continue;
    const value = sourceRootStyle.getPropertyValue(name);
    if (UNSUPPORTED_COLOR_FN.test(value)) {
      cloneRootStyle.setProperty(name, "#000000");
    }
  }
  const sourceEls = sourceDoc.querySelectorAll("*");
  const cloneEls = clonedDoc.querySelectorAll("*");
  const len = Math.min(sourceEls.length, cloneEls.length);
  for (let i = 0; i < len; i += 1) {
    const sourceEl = sourceEls[i];
    const cloneEl = cloneEls[i];
    const computed = getComputedStyle(sourceEl);
    for (const prop of COLOR_PROPS) {
      const value = computed[prop];
      if (!value || !UNSUPPORTED_COLOR_FN.test(value)) continue;
      if (prop === "boxShadow" || prop === "textShadow") {
        cloneEl.style[prop] = "none";
        continue;
      }
      cloneEl.style[prop] = fallbackColor(prop);
    }
  }
}
function fallbackColor(prop) {
  if (prop === "backgroundColor") return "transparent";
  if (prop === "fill" || prop === "stroke") return "#000000";
  return "#111111";
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
var highlight_exports = {};
__export(highlight_exports, {
  cleanup: () => cleanup,
  show: () => show
});
var ROOT_ID = "guider-highlight-root";
var STYLE_ID = "guider-highlight-style";
var activeReposition = null;
var listenersAttached = false;
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-mask {
      position: fixed; background: rgba(8, 10, 18, .58); pointer-events: auto;
      ${reduce ? "" : "transition: all .2s ease;"}
    }
    #${ROOT_ID} .gd-ring {
      position: fixed; pointer-events: none; border: 2px solid var(--gd-accent, #f5d042);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--gd-accent, #f5d042) 25%, transparent),
                  0 0 32px color-mix(in srgb, var(--gd-accent, #f5d042) 60%, transparent);
      border-radius: 10px;
      ${reduce ? "" : "transition: all .25s cubic-bezier(.2,.8,.2,1); animation: gd-pulse 1.6s ease-in-out infinite;"}
    }
    @keyframes gd-pulse {
      0%,100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--gd-accent,#f5d042) 25%, transparent),
                            0 0 24px color-mix(in srgb, var(--gd-accent,#f5d042) 55%, transparent); }
      50%     { box-shadow: 0 0 0 8px color-mix(in srgb, var(--gd-accent,#f5d042) 10%, transparent),
                            0 0 40px color-mix(in srgb, var(--gd-accent,#f5d042) 85%, transparent); }
    }
    #${ROOT_ID} .gd-tip {
      position: fixed; max-width: 320px; padding: 12px 14px;
      background: #0e1118; color: #f3f4f6; border: 1px solid var(--gd-accent, #f5d042);
      border-radius: 12px;
      font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto;
      box-shadow: 0 18px 48px rgba(0,0,0,.55);
      pointer-events: auto;
    }
    #${ROOT_ID} .gd-tip:focus-within { outline: 2px solid var(--gd-accent, #f5d042); outline-offset: 2px; }
    #${ROOT_ID} .gd-tip .gd-step {
      color: var(--gd-accent, #f5d042); font-size: 11px; letter-spacing: .14em;
      text-transform: uppercase; margin-bottom: 4px;
    }
    #${ROOT_ID} .gd-tip .gd-title { font-weight: 700; margin-bottom: 4px; }
    #${ROOT_ID} .gd-tip .gd-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end; }
    #${ROOT_ID} .gd-tip button {
      background: var(--gd-accent, #f5d042); color: #0e1118; border: 0;
      padding: 7px 12px; border-radius: 7px; font: 600 12px ui-sans-serif, system-ui;
      cursor: pointer;
    }
    #${ROOT_ID} .gd-tip button.gd-secondary { background: transparent; color: #f3f4f6; border: 1px solid #2a2f3a; }
    #${ROOT_ID} .gd-tip button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    #${ROOT_ID} .gd-arrow { position: fixed; width: 0; height: 0; border-style: solid; filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
    @media (prefers-contrast: more) {
      #${ROOT_ID} .gd-mask { background: rgba(0,0,0,.85); }
      #${ROOT_ID} .gd-tip { background: #000; color: #fff; border-color: #fff; }
    }
  `;
  document.head.appendChild(style);
}
function ensureRoot(accent) {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
  }
  if (accent) root.style.setProperty("--gd-accent", accent);
  return root;
}
function cleanup() {
  var _a, _b;
  (_a = document.getElementById(ROOT_ID)) == null ? void 0 : _a.remove();
  (_b = document.getElementById(STYLE_ID)) == null ? void 0 : _b.remove();
  if (listenersAttached) {
    window.removeEventListener("resize", onReposition, true);
    window.removeEventListener("scroll", onReposition, true);
    document.removeEventListener("keydown", onKeydown, true);
    listenersAttached = false;
  }
  activeReposition = null;
  activeKeyHandlers = null;
}
var activeKeyHandlers = null;
function onReposition() {
  activeReposition == null ? void 0 : activeReposition();
}
function onKeydown(e) {
  var _a, _b, _c, _d;
  if (!activeKeyHandlers) return;
  if (e.key === "Escape") {
    e.preventDefault();
    (_a = activeKeyHandlers.skip) == null ? void 0 : _a.call(activeKeyHandlers);
  }
  if (e.key === "Enter" && (((_c = (_b = e.target) == null ? void 0 : _b.closest) == null ? void 0 : _c.call(_b, `#${ROOT_ID}`)) || document.activeElement === document.body)) {
    e.preventDefault();
    (_d = activeKeyHandlers.next) == null ? void 0 : _d.call(activeKeyHandlers);
  }
}
async function show({ element, title, body, stepIndex, totalSteps, accent, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "center" });
  await new Promise((r) => setTimeout(r, reduce ? 0 : 250));
  const masks = Array.from({ length: 4 }, () => {
    const d = document.createElement("div");
    d.className = "gd-mask";
    root.appendChild(d);
    return d;
  });
  const ring = document.createElement("div");
  ring.className = "gd-ring";
  root.appendChild(ring);
  const arrow = document.createElement("div");
  arrow.className = "gd-arrow";
  root.appendChild(arrow);
  const tip = document.createElement("div");
  tip.className = "gd-tip";
  tip.setAttribute("role", "dialog");
  tip.setAttribute("aria-live", "assertive");
  tip.setAttribute("aria-label", `Guider step ${stepIndex + 1} of ${totalSteps}: ${title || ""}`);
  tip.innerHTML = `
    <div class="gd-step">Step ${stepIndex + 1} of ${totalSteps}</div>
    <div class="gd-title"></div>
    <div class="gd-body"></div>
    <div class="gd-actions">
      <button class="gd-secondary" type="button" data-act="skip" data-guider="guider-skip">Skip</button>
      <button type="button" data-act="next" data-guider="guider-next">${stepIndex + 1 === totalSteps ? "Done" : "Next"}</button>
    </div>
  `;
  tip.querySelector(".gd-title").textContent = title || "";
  tip.querySelector(".gd-body").textContent = body || "";
  root.appendChild(tip);
  tip.querySelector("[data-act=next]").onclick = () => onNext == null ? void 0 : onNext();
  tip.querySelector("[data-act=skip]").onclick = () => onSkip == null ? void 0 : onSkip();
  setTimeout(() => {
    var _a;
    return (_a = tip.querySelector("[data-act=next]")) == null ? void 0 : _a.focus({ preventScroll: true });
  }, 60);
  const reposition = () => {
    const r = element.getBoundingClientRect();
    const pad = 6;
    const W = innerWidth, H = innerHeight;
    masks[0].style.cssText = `top:0;left:0;width:${W}px;height:${Math.max(0, r.top - pad)}px;`;
    masks[1].style.cssText = `top:${r.bottom + pad}px;left:0;width:${W}px;height:${Math.max(0, H - r.bottom - pad)}px;`;
    masks[2].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:0;width:${Math.max(0, r.left - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    masks[3].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:${r.right + pad}px;width:${Math.max(0, W - r.right - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    ring.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;
    const tipW = 320, tipH = tip.offsetHeight || 110;
    let tx, ty, side;
    if (r.right + tipW + 24 < W) {
      tx = r.right + 18;
      ty = Math.max(8, Math.min(H - tipH - 8, r.top));
      side = "left";
    } else if (r.bottom + tipH + 24 < H) {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = r.bottom + 18;
      side = "top";
    } else {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = Math.max(8, r.top - tipH - 18);
      side = "bottom";
    }
    tip.style.left = `${tx}px`;
    tip.style.top = `${ty}px`;
    const ax = side === "left" ? r.right + 4 : r.left + r.width / 2 - 8;
    const ay = side === "top" ? r.bottom + 4 : side === "bottom" ? r.top - 12 : r.top + r.height / 2 - 8;
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    const c = getComputedStyle(root).getPropertyValue("--gd-accent") || "#f5d042";
    arrow.style.borderWidth = side === "left" ? "8px 14px 8px 0" : side === "top" ? "0 8px 14px 8px" : side === "bottom" ? "14px 8px 0 8px" : "8px 0 8px 14px";
    arrow.style.borderColor = side === "left" ? `transparent ${c} transparent transparent` : side === "top" ? `transparent transparent ${c} transparent` : side === "bottom" ? `${c} transparent transparent transparent` : `transparent transparent transparent ${c}`;
  };
  reposition();
  activeReposition = reposition;
  activeKeyHandlers = { next: onNext, skip: onSkip };
  if (!listenersAttached) {
    window.addEventListener("resize", onReposition, true);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("keydown", onKeydown, true);
    listenersAttached = true;
  }
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
    - "visualHint": describe the element visually (color, position, surrounding text).
    - "expectedRoute": if clicking navigates the user, the route they land on (else null).
    - "action": optional. { "kind": "click" } (default) | { "kind": "type", "value": "..." } |
                { "kind": "select", "value": "..." } | { "kind": "press", "key": "Enter" }.
- If you are NOT confident the element exists, return confidence "low" and a "fallbackMessage".
- Do not invent UI not in the map. Steps must be sequential.

Output JSON shape:
{ "steps": [...], "confidence": "high"|"medium"|"low", "fallbackMessage": "string|null" }`;
function compactMap(map, currentRoute) {
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
function buildMessages({ question, currentRoute, map, screenshotDataUrl }) {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Current route: ${currentRoute}

User question: ${question}

Site map (compacted):
${JSON.stringify(compactMap(map, currentRoute))}

Use the attached screenshot of the user's current viewport.`
        },
        { type: "image_url", image_url: { url: screenshotDataUrl } }
      ]
    }
  ];
}
async function planGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  apiKey,
  model = "gpt-5-nano-2025-08-07",
  endpoint = "https://api.openai.com/v1/chat/completions",
  proxy = null,
  signal
}) {
  var _a, _b, _c;
  const url = (proxy == null ? void 0 : proxy.plan) || endpoint;
  const headers = { "Content-Type": "application/json" };
  if (!proxy && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const body = proxy ? { question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl } : {
    model,
    response_format: { type: "json_object" },
    messages: buildMessages({ question, currentRoute, map, screenshotDataUrl })
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Guider plan failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = proxy ? JSON.stringify(data) : ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {
      steps: [],
      confidence: "low",
      fallbackMessage: "I'm not sure where to point you. Try rephrasing."
    };
  }
}
async function streamPlanGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  proxyUrl,
  signal,
  onStep
}) {
  if (!proxyUrl) throw new Error("streamPlanGuidance requires proxyUrl.");
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl }),
    signal
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Guider stream failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const steps = [];
  let confidence = "medium";
  let fallbackMessage = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = parseSse(raw);
      if (!ev) continue;
      if (ev.event === "step") {
        try {
          const s = JSON.parse(ev.data);
          steps.push(s);
          onStep == null ? void 0 : onStep(s, steps.length - 1);
        } catch {
        }
      } else if (ev.event === "done") {
        try {
          const d = JSON.parse(ev.data);
          confidence = d.confidence || confidence;
          fallbackMessage = d.fallbackMessage || null;
        } catch {
        }
      } else if (ev.event === "error") {
        throw new Error(ev.data || "stream error");
      }
    }
  }
  return { steps, confidence, fallbackMessage };
}
function parseSse(raw) {
  let event = "message", data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
  }
  return data ? { event, data } : null;
}

// src/agent/interact.js
async function click(el) {
  if (!el) throw new Error("click: element is null");
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  await sleep(120);
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y
  };
  el.dispatchEvent(new PointerEvent("pointerover", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new PointerEvent("pointerenter", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mouseover", opts));
  el.dispatchEvent(new MouseEvent("mousemove", opts));
  el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  if (typeof el.focus === "function") try {
    el.focus({ preventScroll: true });
  } catch {
  }
  el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  if (typeof el.click === "function") {
    el.click();
  } else {
    el.dispatchEvent(new MouseEvent("click", opts));
  }
}
async function type(el, text, { clear = true, perCharDelay = 12 } = {}) {
  if (!el) throw new Error("type: element is null");
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  if (typeof el.focus === "function") try {
    el.focus({ preventScroll: true });
  } catch {
  }
  await sleep(60);
  if (clear) {
    setNativeValue(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  const target = String(text);
  let buf = clear ? "" : el.value ?? "";
  for (const ch of target) {
    buf += ch;
    setNativeValue(el, buf);
    el.dispatchEvent(new InputEvent("input", { data: ch, bubbles: true, composed: true, inputType: "insertText" }));
    if (perCharDelay) await sleep(perCharDelay);
  }
  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
async function selectOption(el, value) {
  setNativeValue(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
async function press(target, key, { ctrlKey, shiftKey, altKey, metaKey } = {}) {
  const el = target || document.activeElement || document.body;
  const opts = { key, code: keyToCode(key), bubbles: true, cancelable: true, composed: true, ctrlKey, shiftKey, altKey, metaKey };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}
function setNativeValue(el, value) {
  var _a;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  (_a = desc == null ? void 0 : desc.set) == null ? void 0 : _a.call(el, value);
}
function keyToCode(key) {
  if (key.length === 1) return /[a-zA-Z]/.test(key) ? `Key${key.toUpperCase()}` : `Digit${key}`;
  return key;
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitForSettle({ quietMs = 350, timeoutMs = 4e3, root = document } = {}) {
  return new Promise((resolve) => {
    let timer = null;
    const tStart = Date.now();
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      if (Date.now() - tStart > timeoutMs) {
        obs.disconnect();
        resolve("timeout");
        return;
      }
      timer = setTimeout(() => {
        obs.disconnect();
        resolve("settled");
      }, quietMs);
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    timer = setTimeout(() => {
      obs.disconnect();
      resolve("settled");
    }, quietMs);
    setTimeout(() => {
      obs.disconnect();
      resolve("timeout");
    }, timeoutMs);
  });
}
function waitForRoute({ from = window.location.pathname, timeoutMs = 5e3 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.location.pathname !== from) return resolve(window.location.pathname);
      if (Date.now() - start > timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// src/agent/runner.js
async function runPlan(plan, {
  onProgress = () => {
  },
  signal,
  perStepTimeoutMs = 8e3,
  showHighlight = true,
  highlight
  // optional reference to widget/highlight.js
} = {}) {
  var _a;
  if (!((_a = plan == null ? void 0 : plan.steps) == null ? void 0 : _a.length)) return { status: "completed", steps: [] };
  const trace = [];
  for (let i = 0; i < plan.steps.length; i++) {
    if (signal == null ? void 0 : signal.aborted) {
      cleanupHighlight(highlight);
      return { status: "aborted", steps: trace };
    }
    const step = plan.steps[i];
    onProgress({ phase: "starting", index: i, step });
    const found = findElement(step.selectors);
    if (!found) {
      const err = `Step ${i + 1}: couldn't find "${step.title}". Hint: ${step.visualHint || "(none)"}.`;
      onProgress({ phase: "failed", index: i, step, error: err });
      trace.push({ index: i, status: "not-found", step });
      cleanupHighlight(highlight);
      return { status: "failed", steps: trace, reason: "element-not-found", failedStep: i };
    }
    const el = found.el;
    if (showHighlight && (highlight == null ? void 0 : highlight.show)) {
      try {
        await highlight.show({
          element: el,
          title: step.title,
          body: step.body || step.visualHint,
          stepIndex: i,
          totalSteps: plan.steps.length,
          onNext: () => {
          },
          onSkip: () => {
          }
        });
      } catch {
      }
    }
    const action = inferAction(step, el);
    try {
      const fromRoute = window.location.pathname;
      await Promise.race([
        executeAction(action, el),
        timeout(perStepTimeoutMs, `Step ${i + 1}: timed out`)
      ]);
      await waitForSettle({ quietMs: 300, timeoutMs: Math.min(perStepTimeoutMs, 4e3) });
      if (step.expectedRoute && step.expectedRoute !== fromRoute) {
        await waitForRoute({ from: fromRoute, timeoutMs: 4e3 });
      }
      trace.push({ index: i, status: "ok", step, action: action.kind });
      onProgress({ phase: "completed", index: i, step, action: action.kind });
      await sleep(150);
    } catch (e) {
      const reason = String((e == null ? void 0 : e.message) || e);
      trace.push({ index: i, status: "error", step, error: reason });
      onProgress({ phase: "failed", index: i, step, error: reason });
      cleanupHighlight(highlight);
      return { status: "failed", steps: trace, reason, failedStep: i };
    }
  }
  cleanupHighlight(highlight);
  return { status: "completed", steps: trace };
}
function cleanupHighlight(highlight) {
  if (highlight == null ? void 0 : highlight.cleanup) try {
    highlight.cleanup();
  } catch {
  }
}
function inferAction(step, el) {
  var _a;
  const a = step.action;
  if ((a == null ? void 0 : a.kind) === "type" && a.value != null) return { kind: "type", value: String(a.value), clear: a.clear !== false };
  if ((a == null ? void 0 : a.kind) === "select" && a.value != null) return { kind: "select", value: String(a.value) };
  if ((a == null ? void 0 : a.kind) === "press" && a.key) return { kind: "press", key: a.key };
  if ((a == null ? void 0 : a.kind) === "click") return { kind: "click" };
  const tag = (_a = el.tagName) == null ? void 0 : _a.toLowerCase();
  if (tag === "input" && /^(text|email|password|search|url|tel|number)?$/.test(el.type || "")) {
    if (step.value != null) return { kind: "type", value: step.value };
  }
  if (tag === "textarea" && step.value != null) return { kind: "type", value: step.value };
  if (tag === "select" && step.value != null) return { kind: "select", value: step.value };
  return { kind: "click" };
}
async function executeAction(action, el) {
  switch (action.kind) {
    case "click":
      return click(el);
    case "type":
      return type(el, action.value, { clear: action.clear });
    case "select":
      return selectOption(el, action.value);
    case "press":
      return press(el, action.key);
    default:
      throw new Error(`unknown action ${action.kind}`);
  }
}
function timeout(ms, msg) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}

// src/agent/index.js
var agentMode = {
  available: true,
  /**
   * Execute a plan returned by the widget LLM.
   *
   * @param {{
   *   plan: { steps: Array<{ title:string, body?:string, selectors:any[], visualHint?:string,
   *                          expectedRoute?:string|null, action?:{kind:string, value?:any, key?:string} }>,
   *           confidence: 'high'|'medium'|'low' },
   *   onProgress?: (event: { phase: 'starting'|'completed'|'failed', index: number, step: object, action?: string, error?: string }) => void,
   *   signal?: AbortSignal,
   *   showHighlight?: boolean,
   * }} args
   */
  async run({ plan, onProgress, signal, showHighlight = true }) {
    return runPlan(plan, { onProgress, signal, showHighlight, highlight: highlight_exports });
  }
};

// src/widget/GuiderWidget.jsx
var import_jsx_runtime = require("react/jsx-runtime");
function GuiderWidget({
  apiKey,
  mapUrl,
  map: mapProp,
  model,
  endpoint,
  whisperUrl,
  proxyUrl,
  currentRoute,
  position = "bottom-right",
  accent = "#f5d042",
  agent = true,
  greeting = 'Ask me where to find something \u2014 e.g. "How do I invite a teammate?"'
}) {
  var _a;
  const [open, setOpen] = (0, import_react.useState)(false);
  const [map, setMap] = (0, import_react.useState)(mapProp || null);
  const [messages, setMessages] = (0, import_react.useState)([]);
  const [input, setInput] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [recording, setRecording] = (0, import_react.useState)(false);
  const [steps, setSteps] = (0, import_react.useState)(null);
  const [stepIdx, setStepIdx] = (0, import_react.useState)(0);
  const [agentRunning, setAgentRunning] = (0, import_react.useState)(false);
  const [agentEnabled, setAgentEnabled] = (0, import_react.useState)(false);
  const recorderRef = (0, import_react.useRef)(null);
  const panelRef = (0, import_react.useRef)(null);
  const inputRef = (0, import_react.useRef)(null);
  const launcherRef = (0, import_react.useRef)(null);
  const liveRef = (0, import_react.useRef)(null);
  const abortRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
    var _a2;
    if (!open) {
      cleanup();
      setSteps(null);
      setStepIdx(0);
      (_a2 = abortRef.current) == null ? void 0 : _a2.abort();
    }
  }, [open]);
  (0, import_react.useEffect)(() => () => {
    var _a2;
    cleanup();
    (_a2 = abortRef.current) == null ? void 0 : _a2.abort();
  }, []);
  (0, import_react.useEffect)(() => {
    var _a2;
    if (!open) {
      (_a2 = launcherRef.current) == null ? void 0 : _a2.focus();
      return;
    }
    setTimeout(() => {
      var _a3;
      return (_a3 = inputRef.current) == null ? void 0 : _a3.focus();
    }, 30);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const announce = (0, import_react.useCallback)((text) => {
    if (liveRef.current) {
      liveRef.current.textContent = "";
      setTimeout(() => liveRef.current.textContent = text, 30);
    }
  }, []);
  const route = currentRoute || (typeof window !== "undefined" ? window.location.pathname : "/");
  const highlightStep = (0, import_react.useCallback)(async (plan, idx) => {
    var _a2;
    cleanup();
    if (!((_a2 = plan == null ? void 0 : plan.steps) == null ? void 0 : _a2[idx])) return;
    const step = plan.steps[idx];
    const found = findElement(step.selectors);
    if (!found) {
      const msg = `I couldn't find the exact element. Look for: ${step.visualHint || step.title}.`;
      setMessages((m) => [...m, { role: "assistant", text: msg, status: "visual-only" }]);
      announce(msg);
      return;
    }
    await show({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: idx,
      totalSteps: plan.steps.length,
      accent,
      onNext: () => {
        const next = idx + 1;
        if (next >= plan.steps.length) {
          cleanup();
          const done = "Done. Anything else?";
          setMessages((m) => [...m, { role: "assistant", text: done, status: "done" }]);
          announce(done);
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
  }, [accent, announce]);
  const ask = (0, import_react.useCallback)(async (question) => {
    var _a2, _b;
    if (!(question == null ? void 0 : question.trim())) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    setSteps(null);
    setStepIdx(0);
    cleanup();
    (_a2 = abortRef.current) == null ? void 0 : _a2.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const screenshotDataUrl = await captureViewport();
      let plan;
      if (proxyUrl) {
        const collected = { steps: [], confidence: "medium", fallbackMessage: null };
        plan = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: ctrl.signal,
          onStep: (s) => {
            collected.steps.push(s);
            if (collected.steps.length === 1 && !agentEnabled) {
              setSteps({ steps: collected.steps, confidence: "streaming" });
              highlightStep({ steps: collected.steps }, 0);
            }
          }
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
          signal: ctrl.signal
        });
      }
      if (plan.confidence === "low" || !((_b = plan.steps) == null ? void 0 : _b.length)) {
        const t = plan.fallbackMessage || "I'm not confident about where to point you. Could you rephrase?";
        setMessages((m) => [...m, { role: "assistant", text: t, status: "low-confidence" }]);
        announce(t);
      } else {
        setSteps(plan);
        const summary = `${plan.steps.length} step${plan.steps.length > 1 ? "s" : ""} \u2014 ${agentEnabled ? "I will execute them now." : "I'll walk you through."}`;
        setMessages((m) => [...m, { role: "assistant", text: summary, status: plan.confidence }]);
        announce(summary);
        if (agentEnabled) await runAgent(plan);
        else await highlightStep(plan, 0);
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      const t = `Sorry \u2014 ${String(e.message || e)}`;
      setMessages((m) => [...m, { role: "assistant", text: t, status: "error" }]);
      announce(t);
    } finally {
      setBusy(false);
    }
  }, [apiKey, map, model, endpoint, route, proxyUrl, agentEnabled, highlightStep, announce]);
  const runAgent = (0, import_react.useCallback)(async (plan) => {
    setAgentRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const result = await agentMode.run({
      plan,
      signal: ctrl.signal,
      showHighlight: true,
      onProgress: ({ phase, index, step, error }) => {
        if (phase === "completed") {
          setMessages((m) => [...m, { role: "assistant", text: `\u2713 ${step.title}`, status: "agent-step" }]);
          announce(`Step ${index + 1} done`);
        } else if (phase === "failed") {
          setMessages((m) => [...m, { role: "assistant", text: `Stopped: ${error}`, status: "error" }]);
          announce("Agent stopped");
        }
      }
    });
    cleanup();
    setAgentRunning(false);
    if (result.status === "completed") {
      setMessages((m) => [...m, { role: "assistant", text: "All done.", status: "done" }]);
    }
  }, [announce]);
  const onMicClick = (0, import_react.useCallback)(async () => {
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
        const text = whisperUrl ? await transcribeViaProxy(blob, whisperUrl) : await transcribeWithWhisper(blob, apiKey);
        setBusy(false);
        if (text) {
          setInput("");
          ask(text);
        } else setMessages((m) => [...m, { role: "assistant", text: "I didn't catch that. Try again or type it.", status: "low-confidence" }]);
      }
    } catch (e) {
      setRecording(false);
      setBusy(false);
      setMessages((m) => [...m, { role: "assistant", text: `Voice error: ${e.message}. Type instead.`, status: "error" }]);
    }
  }, [recording, apiKey, whisperUrl, ask]);
  const onSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    ask(q);
  };
  const right = position === "bottom-right";
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const statusText = busy ? "Thinking..." : agentRunning ? "Agent is moving through the flow." : recording ? "Listening..." : (latestAssistant == null ? void 0 : latestAssistant.text) || greeting;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        ref: launcherRef,
        "data-guider": "guider-launcher",
        "aria-label": open ? "Close Guider" : "Open Guider assistant",
        "aria-expanded": open,
        "aria-controls": "guider-panel",
        onClick: () => setOpen((v) => !v),
        style: {
          position: "fixed",
          bottom: 20,
          [right ? "right" : "left"]: 20,
          zIndex: 2147483646,
          width: 20,
          height: 20,
          borderRadius: 999,
          border: `1px solid ${hexAlpha(accent, 0.5)}`,
          cursor: "pointer",
          background: "#ffffff",
          color: "#111111",
          boxShadow: `0 0 0 6px ${hexAlpha(accent, 0.15)}, 0 14px 28px rgba(0,0,0,.18)`,
          display: "grid",
          placeItems: "center",
          padding: 0
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "span",
          {
            "aria-hidden": "true",
            style: { width: 6, height: 6, borderRadius: "50%", background: accent, display: "block" }
          }
        )
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        id: "guider-panel",
        ref: panelRef,
        "data-guider": "guider-panel",
        role: "dialog",
        "aria-modal": "false",
        "aria-label": "Guider assistant",
        style: {
          position: "fixed",
          bottom: 54,
          [right ? "right" : "left"]: 20,
          zIndex: 2147483646,
          width: 420,
          maxWidth: "calc(100vw - 24px)",
          display: "grid",
          gap: 8,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto'
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              role: "status",
              "aria-live": "polite",
              style: {
                justifySelf: right ? "end" : "start",
                maxWidth: "min(420px, calc(100vw - 24px))",
                background: "rgba(255,255,255,0.94)",
                color: "#111111",
                border: "1px solid rgba(17,17,17,0.08)",
                borderRadius: 18,
                padding: "10px 14px",
                boxShadow: "0 14px 32px rgba(0,0,0,.12)",
                backdropFilter: "blur(18px)"
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "aria-hidden": "true", style: { width: 7, height: 7, borderRadius: "50%", background: accent, flex: "0 0 auto" } }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { minWidth: 0, flex: 1 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#6b7280", marginBottom: 2 }, children: agentEnabled ? "Agent ready" : "Guide ready" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12.5, lineHeight: 1.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: statusText })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 10, color: "#6b7280", flex: "0 0 auto" }, children: map ? `${((_a = map.pages) == null ? void 0 : _a.length) || 0} pages` : "loading" })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: liveRef, "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", width: 1, height: 1, overflow: "hidden", whiteSpace: "nowrap" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "form",
            {
              onSubmit,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                background: "rgba(255,255,255,0.98)",
                color: "#111111",
                border: "1px solid rgba(17,17,17,0.08)",
                borderRadius: 999,
                boxShadow: "0 18px 40px rgba(0,0,0,.14)",
                backdropFilter: "blur(18px)"
              },
              children: [
                agent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    "data-guider": "guider-agent-toggle",
                    onClick: () => setAgentEnabled((v) => !v),
                    "aria-pressed": agentEnabled,
                    title: agentEnabled ? "Agent will execute steps" : "Agent disabled \u2014 guided mode",
                    style: {
                      background: agentEnabled ? "#111111" : "transparent",
                      color: agentEnabled ? "#ffffff" : "#6b7280",
                      border: "1px solid rgba(17,17,17,0.08)",
                      borderRadius: 999,
                      padding: "0 10px",
                      height: 36,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      flex: "0 0 auto"
                    },
                    children: "agent"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    "data-guider": "guider-mic",
                    onClick: onMicClick,
                    "aria-label": recording ? "Stop recording" : "Start voice recording",
                    "aria-pressed": recording,
                    style: {
                      background: recording ? "#111111" : "transparent",
                      color: recording ? "#ffffff" : "#6b7280",
                      border: "1px solid rgba(17,17,17,0.08)",
                      borderRadius: 999,
                      width: 36,
                      height: 36,
                      cursor: "pointer",
                      fontSize: 13,
                      flex: "0 0 auto"
                    },
                    children: recording ? "Stop" : "Mic"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    ref: inputRef,
                    "data-guider": "guider-input",
                    value: input,
                    onChange: (e) => setInput(e.target.value),
                    placeholder: recording ? "Recording..." : "Ask where anything lives",
                    disabled: recording || busy || agentRunning,
                    "aria-label": "Message Guider",
                    style: {
                      flex: 1,
                      background: "transparent",
                      color: "#111111",
                      border: "none",
                      padding: "0 6px",
                      outline: "none",
                      fontSize: 14,
                      minWidth: 0
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "submit",
                    "data-guider": "guider-send",
                    disabled: !input.trim() || busy || agentRunning,
                    style: {
                      background: "#111111",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 999,
                      padding: "0 14px",
                      height: 36,
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: !input.trim() || busy || agentRunning ? 0.5 : 1
                    },
                    children: "Go"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    "data-guider": "guider-close",
                    onClick: () => setOpen(false),
                    "aria-label": "Close Guider",
                    style: {
                      background: "transparent",
                      color: "#6b7280",
                      border: "none",
                      cursor: "pointer",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      fontSize: 16,
                      flex: "0 0 auto"
                    },
                    children: "\xD7"
                  }
                )
              ]
            }
          )
        ]
      }
    )
  ] });
}
async function transcribeViaProxy(blob, url) {
  const fd = new FormData();
  fd.append("file", blob, "voice.webm");
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Whisper proxy failed (${res.status})`);
  const data = await res.json();
  return data.text || "";
}
function hexAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex || "");
  if (!m) return `rgba(245,208,66,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// src/widget/context.js
var import_react2 = __toESM(require("react"), 1);
var Ctx = (0, import_react2.createContext)(null);
function GuiderProvider({ children, value }) {
  return import_react2.default.createElement(Ctx.Provider, { value }, children);
}
function useGuider() {
  return (0, import_react2.useContext)(Ctx);
}
