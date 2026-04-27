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

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-mask {
      position: fixed; background: rgba(8, 10, 18, .58); pointer-events: auto;
      ${reduce ? '' : 'transition: all .2s ease;'}
    }
    #${ROOT_ID} .gd-ring {
      position: fixed; pointer-events: none; border: 2px solid var(--gd-accent, #f5d042);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--gd-accent, #f5d042) 25%, transparent),
                  0 0 32px color-mix(in srgb, var(--gd-accent, #f5d042) 60%, transparent);
      border-radius: 10px;
      ${reduce
        ? ''
        : 'transition: all .25s cubic-bezier(.2,.8,.2,1); animation: gd-pulse 1.6s ease-in-out infinite;'}
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
    document.removeEventListener('keydown', onKeydown, true);
    listenersAttached = false;
  }
  activeReposition = null;
  activeKeyHandlers = null;
}

let activeKeyHandlers = null;
function onReposition() { activeReposition?.(); }
function onKeydown(e) {
  if (!activeKeyHandlers) return;
  if (e.key === 'Escape') { e.preventDefault(); activeKeyHandlers.skip?.(); }
  if (e.key === 'Enter' && (e.target?.closest?.(`#${ROOT_ID}`) || document.activeElement === document.body)) {
    e.preventDefault();
    activeKeyHandlers.next?.();
  }
}

export async function show({ element, title, body, stepIndex, totalSteps, accent, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = '';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'center' });
  await new Promise((r) => setTimeout(r, reduce ? 0 : 250));

  const masks = Array.from({ length: 4 }, () => {
    const d = document.createElement('div'); d.className = 'gd-mask'; root.appendChild(d); return d;
  });
  const ring = document.createElement('div'); ring.className = 'gd-ring'; root.appendChild(ring);
  const arrow = document.createElement('div'); arrow.className = 'gd-arrow'; root.appendChild(arrow);

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
    const pad = 6;
    const W = innerWidth, H = innerHeight;
    masks[0].style.cssText = `top:0;left:0;width:${W}px;height:${Math.max(0, r.top - pad)}px;`;
    masks[1].style.cssText = `top:${r.bottom + pad}px;left:0;width:${W}px;height:${Math.max(0, H - r.bottom - pad)}px;`;
    masks[2].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:0;width:${Math.max(0, r.left - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    masks[3].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:${r.right + pad}px;width:${Math.max(0, W - r.right - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    ring.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;

    const tipW = 320, tipH = tip.offsetHeight || 110;
    let tx, ty, side;
    if (r.right + tipW + 24 < W) { tx = r.right + 18; ty = Math.max(8, Math.min(H - tipH - 8, r.top)); side = 'left'; }
    else if (r.bottom + tipH + 24 < H) { tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = r.bottom + 18; side = 'top'; }
    else { tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = Math.max(8, r.top - tipH - 18); side = 'bottom'; }
    tip.style.left = `${tx}px`; tip.style.top = `${ty}px`;

    const ax = side === 'left' ? r.right + 4 : r.left + r.width / 2 - 8;
    const ay = side === 'top' ? r.bottom + 4 : side === 'bottom' ? r.top - 12 : r.top + r.height / 2 - 8;
    arrow.style.left = `${ax}px`; arrow.style.top = `${ay}px`;
    const c = getComputedStyle(root).getPropertyValue('--gd-accent') || '#f5d042';
    arrow.style.borderWidth =
      side === 'left' ? '8px 14px 8px 0' :
      side === 'top' ? '0 8px 14px 8px' :
      side === 'bottom' ? '14px 8px 0 8px' : '8px 0 8px 14px';
    arrow.style.borderColor =
      side === 'left' ? `transparent ${c} transparent transparent` :
      side === 'top' ? `transparent transparent ${c} transparent` :
      side === 'bottom' ? `${c} transparent transparent transparent` :
      `transparent transparent transparent ${c}`;
  };

  reposition();
  activeReposition = reposition;
  activeKeyHandlers = { next: onNext, skip: onSkip };
  if (!listenersAttached) {
    window.addEventListener('resize', onReposition, true);
    window.addEventListener('scroll', onReposition, true);
    document.addEventListener('keydown', onKeydown, true);
    listenersAttached = true;
  }
}
