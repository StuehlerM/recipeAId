namespace RecipeAId.Core.DTOs;

public record RecipeOcrDraftDto(
    string? DetectedTitle,
    string? DetectedInstructions,
    List<IngredientLineDto> DetectedIngredients,
    string RawOcrText,
    string? ImagePath,
    string? SessionId = null,
    string? ImageKey = null
);
