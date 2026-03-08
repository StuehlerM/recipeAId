using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeMatchingService(IRecipeRepository recipeRepo) : IRecipeMatchingService
{
    public async Task<IEnumerable<IngredientSearchResultDto>> FindByIngredientsAsync(
        IEnumerable<string> ingredientNames,
        int minMatch = 1,
        int limit = 20,
        CancellationToken ct = default)
    {
        var requested = ingredientNames
            .Select(n => n.Trim().ToLowerInvariant())
            .Where(n => n.Length > 0)
            .ToHashSet();

        if (requested.Count == 0)
            return [];

        var recipes = await recipeRepo.GetAllAsync(null, ct);

        return recipes
            .Select(r =>
            {
                var recipeIngredientNames = r.RecipeIngredients
                    .Select(ri => ri.Name)
                    .ToList();

                var matched = recipeIngredientNames.Intersect(requested).ToList();
                var missing = recipeIngredientNames.Except(requested).ToList();
                var total   = recipeIngredientNames.Count;

                return (Recipe: r, Matched: matched, Missing: missing, Total: total);
            })
            .Where(x => x.Matched.Count >= minMatch)
            .OrderByDescending(x => x.Matched.Count)
            .ThenByDescending(x => x.Total > 0 ? (double)x.Matched.Count / x.Total : 0d)
            .Take(limit)
            .Select(x => new IngredientSearchResultDto(
                new RecipeSummaryDto(x.Recipe.Id, x.Recipe.Title, x.Recipe.CreatedAt, x.Total, x.Recipe.BookTitle),
                x.Matched.Count,
                x.Total,
                x.Matched,
                x.Missing))
            .ToList();
    }
}
