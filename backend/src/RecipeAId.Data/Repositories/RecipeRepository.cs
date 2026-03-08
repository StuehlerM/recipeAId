using LiteDB;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Data.Repositories;

public class RecipeRepository(ILiteDatabase db) : IRecipeRepository
{
    private ILiteCollection<Recipe> Recipes => db.GetCollection<Recipe>("recipes");

    public Task<IEnumerable<Recipe>> GetAllAsync(string? titleFilter, CancellationToken ct = default)
    {
        var all = Recipes.FindAll().OrderByDescending(r => r.CreatedAt);

        IEnumerable<Recipe> results = string.IsNullOrWhiteSpace(titleFilter)
            ? all
            : all.Where(r => r.Title.Contains(titleFilter, StringComparison.OrdinalIgnoreCase));

        return Task.FromResult(results);
    }

    public Task<Recipe?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var recipe = Recipes.FindById(id);
        return Task.FromResult<Recipe?>(recipe);
    }

    public Task<Recipe> AddAsync(Recipe recipe, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        recipe.CreatedAt = now;
        recipe.UpdatedAt = now;
        Recipes.Insert(recipe);
        return Task.FromResult(recipe);
    }

    public Task UpdateAsync(Recipe recipe, IEnumerable<RecipeIngredient> newIngredients, CancellationToken ct = default)
    {
        recipe.UpdatedAt = DateTime.UtcNow;
        recipe.RecipeIngredients = newIngredients.ToList();
        Recipes.Update(recipe);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Recipe recipe, CancellationToken ct = default)
    {
        Recipes.Delete(recipe.Id);
        return Task.CompletedTask;
    }
}
