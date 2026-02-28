using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IRecipeService
{
    Task<IEnumerable<RecipeSummaryDto>> GetAllAsync(string? titleFilter, CancellationToken ct = default);
    Task<RecipeDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<RecipeDto> CreateAsync(CreateRecipeRequest request, CancellationToken ct = default);
    Task<RecipeDto?> UpdateAsync(int id, UpdateRecipeRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}
