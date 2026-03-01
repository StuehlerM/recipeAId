namespace RecipeAId.Core.DTOs;

public record IngredientLineDto(
    string Name,
    string? Amount,
    string? Unit
);
