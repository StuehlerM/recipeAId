namespace RecipeAId.Core.DTOs;

/// <summary>Nutrient values per 100 g of an ingredient, from a nutrition data source.</summary>
public record NutrientInfo(
    double ProteinPer100g,
    double CarbsPer100g,
    double FatPer100g,
    double FiberPer100g
);
