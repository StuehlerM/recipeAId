using Moq;
using RecipeAId.Core.Entities;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class RecipeMatchingServiceTests
{
    private readonly Mock<IRecipeRepository> _recipeRepo = new();
    private readonly RecipeMatchingService   _sut;

    public RecipeMatchingServiceTests()
    {
        _sut = new RecipeMatchingService(_recipeRepo.Object);
    }

    private static Recipe MakeRecipe(int id, string title, params string[] ingredientNames)
    {
        var recipe = new Recipe { Id = id, Title = title, CreatedAt = DateTime.UtcNow };
        int order = 0;
        foreach (var name in ingredientNames)
        {
            recipe.RecipeIngredients.Add(new RecipeIngredient
            {
                Name      = name,
                SortOrder = order++,
            });
        }
        return recipe;
    }

    // ── Basic matching ─────────────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_EmptyInput_ReturnsEmpty()
    {
        var result = await _sut.FindByIngredientsAsync([]);
        Assert.Empty(result);
    }

    [Fact]
    public async Task FindByIngredients_NoMatch_ReturnsEmpty()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync([MakeRecipe(1, "Pasta", "flour", "egg")]);

        var result = await _sut.FindByIngredientsAsync(["butter"]);

        Assert.Empty(result);
    }

    [Fact]
    public async Task FindByIngredients_SingleMatch_ReturnsOne()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync([MakeRecipe(1, "Pasta", "flour", "egg")]);

        var result = (await _sut.FindByIngredientsAsync(["flour"])).ToList();

        Assert.Single(result);
        Assert.Equal(1, result[0].MatchedIngredientCount);
        Assert.Contains("flour", result[0].MatchedIngredients);
    }

    // ── Ranking by match count ─────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_RanksByMatchCountDescending()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync(
            [
                MakeRecipe(1, "One-match",   "flour"),
                MakeRecipe(2, "Two-matches", "flour", "sugar"),
            ]);

        var result = (await _sut.FindByIngredientsAsync(["flour", "sugar"])).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal("Two-matches", result[0].Recipe.Title);
        Assert.Equal("One-match",   result[1].Recipe.Title);
    }

    // ── Ranking by ratio when match count is tied ──────────────────────────

    [Fact]
    public async Task FindByIngredients_TiedMatchCount_RanksByRatioDescending()
    {
        // Both match 1 ingredient. Ratio: 1/1=100% vs 1/3≈33%.
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync(
            [
                MakeRecipe(1, "Three-ingredient", "flour", "sugar", "butter"),
                MakeRecipe(2, "One-ingredient",   "flour"),
            ]);

        var result = (await _sut.FindByIngredientsAsync(["flour"])).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal("One-ingredient",   result[0].Recipe.Title);
        Assert.Equal("Three-ingredient", result[1].Recipe.Title);
    }

    // ── minMatch filter ────────────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_MinMatch2_ExcludesOneMatchRecipes()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync(
            [
                MakeRecipe(1, "One-match",   "flour"),
                MakeRecipe(2, "Two-matches", "flour", "sugar"),
            ]);

        var result = (await _sut.FindByIngredientsAsync(["flour", "sugar"], minMatch: 2)).ToList();

        Assert.Single(result);
        Assert.Equal("Two-matches", result[0].Recipe.Title);
    }

    // ── limit parameter ────────────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_LimitApplied()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync(
            [
                MakeRecipe(1, "R1", "flour"),
                MakeRecipe(2, "R2", "flour"),
                MakeRecipe(3, "R3", "flour"),
            ]);

        var result = (await _sut.FindByIngredientsAsync(["flour"], limit: 2)).ToList();

        Assert.Equal(2, result.Count);
    }

    // ── Missing ingredients ────────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_MissingIngredients_AreReportedCorrectly()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync([MakeRecipe(1, "Cake", "flour", "sugar", "butter")]);

        var result = (await _sut.FindByIngredientsAsync(["flour"])).ToList();

        Assert.Single(result);
        Assert.Contains("sugar",  result[0].MissingIngredients);
        Assert.Contains("butter", result[0].MissingIngredients);
        Assert.DoesNotContain("flour", result[0].MissingIngredients);
    }

    // ── Normalization ──────────────────────────────────────────────────────

    [Fact]
    public async Task FindByIngredients_NormalizesInputToLowercase()
    {
        _recipeRepo.Setup(r => r.GetAllAsync(null, default))
            .ReturnsAsync([MakeRecipe(1, "Cake", "flour")]);

        // Input in mixed case should still match the lowercase stored ingredient
        var result = (await _sut.FindByIngredientsAsync(["FLOUR"])).ToList();

        Assert.Single(result);
        Assert.Equal(1, result[0].MatchedIngredientCount);
    }
}
