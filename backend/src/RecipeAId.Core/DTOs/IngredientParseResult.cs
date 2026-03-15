namespace RecipeAId.Core.DTOs;

public enum IngredientParseErrorCode
{
    None,
    Unauthorized,
    ServiceError,
    InvalidResponse,
}

public record IngredientParseResult(
    List<IngredientLineDto> Ingredients,
    bool Success,
    string? ErrorMessage,
    IngredientParseErrorCode ErrorCode = IngredientParseErrorCode.None
);
