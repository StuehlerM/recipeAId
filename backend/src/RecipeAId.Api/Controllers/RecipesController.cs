using Microsoft.AspNetCore.Mvc;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.Controllers;

[ApiController]
[Route("api/v1/recipes")]
public class RecipesController(
    IRecipeService recipeService,
    IRecipeMatchingService matchingService,
    IOcrService ocrService,
    IOcrParser ocrParser,
    IIngredientParserService ingredientParserService) : ControllerBase
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
            return BadRequest(new ProblemDetails { Title = "At least one ingredient is required." });

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
            return BadRequest(new ProblemDetails { Title = "Title is required." });

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
            return BadRequest(new ProblemDetails { Title = "Title is required." });

        var updated = await recipeService.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await recipeService.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("from-image")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<RecipeOcrDraftDto>> FromImage(
        IFormFile image,
        CancellationToken ct)
    {
        if (image is null || image.Length == 0)
            return BadRequest(new ProblemDetails { Title = "An image file is required." });

        if (!image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "File must be an image." });

        const long maxSizeBytes = 10 * 1024 * 1024; // 10 MB
        if (image.Length > maxSizeBytes)
            return BadRequest(new ProblemDetails { Title = "Image must be smaller than 10 MB." });

        await using var stream = image.OpenReadStream();
        var ocrResult = await ocrService.ExtractTextAsync(stream, image.ContentType, ct);

        if (!ocrResult.Success)
            return UnprocessableEntity(new ProblemDetails { Title = "OCR processing failed.", Detail = ocrResult.ErrorMessage });

        var draft = ocrParser.Parse(ocrResult.RawText);

        // LLM refinement — send regex-parsed ingredient text to Ministral 3B for normalization
        var ingredientText = string.Join("\n", draft.DetectedIngredients
            .Select(i => string.Join(" ",
                new[] { i.Amount, i.Unit, i.Name }.Where(s => !string.IsNullOrEmpty(s)))));

        if (!string.IsNullOrWhiteSpace(ingredientText))
        {
            var llmResult = await ingredientParserService.ParseAsync(ingredientText, "de", ct);
            if (llmResult.Success && llmResult.Ingredients.Count > 0)
                draft = draft with { DetectedIngredients = llmResult.Ingredients };
            // else: silently fall back to regex-parsed ingredients
        }

        return Ok(draft);
    }
}
