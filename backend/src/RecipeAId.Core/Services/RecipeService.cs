using RecipeAId.Core.DTOs;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeService(IRecipeRepository recipeRepo) : IRecipeService
{
    public async Task<IEnumerable<RecipeSummaryDto>> GetAllAsync(string? titleFilter, CancellationToken ct = default)
    {
        var recipes = await recipeRepo.GetAllAsync(titleFilter, ct);
        return recipes.Select(r => new RecipeSummaryDto(
            r.Id,
            r.Title,
            r.CreatedAt,
            r.RecipeIngredients.Count,
            r.BookTitle));
    }

    public async Task<RecipeDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var recipe = await recipeRepo.GetByIdAsync(id, ct);
        return recipe is null ? null : MapToDto(recipe);
    }

    public async Task<RecipeDto> CreateAsync(CreateRecipeRequest request, CancellationToken ct = default)
    {
        var recipe = new Recipe
        {
            Title = request.Title.Trim(),
            Instructions = request.Instructions,
            ImagePath = request.ImagePath,
            RawOcrText = request.RawOcrText,
            BookTitle = request.BookTitle?.Trim(),
            RecipeIngredients = BuildIngredients(request.Ingredients),
        };

        await recipeRepo.AddAsync(recipe, ct);
        return MapToDto(recipe);
    }

    public async Task<RecipeDto?> UpdateAsync(int id, UpdateRecipeRequest request, CancellationToken ct = default)
    {
        var recipe = await recipeRepo.GetByIdAsync(id, ct);
        if (recipe is null) return null;

        recipe.Title = request.Title.Trim();
        recipe.Instructions = request.Instructions;
        recipe.BookTitle = request.BookTitle?.Trim();

        var newIngredients = BuildIngredients(request.Ingredients);

        await recipeRepo.UpdateAsync(recipe, newIngredients, ct);
        recipe.RecipeIngredients = newIngredients;
        return MapToDto(recipe);
    }

    private static List<RecipeIngredient> BuildIngredients(List<IngredientLineDto> lines)
    {
        var result = new List<RecipeIngredient>(lines.Count);
        for (int i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            result.Add(new RecipeIngredient
            {
                Name = line.Name.Trim().ToLowerInvariant(),
                Amount = line.Amount?.Trim(),
                Unit = line.Unit?.Trim(),
                SortOrder = i,
            });
        }
        return result;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var recipe = await recipeRepo.GetByIdAsync(id, ct);
        if (recipe is null) return false;
        await recipeRepo.DeleteAsync(recipe, ct);
        return true;
    }

    private static RecipeDto MapToDto(Recipe recipe) => new(
        recipe.Id,
        recipe.Title,
        recipe.Instructions,
        recipe.ImagePath,
        recipe.BookTitle,
        recipe.CreatedAt,
        recipe.UpdatedAt,
        recipe.RecipeIngredients
            .OrderBy(ri => ri.SortOrder)
            .Select(ri => new RecipeIngredientDto(
                ri.SortOrder,
                ri.Name,
                ri.Amount,
                ri.Unit,
                ri.SortOrder))
            .ToList(),
        Servings: recipe.Servings);
}
