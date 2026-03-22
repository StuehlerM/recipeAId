using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;
using System.Globalization;

namespace RecipeAId.Core.Services;

public class NutritionEstimatorService(IOpenFoodFactsClient offClient) : INutritionEstimator
{
    private const double FallbackGrams = 100.0;
    private const int    MaxConcurrentLookups = 4;

    public async Task<NutritionSummaryDto?> EstimateAsync(
        IEnumerable<RecipeIngredientDto> ingredients,
        int? servings = null,
        CancellationToken ct = default)
    {
        var ingredientList = ingredients.ToList();
        if (ingredientList.Count == 0)
            return null;

        // Parallel lookups bounded by a semaphore to stay within OFF rate limits.
        using var semaphore = new SemaphoreSlim(MaxConcurrentLookups, MaxConcurrentLookups);
        var upstreamFailed = 0; // 0 = false, 1 = true — written atomically via Interlocked

        var lookupTasks = ingredientList.Select(async ingredient =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                var info = await offClient.GetNutrientsByNameAsync(ingredient.Name, ct);
                return (ingredient, info);
            }
            catch (OperationCanceledException)
            {
                throw; // propagate cancellation; don't treat it as an upstream failure
            }
            catch
            {
                Interlocked.Exchange(ref upstreamFailed, 1);
                return (ingredient, (NutrientInfo?)null);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(lookupTasks);

        // If any upstream call failed (network error / timeout), treat the entire estimate as unavailable.
        if (upstreamFailed == 1)
            return null;

        double totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
        int matchCount = 0;

        foreach (var (ingredient, info) in results)
        {
            if (info is null) continue;

            var grams = ResolveGrams(ingredient.Amount, ingredient.Unit);
            var factor = grams / 100.0;

            totalProtein += info.ProteinPer100g * factor;
            totalCarbs   += info.CarbsPer100g   * factor;
            totalFat     += info.FatPer100g      * factor;
            totalFiber   += info.FiberPer100g    * factor;
            matchCount++;
        }

        if (matchCount == 0)
            return null;

        NutritionPerServingDto? perServing = null;
        if (servings is > 0)
        {
            perServing = new NutritionPerServingDto(
                totalProtein / servings.Value,
                totalCarbs   / servings.Value,
                totalFat     / servings.Value,
                totalFiber   / servings.Value);
        }

        return new NutritionSummaryDto(totalProtein, totalCarbs, totalFat, totalFiber, perServing);
    }

    private static double ResolveGrams(string? amount, string? unit)
    {
        if (string.IsNullOrWhiteSpace(amount) || !double.TryParse(amount, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty))
            return FallbackGrams;

        return unit?.ToLowerInvariant().Trim() switch
        {
            "g" or "gram" or "grams" => qty,
            "kg" or "kilogram" or "kilograms" => qty * 1000.0,
            _ => FallbackGrams,
        };
    }
}
