using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeAId.Api.Controllers;
using RecipeAId.Api.OcrSessions;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;
using Xunit;

namespace RecipeAId.Tests.Services;

/// <summary>
/// Regression tests for image validation in RecipesController.
/// These guard against behavioural changes during the deduplication refactor (Issue #16).
/// </summary>
public class RecipesControllerImageValidationTests
{
    private readonly Mock<IRecipeService>        _recipeService        = new();
    private readonly Mock<IRecipeDetailService>  _recipeDetailService  = new();
    private readonly Mock<IRecipeMatchingService> _matchingService     = new();
    private readonly Mock<IOcrService>           _ocrService           = new();
    private readonly Mock<IOcrTextSanitizer>     _ocrTextSanitizer     = new();
    private readonly Mock<IOcrParser>            _ocrParser            = new();
    private readonly Mock<IRecipeImageService>   _imageService         = new();
    private readonly Mock<IServiceScopeFactory>  _scopeFactory         = new();
    private readonly OcrSessionStore             _sessionStore         = new();
    private readonly RecipesController           _sut;

    public RecipesControllerImageValidationTests()
    {
        _sut = new RecipesController(
            _recipeService.Object,
            _recipeDetailService.Object,
            _matchingService.Object,
            _ocrService.Object,
            _ocrTextSanitizer.Object,
            _ocrParser.Object,
            _imageService.Object,
            _sessionStore,
            _scopeFactory.Object,
            NullLogger<RecipesController>.Instance);
    }

    // ── PutImage validation ────────────────────────────────────────────────

    [Fact]
    public async Task PutImage_NonImageContentType_ReturnsBadRequest()
    {
        // Arrange
        var slot = "title";
        _imageService.Setup(s => s.IsValidSlot(slot)).Returns(true);
        _recipeService.Setup(s => s.GetByIdAsync(1, default)).ReturnsAsync(new RecipeDto(1, "Test", null, null, null, DateTime.UtcNow, DateTime.UtcNow, []));
        var file = MakeFormFile("application/pdf", sizeBytes: 1024);

        // Act
        var result = await _sut.PutImage(1, slot, file, default);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(bad.Value);
        Assert.Contains("image", problem.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PutImage_FileTooLarge_ReturnsBadRequest()
    {
        // Arrange
        var slot = "title";
        _imageService.Setup(s => s.IsValidSlot(slot)).Returns(true);
        _recipeService.Setup(s => s.GetByIdAsync(1, default)).ReturnsAsync(new RecipeDto(1, "Test", null, null, null, DateTime.UtcNow, DateTime.UtcNow, []));
        var file = MakeFormFile("image/jpeg", sizeBytes: 11 * 1024 * 1024); // 11 MB — over limit

        // Act
        var result = await _sut.PutImage(1, slot, file, default);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(bad.Value);
        Assert.Contains("10", problem.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PutImage_ValidImage_CallsStoreDirectAsync()
    {
        // Arrange
        var slot = "title";
        _imageService.Setup(s => s.IsValidSlot(slot)).Returns(true);
        _recipeService.Setup(s => s.GetByIdAsync(1, default)).ReturnsAsync(new RecipeDto(1, "Test", null, null, null, DateTime.UtcNow, DateTime.UtcNow, []));
        _imageService.Setup(s => s.StoreDirectAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
                     .Returns(Task.CompletedTask);
        var file = MakeFormFile("image/jpeg", sizeBytes: 512);

        // Act
        var result = await _sut.PutImage(1, slot, file, default);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _imageService.Verify(s => s.StoreDirectAsync(1, slot, It.IsAny<Stream>(), "image/jpeg", default), Times.Once);
    }

    // ── FromImage validation ───────────────────────────────────────────────

    [Fact]
    public async Task FromImage_NonImageContentType_ReturnsBadRequest()
    {
        // Arrange
        var file = MakeFormFile("application/pdf", sizeBytes: 1024);

        // Act
        var result = await _sut.FromImage(file, refine: false, default);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(bad.Value);
        Assert.Contains("image", problem.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task FromImage_FileTooLarge_ReturnsBadRequest()
    {
        // Arrange
        var file = MakeFormFile("image/jpeg", sizeBytes: 11 * 1024 * 1024); // 11 MB — over limit

        // Act
        var result = await _sut.FromImage(file, refine: false, default);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(bad.Value);
        Assert.Contains("10", problem.Title, StringComparison.OrdinalIgnoreCase);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static IFormFile MakeFormFile(string contentType, long sizeBytes)
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns(contentType);
        mock.Setup(f => f.Length).Returns(sizeBytes);
        mock.Setup(f => f.OpenReadStream()).Returns(new MemoryStream(new byte[Math.Min(sizeBytes, 64)]));
        return mock.Object;
    }
}
