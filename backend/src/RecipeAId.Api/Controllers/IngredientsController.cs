using Microsoft.AspNetCore.Mvc;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class IngredientsController(IIngredientRepository ingredientRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<IngredientDto>>> GetAll(CancellationToken ct)
    {
        var ingredients = await ingredientRepo.GetAllAsync(ct);
        return Ok(ingredients.Select(i => new IngredientDto(i.Id, i.Name)));
    }
}
