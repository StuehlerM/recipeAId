import { describe, it, expect } from "vitest";
import { scaleIngredients } from "./scaleIngredients";
import type { RecipeIngredientDto } from "../../api/types";

function ing(amount: string | null, unit: string | null = null): RecipeIngredientDto {
  return { ingredientId: 1, ingredientName: "test", amount, unit, sortOrder: 0 };
}

describe("scaleIngredients", () => {
  describe("scale === 1 (no-op)", () => {
    it("returns the same array reference when scale is 1", () => {
      const items = [ing("2", "cups")];
      expect(scaleIngredients(items, 1)).toBe(items);
    });
  });

  describe("whole-number amounts", () => {
    it("doubles whole-number amounts at ×2", () => {
      const result = scaleIngredients([ing("3")], 2);
      expect(result[0].amount).toBe("6");
    });

    it("halves whole-number amounts at ×0.5", () => {
      const result = scaleIngredients([ing("4")], 0.5);
      expect(result[0].amount).toBe("2");
    });

    it("preserves unit when scaling", () => {
      const result = scaleIngredients([ing("2", "cups")], 2);
      expect(result[0].amount).toBe("4");
      expect(result[0].unit).toBe("cups");
    });
  });

  describe("decimal amounts", () => {
    it("scales decimal amounts correctly", () => {
      const result = scaleIngredients([ing("1.5")], 2);
      expect(result[0].amount).toBe("3");
    });

    it("rounds to 2 decimal places and strips trailing zeros", () => {
      const result = scaleIngredients([ing("1")], 3);
      expect(result[0].amount).toBe("3");
    });
  });

  describe("fraction amounts", () => {
    it("scales simple fractions: '1/2' at ×2 → '1'", () => {
      const result = scaleIngredients([ing("1/2")], 2);
      expect(result[0].amount).toBe("1");
    });

    it("scales simple fractions: '1/4' at ×4 → '1'", () => {
      const result = scaleIngredients([ing("1/4")], 4);
      expect(result[0].amount).toBe("1");
    });

    it("scales mixed-number fractions: '1 1/2' at ×2 → '3'", () => {
      const result = scaleIngredients([ing("1 1/2")], 2);
      expect(result[0].amount).toBe("3");
    });

    it("scales unicode fractions: '½' at ×4 → '2'", () => {
      const result = scaleIngredients([ing("½")], 4);
      expect(result[0].amount).toBe("2");
    });

    it("scales unicode mixed: '1½' at ×2 → '3'", () => {
      const result = scaleIngredients([ing("1½")], 2);
      expect(result[0].amount).toBe("3");
    });
  });

  describe("range amounts", () => {
    it("scales both ends of a hyphen range: '2-3' at ×2 → '4-6'", () => {
      const result = scaleIngredients([ing("2-3")], 2);
      expect(result[0].amount).toBe("4-6");
    });

    it("scales en-dash ranges: '2–3' at ×2 → '4–6'", () => {
      const result = scaleIngredients([ing("2–3")], 2);
      expect(result[0].amount).toBe("4–6");
    });
  });

  describe("unparseable amounts stay unchanged", () => {
    it("leaves 'a pinch' unchanged", () => {
      const result = scaleIngredients([ing("a pinch")], 2);
      expect(result[0].amount).toBe("a pinch");
    });

    it("leaves 'to taste' unchanged", () => {
      const result = scaleIngredients([ing("to taste")], 2);
      expect(result[0].amount).toBe("to taste");
    });

    it("leaves 'some' unchanged", () => {
      const result = scaleIngredients([ing("some")], 3);
      expect(result[0].amount).toBe("some");
    });

    it("leaves '2 large' unchanged — trailing qualifier must not be silently dropped", () => {
      const result = scaleIngredients([ing("2 large")], 2);
      expect(result[0].amount).toBe("2 large");
    });
  });

  describe("null amount", () => {
    it("returns null amount unchanged", () => {
      const result = scaleIngredients([ing(null)], 2);
      expect(result[0].amount).toBeNull();
    });
  });

  describe("mixed list", () => {
    it("scales parseable amounts and leaves unparseable unchanged in same list", () => {
      const items = [
        ing("400", "g"),
        ing("4"),
        ing("a pinch"),
      ];
      const result = scaleIngredients(items, 2);
      expect(result[0].amount).toBe("800");
      expect(result[1].amount).toBe("8");
      expect(result[2].amount).toBe("a pinch");
    });
  });
});
