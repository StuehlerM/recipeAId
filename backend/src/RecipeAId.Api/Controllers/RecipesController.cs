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
    IRecipeDetailService recipeDetailService,
    IRecipeMatchingService matchingService,
    IOcrService ocrService,
    IOcrTextSanitizer ocrTextSanitizer,
    IOcrParser ocrParser,
    IRecipeImageService imageService,
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
        var recipe = await recipeDetailService.GetEnrichedByIdAsync(id, ct);
        return recipe is null ? NotFound() : Ok(recipe);
    }

    [HttpGet("{id:int}/images/{slot}")]
    public async Task<IActionResult> GetImage(int id, string slot, CancellationToken ct)
    {
        var slotError = ValidateSlot(slot);
        if (slotError is not null) return slotError;

        var image = await imageService.GetImageAsync(id, slot, ct);
        if (image is null)
        {
            return NotFound();
        }

        return File(image.Value.Data, image.Value.ContentType);
    }

    [HttpPut("{id:int}/images/{slot}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> PutImage(int id, string slot, IFormFile image, CancellationToken ct)
    {
        var slotError = ValidateSlot(slot);
        if (slotError is not null) return slotError;

        var recipe = await recipeService.GetByIdAsync(id, ct);
        if (recipe is null)
        {
            return NotFound();
        }

        if (image is null || image.Length == 0)
        {
            return BadRequest(new ProblemDetails { Title = "An image file is required." });
        }

        var imageError = ValidateImage(image);
        if (imageError is not null) return imageError;

        await using var stream = image.OpenReadStream();
        await imageService.StoreDirectAsync(id, slot, stream, image.ContentType, ct);
        return NoContent();
    }

    [HttpGet("search/by-ingredients")]
    public async Task<ActionResult<IEnumerable<IngredientSearchResultDto>>> SearchByIngredients(
        [FromQuery] string ingredients,
        [FromQuery] int minMatch = 1,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ingredients))
        {
            return BadRequest(new ProblemDetails { Title = "At least one ingredient is required." });
        }

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
        {
            return BadRequest(new ProblemDetails { Title = "Title is required." });
        }

        if (request.Servings is <= 0 or > 999)
        {
            return BadRequest(new ProblemDetails { Title = "Servings must be between 1 and 999." });
        }

        var created = await recipeService.CreateAsync(request, ct);

        if (request.ImageKeys is { Count: > 0 })
        {
            await imageService.CommitImagesAsync(created.Id, request.ImageKeys, ct);
        }

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RecipeDto>> Update(
        int id,
        [FromBody] UpdateRecipeRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new ProblemDetails { Title = "Title is required." });
        }

        if (request.Servings is <= 0 or > 999)
        {
            return BadRequest(new ProblemDetails { Title = "Servings must be between 1 and 999." });
        }

        var updated = await recipeService.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        var deleted = await recipeService.DeleteAsync(id, ct);
        if (!deleted)
        {
            return NotFound();
        }

        await imageService.DeleteAllImagesAsync(id, ct);
        return NoContent();
    }

    [HttpPost("from-image")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<RecipeOcrDraftDto>> FromImage(
        IFormFile image,
        [FromQuery] bool refine = true,
        CancellationToken ct = default)
    {
        if (image is null || image.Length == 0)
        {
            return BadRequest(new ProblemDetails { Title = "An image file is required." });
        }

        var imageError = ValidateImage(image);
        if (imageError is not null) return imageError;

        logger.LogInformation("OCR pipeline started: {FileName} {ContentType} {SizeBytes}B refine={Refine}",
            image.FileName, image.ContentType, image.Length, refine);

        var sw = Stopwatch.StartNew();
        await using var ocrStream = image.OpenReadStream();
        var ocrResult = await ocrService.ExtractTextAsync(ocrStream, image.ContentType, ct);
        logger.LogInformation("OCR completed in {ElapsedMs}ms — success={Success} chars={Chars}",
            sw.ElapsedMilliseconds, ocrResult.Success, ocrResult.RawText.Length);

        if (!ocrResult.Success)
        {
            return UnprocessableEntity(new ProblemDetails { Title = "OCR processing failed.", Detail = ocrResult.ErrorMessage });
        }

        // Store the image for the client to reference when saving the recipe
        await using var imageStream = image.OpenReadStream();
        var imageKey = await imageService.StoreTemporaryImageAsync(imageStream, image.ContentType, ct);
        logger.LogInformation("Image stored temporarily with key={ImageKey}", imageKey);

        var sanitizedOcrText = ocrTextSanitizer.Sanitize(ocrResult.RawText);
        var draft = ocrParser.Parse(sanitizedOcrText);
        logger.LogInformation("Regex parse: title={Title} ingredients={Count}",
            draft.DetectedTitle ?? "(none)", draft.DetectedIngredients.Count);

        if (!refine || draft.DetectedIngredients.Count == 0)
        {
            return Ok(draft with { SessionId = null, ImageKey = imageKey });
        }

        // Fire LLM refinement in the background; return the regex draft immediately with a sessionId.
        // The frontend opens GET /api/v1/ocr-sessions/{sessionId}/events (SSE) and waits for the result.
        var sessionId = sessionStore.CreateSession();
        var rawText = sanitizedOcrText;
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var parserService = scope.ServiceProvider.GetRequiredService<IIngredientParserService>();
            try
            {
                var result = await parserService.ParseAsync(rawText, "en");
                sessionStore.Complete(sessionId, result);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background ingredient refinement failed for session {SessionId}", sessionId);
                sessionStore.Complete(sessionId, new IngredientParseResult([], false, "LLM refinement failed"));
            }
        });

        logger.LogInformation("LLM refinement started in background — sessionId={SessionId}", sessionId);
        return Ok(draft with { SessionId = sessionId, ImageKey = imageKey });
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private const long MaxImageSizeBytes = 10 * 1024 * 1024;

    private ActionResult? ValidateSlot(string slot)
    {
        if (!imageService.IsValidSlot(slot))
            return BadRequest(new ProblemDetails { Title = "Invalid slot. Must be one of: title, ingredients, instructions." });
        return null;
    }

    private ActionResult? ValidateImage(IFormFile image)
    {
        if (!image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "File must be an image." });
        if (image.Length > MaxImageSizeBytes)
            return BadRequest(new ProblemDetails { Title = "Image must be smaller than 10 MB." });
        return null;
    }
}
