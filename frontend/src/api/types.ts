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
}

export interface RecipeOcrDraftDto {
  title: string;
  instructions: string | null;
  ingredients: { name: string; quantity: string | null }[];
  rawOcrText: string;
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
