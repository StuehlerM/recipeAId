/**
 * Typed API client.
 * All functions currently return mocked data with a simulated network delay.
 * Replace the mock implementations with real fetch calls once the backend is ready.
 */

import type { CreateRecipeRequest, IngredientSearchResultDto, Ingredient, RecipeDto, RecipeOcrDraftDto } from "./types";
import { MOCK_INGREDIENTS, MOCK_OCR_DRAFT, MOCK_RECIPES, searchByIngredients } from "./mockData";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ── Recipes ─────────────────────────────────────────────────────────────────

export async function getRecipes(q?: string): Promise<RecipeDto[]> {
  await delay();
  if (!q) return MOCK_RECIPES;
  const lower = q.toLowerCase();
  return MOCK_RECIPES.filter((r) => r.title.toLowerCase().includes(lower));
}

export async function getRecipe(id: number): Promise<RecipeDto> {
  await delay();
  const recipe = MOCK_RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Recipe ${id} not found`);
  return recipe;
}

export async function createRecipe(data: CreateRecipeRequest): Promise<RecipeDto> {
  await delay(500);
  const newRecipe: RecipeDto = {
    id: Math.max(...MOCK_RECIPES.map((r) => r.id)) + 1,
    title: data.title,
    instructions: data.instructions,
    imagePath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: data.ingredients.map((ing, idx) => ({
      ingredientId: 100 + idx,
      ingredientName: ing.name,
      quantity: ing.quantity,
      sortOrder: ing.sortOrder,
    })),
  };
  MOCK_RECIPES.push(newRecipe);
  return newRecipe;
}

export async function deleteRecipe(id: number): Promise<void> {
  await delay(300);
  const idx = MOCK_RECIPES.findIndex((r) => r.id === id);
  if (idx !== -1) MOCK_RECIPES.splice(idx, 1);
}

// ── Ingredient search ────────────────────────────────────────────────────────

export async function searchRecipesByIngredients(
  ingredients: string[],
  minMatch = 1,
  limit = 20
): Promise<IngredientSearchResultDto[]> {
  await delay();
  return searchByIngredients(ingredients, minMatch, limit);
}

export async function getIngredients(): Promise<Ingredient[]> {
  await delay(150);
  return MOCK_INGREDIENTS;
}

// ── OCR ──────────────────────────────────────────────────────────────────────

export async function uploadRecipeImage(_file: File): Promise<RecipeOcrDraftDto> {
  await delay(1500); // simulate OCR processing time
  return MOCK_OCR_DRAFT;
}
