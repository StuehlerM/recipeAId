import type { RecipeDto } from "../api/types";

type IngredientEntry = { amount: string | null; unit: string | null };

function sumGroup(name: string, entries: IngredientEntry[]): { name: string; quantity: string } {
  const nonEmpty = entries.filter((e) => e.amount !== null || e.unit !== null);

  if (nonEmpty.length === 0) {
    return { name, quantity: "" };
  }

  // Try numeric sum when all entries share the same unit and parseable numeric amounts
  const parsedAmounts = nonEmpty.map((e) => {
    const n = e.amount ? parseFloat(e.amount.replace(/[^\d.]/g, "")) : NaN;
    return { n, unit: e.unit?.toLowerCase().trim() ?? "" };
  });

  const allParsed = parsedAmounts.every((p) => !isNaN(p.n));
  const units = [...new Set(parsedAmounts.map((p) => p.unit))];

  if (allParsed && units.length === 1) {
    const total = parsedAmounts.reduce((acc, p) => acc + p.n, 0);
    const formatted = Number.isInteger(total)
      ? String(total)
      : total.toFixed(2).replace(/\.?0+$/, "");
    return { name, quantity: units[0] ? `${formatted} ${units[0]}` : formatted };
  }

  // Fallback: join as "amount unit" strings
  const parts = nonEmpty.map((e) => [e.amount, e.unit].filter(Boolean).join(" "));
  return { name, quantity: parts.join(" + ") };
}

/**
 * Aggregates ingredients across multiple recipes into a deduplicated shopping list.
 * Amounts with the same unit are summed; mismatched or unparseable entries are
 * concatenated with " + ".
 */
export function aggregateIngredients(
  recipes: RecipeDto[]
): { name: string; quantity: string }[] {
  const grouped = new Map<string, IngredientEntry[]>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.ingredientName.trim().toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ amount: ing.amount, unit: ing.unit });
    }
  }

  return Array.from(grouped.entries())
    .map(([name, entries]) => sumGroup(name, entries))
    .sort((a, b) => a.name.localeCompare(b.name));
}
