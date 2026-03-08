using LiteDB;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Data.Repositories;

public class IngredientRepository(ILiteDatabase db) : IIngredientRepository
{
    private ILiteCollection<Recipe> Recipes => db.GetCollection<Recipe>("recipes");

    public Task<IEnumerable<Ingredient>> GetAllAsync(CancellationToken ct = default)
    {
        var names = Recipes.FindAll()
            .SelectMany(r => r.RecipeIngredients.Select(ri => ri.Name))
            .Distinct()
            .OrderBy(n => n)
            .Select((name, idx) => new Ingredient { Id = idx + 1, Name = name })
            .ToList();

        return Task.FromResult<IEnumerable<Ingredient>>(names);
    }

    public Task<Ingredient?> GetByNameAsync(string normalizedName, CancellationToken ct = default)
    {
        var found = Recipes.FindAll()
            .SelectMany(r => r.RecipeIngredients)
            .Any(ri => ri.Name == normalizedName);

        var ingredient = found ? new Ingredient { Name = normalizedName } : null;
        return Task.FromResult(ingredient);
    }

    public Task<Ingredient> GetOrCreateAsync(string normalizedName, CancellationToken ct = default)
    {
        // Ingredients are embedded inside recipe documents; no separate storage is needed.
        // This method is retained for interface compatibility.
        return Task.FromResult(new Ingredient { Name = normalizedName });
    }
}
