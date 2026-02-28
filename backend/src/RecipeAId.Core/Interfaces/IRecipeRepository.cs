using RecipeAId.Core.Entities;

namespace RecipeAId.Core.Interfaces;

public interface IRecipeRepository
{
    Task<IEnumerable<Recipe>> GetAllAsync(string? titleFilter, CancellationToken ct = default);
    Task<Recipe?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Recipe> AddAsync(Recipe recipe, CancellationToken ct = default);
    Task UpdateAsync(Recipe recipe, IEnumerable<RecipeIngredient> newIngredients, CancellationToken ct = default);
    Task DeleteAsync(Recipe recipe, CancellationToken ct = default);
}
