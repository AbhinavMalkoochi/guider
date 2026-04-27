/**
 * Capture a fresh JPEG screenshot of the current viewport.
 * Uses html-to-image instead of html2canvas because it is more resilient to
 * the modern Tailwind color functions used in the test app.
 */
export async function captureViewport() {
  const { toJpeg } = await import('html-to-image');
  const root = document.documentElement;
  try {
    return await toJpeg(root, {
      quality: 0.72,
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      canvasWidth: Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)),
      canvasHeight: Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)),
      width: window.innerWidth,
      height: window.innerHeight,
      skipFonts: true,
      style: {
        margin: '0',
        transform: 'none',
        transformOrigin: 'top left',
      },
      filter: (node) => shouldIncludeNode(node),
    });
  } catch {
    return createFallbackCanvas().toDataURL('image/jpeg', 0.72);
  }
}

function shouldIncludeNode(node) {
  if (!(node instanceof Element)) return true;
  return !node.closest('[data-guider-panel], [data-guider-launcher], [data-guider-cursor], #guider-highlight-root');
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
