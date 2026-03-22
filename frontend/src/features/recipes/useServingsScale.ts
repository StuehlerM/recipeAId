import { useState, useEffect } from "react";

export interface ServingsScaleState {
  /** The currently displayed serving count (null when no base servings is set). */
  current: number | null;
  /** Scale factor to apply: current / base, or 1 when scaling is unavailable. */
  scale: number;
  /** True when the recipe has a positive base servings value. */
  canScale: boolean;
  /** True when displayServings differs from the base. */
  isScaled: boolean;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export function useServingsScale(
  baseServings: number | null | undefined
): ServingsScaleState {
  const base = baseServings != null && baseServings > 0 ? baseServings : null;
  const [current, setCurrent] = useState<number | null>(base);

  // Reset when navigating to a different recipe
  useEffect(() => {
    setCurrent(base);
  }, [base]);

  const canScale = base !== null;
  const scale = canScale && current !== null ? current / base : 1;
  const isScaled = canScale && current !== base;

  function increment() {
    setCurrent((n) => Math.min(999, (n ?? base ?? 1) + 1));
  }

  function decrement() {
    setCurrent((n) => Math.max(1, (n ?? base ?? 1) - 1));
  }

  function reset() {
    setCurrent(base);
  }

  return { current, scale, canScale, isScaled, increment, decrement, reset };
}
