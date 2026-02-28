namespace RecipeAId.Core.DTOs;

public record ConvertRequest(
    decimal Value,
    string FromUnit,
    string ToUnit,
    string? Ingredient = null
);

public record ConvertResult(
    decimal OriginalValue,
    string OriginalUnit,
    decimal ConvertedValue,
    string ConvertedUnit,
    string Formatted
);
