using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IOcrParser
{
    RecipeOcrDraftDto Parse(string rawOcrText, string? imagePath = null);
}
