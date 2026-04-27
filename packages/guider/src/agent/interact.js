/**
 * In-page DOM interaction primitives.
 *
 * Why not Playwright/CDP? We live INSIDE the user's page, so we can't open a
 * DevTools session. The constraint we accept: dispatched events are not
 * `isTrusted`, so APIs gated on user activation (clipboard write, fullscreen,
 * file picker) won't work. For ~95% of UI flows (clicks, typing, keyboard,
 * form submission, navigation) this is fine because React 17+/Vue/Svelte all
 * use root-level event delegation that fires on bubbled native events
 * regardless of trust.
 *
 * What this gives us:
 *  - click()  : full pointer sequence (mouseover → mousedown → mouseup → click)
 *               with element.click() fallback for native buttons/links
 *  - type()   : native input value setter (bypasses React's controlled-input
 *               cache) + bubbling + composed `input` event
 *  - press()  : keydown / keypress / keyup sequence
 *  - select() : <select> change with native value setter
 *  - waitForSettle(): MutationObserver-based DOM-quiescence wait
 *  - waitForRoute(): waits for window.location to change
 */

export async function click(el) {
  if (!el) throw new Error('click: element is null');
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  await sleep(120);

  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true, cancelable: true, composed: true, view: window,
    button: 0, buttons: 1, clientX: x, clientY: y,
  };

  // Pointer + mouse sequence — most components listen on click; some on
  // pointerdown (radix). Firing the full sequence is safest.
  el.dispatchEvent(new PointerEvent('pointerover', { ...opts, pointerType: 'mouse' }));
  el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseover', opts));
  el.dispatchEvent(new MouseEvent('mousemove', opts));
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', opts));

  // focus before click so :focus-visible styles + onFocus handlers fire
  if (typeof el.focus === 'function') try { el.focus({ preventScroll: true }); } catch {}

  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));

  // Native click() invokes the element's default action (form submit, anchor
  // navigation, checkbox toggle) — better than only synthesizing the event.
  if (typeof el.click === 'function') {
    el.click();
  } else {
    el.dispatchEvent(new MouseEvent('click', opts));
  }
}

export async function type(el, text, { clear = true, perCharDelay = 12 } = {}) {
  if (!el) throw new Error('type: element is null');
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  if (typeof el.focus === 'function') try { el.focus({ preventScroll: true }); } catch {}
  await sleep(60);

  if (clear) {
    setNativeValue(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  const target = String(text);
  let buf = clear ? '' : (el.value ?? '');
  for (const ch of target) {
    buf += ch;
    setNativeValue(el, buf);
    el.dispatchEvent(new InputEvent('input', { data: ch, bubbles: true, composed: true, inputType: 'insertText' }));
    if (perCharDelay) await sleep(perCharDelay);
  }
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

export async function selectOption(el, value) {
  setNativeValue(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

export async function press(target, key, { ctrlKey, shiftKey, altKey, metaKey } = {}) {
  const el = target || document.activeElement || document.body;
  const opts = { key, code: keyToCode(key), bubbles: true, cancelable: true, composed: true, ctrlKey, shiftKey, altKey, metaKey };
  el.dispatchEvent(new KeyboardEvent('keydown', opts));
  el.dispatchEvent(new KeyboardEvent('keypress', opts));
  el.dispatchEvent(new KeyboardEvent('keyup', opts));
}

/**
 * React (and Vue/Svelte) override the input.value setter. To trigger a real
 * input event we have to call the prototype's setter directly.
 */
function setNativeValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
              : el instanceof HTMLSelectElement   ? HTMLSelectElement.prototype
              :                                     HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
}

function keyToCode(key) {
  if (key.length === 1) return /[a-zA-Z]/.test(key) ? `Key${key.toUpperCase()}` : `Digit${key}`;
  return key; // Enter, Escape, ArrowDown, etc.
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve when the DOM has been quiet for `quietMs` (no mutations in window).
 * Caps at `timeoutMs` even if the page never settles.
 */
export function waitForSettle({ quietMs = 350, timeoutMs = 4000, root = document } = {}) {
  return new Promise((resolve) => {
    let timer = null;
    const tStart = Date.now();
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      if (Date.now() - tStart > timeoutMs) { obs.disconnect(); resolve('timeout'); return; }
      timer = setTimeout(() => { obs.disconnect(); resolve('settled'); }, quietMs);
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    timer = setTimeout(() => { obs.disconnect(); resolve('settled'); }, quietMs);
    // Hard ceiling
    setTimeout(() => { obs.disconnect(); resolve('timeout'); }, timeoutMs);
  });
}

export function waitForRoute({ from = window.location.pathname, timeoutMs = 5000 } = {}) {
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

export { sleep };
