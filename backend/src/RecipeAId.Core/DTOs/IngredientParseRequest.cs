namespace RecipeAId.Core.DTOs;

public record IngredientParseRequest(
    string Text,
    string? Lang
);
