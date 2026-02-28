using Microsoft.AspNetCore.Mvc;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.Controllers;

[ApiController]
[Route("api/v1/recipes")]
public class RecipesController(IRecipeService recipeService, IRecipeMatchingService matchingService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RecipeSummaryDto>>> GetAll(
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var recipes = await recipeService.GetAllAsync(q, ct);
        return Ok(recipes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RecipeDto>> GetById(int id, CancellationToken ct)
    {
        var recipe = await recipeService.GetByIdAsync(id, ct);
        return recipe is null ? NotFound() : Ok(recipe);
    }

    [HttpGet("search/by-ingredients")]
    public async Task<ActionResult<IEnumerable<IngredientSearchResultDto>>> SearchByIngredients(
        [FromQuery] string ingredients,
        [FromQuery] int minMatch = 1,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ingredients))
            return BadRequest(new { error = "At least one ingredient is required." });

        var names = ingredients
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var results = await matchingService.FindByIngredientsAsync(names, minMatch, limit, ct);
        return Ok(results);
    }

    [HttpPost]
    public async Task<ActionResult<RecipeDto>> Create(
        [FromBody] CreateRecipeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "Title is required." });

        var created = await recipeService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RecipeDto>> Update(
        int id,
        [FromBody] UpdateRecipeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "Title is required." });

        var updated = await recipeService.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await recipeService.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
