import { describe, it, expect } from "vitest";
import type { RecipeOcrDraftDto } from "../../api/types";
import { mapIngredients } from "./useAddRecipeWizard";

/**
 * Unit tests for pure helpers extracted from useAddRecipeWizard (Issue #14).
 *
 * Run: cd frontend && npm test -- --run
 */

describe("mapIngredients — from detected ingredients", () => {
  it("maps detected ingredients to IngredientRow objects", () => {
    // Arrange
    const draft = {
      detectedIngredients: [
        { name: "flour", amount: "200", unit: "g" },
        { name: "eggs", amount: "2", unit: null },
      ],
      rawOcrText: "",
      detectedTitle: null,
      detectedInstructions: null,
      imagePath: null,
      sessionId: null,
      imageKey: null,
    } satisfies RecipeOcrDraftDto;

    // Act
    const rows = mapIngredients(draft);

    // Assert
    expect(rows).toEqual([
      { name: "flour", amount: "200", unit: "g" },
      { name: "eggs", amount: "2", unit: "" },
    ]);
  });

  it("falls back to rawOcrText lines when detectedIngredients is empty", () => {
    // Arrange
    const draft = {
      detectedIngredients: [],
      rawOcrText: "200g flour\n2 eggs\n",
      detectedTitle: null,
      detectedInstructions: null,
      imagePath: null,
      sessionId: null,
      imageKey: null,
    } satisfies RecipeOcrDraftDto;

    // Act
    const rows = mapIngredients(draft);

    // Assert
    expect(rows).toEqual([
      { name: "200g flour", amount: "", unit: "" },
      { name: "2 eggs", amount: "", unit: "" },
    ]);
  });

  it("filters blank lines from rawOcrText fallback", () => {
    // Arrange
    const draft = {
      detectedIngredients: [],
      rawOcrText: "salt\n\npepper\n",
      detectedTitle: null,
      detectedInstructions: null,
      imagePath: null,
      sessionId: null,
      imageKey: null,
    } satisfies RecipeOcrDraftDto;

    // Act
    const rows = mapIngredients(draft);

    // Assert
    expect(rows).toEqual([
      { name: "salt", amount: "", unit: "" },
      { name: "pepper", amount: "", unit: "" },
    ]);
  });

  it("returns empty array when both detectedIngredients and rawOcrText are empty", () => {
    // Arrange
    const draft = {
      detectedIngredients: [],
      rawOcrText: "",
      detectedTitle: null,
      detectedInstructions: null,
      imagePath: null,
      sessionId: null,
      imageKey: null,
    } satisfies RecipeOcrDraftDto;

    // Act
    const rows = mapIngredients(draft);

    // Assert
    expect(rows).toHaveLength(0);
  });
});
