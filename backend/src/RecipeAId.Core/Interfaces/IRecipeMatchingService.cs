using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IRecipeMatchingService
{
    Task<IEnumerable<IngredientSearchResultDto>> FindByIngredientsAsync(
        IEnumerable<string> ingredientNames,
        int minMatch = 1,
        int limit = 20,
        CancellationToken ct = default);
}
