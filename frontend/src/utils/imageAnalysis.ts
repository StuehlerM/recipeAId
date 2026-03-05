/**
 * Pure canvas pixel-math utilities for camera quality analysis.
 * No DOM side-effects — safe to call from rAF loops.
 */

export const SHARPNESS_THRESHOLD = 30;
export const ANALYSIS_WIDTH = 320;
export const ANALYSIS_HEIGHT = 240;

/** BT.601 luma coefficients */
const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

function toGrayscaleArray(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    gray[i] = LUMA_R * data[p] + LUMA_G * data[p + 1] + LUMA_B * data[p + 2];
  }
  return gray;
}

/**
 * Compute the variance of Laplacian over the center 50% of the frame.
 * Higher values mean sharper image.
 */
export function computeSharpnessVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = toGrayscaleArray(data, width, height);

  // Analyze center 50% of frame
  const x0 = Math.floor(width * 0.25);
  const x1 = Math.floor(width * 0.75);
  const y0 = Math.floor(height * 0.25);
  const y1 = Math.floor(height * 0.75);

  const laplacianValues: number[] = [];

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const center = gray[y * width + x];
      const top    = gray[(y - 1) * width + x] ?? center;
      const bottom = gray[(y + 1) * width + x] ?? center;
      const left   = gray[y * width + (x - 1)] ?? center;
      const right  = gray[y * width + (x + 1)] ?? center;
      // Laplacian kernel: [0,1,0; 1,-4,1; 0,1,0]
      laplacianValues.push(top + bottom + left + right - 4 * center);
    }
  }

  if (laplacianValues.length === 0) return 0;

  const mean = laplacianValues.reduce((s, v) => s + v, 0) / laplacianValues.length;
  const variance = laplacianValues.reduce((s, v) => s + (v - mean) ** 2, 0) / laplacianValues.length;
  return variance;
}

/**
 * Returns true when the image contains a shadow (high-contrast lighting).
 * Heuristic: decent average brightness but significant dark + bright regions.
 */
export function detectShadow(imageData: ImageData): boolean {
  const { data, width, height } = imageData;
  const gray = toGrayscaleArray(data, width, height);
  const total = width * height;

  let sum = 0;
  let darkCount = 0;
  let brightCount = 0;

  for (let i = 0; i < total; i++) {
    const luma = gray[i];
    sum += luma;
    if (luma < 60) darkCount++;
    if (luma > 180) brightCount++;
  }

  const mean = sum / total;
  const darkRatio = darkCount / total;
  const brightRatio = brightCount / total;

  return mean > 80 && darkRatio > 0.20 && brightRatio > 0.15;
}
