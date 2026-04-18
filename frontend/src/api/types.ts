export interface Ingredient {
  id: number;
  name: string;
}

export interface RecipeIngredientDto {
  ingredientId: number;
  ingredientName: string;
  amount: string | null;
  unit: string | null;
  sortOrder: number;
}

export interface MacroSetDto {
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface NutritionSummaryDto extends MacroSetDto {
  /** Per-serving breakdown — only present when the backend could compute it */
  perServing?: MacroSetDto;
}

export interface RecipeDto {
  id: number;
  title: string;
  instructions: string | null;
  instructionSteps?: string[];
  imagePath: string | null;
  bookTitle: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  ingredientCount?: number;
  servings?: number | null;
  /**
   * undefined = backend did not include this field (nutrition unavailable / old record)
   * null      = backend tried to estimate but could not produce a result
   * object    = estimate available
   */
  nutritionSummary?: NutritionSummaryDto | null;
}

export interface RecipeOcrDraftDto {
  detectedTitle: string | null;
  detectedInstructions: string | null;
  detectedIngredients: { name: string; amount: string | null; unit: string | null }[];
  rawOcrText: string;
  imagePath: string | null;
  sessionId: string | null;
  imageKey: string | null;
}

export interface IngredientSearchResultDto {
  recipe: RecipeDto;
  matchCount: number;
  matchRatio: number;
}

export interface CreateRecipeRequest {
  title: string;
  instructions: string | null;
  bookTitle: string | null;
  servings?: number | null;
  ingredients: { name: string; amount: string | null; unit: string | null; sortOrder: number }[];
  imageKeys?: Record<string, string>;
}
