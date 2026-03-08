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

export interface RecipeDto {
  id: number;
  title: string;
  instructions: string | null;
  imagePath: string | null;
  bookTitle: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  ingredientCount?: number;
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
  ingredients: { name: string; amount: string | null; unit: string | null; sortOrder: number }[];
  imageKeys?: Record<string, string>;
}
