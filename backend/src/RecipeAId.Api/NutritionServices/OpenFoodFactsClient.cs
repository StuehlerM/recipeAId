using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.NutritionServices;

public class OpenFoodFactsClient(
    HttpClient httpClient,
    IMemoryCache cache,
    ILogger<OpenFoodFactsClient> logger) : IOpenFoodFactsClient
{
    private static readonly MemoryCacheEntryOptions CacheOptions = new MemoryCacheEntryOptions()
        .SetSlidingExpiration(TimeSpan.FromHours(1))
        .SetAbsoluteExpiration(TimeSpan.FromHours(24));

    private static readonly MemoryCacheEntryOptions ErrorCacheOptions = new MemoryCacheEntryOptions()
        .SetAbsoluteExpiration(TimeSpan.FromMinutes(5));

    private const string CacheKeyPrefix = "off_nutrients_";

    public async Task<NutrientInfo?> GetNutrientsByNameAsync(string ingredientName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ingredientName))
            return null;

        var normalised = ingredientName.Trim().ToLowerInvariant();
        var cacheKey = CacheKeyPrefix + normalised;

        if (cache.TryGetValue(cacheKey, out NutrientInfo? cached))
            return cached;

        var encoded = Uri.EscapeDataString(normalised);
        var url = $"/api/v2/search?q={encoded}&fields=nutriments&page_size=1&json=1";

        try
        {
            using var response = await httpClient.GetAsync(url, ct);

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                cache.Set(cacheKey, (NutrientInfo?)null, CacheOptions);
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Open Food Facts returned {StatusCode} for ingredient '{Ingredient}'",
                    response.StatusCode, ingredientName);
                // Cache null briefly to avoid hammering OFF on rate-limit (429) or server error (5xx).
                cache.Set(cacheKey, (NutrientInfo?)null, ErrorCacheOptions);
                return null;
            }

            try
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                NutrientInfo? result = null;
                if (doc.RootElement.TryGetProperty("products", out var products) &&
                    products.GetArrayLength() > 0 &&
                    products[0].TryGetProperty("nutriments", out var nutriments))
                {
                    result = new NutrientInfo(
                        ProteinPer100g: GetDouble(nutriments, "proteins_100g"),
                        CarbsPer100g:   GetDouble(nutriments, "carbohydrates_100g"),
                        FatPer100g:     GetDouble(nutriments, "fat_100g"),
                        FiberPer100g:   GetDouble(nutriments, "fiber_100g"));
                }

                cache.Set(cacheKey, result, CacheOptions);
                return result;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to parse Open Food Facts response for ingredient '{Ingredient}'", ingredientName);
                return null;
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Open Food Facts request failed for ingredient '{Ingredient}'", ingredientName);
            return null;
        }
    }

    private static double GetDouble(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop) &&
            prop.ValueKind is JsonValueKind.Number &&
            prop.TryGetDouble(out var value))
            return value;

        return 0.0;
    }
}
