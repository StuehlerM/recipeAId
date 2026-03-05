using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.ParserServices;

/// <summary>
/// Calls the Ministral 3B ingredient-parser sidecar to refine OCR ingredient text
/// into structured <see cref="IngredientLineDto"/> records.
/// Falls back gracefully — callers should treat a failed result as a signal to use
/// the regex-parsed fallback.
/// </summary>
public sealed class LlmIngredientParserService(
    IHttpClientFactory httpClientFactory,
    ILogger<LlmIngredientParserService> logger)
    : IIngredientParserService
{
    public async Task<IngredientParseResult> ParseAsync(
        string text,
        string lang,
        CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("IngredientParser");

        var requestBody = new { text, lang };
        HttpResponseMessage response;
        try
        {
            response = await client.PostAsJsonAsync("/parse", requestBody, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Ingredient parser sidecar is unreachable — falling back to regex");
            return new IngredientParseResult([], false, "Ingredient parser unavailable");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning(
                "Ingredient parser returned {Status}: {Body}",
                (int)response.StatusCode,
                body);
            return new IngredientParseResult([], false, $"Ingredient parser error ({(int)response.StatusCode})");
        }

        ParseResponse? parsed;
        try
        {
            parsed = await response.Content.ReadFromJsonAsync<ParseResponse>(ct);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Could not deserialize ingredient parser response");
            return new IngredientParseResult([], false, "Invalid response from ingredient parser");
        }

        if (parsed?.Ingredients is null)
            return new IngredientParseResult([], false, "Empty response from ingredient parser");

        var ingredients = parsed.Ingredients
            .Select(item => new IngredientLineDto(
                Name: item.Name,
                Amount: FormatValue(item.Value),
                Unit: item.Unit))
            .ToList();

        return new IngredientParseResult(ingredients, true, null);
    }

    /// <summary>
    /// Converts a float quantity to a display string.
    /// Whole numbers drop the decimal: 2.0 → "2", 0.5 → "0.5".
    /// </summary>
    private static string FormatValue(double value)
    {
        if (value == 0) return string.Empty;
        return value % 1 == 0
            ? ((long)value).ToString()
            : value.ToString("0.##");
    }

    // ── JSON response shape from the Python sidecar ──────────────────────────

    private sealed record ParseResponse(
        [property: JsonPropertyName("ingredients")] List<IngredientItemJson> Ingredients);

    private sealed record IngredientItemJson(
        [property: JsonPropertyName("name")]  string Name,
        [property: JsonPropertyName("value")] double Value,
        [property: JsonPropertyName("unit")]  string Unit);
}
