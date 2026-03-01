namespace RecipeAId.Core.DTOs;

public record OcrResult(
    string RawText,
    bool Success,
    string? ErrorMessage
);
