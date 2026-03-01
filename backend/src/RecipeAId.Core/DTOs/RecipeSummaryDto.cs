namespace RecipeAId.Core.DTOs;

public record RecipeSummaryDto(
    int Id,
    string Title,
    DateTime CreatedAt,
    int IngredientCount,
    string? BookTitle
);
