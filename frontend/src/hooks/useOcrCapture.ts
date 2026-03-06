import { useRef, useState, useEffect } from "react";
import { uploadRecipeImage, subscribeToOcrSession } from "../api/client";
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
  const [loadingStage, setLoadingStage] = useState<"ocr" | "llm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const callbackRef = useRef<((draft: RecipeOcrDraftDto) => void) | null>(null);
  const esCleanupRef = useRef<(() => void) | null>(null);

  // Revoke pending object URL and close any open SSE connection on unmount
  useEffect(() => {
    return () => {
      if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
      esCleanupRef.current?.();
    };
  }, [pendingImageUrl]);

  function openFileInput() {
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

  async function capture(onResult: (draft: RecipeOcrDraftDto) => void) {
    callbackRef.current = onResult;
    setError(null);
    if ((navigator.mediaDevices as MediaDevices | undefined)?.getUserMedia) {
      setShowCamera(true);
    } else {
      openFileInput();
    }
  }

  function handleChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setError(null);
    // Show the crop modal instead of uploading immediately
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
  }

  /** Called by CameraCapture.onCapture — sets pendingImageUrl to open CropModal. */
  function handleCameraCapture(file: File) {
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
    // Keep showCamera=true (hidden prop) so stream stays alive under CropModal
  }

  /** Called when user explicitly closes the camera overlay. */
  function handleCameraClose() {
    setShowCamera(false);
  }

  /** Called by CropModal after the user confirms the crop. */
  async function submitCroppedImage(croppedFile: File) {
    setShowCamera(false);
    // Clean up the pending preview
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    setPendingImageUrl(null);

    setIsLoading(true);
    setLoadingStage("ocr");
    try {
      // toJpeg handles downscaling if the cropped region is still large
      const jpeg = await toJpeg(croppedFile);
      console.info("[OCR] Uploading image:", jpeg.name, jpeg.size, "bytes", jpeg.type);

      // POST returns immediately with OCR + regex draft + sessionId
      const draft = await uploadRecipeImage(jpeg);
      console.info("[OCR] OCR done: title=%s ingredients=%d sessionId=%s",
        draft.detectedTitle ?? "(none)", draft.detectedIngredients?.length ?? 0, draft.sessionId ?? "none");

      if (draft.sessionId) {
        // LLM is running in the background — wait for SSE result before calling the callback
        setLoadingStage("llm");
        esCleanupRef.current = subscribeToOcrSession(
          draft.sessionId,
          (ingredients) => {
            // LLM succeeded — populate with refined ingredients
            console.info("[OCR] LLM refinement done: %d ingredients", ingredients.length);
            setIsLoading(false);
            setLoadingStage(null);
            callbackRef.current?.({ ...draft, detectedIngredients: ingredients });
          },
          () => {
            // LLM failed — silently use regex draft as fallback
            console.info("[OCR] LLM refinement failed, using regex fallback");
            setIsLoading(false);
            setLoadingStage(null);
            callbackRef.current?.(draft);
          },
        );
        // isLoading stays true — the SSE handlers above will clear it
      } else {
        // No ingredients to refine (empty recipe body) — return regex draft directly
        setIsLoading(false);
        setLoadingStage(null);
        callbackRef.current?.(draft);
      }
    } catch (err) {
      console.error("[OCR] Upload failed:", err);
      setError("OCR failed. Make sure the text is well-lit and in focus, then try again.");
      setIsLoading(false);
      setLoadingStage(null);
    }
    // Note: no finally block for setIsLoading — SSE keeps it true until resolved
  }

  /** Called when the user cancels the crop modal. */
  function cancelCrop() {
    setShowCamera(false);
    if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    setPendingImageUrl(null);
  }

  function clearError() {
    setError(null);
  }

  return {
    capture,
    isLoading,
    loadingStage,
    error,
    clearError,
    pendingImageUrl,
    submitCroppedImage,
    cancelCrop,
    showCamera,
    handleCameraCapture,
    handleCameraClose,
  };
}
