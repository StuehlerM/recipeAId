using Microsoft.AspNetCore.Mvc;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class IngredientsController(
    IIngredientService ingredientService,
    IIngredientParserService ingredientParserService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<IngredientDto>>> GetAll(CancellationToken ct)
    {
        var ingredients = await ingredientService.GetAllAsync(ct);
        return Ok(ingredients);
    }

    [HttpPost("parse")]
    public async Task<ActionResult<List<IngredientLineDto>>> Parse(
        [FromBody] IngredientParseRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new ProblemDetails { Title = "Text is required." });

        if (request.Text.Length > 5000)
            return BadRequest(new ProblemDetails { Title = "Text must be 5000 characters or fewer." });

        var result = await ingredientParserService.ParseAsync(
            request.Text,
            request.Lang ?? "en",
            ct);

        if (!result.Success)
            return UnprocessableEntity(new ProblemDetails
            {
                Title = "Ingredient parsing failed.",
                Detail = result.ErrorMessage,
            });

        return Ok(result.Ingredients);
    }
}
