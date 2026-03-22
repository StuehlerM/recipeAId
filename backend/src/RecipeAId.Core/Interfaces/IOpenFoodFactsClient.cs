using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IOpenFoodFactsClient
{
    /// <summary>
    /// Looks up per-100g nutrient data for the given ingredient name.
    /// Returns null when no match is found or the source is unavailable.
    /// </summary>
    Task<NutrientInfo?> GetNutrientsByNameAsync(string ingredientName, CancellationToken ct = default);
}
