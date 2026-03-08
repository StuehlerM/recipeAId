import type { RecipeDto, Ingredient, IngredientSearchResultDto, RecipeOcrDraftDto } from "./types";

export const MOCK_RECIPES: RecipeDto[] = [
  {
    id: 1,
    title: "Classic Spaghetti Bolognese",
    instructions:
      "1. Brown the ground beef in a large pan over medium-high heat.\n2. Add onion and garlic, cook until soft.\n3. Stir in tomato paste and crushed tomatoes.\n4. Season with salt, pepper, and Italian herbs.\n5. Simmer for 30 minutes.\n6. Cook spaghetti according to package directions.\n7. Serve sauce over pasta with parmesan.",
    imagePath: null,
    bookTitle: "The Italian Kitchen",
    createdAt: "2025-01-10T08:00:00Z",
    updatedAt: "2025-01-10T08:00:00Z",
    ingredients: [
      { ingredientId: 1, ingredientName: "ground beef", amount: "500", unit: "g", sortOrder: 0 },
      { ingredientId: 2, ingredientName: "spaghetti", amount: "400", unit: "g", sortOrder: 1 },
      { ingredientId: 3, ingredientName: "onion", amount: "1", unit: "large", sortOrder: 2 },
      { ingredientId: 4, ingredientName: "garlic", amount: "3", unit: "cloves", sortOrder: 3 },
      { ingredientId: 5, ingredientName: "crushed tomatoes", amount: "400", unit: "g", sortOrder: 4 },
      { ingredientId: 6, ingredientName: "tomato paste", amount: "2", unit: "tbsp", sortOrder: 5 },
      { ingredientId: 7, ingredientName: "parmesan", amount: null, unit: "to taste", sortOrder: 6 },
    ],
  },
  {
    id: 2,
    title: "Lemon Garlic Roast Chicken",
    instructions:
      "1. Preheat oven to 200°C.\n2. Pat chicken dry and season generously with salt and pepper.\n3. Stuff cavity with lemon halves and garlic cloves.\n4. Rub butter all over the skin.\n5. Roast for 1 hour 20 minutes, basting halfway through.\n6. Rest 15 minutes before carving.",
    imagePath: null,
    bookTitle: "The Italian Kitchen",
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-01-15T10:30:00Z",
    ingredients: [
      { ingredientId: 8, ingredientName: "whole chicken", amount: "1.5", unit: "kg", sortOrder: 0 },
      { ingredientId: 9, ingredientName: "lemon", amount: "2", unit: null, sortOrder: 1 },
      { ingredientId: 4, ingredientName: "garlic", amount: "6", unit: "cloves", sortOrder: 2 },
      { ingredientId: 10, ingredientName: "butter", amount: "50", unit: "g", sortOrder: 3 },
      { ingredientId: 11, ingredientName: "salt", amount: null, unit: "to taste", sortOrder: 4 },
      { ingredientId: 12, ingredientName: "black pepper", amount: null, unit: "to taste", sortOrder: 5 },
    ],
  },
  {
    id: 3,
    title: "Avocado Toast with Poached Egg",
    instructions:
      "1. Toast sourdough bread until golden.\n2. Mash avocado with lemon juice, salt, and chili flakes.\n3. Bring a pot of water to a gentle simmer, add a splash of vinegar.\n4. Crack egg into a small bowl, swirl the water, then slide egg in.\n5. Poach for 3 minutes.\n6. Spread avocado on toast, top with poached egg and seasoning.",
    imagePath: null,
    bookTitle: null,
    createdAt: "2025-02-01T07:15:00Z",
    updatedAt: "2025-02-01T07:15:00Z",
    ingredients: [
      { ingredientId: 13, ingredientName: "sourdough bread", amount: "2", unit: "slices", sortOrder: 0 },
      { ingredientId: 14, ingredientName: "avocado", amount: "1", unit: null, sortOrder: 1 },
      { ingredientId: 15, ingredientName: "egg", amount: "2", unit: null, sortOrder: 2 },
      { ingredientId: 9, ingredientName: "lemon", amount: "½", unit: null, sortOrder: 3 },
      { ingredientId: 16, ingredientName: "chili flakes", amount: null, unit: "pinch", sortOrder: 4 },
      { ingredientId: 11, ingredientName: "salt", amount: null, unit: "to taste", sortOrder: 5 },
    ],
  },
  {
    id: 4,
    title: "Vegetable Stir-Fry",
    instructions:
      "1. Heat oil in a wok over high heat.\n2. Add garlic and ginger, stir-fry 30 seconds.\n3. Add harder vegetables first (broccoli, carrots), cook 3 minutes.\n4. Add softer vegetables (capsicum, snow peas), cook 2 more minutes.\n5. Add soy sauce, oyster sauce, and sesame oil.\n6. Toss everything together and serve over rice.",
    imagePath: null,
    bookTitle: "Quick Asian Cooking",
    createdAt: "2025-02-10T12:00:00Z",
    updatedAt: "2025-02-10T12:00:00Z",
    ingredients: [
      { ingredientId: 17, ingredientName: "broccoli", amount: "1", unit: null, sortOrder: 0 },
      { ingredientId: 18, ingredientName: "carrot", amount: "2", unit: null, sortOrder: 1 },
      { ingredientId: 19, ingredientName: "capsicum", amount: "1", unit: null, sortOrder: 2 },
      { ingredientId: 20, ingredientName: "snow peas", amount: "100", unit: "g", sortOrder: 3 },
      { ingredientId: 4, ingredientName: "garlic", amount: "2", unit: "cloves", sortOrder: 4 },
      { ingredientId: 21, ingredientName: "ginger", amount: "1", unit: "tsp", sortOrder: 5 },
      { ingredientId: 22, ingredientName: "soy sauce", amount: "2", unit: "tbsp", sortOrder: 6 },
      { ingredientId: 23, ingredientName: "oyster sauce", amount: "1", unit: "tbsp", sortOrder: 7 },
      { ingredientId: 24, ingredientName: "sesame oil", amount: "1", unit: "tsp", sortOrder: 8 },
    ],
  },
  {
    id: 5,
    title: "Banana Pancakes",
    instructions:
      "1. Mash bananas in a bowl.\n2. Whisk in eggs, flour, baking powder, and a pinch of salt.\n3. Heat butter in a non-stick pan over medium heat.\n4. Pour small rounds of batter and cook until bubbles form on top.\n5. Flip and cook 1 more minute.\n6. Serve with maple syrup.",
    imagePath: null,
    bookTitle: null,
    createdAt: "2025-02-20T09:00:00Z",
    updatedAt: "2025-02-20T09:00:00Z",
    ingredients: [
      { ingredientId: 25, ingredientName: "banana", amount: "2", unit: null, sortOrder: 0 },
      { ingredientId: 15, ingredientName: "egg", amount: "2", unit: null, sortOrder: 1 },
      { ingredientId: 26, ingredientName: "flour", amount: "½", unit: "cup", sortOrder: 2 },
      { ingredientId: 27, ingredientName: "baking powder", amount: "1", unit: "tsp", sortOrder: 3 },
      { ingredientId: 10, ingredientName: "butter", amount: "1", unit: "tbsp", sortOrder: 4 },
      { ingredientId: 11, ingredientName: "salt", amount: null, unit: "pinch", sortOrder: 5 },
      { ingredientId: 28, ingredientName: "maple syrup", amount: null, unit: "to serve", sortOrder: 6 },
    ],
  },
];

