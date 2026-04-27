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
    onclone: (clonedDoc) => sanitizeClonedDocument(document, clonedDoc),
  };

  let canvas;
  try {
    canvas = await html2canvas(document.body, options);
  } catch {
    canvas = await html2canvas(document.documentElement, options);
  }
  return canvas.toDataURL('image/jpeg', 0.7);
}

const UNSUPPORTED_COLOR_FN = /(oklch|oklab|lch|lab|color-mix)\(/i;
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
