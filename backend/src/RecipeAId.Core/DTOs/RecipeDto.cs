namespace RecipeAId.Core.DTOs;

public record RecipeDto(
    int Id,
    string Title,
    string? Instructions,
    string? ImagePath,
    string? BookTitle,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<RecipeIngredientDto> Ingredients,
    int? Servings = null,
    NutritionSummaryDto? NutritionSummary = null
);
