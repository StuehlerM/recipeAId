using RecipeAId.Core.Entities;

namespace RecipeAId.Core.Interfaces;

public interface IIngredientRepository
{
    Task<IEnumerable<Ingredient>> GetAllAsync(CancellationToken ct = default);
    Task<Ingredient?> GetByNameAsync(string normalizedName, CancellationToken ct = default);
    Task<Ingredient> GetOrCreateAsync(string normalizedName, CancellationToken ct = default);
}
