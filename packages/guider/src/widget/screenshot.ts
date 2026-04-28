/**
 * Capture a fresh JPEG screenshot of the current viewport.
 * Uses html-to-image because it is more resilient to modern CSS color syntax
 * than canvas-based DOM capture.
 */
export async function captureViewport() {
  const { toJpeg } = await import('html-to-image');
  const root = document.documentElement;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth));
  const height = Math.max(1, Math.round(window.innerHeight));

  try {
    return await toJpeg(root, {
      quality: 0.8,
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio,
      canvasWidth: Math.round(width * pixelRatio),
      canvasHeight: Math.round(height * pixelRatio),
      width,
      height,
      skipFonts: true,
      style: {
        margin: '0',
        transform: 'none',
        transformOrigin: 'top left',
      },
      filter: (node) => shouldIncludeNode(node),
    });
  } catch {
    return createFallbackCanvas(width, height).toDataURL('image/jpeg', 0.8);
  }
}

function shouldIncludeNode(node: unknown) {
  if (!(node instanceof Element)) return true;
  return !node.closest('[data-guider-panel], [data-guider-launcher], [data-guider-cursor], #guider-highlight-root');
}

function createFallbackCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f7f7f5');
  gradient.addColorStop(1, '#ffffff');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111111';
  context.font = '500 20px sans-serif';
  context.fillText('Guider fallback capture', 28, 42);
  context.fillStyle = 'rgba(17,17,17,0.55)';
  context.font = '14px sans-serif';
  context.fillText(window.location.pathname || '/', 28, 66);
  return canvas;
}