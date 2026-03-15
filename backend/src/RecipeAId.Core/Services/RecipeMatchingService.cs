using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeMatchingService(IRecipeRepository recipeRepo) : IRecipeMatchingService
{
    private const double ExactMatchScore = 1.0;
    private const double FuzzyMatchScore = 0.8;
    private const int    FuzzyMaxDistance = 2;

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
        {
            return [];
        }

        var recipes = await recipeRepo.GetAllAsync(null, ct);

        return recipes
            .Select(r =>
            {
                var recipeIngredientNames = r.RecipeIngredients
                    .Select(ri => ri.Name)
                    .ToList();

                var matched     = new List<string>();
                var missing     = new List<string>();
                double matchScore = 0.0;
                int total       = recipeIngredientNames.Count;

                foreach (var storedName in recipeIngredientNames)
                {
                    if (requested.Contains(storedName))
                    {
                        matched.Add(storedName);
                        matchScore += ExactMatchScore;
                    }
                    else if (requested.Any(req => DamerauLevenshtein(storedName, req) <= FuzzyMaxDistance))
                    {
                        matched.Add(storedName);
                        matchScore += FuzzyMatchScore;
                    }
                    else
                    {
                        missing.Add(storedName);
                    }
                }

                return (Recipe: r, Matched: matched, Missing: missing, Total: total, MatchScore: matchScore);
            })
            .Where(x => x.Matched.Count >= minMatch)
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.Total > 0 ? x.MatchScore / x.Total : 0d)
            .Take(limit)
            .Select(x => new IngredientSearchResultDto(
                new RecipeSummaryDto(x.Recipe.Id, x.Recipe.Title, x.Recipe.CreatedAt, x.Total, x.Recipe.BookTitle),
                x.Matched.Count,
                x.Total,
                x.Matched,
                x.Missing))
            .ToList();
    }

    private static int DamerauLevenshtein(string s, string t)
    {
        int sLen = s.Length, tLen = t.Length;
        if (Math.Abs(sLen - tLen) > FuzzyMaxDistance)
            return FuzzyMaxDistance + 1;

        var d = new int[sLen + 1, tLen + 1];
        for (int i = 0; i <= sLen; i++) d[i, 0] = i;
        for (int j = 0; j <= tLen; j++) d[0, j] = j;

        for (int i = 1; i <= sLen; i++)
        {
            for (int j = 1; j <= tLen; j++)
            {
                int cost = s[i - 1] == t[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);

                if (i > 1 && j > 1 && s[i - 1] == t[j - 2] && s[i - 2] == t[j - 1])
                    d[i, j] = Math.Min(d[i, j], d[i - 2, j - 2] + cost);
            }
        }

        return d[sLen, tLen];
    }
}
