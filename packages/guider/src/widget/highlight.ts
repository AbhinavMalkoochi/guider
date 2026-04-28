const ROOT_ID = 'guider-highlight-root';
const STYLE_ID = 'guider-highlight-style';

let activeReposition: (() => void) | null = null;
let listenersAttached = false;
let lastPointer = getInitialPointer();

type PointerTarget = {
  element: Element;
  title?: string;
  body?: string;
  accent?: string;
};

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .16);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 18px;
      ${reduceMotion ? '' : 'transition: all .22s ease-out;'}
    }
    #${ROOT_ID} .gd-target {
      position: fixed;
      width: 34px;
      height: 34px;
      margin-left: -10px;
      margin-top: -10px;
      transform-origin: 7px 7px;
      ${reduceMotion ? '' : 'transition: left .18s ease-out, top .18s ease-out;'}
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
      ${reduceMotion ? '' : 'transition: left .08s linear, top .08s linear;'}
    }
    #${ROOT_ID} .gd-line {
      position: fixed;
      height: 2px;
      transform-origin: 0 50%;
      background: linear-gradient(90deg, rgba(59,130,246,.42), rgba(59,130,246,.92));
      ${reduceMotion ? '' : 'transition: left .08s linear, top .08s linear, width .12s ease-out, transform .12s ease-out;'}
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

function ensureRoot(accent?: string) {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  if (accent) {
    root.style.setProperty('--gd-accent', accent);
  }
  return root;
}

export function cleanup() {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  if (listenersAttached) {
    window.removeEventListener('resize', onReposition, true);
    window.removeEventListener('scroll', onReposition, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    listenersAttached = false;
  }
  activeReposition = null;
}

function onReposition() {
  activeReposition?.();
}

function onMouseMove(event: MouseEvent) {
  lastPointer = { x: event.clientX, y: event.clientY };
  activeReposition?.();
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

export async function show({ element, title, body, accent }: PointerTarget) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = '';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' });
  await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 180));

  const focus = document.createElement('div');
  focus.className = 'gd-focus';
  root.appendChild(focus);

  const follower = document.createElement('div');
  follower.className = 'gd-follower';
  root.appendChild(follower);

  const line = document.createElement('div');
  line.className = 'gd-line';
  root.appendChild(line);

  const target = document.createElement('div');
  target.className = 'gd-target';
  root.appendChild(target);

  const tip = document.createElement('div');
  tip.className = 'gd-tip';
  tip.setAttribute('role', 'status');
  tip.innerHTML = `
    <div class="gd-title"></div>
    <div class="gd-body"></div>
  `;
  const titleElement = tip.querySelector('.gd-title');
  const bodyElement = tip.querySelector('.gd-body');
  if (titleElement) {
    titleElement.textContent = title || 'Go here';
  }
  if (bodyElement) {
    bodyElement.textContent = body || '';
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
      tipTop = rect.bottom + tipHeight + 20 < viewportHeight
        ? rect.bottom + 18
        : Math.max(8, rect.top - tipHeight - 18);
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
    window.addEventListener('resize', onReposition, true);
    window.addEventListener('scroll', onReposition, true);
    document.addEventListener('mousemove', onMouseMove, true);
    listenersAttached = true;
  }
}