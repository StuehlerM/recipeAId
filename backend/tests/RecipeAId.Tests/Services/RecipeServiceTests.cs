using Moq;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class RecipeServiceTests
{
    private readonly Mock<IRecipeRepository>    _recipeRepo = new();
    private readonly Mock<IIngredientRepository> _ingredientRepo = new();
    private readonly RecipeService              _sut;

    public RecipeServiceTests()
    {
        _sut = new RecipeService(_recipeRepo.Object, _ingredientRepo.Object);
    }

    // ── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsMappedSummaries()
    {
        var recipes = new List<Recipe>
        {
            new() { Id = 1, Title = "Pasta", CreatedAt = DateTime.UtcNow, RecipeIngredients = [] },
            new() { Id = 2, Title = "Soup",  CreatedAt = DateTime.UtcNow, RecipeIngredients = [] },
        };
        _recipeRepo.Setup(r => r.GetAllAsync(null, default)).ReturnsAsync(recipes);

        var result = (await _sut.GetAllAsync(null)).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal("Pasta", result[0].Title);
        Assert.Equal("Soup",  result[1].Title);
    }

    [Fact]
    public async Task GetAllAsync_PassesTitleFilterToRepo()
    {
        _recipeRepo.Setup(r => r.GetAllAsync("pasta", default)).ReturnsAsync([]);

        await _sut.GetAllAsync("pasta");

        _recipeRepo.Verify(r => r.GetAllAsync("pasta", default), Times.Once);
    }

    // ── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        _recipeRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Recipe?)null);

        var result = await _sut.GetByIdAsync(99);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsMappedDto_WhenFound()
    {
        var ingredient = new Ingredient { Id = 1, Name = "flour" };
        var recipe = new Recipe
        {
            Id    = 1,
            Title = "Cake",
            RecipeIngredients =
            [
                new RecipeIngredient { IngredientId = 1, Ingredient = ingredient, Quantity = "2 cups", SortOrder = 0 }
            ]
        };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);

        var result = await _sut.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Cake", result.Title);
        Assert.Single(result.Ingredients);
        Assert.Equal("flour", result.Ingredients[0].Name);
    }

    // ── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_NormalizesIngredientNamesToLowercase()
    {
        var request = new CreateRecipeRequest(
            "Test Recipe",
            null, null, null,
            [new IngredientLineDto("FLOUR", "2 cups"), new IngredientLineDto("Sugar", "1 cup")]);

        string? capturedFlour = null;
        string? capturedSugar = null;

        _ingredientRepo
            .Setup(r => r.GetOrCreateAsync(It.IsAny<string>(), default))
            .ReturnsAsync((string name, CancellationToken _) =>
            {
                if (name == "flour") capturedFlour = name;
                if (name == "sugar") capturedSugar = name;
                return new Ingredient { Id = 1, Name = name };
            });

        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => r);

        await _sut.CreateAsync(request);

        Assert.Equal("flour", capturedFlour);
        Assert.Equal("sugar", capturedSugar);
    }

    [Fact]
    public async Task CreateAsync_TrimsTitleWhitespace()
    {
        var request = new CreateRecipeRequest("  Pasta  ", null, null, null, []);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        await _sut.CreateAsync(request);

        Assert.Equal("Pasta", saved?.Title);
    }

    // ── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        _recipeRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Recipe?)null);

        var result = await _sut.DeleteAsync(99);

        Assert.False(result);
    }

    [Fact]
    public async Task DeleteAsync_ReturnsTrue_AndCallsDelete_WhenFound()
    {
        var recipe = new Recipe { Id = 1, Title = "To Delete", RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);
        _recipeRepo.Setup(r => r.DeleteAsync(recipe, default)).Returns(Task.CompletedTask);

        var result = await _sut.DeleteAsync(1);

        Assert.True(result);
        _recipeRepo.Verify(r => r.DeleteAsync(recipe, default), Times.Once);
    }

    // ── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_ReturnsNull_WhenNotFound()
    {
        _recipeRepo.Setup(r => r.GetByIdAsync(99, default)).ReturnsAsync((Recipe?)null);

        var result = await _sut.UpdateAsync(99, new UpdateRecipeRequest("X", null, []));

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTitleAndNormalizesIngredients()
    {
        var recipe = new Recipe { Id = 1, Title = "Old", RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);
        _recipeRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Recipe>(), It.IsAny<IEnumerable<RecipeIngredient>>(), default))
            .Returns(Task.CompletedTask);

        _ingredientRepo
            .Setup(r => r.GetOrCreateAsync(It.IsAny<string>(), default))
            .ReturnsAsync((string name, CancellationToken _) => new Ingredient { Id = 1, Name = name });

        var request = new UpdateRecipeRequest("New Title", "Cook it.", [new IngredientLineDto("BUTTER", "100g")]);
        var result = await _sut.UpdateAsync(1, request);

        Assert.NotNull(result);
        Assert.Equal("New Title", result.Title);
        _ingredientRepo.Verify(r => r.GetOrCreateAsync("butter", default), Times.Once);
    }
}
