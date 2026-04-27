/**
 * Highlight overlay engine.
 * - Draws a translucent dim layer over the rest of the page
 * - Cuts a hole around the target element (4-piece overlay)
 * - Adds a glowing ring + arrow + tooltip pointing at it
 * - Scrolls element into view first
 *
 * Single-instance: calling show() replaces any previous highlight. cleanup() removes everything.
 */
const ROOT_ID = 'guider-highlight-root';
const STYLE_ID = 'guider-highlight-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
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
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

export function cleanup() {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  window.removeEventListener('resize', onReposition, true);
  window.removeEventListener('scroll', onReposition, true);
}

let activeShow = null;
function onReposition() {
  if (activeShow) activeShow();
}

export async function show({ element, title, body, stepIndex, totalSteps, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot();
  root.innerHTML = '';

  // scroll into view first so the rect is correct
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  await new Promise((r) => setTimeout(r, 250));

  const masks = [
    Object.assign(document.createElement('div'), { className: 'gd-mask' }),
    Object.assign(document.createElement('div'), { className: 'gd-mask' }),
    Object.assign(document.createElement('div'), { className: 'gd-mask' }),
    Object.assign(document.createElement('div'), { className: 'gd-mask' }),
  ];
  for (const m of masks) root.appendChild(m);

  const ring = document.createElement('div');
  ring.className = 'gd-ring';
  root.appendChild(ring);

  const tip = document.createElement('div');
  tip.className = 'gd-tip';
  tip.innerHTML = `
    <div class="gd-tip-step">Step ${stepIndex + 1} of ${totalSteps}</div>
    <div class="gd-tip-title" style="font-weight:700;margin-bottom:4px;">${escapeHtml(title || '')}</div>
    <div class="gd-tip-body">${escapeHtml(body || '')}</div>
    <div class="gd-tip-actions">
      <button class="gd-secondary" data-act="skip">Skip</button>
      <button data-act="next">${stepIndex + 1 === totalSteps ? 'Done' : 'Next'}</button>
    </div>
  `;
  root.appendChild(tip);
  tip.querySelector('[data-act=next]').onclick = () => onNext?.();
  tip.querySelector('[data-act=skip]').onclick = () => onSkip?.();

  const arrow = document.createElement('div');
  arrow.className = 'gd-arrow';
  root.appendChild(arrow);

  const reposition = () => {
    const r = element.getBoundingClientRect();
    const pad = 6;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // 4 mask rectangles forming a hole
    masks[0].style.cssText = `top:0;left:0;width:${W}px;height:${Math.max(0, r.top - pad)}px;`;
    masks[1].style.cssText = `top:${r.bottom + pad}px;left:0;width:${W}px;height:${Math.max(0, H - r.bottom - pad)}px;`;
    masks[2].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:0;width:${Math.max(0, r.left - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;
    masks[3].style.cssText = `top:${Math.max(0, r.top - pad)}px;left:${r.right + pad}px;width:${Math.max(0, W - r.right - pad)}px;height:${Math.max(0, r.height + 2 * pad)}px;`;

    ring.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;

    // tooltip placement — prefer right, then below, then above
    const tipW = 320;
    const tipH = tip.offsetHeight || 110;
    let tx, ty, arrowSide;
    if (r.right + tipW + 24 < W) {
      tx = r.right + 18; ty = Math.max(8, Math.min(H - tipH - 8, r.top));
      arrowSide = 'left';
    } else if (r.bottom + tipH + 24 < H) {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = r.bottom + 18;
      arrowSide = 'top';
    } else {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left)); ty = Math.max(8, r.top - tipH - 18);
      arrowSide = 'bottom';
    }
    tip.style.left = `${tx}px`;
    tip.style.top = `${ty}px`;

    const ax = arrowSide === 'left' ? r.right + 4 : r.left + r.width / 2 - 8;
    const ay = arrowSide === 'top' ? r.bottom + 4 : arrowSide === 'bottom' ? r.top - 12 : r.top + r.height / 2 - 8;
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    arrow.style.borderWidth =
      arrowSide === 'left' ? '8px 14px 8px 0' :
      arrowSide === 'top' ? '0 8px 14px 8px' :
      arrowSide === 'bottom' ? '14px 8px 0 8px' : '8px 0 8px 14px';
    arrow.style.borderColor =
      arrowSide === 'left' ? 'transparent #f5d042 transparent transparent' :
      arrowSide === 'top' ? 'transparent transparent #f5d042 transparent' :
      arrowSide === 'bottom' ? '#f5d042 transparent transparent transparent' :
      'transparent transparent transparent #f5d042';
  };

  reposition();
  activeShow = reposition;
  window.addEventListener('resize', onReposition, true);
  window.addEventListener('scroll', onReposition, true);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}
