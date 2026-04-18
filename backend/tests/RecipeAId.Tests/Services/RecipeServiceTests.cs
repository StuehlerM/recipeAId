using Moq;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class RecipeServiceTests
{
    private readonly Mock<IRecipeRepository> _recipeRepo = new();
    private readonly RecipeService           _sut;

    public RecipeServiceTests()
    {
        _sut = new RecipeService(_recipeRepo.Object);
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
        var recipe = new Recipe
        {
            Id    = 1,
            Title = "Cake",
            RecipeIngredients =
            [
                new RecipeIngredient { Name = "flour", Amount = "2", Unit = "cups", SortOrder = 0 }
            ]
        };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);

        var result = await _sut.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Cake", result.Title);
        Assert.Single(result.Ingredients);
        Assert.Equal("flour", result.Ingredients[0].Name);
        Assert.Equal("2", result.Ingredients[0].Amount);
        Assert.Equal("cups", result.Ingredients[0].Unit);
    }

    [Fact]
    public async Task GetByIdAsync_SplitsNumberedInstructionsIntoSteps()
    {
        var recipe = new Recipe
        {
            Id = 1,
            Title = "Cake",
            Instructions = "1. Mix ingredients\n2. Pour into pan\n3. Bake for 30 minutes",
            RecipeIngredients = [],
        };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);

        var result = await _sut.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal(["Mix ingredients", "Pour into pan", "Bake for 30 minutes"], result.InstructionSteps);
    }

    [Fact]
    public async Task GetByIdAsync_UsesSingleParagraphAsFallbackInstructionStep()
    {
        var recipe = new Recipe
        {
            Id = 1,
            Title = "Cake",
            Instructions = "Mix ingredients thoroughly and bake until golden brown.",
            RecipeIngredients = [],
        };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);

        var result = await _sut.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal(["Mix ingredients thoroughly and bake until golden brown."], result.InstructionSteps);
    }

    // ── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_NormalizesIngredientNamesToLowercase()
    {
        var request = new CreateRecipeRequest(
            "Test Recipe",
            null, null, null, null,
            [new IngredientLineDto("FLOUR", "2", "cups"), new IngredientLineDto("Sugar", "1", "cup")]);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        await _sut.CreateAsync(request);

        Assert.NotNull(saved);
        Assert.Equal("flour", saved.RecipeIngredients[0].Name);
        Assert.Equal("sugar", saved.RecipeIngredients[1].Name);
    }

    [Fact]
    public async Task CreateAsync_TrimsTitleWhitespace()
    {
        var request = new CreateRecipeRequest("  Pasta  ", null, null, null, null, []);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        await _sut.CreateAsync(request);

        Assert.Equal("Pasta", saved?.Title);
    }

    [Fact]
    public async Task CreateAsync_StoresBookTitle()
    {
        var request = new CreateRecipeRequest("Tarte Tatin", null, null, null, "French Classics", []);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        await _sut.CreateAsync(request);

        Assert.Equal("French Classics", saved?.BookTitle);
    }

    [Fact]
    public async Task CreateAsync_StoresServings_WhenProvided()
    {
        var request = new CreateRecipeRequest("Pasta", null, null, null, null, [], Servings: 4);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        var result = await _sut.CreateAsync(request);

        Assert.Equal(4, saved?.Servings);
        Assert.Equal(4, result.Servings);
    }

    [Fact]
    public async Task CreateAsync_ServingsIsNull_WhenNotProvided()
    {
        var request = new CreateRecipeRequest("Pasta", null, null, null, null, []);

        Recipe? saved = null;
        _recipeRepo
            .Setup(r => r.AddAsync(It.IsAny<Recipe>(), default))
            .ReturnsAsync((Recipe r, CancellationToken _) => { saved = r; return r; });

        var result = await _sut.CreateAsync(request);

        Assert.Null(saved?.Servings);
        Assert.Null(result.Servings);
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

        var result = await _sut.UpdateAsync(99, new UpdateRecipeRequest("X", null, null, []));

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTitleAndNormalizesIngredients()
    {
        var recipe = new Recipe { Id = 1, Title = "Old", RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);

        IEnumerable<RecipeIngredient>? captured = null;
        _recipeRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Recipe>(), It.IsAny<IEnumerable<RecipeIngredient>>(), default))
            .Callback<Recipe, IEnumerable<RecipeIngredient>, CancellationToken>((_, ris, _) => captured = ris)
            .Returns(Task.CompletedTask);

        var request = new UpdateRecipeRequest("New Title", "Cook it.", null, [new IngredientLineDto("BUTTER", "100", "g")]);
        var result = await _sut.UpdateAsync(1, request);

        Assert.NotNull(result);
        Assert.Equal("New Title", result.Title);
        Assert.NotNull(captured);
        Assert.Equal("butter", captured!.First().Name);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesBookTitle()
    {
        var recipe = new Recipe { Id = 1, Title = "Old", BookTitle = null, RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);
        _recipeRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Recipe>(), It.IsAny<IEnumerable<RecipeIngredient>>(), default))
            .Returns(Task.CompletedTask);

        var request = new UpdateRecipeRequest("Old", null, "My Cookbook", []);
        var result = await _sut.UpdateAsync(1, request);

        Assert.NotNull(result);
        Assert.Equal("My Cookbook", result.BookTitle);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesServings_WhenProvided()
    {
        var recipe = new Recipe { Id = 1, Title = "Old", Servings = null, RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);
        _recipeRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Recipe>(), It.IsAny<IEnumerable<RecipeIngredient>>(), default))
            .Returns(Task.CompletedTask);

        var request = new UpdateRecipeRequest("Old", null, null, [], Servings: 6);
        var result = await _sut.UpdateAsync(1, request);

        Assert.NotNull(result);
        Assert.Equal(6, result.Servings);
        Assert.Equal(6, recipe.Servings);
    }

    [Fact]
    public async Task UpdateAsync_ClearsServings_WhenSetToNull()
    {
        var recipe = new Recipe { Id = 1, Title = "Old", Servings = 4, RecipeIngredients = [] };
        _recipeRepo.Setup(r => r.GetByIdAsync(1, default)).ReturnsAsync(recipe);
        _recipeRepo
            .Setup(r => r.UpdateAsync(It.IsAny<Recipe>(), It.IsAny<IEnumerable<RecipeIngredient>>(), default))
            .Returns(Task.CompletedTask);

        var request = new UpdateRecipeRequest("Old", null, null, [], Servings: null);
        var result = await _sut.UpdateAsync(1, request);

        Assert.NotNull(result);
        Assert.Null(result.Servings);
        Assert.Null(recipe.Servings);
    }
}
