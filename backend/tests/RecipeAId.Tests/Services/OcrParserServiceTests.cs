using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class OcrParserServiceTests
{
    private readonly OcrParserService _sut = new();

    // ── Structured (section headers) ────────────────────────────────────────

    [Fact]
    public void Parse_StructuredRecipe_ExtractsAllSections()
    {
        var text = """
            Chocolate Chip Cookies

            Ingredients:
            2 cups flour
            1 cup sugar
            2 eggs

            Instructions:
            Mix dry ingredients. Add eggs. Bake at 350°F for 12 minutes.
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Chocolate Chip Cookies", draft.DetectedTitle);
        Assert.Equal(3, draft.DetectedIngredients.Count);
        Assert.Contains(draft.DetectedIngredients, i => i.Name.Contains("flour"));
        Assert.Contains(draft.DetectedIngredients, i => i.Name.Contains("sugar"));
        Assert.Contains(draft.DetectedIngredients, i => i.Name.Contains("eggs"));
        Assert.NotNull(draft.DetectedInstructions);
        Assert.Contains("Bake", draft.DetectedInstructions);
    }

    [Fact]
    public void Parse_StructuredRecipe_ParsesAmountAndUnit()
    {
        var text = """
            Pancakes

            Ingredients:
            2 cups flour
            1 tsp baking powder

            Directions:
            Mix and cook.
            """;

        var draft = _sut.Parse(text);

        var flour = draft.DetectedIngredients.First(i => i.Name.Contains("flour"));
        Assert.Equal("flour", flour.Name, ignoreCase: true);
        Assert.Equal("2", flour.Amount);
        Assert.Equal("cups", flour.Unit, ignoreCase: true);
    }

    [Fact]
    public void Parse_StructuredRecipe_ParsesAmountUnitNoSpace()
    {
        var text = """
            Bread

            Ingredients:
            200g flour
            """;

        var draft = _sut.Parse(text);

        var flour = draft.DetectedIngredients.First(i => i.Name.Contains("flour"));
        Assert.Equal("flour", flour.Name, ignoreCase: true);
        Assert.Equal("200", flour.Amount);
        Assert.Equal("g", flour.Unit, ignoreCase: true);
    }

    [Fact]
    public void Parse_StructuredRecipe_CaseInsensitiveHeaders()
    {
        var text = """
            Soup

            INGREDIENTS:
            1 cup broth

            METHOD:
            Simmer for 20 minutes.
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Soup", draft.DetectedTitle);
        Assert.Single(draft.DetectedIngredients);
        Assert.NotNull(draft.DetectedInstructions);
    }

    [Fact]
    public void Parse_RecipeHeader_ExtractsTitleFromNextLine()
    {
        var text = """
            Recipe:
            Banana Bread

            Ingredients:
            3 bananas
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Banana Bread", draft.DetectedTitle);
    }

    // ── Unstructured (no section headers) ───────────────────────────────────

    [Fact]
    public void Parse_Unstructured_FirstLineIsTitle()
    {
        var text = """
            Grandma's Stew
            2 cups potatoes
            1 lb beef
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Grandma's Stew", draft.DetectedTitle);
    }

    [Fact]
    public void Parse_Unstructured_NumberedIngredients()
    {
        var text = """
            Simple Salad
            1. 2 cups lettuce
            2. 1 tomato
            3. Olive oil
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Simple Salad", draft.DetectedTitle);
        Assert.Equal(3, draft.DetectedIngredients.Count);
    }

    [Fact]
    public void Parse_Unstructured_BulletedIngredients()
    {
        var text = """
            Rice Bowl
            - 1 cup rice
            - 2 tbsp soy sauce
            """;

        var draft = _sut.Parse(text);

        Assert.Equal(2, draft.DetectedIngredients.Count);
        Assert.Contains(draft.DetectedIngredients, i => i.Name.Contains("rice"));
    }

    // ── Edge cases ───────────────────────────────────────────────────────────

    [Fact]
    public void Parse_EmptyText_ReturnsEmptyDraft()
    {
        var draft = _sut.Parse(string.Empty);

        Assert.Null(draft.DetectedTitle);
        Assert.Null(draft.DetectedInstructions);
        Assert.Empty(draft.DetectedIngredients);
    }

    [Fact]
    public void Parse_WhitespaceOnlyText_ReturnsEmptyDraft()
    {
        var draft = _sut.Parse("   \n\n   \n");

        Assert.Null(draft.DetectedTitle);
        Assert.Empty(draft.DetectedIngredients);
    }

    [Fact]
    public void Parse_TitleOnly_NoIngredientsOrInstructions()
    {
        var draft = _sut.Parse("My Recipe");

        Assert.Equal("My Recipe", draft.DetectedTitle);
        Assert.Empty(draft.DetectedIngredients);
        Assert.Null(draft.DetectedInstructions);
    }

    [Fact]
    public void Parse_RawTextPreserved()
    {
        var text = "Some recipe\n2 eggs";
        var draft = _sut.Parse(text, imagePath: "/images/photo.jpg");

        Assert.Equal(text, draft.RawOcrText);
        Assert.Equal("/images/photo.jpg", draft.ImagePath);
    }

    [Fact]
    public void Parse_IngredientsWithFractions_ParsesAmountAndUnit()
    {
        var text = """
            Scones

            Ingredients:
            1/2 cup butter
            1/4 tsp salt
            """;

        var draft = _sut.Parse(text);

        Assert.Equal(2, draft.DetectedIngredients.Count);
        var butter = draft.DetectedIngredients.First(i => i.Name.Contains("butter"));
        Assert.Equal("1/2", butter.Amount);
        Assert.Contains("cup", butter.Unit, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Parse_StructuredRecipe_EmptyIngredientSection_ReturnsEmpty()
    {
        var text = """
            Empty Recipe

            Ingredients:

            Instructions:
            Do nothing.
            """;

        var draft = _sut.Parse(text);

        Assert.Empty(draft.DetectedIngredients);
        Assert.NotNull(draft.DetectedInstructions);
    }

    // ── Name-Amount-Unit format (reversed order) ─────────────────────────────

    [Fact]
    public void Parse_NameAmountUnit_ParsesCorrectly()
    {
        var text = """
            Apfelkuchen

            Ingredients:
            Flour 200 g
            Sugar 100 g
            Butter 50 g

            Instructions:
            Mix and bake.
            """;

        var draft = _sut.Parse(text);

        Assert.Equal(3, draft.DetectedIngredients.Count);

        var flour = draft.DetectedIngredients.First(i => i.Name.Contains("Flour"));
        Assert.Equal("200", flour.Amount);
        Assert.Equal("g", flour.Unit);

        var sugar = draft.DetectedIngredients.First(i => i.Name.Contains("Sugar"));
        Assert.Equal("100", sugar.Amount);
        Assert.Equal("g", sugar.Unit);
    }

    [Fact]
    public void Parse_NameAmountNoUnit_ParsesCorrectly()
    {
        var text = """
            Salad

            Ingredients:
            Eggs 2
            Tomatoes 3
            """;

        var draft = _sut.Parse(text);

        Assert.Equal(2, draft.DetectedIngredients.Count);

        var eggs = draft.DetectedIngredients.First(i => i.Name.Contains("Eggs"));
        Assert.Equal("2", eggs.Amount);
        Assert.Null(eggs.Unit);
    }

    // ── Run-on ingredient splitting ─────────────────────────────────────────

    [Fact]
    public void Parse_RunOnIngredients_SplitsIntoSeparateEntries()
    {
        // Real OCR output where paragraph mode merged all ingredients into one line.
        // The parser should split this into individual ingredients using the
        // run-on splitter (quantity+unit boundaries and case transitions).
        var text = "Ingredients 8 oz linguine pasta 2 tbsp olive oil 1lb large shrimp, peeled and deveined Salt to taste Black pepper to taste 1tbsp minced garlic tsp red pepper flakes 1/2 cup chicken broth 1cup fresh lemon juice Zest of 1 lemon 1/2 cup finely chopped fresh parsley Grated Parmesan cheese for serving";

        var draft = _sut.Parse(text);

        // "Ingredients" should be detected as section header.
        // Each expected ingredient must appear as a separate entry.
        var names = draft.DetectedIngredients.Select(i => i.Name).ToList();

        Assert.Contains(names, n => n.Contains("linguine pasta", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("olive oil", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("shrimp", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("garlic", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("chicken broth", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("lemon juice", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("parsley", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(names, n => n.Contains("Parmesan", StringComparison.OrdinalIgnoreCase));

        // Verify amount/unit parsing
        var pasta = draft.DetectedIngredients.First(i => i.Name.Contains("linguine", StringComparison.OrdinalIgnoreCase));
        Assert.Equal("8", pasta.Amount);
        Assert.Equal("oz", pasta.Unit);

        var oil = draft.DetectedIngredients.First(i => i.Name.Contains("olive oil", StringComparison.OrdinalIgnoreCase));
        Assert.Equal("2", oil.Amount);
        Assert.Equal("tbsp", oil.Unit);

        var broth = draft.DetectedIngredients.First(i => i.Name.Contains("chicken broth", StringComparison.OrdinalIgnoreCase));
        Assert.Equal("1/2", broth.Amount);
        Assert.Equal("cup", broth.Unit);
    }

    // ── German section headers ───────────────────────────────────────────────

    [Fact]
    public void Parse_GermanHeaders_ExtractsAllSections()
    {
        var text = """
            Kartoffelsuppe

            Zutaten:
            500 g Kartoffeln
            1 l Brühe

            Zubereitung:
            Kartoffeln schälen und kochen. Mit Brühe pürieren.
            """;

        var draft = _sut.Parse(text);

        Assert.Equal("Kartoffelsuppe", draft.DetectedTitle);
        Assert.Equal(2, draft.DetectedIngredients.Count);
        Assert.NotNull(draft.DetectedInstructions);
        Assert.Contains("pürieren", draft.DetectedInstructions);
    }

    // ── Multi-line title merging ─────────────────────────────────────────────

    // AC1: Two-line title is merged (unstructured path)
    [Fact]
    public void Parse_Unstructured_TwoLineTitleMerged()
    {
        var text = "Spring chickpea stew\nwith salted lemons\n2 cups chickpeas";

        var draft = _sut.Parse(text);

        Assert.Equal("Spring chickpea stew with salted lemons", draft.DetectedTitle);
        Assert.Single(draft.DetectedIngredients);
    }

    // AC2: Single-line title is unchanged (unstructured path)
    [Fact]
    public void Parse_Unstructured_SingleLineTitleUnchanged()
    {
        var text = "Simple Pasta\n200g spaghetti";

        var draft = _sut.Parse(text);

        Assert.Equal("Simple Pasta", draft.DetectedTitle);
    }

    // AC3: Second line that looks like an ingredient is NOT merged into title
    [Fact]
    public void Parse_Unstructured_IngredientLineNotMergedIntoTitle()
    {
        var text = "Pasta bake\n200g spaghetti\n1 cup sauce";

        var draft = _sut.Parse(text);

        Assert.Equal("Pasta bake", draft.DetectedTitle);
        Assert.Equal(2, draft.DetectedIngredients.Count);
    }

    // AC4: Section header on line 2 is NOT merged into title (structured path)
    [Fact]
    public void Parse_Structured_SectionHeaderNotMergedIntoTitle()
    {
        var text = "Pasta bake\nIngredients:\n200g spaghetti";

        var draft = _sut.Parse(text);

        Assert.Equal("Pasta bake", draft.DetectedTitle);
        Assert.Single(draft.DetectedIngredients);
    }

    // AC5: Only the first two lines are considered — a third short line is NOT merged
    [Fact]
    public void Parse_Unstructured_OnlyFirstTwoLinesConsideredForTitle()
    {
        var text = "Spring chickpea stew\nwith salted lemons\nand some extras\n2 cups chickpeas";

        var draft = _sut.Parse(text);

        Assert.Equal("Spring chickpea stew with salted lemons", draft.DetectedTitle);
        Assert.DoesNotContain("extras", draft.DetectedTitle);
    }

    // AC6: Two-line title merged in the structured (section-headers) path
    [Fact]
    public void Parse_Structured_TwoLineTitleMerged()
    {
        var text = "Spring chickpea stew\nwith salted lemons\n\nIngredients:\n2 cups chickpeas";

        var draft = _sut.Parse(text);

        Assert.Equal("Spring chickpea stew with salted lemons", draft.DetectedTitle);
        Assert.Single(draft.DetectedIngredients);
    }
}
