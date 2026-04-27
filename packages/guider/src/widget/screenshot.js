/**
 * Capture a fresh JPEG screenshot of the current viewport.
 * Lazy-imports html2canvas so the initial widget bundle stays small.
 *
 * Returns a base64 data-url (data:image/jpeg;base64,...).
 */
export async function captureViewport() {
  const { default: html2canvas } = await import('html2canvas');
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
    ignoreElements: (element) => shouldIgnoreElement(element),
    onclone: (clonedDoc) => sanitizeClonedDocument(document, clonedDoc),
  };

  let canvas;
  try {
    canvas = await html2canvas(document.body, options);
  } catch {
    try {
      canvas = await html2canvas(document.documentElement, options);
    } catch {
      canvas = createFallbackCanvas();
    }
  }
  return canvas.toDataURL('image/jpeg', 0.7);
}

const UNSUPPORTED_COLOR_FN = /(oklch|oklab|lch|lab|color-mix)\(/i;
const UNSUPPORTED_COLOR_SPACE = /\sin\s+(oklch|oklab|lch|lab)\b/gi;
const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'caretColor',
  'fill',
  'stroke',
  'boxShadow',
  'textShadow',
];

function shouldIgnoreElement(element) {
  return !!element?.closest?.('[data-guider-panel], [data-guider-launcher], [data-guider-dock], #guider-highlight-root');
}

function sanitizeClonedDocument(sourceDoc, clonedDoc) {
  const sourceRootStyle = getComputedStyle(sourceDoc.documentElement);
  const cloneRootStyle = clonedDoc.documentElement.style;
  for (const name of sourceRootStyle) {
    if (!name.startsWith('--')) continue;
    const value = sourceRootStyle.getPropertyValue(name);
    if (UNSUPPORTED_COLOR_FN.test(value)) {
      cloneRootStyle.setProperty(name, '#000000');
    }
  }

  for (const styleEl of clonedDoc.querySelectorAll('style')) {
    if (!styleEl.textContent || !UNSUPPORTED_COLOR_FN.test(styleEl.textContent)) continue;
    styleEl.textContent = sanitizeCssText(styleEl.textContent);
  }

  for (const cloneEl of clonedDoc.querySelectorAll('[style]')) {
    const inlineStyle = cloneEl.getAttribute('style');
    if (!inlineStyle || !UNSUPPORTED_COLOR_FN.test(inlineStyle)) continue;
    cloneEl.setAttribute('style', sanitizeCssText(inlineStyle));
  }

  for (const widgetEl of clonedDoc.querySelectorAll('[data-guider-panel], [data-guider-launcher], [data-guider-dock], #guider-highlight-root')) {
    widgetEl.remove();
  }

  const sourceEls = sourceDoc.querySelectorAll('*');
  const cloneEls = clonedDoc.querySelectorAll('*');
  const len = Math.min(sourceEls.length, cloneEls.length);
  for (let i = 0; i < len; i += 1) {
    const sourceEl = sourceEls[i];
    const cloneEl = cloneEls[i];
    const computed = getComputedStyle(sourceEl);
    for (const prop of COLOR_PROPS) {
      const value = computed[prop];
      if (!value || !UNSUPPORTED_COLOR_FN.test(value)) continue;
      if (prop === 'boxShadow' || prop === 'textShadow') {
        cloneEl.style[prop] = 'none';
        continue;
      }
      cloneEl.style[prop] = fallbackColor(prop);
    }
  }
}

function fallbackColor(prop) {
  if (prop === 'backgroundColor') return 'transparent';
  if (prop === 'fill' || prop === 'stroke') return '#000000';
  return '#111111';
}

function sanitizeCssText(cssText) {
  return cssText
    .replace(/color-mix\([^)]*\)/gi, 'rgba(17,17,17,0.12)')
    .replace(/oklch\([^)]*\)/gi, 'rgb(17 17 17)')
    .replace(/oklab\([^)]*\)/gi, 'rgb(17 17 17)')
    .replace(/(?<!-)\blch\([^)]*\)/gi, 'rgb(17 17 17)')
    .replace(/(?<!-)\blab\([^)]*\)/gi, 'rgb(17 17 17)')
    .replace(UNSUPPORTED_COLOR_SPACE, '');
}

function createFallbackCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(window.innerWidth));
  canvas.height = Math.max(1, Math.round(window.innerHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#f7f7f5');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.font = '500 20px sans-serif';
  ctx.fillText('Guider fallback capture', 28, 42);
  ctx.fillStyle = 'rgba(17,17,17,0.55)';
  ctx.font = '14px sans-serif';
  ctx.fillText(window.location.pathname || '/', 28, 66);
  return canvas;
}
