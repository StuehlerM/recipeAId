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
        {
            return BadRequest(new ProblemDetails { Title = "Text is required." });
        }

        if (request.Text.Length > 5000)
        {
            return BadRequest(new ProblemDetails { Title = "Text must be 5000 characters or fewer." });
        }

        var lang = request.Lang ?? "en";
        if (!System.Text.RegularExpressions.Regex.IsMatch(lang, @"^[a-z]{2}(-[A-Z]{2})?$"))
        {
            lang = "en";
        }

        var result = await ingredientParserService.ParseAsync(
            request.Text,
            lang,
            ct);

        if (!result.Success)
        {
            if (result.IsProviderUnavailable)
                return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
                {
                    Title = "Ingredient parser unavailable.",
                    Detail = result.ErrorMessage,
                    Status = StatusCodes.Status502BadGateway,
                });

            return UnprocessableEntity(new ProblemDetails
            {
                Title = "Ingredient parsing failed.",
                Detail = result.ErrorMessage,
            });
        }

        return Ok(result.Ingredients);
    }
}
