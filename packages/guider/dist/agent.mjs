"use client";
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
var lastPointer = { x: Math.round(window.innerWidth * 0.5), y: Math.round(window.innerHeight - 80) };
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .18);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 16px;
      ${reduce ? "" : "transition: all .34s cubic-bezier(.2,.8,.2,1);"}
    }
    #${ROOT_ID} .gd-pointer {
      position: fixed;
      width: 24px;
      height: 24px;
      transform-origin: 7px 7px;
      ${reduce ? "" : "transition: left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1);"}
    }
    #${ROOT_ID} .gd-pointer::before {
      content: '';
      position: absolute;
      inset: 0;
      clip-path: polygon(0 0, 68% 58%, 43% 63%, 57% 100%, 43% 100%, 31% 66%, 0 0);
      background: var(--gd-accent, #3b82f6);
      filter: drop-shadow(0 10px 18px rgba(59, 130, 246, .28));
    }
    #${ROOT_ID} .gd-pointer::after {
      content: '';
      position: absolute;
      left: -6px;
      top: -6px;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, .22);
      background: rgba(59, 130, 246, .08);
    }
    #${ROOT_ID} .gd-tip {
      position: fixed;
      max-width: 280px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, .96);
      color: #111827;
      border: 1px solid rgba(15, 23, 42, .08);
      border-radius: 18px;
      font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 22px 44px rgba(15, 23, 42, .14);
      backdrop-filter: blur(18px);
      pointer-events: auto;
    }
    #${ROOT_ID} .gd-tip:focus-within { outline: 2px solid rgba(59, 130, 246, .34); outline-offset: 2px; }
    #${ROOT_ID} .gd-tip .gd-step {
      color: rgba(17, 24, 39, .5);
      font-size: 10px;
      letter-spacing: .16em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    #${ROOT_ID} .gd-tip .gd-title { font-weight: 700; margin-bottom: 4px; }
    #${ROOT_ID} .gd-tip .gd-body { color: rgba(17, 24, 39, .72); }
    #${ROOT_ID} .gd-tip .gd-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: flex-start; }
    #${ROOT_ID} .gd-tip button {
      background: #111827;
      color: #fff;
      border: 0;
      padding: 8px 12px;
      border-radius: 999px;
      font: 600 12px ui-sans-serif, system-ui;
      cursor: pointer;
    }
    #${ROOT_ID} .gd-tip button.gd-secondary {
      background: transparent;
      color: rgba(17, 24, 39, .65);
      border: 1px solid rgba(15, 23, 42, .08);
    }
    #${ROOT_ID} .gd-tip button:focus-visible { outline: 2px solid rgba(59, 130, 246, .34); outline-offset: 2px; }
    #${ROOT_ID} .gd-line {
      position: fixed;
      height: 1px;
      transform-origin: 0 50%;
      background: linear-gradient(90deg, rgba(59,130,246,.72), rgba(59,130,246,0));
      ${reduce ? "" : "transition: left .34s cubic-bezier(.2,.8,.2,1), top .34s cubic-bezier(.2,.8,.2,1), width .34s cubic-bezier(.2,.8,.2,1), transform .34s cubic-bezier(.2,.8,.2,1);"}
    }
    @media (prefers-contrast: more) {
      #${ROOT_ID} .gd-focus { box-shadow: 0 0 0 4px rgba(255,255,255,.4); }
      #${ROOT_ID} .gd-tip { background: #fff; color: #000; border-color: #000; }
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
    document.removeEventListener("mousemove", onMouseMove, true);
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
function onMouseMove(e) {
  lastPointer = { x: e.clientX, y: e.clientY };
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
  const focus = document.createElement("div");
  focus.className = "gd-focus";
  root.appendChild(focus);
  const pointer = document.createElement("div");
  pointer.className = "gd-pointer";
  root.appendChild(pointer);
  const line = document.createElement("div");
  line.className = "gd-line";
  root.appendChild(line);
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
    const pad = 10;
    const W = innerWidth, H = innerHeight;
    focus.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;
    const tipW = Math.min(280, W - 24);
    const tipH = tip.offsetHeight || 110;
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
    const targetX = r.left + Math.min(r.width * 0.45, 22);
    const targetY = r.top + Math.min(r.height * 0.5, 22);
    pointer.style.left = `${targetX}px`;
    pointer.style.top = `${targetY}px`;
    const startX = lastPointer.x;
    const startY = lastPointer.y;
    const endX = tx + (side === "left" ? 0 : tipW * 0.5);
    const endY = ty + (side === "top" ? 0 : tipH * 0.5);
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    lastPointer = { x: targetX, y: targetY };
  };
  reposition();
  activeReposition = reposition;
  activeKeyHandlers = { next: onNext, skip: onSkip };
  if (!listenersAttached) {
    window.addEventListener("resize", onReposition, true);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("keydown", onKeydown, true);
    listenersAttached = true;
  }
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
export {
  agentMode,
  runPlan
};
