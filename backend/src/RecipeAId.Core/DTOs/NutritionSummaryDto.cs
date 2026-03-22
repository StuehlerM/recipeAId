namespace RecipeAId.Core.DTOs;

public record NutritionPerServingDto(
    double ProteinGrams,
    double CarbGrams,
    double FatGrams,
    double FiberGrams
);

public record NutritionSummaryDto(
    double ProteinGrams,
    double CarbGrams,
    double FatGrams,
    double FiberGrams,
    NutritionPerServingDto? PerServing = null
);
