using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IOcrService
{
    Task<OcrResult> ExtractTextAsync(Stream imageStream, string mimeType, CancellationToken ct = default);
}
