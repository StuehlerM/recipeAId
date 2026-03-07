using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using RecipeAId.Api.OcrSessions;
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
    OcrSessionStore sessionStore,
    IServiceScopeFactory scopeFactory,
    ILogger<RecipesController> logger) : ControllerBase
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
        [FromQuery] bool refine = true,
        CancellationToken ct = default)
    {
        if (image is null || image.Length == 0)
            return BadRequest(new ProblemDetails { Title = "An image file is required." });

        if (!image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "File must be an image." });

        const long maxSizeBytes = 10 * 1024 * 1024; // 10 MB
        if (image.Length > maxSizeBytes)
            return BadRequest(new ProblemDetails { Title = "Image must be smaller than 10 MB." });

        logger.LogInformation("OCR pipeline started: {FileName} {ContentType} {SizeBytes}B refine={Refine}",
            image.FileName, image.ContentType, image.Length, refine);

        var sw = Stopwatch.StartNew();
        await using var stream = image.OpenReadStream();
        var ocrResult = await ocrService.ExtractTextAsync(stream, image.ContentType, ct);
        logger.LogInformation("OCR completed in {ElapsedMs}ms — success={Success} chars={Chars}",
            sw.ElapsedMilliseconds, ocrResult.Success, ocrResult.RawText.Length);

        if (!ocrResult.Success)
            return UnprocessableEntity(new ProblemDetails { Title = "OCR processing failed.", Detail = ocrResult.ErrorMessage });

        var draft = ocrParser.Parse(ocrResult.RawText);
        logger.LogInformation("Regex parse: title={Title} ingredients={Count}",
            draft.DetectedTitle ?? "(none)", draft.DetectedIngredients.Count);

        if (!refine || draft.DetectedIngredients.Count == 0)
            return Ok(draft with { SessionId = null });

        // Fire LLM refinement in the background; return the regex draft immediately with a sessionId.
        // The frontend opens GET /api/v1/ocr-sessions/{sessionId}/events (SSE) and waits for the result.
        var sessionId = sessionStore.CreateSession();
        var rawText = ocrResult.RawText;
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var parserService = scope.ServiceProvider.GetRequiredService<IIngredientParserService>();
            var result = await parserService.ParseAsync(rawText, "en");
            sessionStore.Complete(sessionId, result);
        });

        logger.LogInformation("LLM refinement started in background — sessionId={SessionId}", sessionId);
        return Ok(draft with { SessionId = sessionId });
    }
}
