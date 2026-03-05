using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IIngredientParserService
{
    Task<IngredientParseResult> ParseAsync(string text, string lang, CancellationToken ct = default);
}
