const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNICODE_FRAC_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

/**
 * Parses a recipe amount string into a number.
 *
 * Handles: integers ("2"), decimals ("1.5"), simple fractions ("1/2"),
 * mixed numbers ("1 1/2"), and Unicode vulgar fractions ("1½", "½").
 * Returns null for unparseable strings (e.g. "a pinch", "to taste").
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Unicode fraction possibly preceded by a whole number: "1½", "½"
  const unicodeFracMatch = s.match(
    new RegExp(`^(\\d+)?\\s*([${UNICODE_FRAC_CHARS}])$`)
  );
  if (unicodeFracMatch) {
    const whole = unicodeFracMatch[1] ? parseInt(unicodeFracMatch[1], 10) : 0;
    return whole + (UNICODE_FRACTIONS[unicodeFracMatch[2]] ?? 0);
  }

  // Mixed number: "1 1/2"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const denom = parseInt(mixedMatch[3], 10);
    if (denom === 0) return null;
    return parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / denom;
  }

  // Simple fraction: "1/2"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const denom = parseInt(fracMatch[2], 10);
    return denom === 0 ? null : parseInt(fracMatch[1], 10) / denom;
  }

  // Decimal or integer — strict: the *entire* string must be a valid number.
  // parseFloat alone accepts "2 large" → 2, silently dropping qualifiers.
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  return null;
}
