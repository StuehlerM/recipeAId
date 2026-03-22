using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IRecipeDetailService
{
    /// <summary>
    /// Returns the recipe by ID, enriched with an estimated nutrition summary when available.
    /// Returns null when the recipe does not exist.
    /// </summary>
    Task<RecipeDto?> GetEnrichedByIdAsync(int id, CancellationToken ct = default);
}
