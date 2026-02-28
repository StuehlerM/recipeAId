using Microsoft.EntityFrameworkCore;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Data.Repositories;

public class IngredientRepository(AppDbContext db) : IIngredientRepository
{
    public async Task<IEnumerable<Ingredient>> GetAllAsync(CancellationToken ct = default) =>
        await db.Ingredients.OrderBy(i => i.Name).ToListAsync(ct);

    public async Task<Ingredient?> GetByNameAsync(string normalizedName, CancellationToken ct = default) =>
        await db.Ingredients.FirstOrDefaultAsync(i => i.Name == normalizedName, ct);

    public async Task<Ingredient> GetOrCreateAsync(string normalizedName, CancellationToken ct = default)
    {
        var existing = await GetByNameAsync(normalizedName, ct);
        if (existing is not null)
            return existing;

        var ingredient = new Ingredient { Name = normalizedName };
        db.Ingredients.Add(ingredient);
        await db.SaveChangesAsync(ct);
        return ingredient;
    }
}
