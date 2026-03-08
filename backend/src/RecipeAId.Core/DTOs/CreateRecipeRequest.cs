namespace RecipeAId.Core.DTOs;

public record CreateRecipeRequest(
    string Title,
    string? Instructions,
    string? ImagePath,
    string? RawOcrText,
    string? BookTitle,
    List<IngredientLineDto> Ingredients,
    Dictionary<string, string>? ImageKeys = null
);
