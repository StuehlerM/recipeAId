/**
 * Typed API client.
 * When VITE_API_BASE_URL is set, makes real fetch calls to the backend.
 * Otherwise falls back to mock data (for local dev without a running backend).
 */

import type { CreateRecipeRequest, IngredientSearchResultDto, Ingredient, RecipeDto, RecipeOcrDraftDto } from "./types";
import { MOCK_INGREDIENTS, MOCK_OCR_DRAFT, MOCK_RECIPES, searchByIngredients } from "./mockData";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
// In production (nginx), BASE is empty and the proxy handles /api/ routes.
// In dev, BASE empty → use mock data so the Vite dev server works offline.
const USE_MOCK = BASE === "" && import.meta.env.DEV;

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ── Internal backend response shapes (not exported) ───────────────────────────

interface BackendIngredient {
  ingredientId: number;
  name: string;
  quantity: string | null;
  sortOrder: number;
}

interface BackendRecipeSummary {
  id: number;
  title: string;
  createdAt: string;
  ingredientCount: number;
}

interface BackendRecipeDto {
  id: number;
  title: string;
  instructions: string | null;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: BackendIngredient[];
}

interface BackendSearchResult {
  recipe: BackendRecipeSummary;
  matchedIngredientCount: number;
  totalIngredientCount: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function toRecipeDto(r: BackendRecipeDto): RecipeDto {
  return {
    id: r.id,
    title: r.title,
    instructions: r.instructions,
    imagePath: r.imagePath,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ingredients: r.ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      ingredientName: i.name,
      quantity: i.quantity,
      sortOrder: i.sortOrder,
    })),
    ingredientCount: r.ingredients.length,
  };
}

function summaryToRecipeDto(s: BackendRecipeSummary): RecipeDto {
  return {
    id: s.id,
    title: s.title,
    instructions: null,
    imagePath: null,
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
    ingredients: [],
    ingredientCount: s.ingredientCount,
  };
}

async function checkOk(res: Response, label: string): Promise<Response> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  return res;
}

// ── Recipes ─────────────────────────────────────────────────────────────────

export async function getRecipes(q?: string): Promise<RecipeDto[]> {
  if (USE_MOCK) {
    await delay();
    if (!q) return MOCK_RECIPES;
    const lower = q.toLowerCase();
    return MOCK_RECIPES.filter((r) => r.title.toLowerCase().includes(lower));
  }

  const url = new URL(`${BASE}/api/v1/recipes`, window.location.origin);
  if (q) url.searchParams.set("q", q);
  const res = await checkOk(await fetch(url.toString()), "GET /api/v1/recipes");
  return (await res.json() as BackendRecipeSummary[]).map(summaryToRecipeDto);
}

export async function getRecipe(id: number): Promise<RecipeDto> {
  if (USE_MOCK) {
    await delay();
    const recipe = MOCK_RECIPES.find((r) => r.id === id);
    if (!recipe) throw new Error(`Recipe ${id} not found`);
    return recipe;
  }

  const res = await fetch(`${BASE}/api/v1/recipes/${id}`);
  if (res.status === 404) throw new Error(`Recipe ${id} not found`);
  await checkOk(res, `GET /api/v1/recipes/${id}`);
  return toRecipeDto(await res.json());
}

export async function createRecipe(data: CreateRecipeRequest): Promise<RecipeDto> {
  if (USE_MOCK) {
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

  const res = await checkOk(
    await fetch(`${BASE}/api/v1/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        instructions: data.instructions,
        imagePath: null,
        rawOcrText: null,
        ingredients: data.ingredients.map((i) => ({ name: i.name, quantity: i.quantity })),
      }),
    }),
    "POST /api/v1/recipes"
  );
  return toRecipeDto(await res.json());
}

export async function deleteRecipe(id: number): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    const idx = MOCK_RECIPES.findIndex((r) => r.id === id);
    if (idx !== -1) MOCK_RECIPES.splice(idx, 1);
    return;
  }

  await checkOk(
    await fetch(`${BASE}/api/v1/recipes/${id}`, { method: "DELETE" }),
    `DELETE /api/v1/recipes/${id}`
  );
}

// ── Ingredient search ────────────────────────────────────────────────────────

export async function searchRecipesByIngredients(
  ingredients: string[],
  minMatch = 1,
  limit = 20
): Promise<IngredientSearchResultDto[]> {
  if (USE_MOCK) {
    await delay();
    return searchByIngredients(ingredients, minMatch, limit);
  }

  const params = new URLSearchParams({
    ingredients: ingredients.join(","),
    minMatch: String(minMatch),
    limit: String(limit),
  });
  const res = await checkOk(
    await fetch(`${BASE}/api/v1/recipes/search/by-ingredients?${params}`),
    "GET /api/v1/recipes/search/by-ingredients"
  );
  return (await res.json() as BackendSearchResult[]).map((r) => ({
    recipe: summaryToRecipeDto(r.recipe),
    matchCount: r.matchedIngredientCount,
    matchRatio: r.totalIngredientCount > 0
      ? r.matchedIngredientCount / r.totalIngredientCount
      : 0,
  }));
}

export async function getIngredients(): Promise<Ingredient[]> {
  if (USE_MOCK) {
    await delay(150);
    return MOCK_INGREDIENTS;
  }

  const res = await checkOk(
    await fetch(`${BASE}/api/v1/ingredients`),
    "GET /api/v1/ingredients"
  );
  return res.json();
}

// ── OCR ──────────────────────────────────────────────────────────────────────

export async function uploadRecipeImage(file: File): Promise<RecipeOcrDraftDto> {
  if (USE_MOCK) {
    await delay(1500);
    return MOCK_OCR_DRAFT;
  }

  const body = new FormData();
  body.append("image", file);
  const res = await checkOk(
    await fetch(`${BASE}/api/v1/recipes/from-image`, { method: "POST", body }),
    "POST /api/v1/recipes/from-image"
  );
  return res.json() as Promise<RecipeOcrDraftDto>;
}
