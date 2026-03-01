using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IIngredientService
{
    Task<IEnumerable<IngredientDto>> GetAllAsync(CancellationToken ct = default);
}
