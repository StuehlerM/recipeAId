import { useRef, useState } from "react";
import { uploadRecipeImage } from "../api/client";
import type { RecipeOcrDraftDto } from "../api/types";

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
      const draft = await uploadRecipeImage(file);
      callbackRef.current?.(draft);
    } catch {
      setError("OCR failed. Please try a clearer image.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { capture, isLoading, error, clearError };
}
