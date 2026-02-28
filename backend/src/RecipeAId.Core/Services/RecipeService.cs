using RecipeAId.Core.DTOs;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeService(IRecipeRepository recipeRepo, IIngredientRepository ingredientRepo) : IRecipeService
{
    public async Task<IEnumerable<RecipeSummaryDto>> GetAllAsync(string? titleFilter, CancellationToken ct = default)
    {
        var recipes = await recipeRepo.GetAllAsync(titleFilter, ct);
        return recipes.Select(r => new RecipeSummaryDto(
            r.Id,
            r.Title,
            r.CreatedAt,
            r.RecipeIngredients.Count));
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
        };

        for (int i = 0; i < request.Ingredients.Count; i++)
        {
            var line = request.Ingredients[i];
            var normalized = line.Name.Trim().ToLowerInvariant();
            var ingredient = await ingredientRepo.GetOrCreateAsync(normalized, ct);
            recipe.RecipeIngredients.Add(new RecipeIngredient
            {
                Ingredient = ingredient,
                IngredientId = ingredient.Id,
                Quantity = line.Quantity?.Trim(),
                SortOrder = i,
            });
        }

        await recipeRepo.AddAsync(recipe, ct);
        return MapToDto(recipe);
    }

    public async Task<RecipeDto?> UpdateAsync(int id, UpdateRecipeRequest request, CancellationToken ct = default)
    {
        var recipe = await recipeRepo.GetByIdAsync(id, ct);
        if (recipe is null) return null;

        recipe.Title = request.Title.Trim();
        recipe.Instructions = request.Instructions;

        var newIngredients = new List<RecipeIngredient>();
        for (int i = 0; i < request.Ingredients.Count; i++)
        {
            var line = request.Ingredients[i];
            var normalized = line.Name.Trim().ToLowerInvariant();
            var ingredient = await ingredientRepo.GetOrCreateAsync(normalized, ct);
            newIngredients.Add(new RecipeIngredient
            {
                RecipeId = recipe.Id,
                IngredientId = ingredient.Id,
                Ingredient = ingredient,
                Quantity = line.Quantity?.Trim(),
                SortOrder = i,
            });
        }

        await recipeRepo.UpdateAsync(recipe, newIngredients, ct);
        recipe.RecipeIngredients = newIngredients;
        return MapToDto(recipe);
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
        recipe.CreatedAt,
        recipe.UpdatedAt,
        recipe.RecipeIngredients
            .OrderBy(ri => ri.SortOrder)
            .Select(ri => new RecipeIngredientDto(
                ri.IngredientId,
                ri.Ingredient.Name,
                ri.Quantity,
                ri.SortOrder))
            .ToList());
}
