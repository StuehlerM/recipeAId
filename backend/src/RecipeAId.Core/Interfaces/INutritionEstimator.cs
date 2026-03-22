using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface INutritionEstimator
{
    /// <summary>
    /// Estimates the nutrition summary for a recipe given its ingredients.
    /// Returns null when no ingredients could be matched to a nutrition source.
    /// </summary>
    Task<NutritionSummaryDto?> EstimateAsync(
        IEnumerable<RecipeIngredientDto> ingredients,
        int? servings = null,
        CancellationToken ct = default);
}
