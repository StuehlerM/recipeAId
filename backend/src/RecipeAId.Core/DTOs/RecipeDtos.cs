namespace RecipeAId.Core.DTOs;

public record IngredientLineDto(
    string Name,
    string? Amount,
    string? Unit
);

public record CreateRecipeRequest(
    string Title,
    string? Instructions,
    string? ImagePath,
    string? RawOcrText,
    string? BookTitle,
    List<IngredientLineDto> Ingredients
);

public record UpdateRecipeRequest(
    string Title,
    string? Instructions,
    string? BookTitle,
    List<IngredientLineDto> Ingredients
);

public record RecipeIngredientDto(
    int IngredientId,
    string Name,
    string? Amount,
    string? Unit,
    int SortOrder
);

public record RecipeDto(
    int Id,
    string Title,
    string? Instructions,
    string? ImagePath,
    string? BookTitle,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<RecipeIngredientDto> Ingredients
);

public record RecipeSummaryDto(
    int Id,
    string Title,
    DateTime CreatedAt,
    int IngredientCount,
    string? BookTitle
);

public record RecipeOcrDraftDto(
    string? DetectedTitle,
    string? DetectedInstructions,
    List<IngredientLineDto> DetectedIngredients,
    string RawOcrText,
    string? ImagePath
);

public record IngredientSearchResultDto(
    RecipeSummaryDto Recipe,
    int MatchedIngredientCount,
    int TotalIngredientCount,
    List<string> MatchedIngredients,
    List<string> MissingIngredients
);

public record IngredientDto(
    int Id,
    string Name
);
