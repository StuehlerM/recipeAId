using Moq;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class NutritionEstimatorServiceTests
{
    private readonly Mock<IOpenFoodFactsClient> _offClient = new();
    private readonly NutritionEstimatorService  _sut;

    public NutritionEstimatorServiceTests()
    {
        _sut = new NutritionEstimatorService(_offClient.Object);
    }

    // ── Full match ─────────────────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_AllIngredientsMatched_ReturnsSummedMacros()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "chicken", "200", "g", 0),
            new(2, "rice",    "150", "g", 1),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("chicken", default))
            .ReturnsAsync(new NutrientInfo(25.0, 0.0, 3.0, 0.0));

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("rice", default))
            .ReturnsAsync(new NutrientInfo(2.5, 28.0, 0.3, 0.4));

        var result = await _sut.EstimateAsync(ingredients);

        Assert.NotNull(result);
        // chicken 200g: protein=50.0, carbs=0.0, fat=6.0, fiber=0.0
        // rice    150g: protein=3.75, carbs=42.0, fat=0.45, fiber=0.6
        Assert.Equal(53.75, result.ProteinGrams, precision: 2);
        Assert.Equal(42.0,  result.CarbGrams,    precision: 2);
        Assert.Equal(6.45,  result.FatGrams,     precision: 2);
        Assert.Equal(0.6,   result.FiberGrams,   precision: 2);
    }

    // ── Partial match ──────────────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_PartialMatch_SumsOnlyMatchedIngredients()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "egg",           "2",   null, 0),
            new(2, "xylanorindite", "100", "g",  1), // unrecognisable name → no match
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("egg", default))
            .ReturnsAsync(new NutrientInfo(13.0, 1.1, 10.6, 0.0));

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("xylanorindite", default))
            .ReturnsAsync((NutrientInfo?)null);

        var result = await _sut.EstimateAsync(ingredients);

        Assert.NotNull(result);
        // egg: no parseable grams → fallback 100 g → protein=13.0, carbs=1.1, fat=10.6, fiber=0.0
        Assert.Equal(13.0, result.ProteinGrams, precision: 2);
        Assert.Equal(1.1,  result.CarbGrams,    precision: 2);
        Assert.Equal(10.6, result.FatGrams,     precision: 2);
        Assert.Equal(0.0,  result.FiberGrams,   precision: 2);
    }

    // ── No match ───────────────────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_NoIngredientsMatched_ReturnsNull()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "zxgribblefork", "100", "g", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("zxgribblefork", default))
            .ReturnsAsync((NutrientInfo?)null);

        var result = await _sut.EstimateAsync(ingredients);

        Assert.Null(result);
    }

    // ── Empty ingredient list ──────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_EmptyIngredients_ReturnsNull()
    {
        var result = await _sut.EstimateAsync([]);

        Assert.Null(result);
        _offClient.Verify(c => c.GetNutrientsByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Amount scaling ─────────────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_AmountInGrams_ScalesMacrosCorrectly()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "oats", "50", "g", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("oats", default))
            .ReturnsAsync(new NutrientInfo(17.0, 66.0, 7.0, 10.0));

        var result = await _sut.EstimateAsync(ingredients);

        Assert.NotNull(result);
        // 50 g → multiply per-100g values by 0.5
        Assert.Equal(8.5,  result.ProteinGrams, precision: 2);
        Assert.Equal(33.0, result.CarbGrams,    precision: 2);
        Assert.Equal(3.5,  result.FatGrams,     precision: 2);
        Assert.Equal(5.0,  result.FiberGrams,   precision: 2);
    }

    [Fact]
    public async Task EstimateAsync_AmountInKg_ScalesMacrosCorrectly()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "beef", "0.5", "kg", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("beef", default))
            .ReturnsAsync(new NutrientInfo(26.0, 0.0, 20.0, 0.0));

        var result = await _sut.EstimateAsync(ingredients);

        Assert.NotNull(result);
        // 0.5 kg = 500 g → multiply per-100g values by 5
        Assert.Equal(130.0, result.ProteinGrams, precision: 2);
        Assert.Equal(0.0,   result.CarbGrams,    precision: 2);
        Assert.Equal(100.0, result.FatGrams,     precision: 2);
    }

    [Fact]
    public async Task EstimateAsync_NonGramUnit_UsesFallback100gAmount()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "milk", "1", "cup", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("milk", default))
            .ReturnsAsync(new NutrientInfo(3.4, 4.7, 3.7, 0.0));

        var result = await _sut.EstimateAsync(ingredients);

        Assert.NotNull(result);
        // non-gram unit → fallback 100 g
        Assert.Equal(3.4, result.ProteinGrams, precision: 2);
        Assert.Equal(4.7, result.CarbGrams,    precision: 2);
        Assert.Equal(3.7, result.FatGrams,     precision: 2);
    }

    // ── Per-serving calculation ────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_WithServings_PopulatesPerServingValues()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "pasta", "400", "g", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("pasta", default))
            .ReturnsAsync(new NutrientInfo(12.0, 70.0, 2.0, 3.0));

        var result = await _sut.EstimateAsync(ingredients, servings: 4);

        Assert.NotNull(result);
        Assert.NotNull(result.PerServing);
        // total: 400g → protein=48, carbs=280, fat=8, fiber=12
        // per serving (÷4): protein=12, carbs=70, fat=2, fiber=3
        Assert.Equal(12.0, result.PerServing!.ProteinGrams, precision: 2);
        Assert.Equal(70.0, result.PerServing!.CarbGrams,    precision: 2);
        Assert.Equal(2.0,  result.PerServing!.FatGrams,     precision: 2);
        Assert.Equal(3.0,  result.PerServing!.FiberGrams,   precision: 2);
    }

    [Fact]
    public async Task EstimateAsync_WithoutServings_PerServingIsNull()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "pasta", "400", "g", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("pasta", default))
            .ReturnsAsync(new NutrientInfo(12.0, 70.0, 2.0, 3.0));

        var result = await _sut.EstimateAsync(ingredients, servings: null);

        Assert.NotNull(result);
        Assert.Null(result.PerServing);
    }

    // ── Resilience ─────────────────────────────────────────────────────────

    [Fact]
    public async Task EstimateAsync_ClientThrows_ReturnsNull()
    {
        var ingredients = new List<RecipeIngredientDto>
        {
            new(1, "tomato", "200", "g", 0),
        };

        _offClient
            .Setup(c => c.GetNutrientsByNameAsync("tomato", default))
            .ThrowsAsync(new HttpRequestException("OFF unavailable"));

        var result = await _sut.EstimateAsync(ingredients);

        Assert.Null(result);
    }
}
