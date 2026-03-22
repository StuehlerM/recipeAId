import type { RecipeIngredientDto } from "../../api/types";
import { parseAmount } from "../../utils/parseAmount";

/** Formats a scaled number back to a clean display string. */
function formatScaled(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Returns a new ingredients array with amounts scaled by the given factor.
 *
 * - Parseable numeric amounts are multiplied and reformatted.
 * - Range amounts like "2-3" or "2–3" scale both ends.
 * - Unparseable amounts ("a pinch", "to taste") are returned unchanged.
 * - null amounts remain null.
 * - scale === 1 returns the original array reference (no allocation).
 */
export function scaleIngredients(
  ingredients: RecipeIngredientDto[],
  scale: number
): RecipeIngredientDto[] {
  if (scale === 1) return ingredients;

  return ingredients.map((ing) => {
    if (ing.amount === null || ing.amount === undefined) return ing;

    // Range: "2-3" or "2–3" (en-dash), optionally with trailing text.
    // Only standard dot-decimal numbers — comma decimals are not produced by the backend.
    const rangeMatch = ing.amount.match(
      /^(\d+(?:\.\d+)?)\s*([-–])\s*(\d+(?:\.\d+)?)(.*)$/
    );
    if (rangeMatch) {
      const lo = parseAmount(rangeMatch[1]);
      const hi = parseAmount(rangeMatch[3]);
      const dash = rangeMatch[2];
      const suffix = rangeMatch[4];
      if (lo !== null && hi !== null) {
        return {
          ...ing,
          amount: `${formatScaled(lo * scale)}${dash}${formatScaled(hi * scale)}${suffix}`,
        };
      }
      return ing;
    }

    // Leading numeric portion (handles "2", "1.5", "1/2", "1 1/2", "1½")
    // Try parsing the whole amount string first (covers pure numeric amounts)
    const parsed = parseAmount(ing.amount);
    if (parsed !== null) {
      return { ...ing, amount: formatScaled(parsed * scale) };
    }

    return ing;
  });
}
