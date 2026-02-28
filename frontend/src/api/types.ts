export interface Ingredient {
  id: number;
  name: string;
}

export interface RecipeIngredientDto {
  ingredientId: number;
  ingredientName: string;
  quantity: string | null;
  sortOrder: number;
}

export interface RecipeDto {
  id: number;
  title: string;
  instructions: string | null;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  ingredientCount?: number;
}

export interface RecipeOcrDraftDto {
  detectedTitle: string | null;
  detectedInstructions: string | null;
  detectedIngredients: { name: string; quantity: string | null }[];
  rawOcrText: string;
  imagePath: string | null;
}

export interface IngredientSearchResultDto {
  recipe: RecipeDto;
  matchCount: number;
  matchRatio: number;
}

export interface CreateRecipeRequest {
  title: string;
  instructions: string | null;
  ingredients: { name: string; quantity: string | null; sortOrder: number }[];
}
