using Microsoft.EntityFrameworkCore;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Data.Repositories;

public class RecipeRepository(AppDbContext db) : IRecipeRepository
{
    public async Task<IEnumerable<Recipe>> GetAllAsync(string? titleFilter, CancellationToken ct = default)
    {
        var query = db.Recipes
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Ingredient)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(titleFilter))
            query = query.Where(r => r.Title.ToLower().Contains(titleFilter.ToLower()));

        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
    }

    public async Task<Recipe?> GetByIdAsync(int id, CancellationToken ct = default) =>
        await db.Recipes
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Ingredient)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<Recipe> AddAsync(Recipe recipe, CancellationToken ct = default)
    {
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync(ct);
        return recipe;
    }

    public async Task UpdateAsync(Recipe recipe, CancellationToken ct = default)
    {
        db.Recipes.Update(recipe);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Recipe recipe, CancellationToken ct = default)
    {
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync(ct);
    }
}
