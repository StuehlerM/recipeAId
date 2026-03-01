namespace RecipeAId.Core.DTOs;

public record UpdateRecipeRequest(
    string Title,
    string? Instructions,
    string? BookTitle,
    List<IngredientLineDto> Ingredients
);
