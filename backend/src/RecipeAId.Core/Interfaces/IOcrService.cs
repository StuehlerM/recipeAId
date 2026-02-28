namespace RecipeAId.Core.Interfaces;

public record OcrResult(
    string RawText,
    bool Success,
    string? ErrorMessage
);

public interface IOcrService
{
    Task<OcrResult> ExtractTextAsync(Stream imageStream, string mimeType, CancellationToken ct = default);
}
