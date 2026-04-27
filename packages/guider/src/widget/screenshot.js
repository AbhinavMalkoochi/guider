/**
 * Capture a fresh JPEG screenshot of the current viewport.
 * Lazy-imports html2canvas so the initial widget bundle stays small.
 *
 * Returns a base64 data-url (data:image/jpeg;base64,...).
 */
export async function captureViewport() {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(document.body, {
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
  });
  return canvas.toDataURL('image/jpeg', 0.7);
}
