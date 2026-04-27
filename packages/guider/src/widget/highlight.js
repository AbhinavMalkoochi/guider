/**
 * Highlight overlay engine.
 *
 * Improvements (v0.2):
 *  - Respects prefers-reduced-motion: no pulse, no scroll smoothing
 *  - High-contrast mode: simpler ring + black/yellow tooltip
 *  - Tooltip is keyboard-accessible (Tab → buttons; Enter = next; Esc = skip)
 *  - aria-live="assertive" so screen readers announce the step
 *  - Cleanup is idempotent
 */
const ROOT_ID = 'guider-highlight-root';
const STYLE_ID = 'guider-highlight-style';

let activeReposition = null;
let listenersAttached = false;
let lastPointer = getInitialPointer();

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .18);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 16px;
      ${reduce ? '' : 'transition: all .34s cubic-bezier(.2,.8,.2,1);'}
    }
    #${ROOT_ID} .gd-pointer {
      position: fixed;
      width: 24px;
      height: 24px;
      transform-origin: 7px 7px;
      ${reduce ? '' : 'transition: left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1);'}
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
      ${reduce ? '' : 'transition: left .34s cubic-bezier(.2,.8,.2,1), top .34s cubic-bezier(.2,.8,.2,1), width .34s cubic-bezier(.2,.8,.2,1), transform .34s cubic-bezier(.2,.8,.2,1);'}
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
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  if (accent) root.style.setProperty('--gd-accent', accent);
  return root;
}

export function cleanup() {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  if (listenersAttached) {
    window.removeEventListener('resize', onReposition, true);
    window.removeEventListener('scroll', onReposition, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('keydown', onKeydown, true);
    listenersAttached = false;
  }
  activeReposition = null;
  activeKeyHandlers = null;
}

let activeKeyHandlers = null;
function onReposition() { activeReposition?.(); }
function onMouseMove(e) { lastPointer = { x: e.clientX, y: e.clientY }; }
function onKeydown(e) {
  if (!activeKeyHandlers) return;
  if (e.key === 'Escape') { e.preventDefault(); activeKeyHandlers.skip?.(); }
  if (e.key === 'Enter' && (e.target?.closest?.(`#${ROOT_ID}`) || document.activeElement === document.body)) {
    e.preventDefault();
    activeKeyHandlers.next?.();
  }
}

function getInitialPointer() {
  if (typeof window === 'undefined') {
    return { x: 640, y: 640 };
  }
  return {
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight - 80),
  };
}

export async function show({ element, title, body, stepIndex, totalSteps, accent, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = '';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'center' });
  await new Promise((r) => setTimeout(r, reduce ? 0 : 250));

  const focus = document.createElement('div'); focus.className = 'gd-focus'; root.appendChild(focus);
  const pointer = document.createElement('div'); pointer.className = 'gd-pointer'; root.appendChild(pointer);
  const line = document.createElement('div'); line.className = 'gd-line'; root.appendChild(line);

  const tip = document.createElement('div');
  tip.className = 'gd-tip';
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-live', 'assertive');
  tip.setAttribute('aria-label', `Guider step ${stepIndex + 1} of ${totalSteps}: ${title || ''}`);
  tip.innerHTML = `
    <div class="gd-step">Step ${stepIndex + 1} of ${totalSteps}</div>
    <div class="gd-title"></div>
    <div class="gd-body"></div>
    <div class="gd-actions">
      <button class="gd-secondary" type="button" data-act="skip" data-guider="guider-skip">Skip</button>
      <button type="button" data-act="next" data-guider="guider-next">${stepIndex + 1 === totalSteps ? 'Done' : 'Next'}</button>
    </div>
  `;
  tip.querySelector('.gd-title').textContent = title || '';
  tip.querySelector('.gd-body').textContent = body || '';
  root.appendChild(tip);

  tip.querySelector('[data-act=next]').onclick = () => onNext?.();
  tip.querySelector('[data-act=skip]').onclick = () => onSkip?.();

  // focus the primary action so keyboard users can hit Enter immediately
  setTimeout(() => tip.querySelector('[data-act=next]')?.focus({ preventScroll: true }), 60);

  const reposition = () => {
    const r = element.getBoundingClientRect();
    const pad = 10;
    const W = innerWidth, H = innerHeight;
    focus.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;

    const tipW = Math.min(280, W - 24);
    const tipH = tip.offsetHeight || 110;
    let tx, ty, side;
    if (r.right + tipW + 24 < W) { tx = r.right + 18; ty = Math.max(8, Math.min(H - tipH - 8, r.top)); side = 'left'; }
    else if (r.bottom + tipH + 24 < H) { tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = r.bottom + 18; side = 'top'; }
    else { tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = Math.max(8, r.top - tipH - 18); side = 'bottom'; }
    tip.style.left = `${tx}px`; tip.style.top = `${ty}px`;

    const targetX = r.left + Math.min(r.width * 0.45, 22);
    const targetY = r.top + Math.min(r.height * 0.5, 22);
    pointer.style.left = `${targetX}px`;
    pointer.style.top = `${targetY}px`;

    const startX = lastPointer.x;
    const startY = lastPointer.y;
    const endX = tx + (side === 'left' ? 0 : tipW * 0.5);
    const endY = ty + (side === 'top' ? 0 : tipH * 0.5);
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
    window.addEventListener('resize', onReposition, true);
    window.addEventListener('scroll', onReposition, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('keydown', onKeydown, true);
    listenersAttached = true;
  }
}
