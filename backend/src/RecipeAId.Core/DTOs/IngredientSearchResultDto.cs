namespace RecipeAId.Core.DTOs;

public record IngredientSearchResultDto(
    RecipeSummaryDto Recipe,
    int MatchedIngredientCount,
    int TotalIngredientCount,
    List<string> MatchedIngredients,
    List<string> MissingIngredients
);
