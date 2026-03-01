namespace RecipeAId.Core.DTOs;

public record RecipeIngredientDto(
    int IngredientId,
    string Name,
    string? Amount,
    string? Unit,
    int SortOrder
);
