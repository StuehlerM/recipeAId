/**
 * Canvas-based image enhancement pipeline for OCR.
 * Converts to grayscale, stretches contrast, and sharpens text edges.
 */

/** Standard BT.601 luminance weights. */
const LUM_R = 0.299;
const LUM_G = 0.587;
const LUM_B = 0.114;

/** Percentile clipping for auto-contrast (ignore darkest/brightest 1%). */
const CLIP_LOW = 0.01;
const CLIP_HIGH = 0.99;

/** Unsharp-mask strength (0 = no sharpening, 1 = full difference added). */
const SHARPEN_ALPHA = 0.4;

/**
 * Enhance an image canvas for OCR readability.
 *
 * Pipeline:
 *  1. Grayscale conversion (BT.601 luminance)
 *  2. Auto-contrast via histogram stretching with percentile clipping
 *  3. Unsharp-mask sharpening (blur-then-subtract)
 *
 * Returns a **new** canvas — the input is not mutated.
 */
export function enhanceForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = source;

  // --- Step 1 + 2: grayscale & auto-contrast on a working canvas ----------

  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const workCtx = work.getContext("2d")!;
  workCtx.drawImage(source, 0, 0);

  const imageData = workCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Grayscale
  for (let i = 0; i < data.length; i += 4) {
    const lum = LUM_R * data[i] + LUM_G * data[i + 1] + LUM_B * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
  }

  // Auto-contrast: build histogram, find clip bounds, remap
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) histogram[data[i]]++;

  const totalPixels = width * height;
  const lowThreshold = totalPixels * CLIP_LOW;
  const highThreshold = totalPixels * CLIP_HIGH;

  let cumulative = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    if (cumulative >= lowThreshold) {
      lo = v;
      break;
    }
  }
  cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    if (cumulative >= highThreshold) {
      hi = v;
      break;
    }
  }

  const range = hi - lo || 1;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.min(255, Math.max(0, ((data[i] - lo) / range) * 255));
    data[i] = data[i + 1] = data[i + 2] = v;
  }

  workCtx.putImageData(imageData, 0, 0);

  // --- Step 3: unsharp-mask sharpening ------------------------------------

  // Create a blurred copy using the Canvas filter API (widely supported)
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext("2d")!;

  const supportsFilter = typeof blurCtx.filter !== "undefined";
  if (supportsFilter) {
    blurCtx.filter = "blur(1px)";
  }
  blurCtx.drawImage(work, 0, 0);

  // If filter is supported, blend: sharp = original + alpha * (original - blur)
  if (supportsFilter) {
    const origData = workCtx.getImageData(0, 0, width, height).data;
    const blurData = blurCtx.getImageData(0, 0, width, height).data;

    const outData = workCtx.getImageData(0, 0, width, height);
    const out = outData.data;
    for (let i = 0; i < out.length; i += 4) {
      const diff = origData[i] - blurData[i];
      const v = Math.min(255, Math.max(0, origData[i] + SHARPEN_ALPHA * diff));
      out[i] = out[i + 1] = out[i + 2] = v;
    }
    workCtx.putImageData(outData, 0, 0);
  }
  // If filter not supported, skip sharpening — grayscale + contrast is still a big win

  return work;
}
