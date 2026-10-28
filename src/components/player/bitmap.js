// Bitmap tracks remain independent of the video stream: seeking or switching
// audio never requires burning subtitles into the picture.
export async function createBitmapSubtitle({ video, container, track, data, signal, onError }) {
  const { PgsRenderer, VobSubRenderer, initWasm } = await import('libbitsub');
  await initWasm();
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const canvas = document.createElement('canvas');
  canvas.className = 'bitmap-subtitle-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:20';
  container.appendChild(canvas);
  let renderer;
  try {
    await new Promise((resolve, reject) => {
      const Renderer = track.format === 'sup' ? PgsRenderer : VobSubRenderer;
      renderer = new Renderer({
        video, canvas, container, subContent: data, fileName: `subtitle.${track.format}`,
        backend: 'canvas2d', offscreenRender: false,
        onLoaded: resolve, onError: reject,
        onEvent: event => { if (event.type === 'error') { reject(event.error); onError?.(event.error); } },
      });
      signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  } catch (error) { renderer?.dispose(); canvas.remove(); throw error; }
  return {
    set timeOffset(value) { renderer.timeOffset = value; },
    dispose() { renderer.dispose(); canvas.remove(); },
  };
}
