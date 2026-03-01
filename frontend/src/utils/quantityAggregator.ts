import type { RecipeDto } from "../api/types";

/** Matches "2 cups", "1.5 tbsp", "300 ml" — number then space then unit word(s). */
const QUANTITY_RE = /^\s*(\d+(?:\.\d+)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*$/;

function parseQuantity(raw: string | null): { amount: number; unit: string } | null {
  if (!raw) return null;
  const m = raw.trim().match(QUANTITY_RE);
  if (!m) return null;
  return { amount: parseFloat(m[1]), unit: m[2].toLowerCase().trim() };
}

function sumGroup(name: string, quantities: (string | null)[]): { name: string; quantity: string } {
  const nonEmpty = quantities.filter((q): q is string => q !== null && q.trim() !== "");

  if (nonEmpty.length === 0) {
    return { name, quantity: "" };
  }

  const parsed = nonEmpty.map(parseQuantity);
  const allParsed = parsed.every((p) => p !== null);

  if (allParsed) {
    const items = parsed as { amount: number; unit: string }[];
    const units = [...new Set(items.map((p) => p.unit))];
    if (units.length === 1) {
      const total = items.reduce((acc, p) => acc + p.amount, 0);
      const formatted = Number.isInteger(total)
        ? String(total)
        : total.toFixed(2).replace(/\.?0+$/, "");
      return { name, quantity: `${formatted} ${units[0]}` };
    }
  }

  return { name, quantity: nonEmpty.join(" + ") };
}

/**
 * Aggregates ingredients across multiple recipes into a deduplicated shopping list.
 * Quantities with the same unit are summed; mismatched or unparseable quantities
 * are concatenated with " + ".
 */
export function aggregateIngredients(
  recipes: RecipeDto[]
): { name: string; quantity: string }[] {
  const grouped = new Map<string, (string | null)[]>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.ingredientName.trim().toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ing.quantity);
    }
  }

  return Array.from(grouped.entries())
    .map(([name, quantities]) => sumGroup(name, quantities))
    .sort((a, b) => a.name.localeCompare(b.name));
}
