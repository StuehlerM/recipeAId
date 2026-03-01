using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public sealed class IngredientService(IIngredientRepository ingredientRepo) : IIngredientService
{
    public async Task<IEnumerable<IngredientDto>> GetAllAsync(CancellationToken ct = default)
    {
        var ingredients = await ingredientRepo.GetAllAsync(ct);
        return ingredients.Select(i => new IngredientDto(i.Id, i.Name));
    }
}
