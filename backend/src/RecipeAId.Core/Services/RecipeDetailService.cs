using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeDetailService(
    IRecipeService recipeService,
    INutritionEstimator nutritionEstimator) : IRecipeDetailService
{
    public async Task<RecipeDto?> GetEnrichedByIdAsync(int id, CancellationToken ct = default)
    {
        var recipe = await recipeService.GetByIdAsync(id, ct);
        if (recipe is null)
            return null;

        var nutrition = await nutritionEstimator.EstimateAsync(recipe.Ingredients, recipe.Servings, ct);
        return recipe with { NutritionSummary = nutrition };
    }
}
