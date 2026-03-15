using Microsoft.Extensions.Logging;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

/// <summary>
/// Calls a public LLM API to parse raw ingredient text into structured
/// <see cref="IngredientLineDto"/> records.
/// Replaces the Ollama sidecar; API key is supplied via the
/// <c>INGREDIENT_PARSER_API_KEY</c> environment variable.
/// </summary>
/// <remarks>
/// IMPLEMENTATION PENDING — this is a TDD stub; all methods throw
/// <see cref="NotImplementedException"/> until the feature is implemented.
/// </remarks>
public sealed class PublicLlmIngredientParserService(
    HttpClient httpClient,
    string apiKey,
    ILogger<PublicLlmIngredientParserService> logger)
    : IIngredientParserService
{
    public Task<IngredientParseResult> ParseAsync(
        string text,
        string lang,
        CancellationToken ct = default)
        => throw new NotImplementedException("PublicLlmIngredientParserService is not yet implemented.");
}
