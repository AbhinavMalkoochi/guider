"use client";
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/agent/index.ts
var index_exports = {};
__export(index_exports, {
  agentMode: () => agentMode,
  runPlan: () => runPlan
});
module.exports = __toCommonJS(index_exports);

// src/widget/selectors.ts
var KIND_WEIGHT = {
  "data-guider": 100,
  testid: 90,
  aria: 82,
  "role-name": 74,
  text: 60,
  css: 42
};
function findElement(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const matches = [];
  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate);
    for (const element of resolved) {
      if (!isVisible(element)) continue;
      matches.push({
        el: element,
        matched: candidate,
        score: scoreElement(candidate, element)
      });
    }
  }
  matches.sort((left, right) => right.score - left.score);
  return matches[0] ? { el: matches[0].el, matched: matches[0].matched } : null;
}
function resolveCandidate(candidate) {
  if (!candidate) return [];
  if (typeof candidate === "string") {
    return querySelectorAllSafe(candidate);
  }
  switch (candidate.kind) {
    case "css":
      return querySelectorAllSafe(candidate.value || "");
    case "data-guider":
      return querySelectorAllSafe(`[data-guider="${cssEscape(candidate.value)}"]`);
    case "testid":
      return querySelectorAllSafe(`[data-testid="${cssEscape(candidate.value)}"]`);
    case "aria":
      return querySelectorAllSafe(`[aria-label="${cssEscape(candidate.value)}"]`);
    case "role-name":
      return findByRoleName(candidate.role, candidate.name);
    case "text":
      return findByText(candidate.value, candidate.tag);
    default:
      return [];
  }
}
function querySelectorAllSafe(selector) {
  if (!selector) return [];
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}
function findByRoleName(role, name) {
  if (!role || !name) return [];
  const query = String(name).trim().toLowerCase();
  if (!query) return [];
  const elements = document.querySelectorAll(`[role="${cssEscape(role)}"]`);
  return Array.from(elements).filter((element) => {
    const accessibleName = getAccessibleName(element).toLowerCase();
    return accessibleName === query || accessibleName.includes(query);
  });
}
function findByText(text, tag) {
  const query = String(text || "").trim().toLowerCase();
  if (!query) return [];
  const selector = tag || "a, button, input, [role=button], [role=link], [role=tab], summary, label";
  return Array.from(document.querySelectorAll(selector)).filter((element) => {
    const valueText = getAccessibleName(element).toLowerCase();
    return valueText === query || valueText.includes(query);
  });
}
function getAccessibleName(element) {
  return (element.getAttribute("aria-label") || (element instanceof HTMLInputElement ? element.value : "") || element.textContent || "").trim();
}
function scoreElement(candidate, element) {
  const kind = typeof candidate === "string" ? "css" : candidate.kind || "css";
  const rect = element.getBoundingClientRect();
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const elementArea = Math.max(1, rect.width * rect.height);
  const areaScore = Math.min(18, elementArea / viewportArea * 240);
  const viewportScore = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? 10 : 0;
  const occlusionPenalty = isOccluded(element) ? -50 : 0;
  const exactNameBonus = typeof candidate === "object" && candidate.value ? getAccessibleName(element).toLowerCase() === candidate.value.toLowerCase() ? 12 : 0 : 0;
  return (KIND_WEIGHT[kind] || 0) + areaScore + viewportScore + exactNameBonus + occlusionPenalty;
}
function isVisible(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const styles = getComputedStyle(element);
  if (styles.visibility === "hidden" || styles.display === "none" || parseFloat(styles.opacity) === 0) {
    return false;
  }
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}
function isOccluded(element) {
  const rect = element.getBoundingClientRect();
  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + 8, y: rect.top + 8 },
    { x: rect.right - 8, y: rect.bottom - 8 }
  ].filter((point) => point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight);
  for (const point of points) {
    const topElement = document.elementFromPoint(point.x, point.y);
    if (!topElement) continue;
    if (topElement === element || element.contains(topElement)) {
      return false;
    }
  }
  return points.length > 0;
}
function cssEscape(value) {
  return String(value || "").replace(/["\\]/g, "\\$&");
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

// src/widget/highlight.ts
var highlight_exports = {};
__export(highlight_exports, {
  cleanup: () => cleanup,
  show: () => show
});
var ROOT_ID = "guider-highlight-root";
var STYLE_ID = "guider-highlight-style";
var activeReposition = null;
var listenersAttached = false;
var lastPointer = getInitialPointer();
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .16);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 18px;
      ${reduceMotion ? "" : "transition: all .22s ease-out;"}
    }
    #${ROOT_ID} .gd-target {
      position: fixed;
      width: 34px;
      height: 34px;
      margin-left: -10px;
      margin-top: -10px;
      transform-origin: 7px 7px;
      ${reduceMotion ? "" : "transition: left .18s ease-out, top .18s ease-out;"}
    }
    #${ROOT_ID} .gd-target::before {
      content: '';
      position: absolute;
      inset: 0;
      clip-path: polygon(2% 2%, 74% 56%, 49% 61%, 64% 100%, 48% 100%, 34% 66%, 2% 2%);
      background: var(--gd-accent, #3b82f6);
      filter: drop-shadow(0 12px 22px rgba(59, 130, 246, .28));
    }
    #${ROOT_ID} .gd-target::after {
      content: '';
      position: absolute;
      left: -10px;
      top: -10px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, .24);
      background: rgba(59, 130, 246, .08);
    }
    #${ROOT_ID} .gd-follower {
      position: fixed;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      margin-top: -9px;
      border-radius: 999px;
      border: 1px solid rgba(15, 23, 42, .12);
      background: rgba(255, 255, 255, .78);
      box-shadow: 0 10px 22px rgba(15, 23, 42, .12);
      backdrop-filter: blur(10px);
      ${reduceMotion ? "" : "transition: left .08s linear, top .08s linear;"}
    }
    #${ROOT_ID} .gd-line {
      position: fixed;
      height: 2px;
      transform-origin: 0 50%;
      background: linear-gradient(90deg, rgba(59,130,246,.42), rgba(59,130,246,.92));
      ${reduceMotion ? "" : "transition: left .08s linear, top .08s linear, width .12s ease-out, transform .12s ease-out;"}
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
    }
    #${ROOT_ID} .gd-title { font-weight: 700; margin-bottom: 4px; }
    #${ROOT_ID} .gd-body { color: rgba(17, 24, 39, .72); }
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
  if (accent) {
    root.style.setProperty("--gd-accent", accent);
  }
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
    listenersAttached = false;
  }
  activeReposition = null;
}
function onReposition() {
  activeReposition == null ? void 0 : activeReposition();
}
function onMouseMove(event) {
  lastPointer = { x: event.clientX, y: event.clientY };
  activeReposition == null ? void 0 : activeReposition();
}
function getInitialPointer() {
  if (typeof window === "undefined") {
    return { x: 640, y: 640 };
  }
  return {
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight - 80)
  };
}
async function show({ element, title, body, accent }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = "";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "center" });
  await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 180));
  const focus = document.createElement("div");
  focus.className = "gd-focus";
  root.appendChild(focus);
  const follower = document.createElement("div");
  follower.className = "gd-follower";
  root.appendChild(follower);
  const line = document.createElement("div");
  line.className = "gd-line";
  root.appendChild(line);
  const target = document.createElement("div");
  target.className = "gd-target";
  root.appendChild(target);
  const tip = document.createElement("div");
  tip.className = "gd-tip";
  tip.setAttribute("role", "status");
  tip.innerHTML = `
    <div class="gd-title"></div>
    <div class="gd-body"></div>
  `;
  const titleElement = tip.querySelector(".gd-title");
  const bodyElement = tip.querySelector(".gd-body");
  if (titleElement) {
    titleElement.textContent = title || "Go here";
  }
  if (bodyElement) {
    bodyElement.textContent = body || "";
  }
  root.appendChild(tip);
  const reposition = () => {
    const rect = element.getBoundingClientRect();
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    focus.style.cssText = `top:${rect.top - padding}px;left:${rect.left - padding}px;width:${rect.width + 2 * padding}px;height:${rect.height + 2 * padding}px;`;
    const tipWidth = Math.min(280, viewportWidth - 24);
    const tipHeight = tip.offsetHeight || 96;
    let tipLeft = rect.right + 20;
    let tipTop = Math.max(8, Math.min(viewportHeight - tipHeight - 8, rect.top));
    if (tipLeft + tipWidth > viewportWidth - 8) {
      tipLeft = Math.max(8, Math.min(viewportWidth - tipWidth - 8, rect.left));
      tipTop = rect.bottom + tipHeight + 20 < viewportHeight ? rect.bottom + 18 : Math.max(8, rect.top - tipHeight - 18);
    }
    tip.style.left = `${tipLeft}px`;
    tip.style.top = `${tipTop}px`;
    const targetX = rect.left + Math.min(rect.width * 0.5, 30);
    const targetY = rect.top + Math.min(rect.height * 0.5, 30);
    const startX = lastPointer.x;
    const startY = lastPointer.y;
    follower.style.left = `${startX}px`;
    follower.style.top = `${startY}px`;
    target.style.left = `${targetX}px`;
    target.style.top = `${targetY}px`;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.max(0, Math.hypot(dx, dy) - 18);
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
  };
  reposition();
  activeReposition = reposition;
  if (!listenersAttached) {
    window.addEventListener("resize", onReposition, true);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousemove", onMouseMove, true);
    listenersAttached = true;
  }
}

// src/agent/index.ts
var agentMode = {
  available: true,
  async run({
    plan,
    onProgress,
    signal,
    showHighlight = true
  }) {
    const progressHandler = onProgress ? (event) => onProgress(event) : void 0;
    return runPlan(plan, {
      onProgress: progressHandler,
      signal,
      showHighlight,
      highlight: highlight_exports
    });
  }
};
