namespace RecipeAId.Core.DTOs;

public record IngredientParseResult(
    List<IngredientLineDto> Ingredients,
    bool Success,
    string? ErrorMessage
);