export const MOCK_INGREDIENTS: Ingredient[] = Array.from(
  new Map(
    MOCK_RECIPES.flatMap((r) =>
      r.ingredients.map((i) => [i.ingredientId, { id: i.ingredientId, name: i.ingredientName }])
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

export function searchByIngredients(
  names: string[],
  minMatch = 1,
  limit = 20
): IngredientSearchResultDto[] {
  const query = names.map((n) => n.toLowerCase().trim());
  return MOCK_RECIPES
    .map((recipe) => {
      const recipeNames = recipe.ingredients.map((i) => i.ingredientName.toLowerCase());
      const matchCount = query.filter((q) => recipeNames.includes(q)).length;
      const matchRatio = query.length > 0 ? matchCount / query.length : 0;
      return { recipe, matchCount, matchRatio };
    })
    .filter((r) => r.matchCount >= minMatch)
    .sort((a, b) => b.matchCount - a.matchCount || b.matchRatio - a.matchRatio)
    .slice(0, limit);
}

export const MOCK_OCR_DRAFT: RecipeOcrDraftDto = {
  detectedTitle: "Grandma's Apple Pie",
  detectedInstructions:
    "Preheat oven to 180°C. Mix flour and butter until crumbly. Add water gradually to form dough. Peel and slice apples, toss with sugar and cinnamon. Line pie dish with half the dough, fill with apple mixture, cover with remaining dough. Bake 45 minutes until golden.",
  detectedIngredients: [
    { name: "flour", amount: "2", unit: "cups" },
    { name: "butter", amount: "125", unit: "g" },
    { name: "apple", amount: "6", unit: "large" },
    { name: "sugar", amount: "¾", unit: "cup" },
    { name: "cinnamon", amount: "1", unit: "tsp" },
    { name: "water", amount: "4", unit: "tbsp" },
  ],
  rawOcrText:
    "Grandma's Apple Pie\n\nIngredients:\n2 cups flour\n125g butter\n6 large apples\n3/4 cup sugar\n1 tsp cinnamon\n4 tbsp water\n\nInstructions:\nPreheat oven to 180C...",
  imagePath: null,
  sessionId: null,
  imageKey: null,
};
