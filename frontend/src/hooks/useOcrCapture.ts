import { useRef, useState } from "react";
import { uploadRecipeImage } from "../api/client";
import type { RecipeOcrDraftDto } from "../api/types";

/** Max dimension (px) for the longest side — keeps uploads fast for OCR. */
const MAX_DIMENSION = 2048;

/**
 * Convert any browser-readable image to JPEG via Canvas.
 * Handles HEIC (iPhone default), WebP, BMP, etc.
 * Also downscales large images so OCR uploads stay small.
 */
function toJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("JPEG conversion failed")); return; }
          resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

export function useOcrCapture() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const callbackRef = useRef<((draft: RecipeOcrDraftDto) => void) | null>(null);

  function capture(onResult: (draft: RecipeOcrDraftDto) => void) {
    callbackRef.current = onResult;
    // Create a hidden file input on demand, or reuse the existing ref
    if (!inputRef.current) {
      const el = document.createElement("input");
      el.type = "file";
      el.accept = "image/*";
      el.capture = "environment";
      el.style.display = "none";
      el.addEventListener("change", handleChange);
      document.body.appendChild(el);
      inputRef.current = el;
    }
    // Reset so the same file can be re-selected
    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function handleChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const jpeg = await toJpeg(file);
      const draft = await uploadRecipeImage(jpeg);
      callbackRef.current?.(draft);
    } catch {
      setError("OCR failed. Make sure the text is well-lit and in focus, then try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { capture, isLoading, error, clearError };
}
