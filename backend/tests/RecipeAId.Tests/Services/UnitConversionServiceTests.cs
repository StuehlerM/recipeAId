using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class UnitConversionServiceTests
{
    private readonly UnitConversionService _sut = new();

    // ── Volume: imperial → metric ──────────────────────────────────────────

    [Theory]
    [InlineData(1,    "cup",  "ml",  236.59)]
    [InlineData(1,    "tbsp", "ml",  14.79)]
    [InlineData(1,    "tsp",  "ml",  4.93)]
    [InlineData(1,    "fl oz","ml",  29.57)]
    [InlineData(2,    "cups", "ml",  473.18)]
    [InlineData(0.5,  "cup",  "l",   0.12)]
    public void Convert_Volume_ImperialToMetric(double value, string from, string to, double expected)
    {
        var result = _sut.Convert((decimal)value, from, to);
        Assert.Equal((decimal)expected, result.ConvertedValue);
    }

    // ── Volume: metric → imperial ──────────────────────────────────────────

    [Theory]
    [InlineData(236.588, "ml", "cup",  1)]
    [InlineData(14.787,  "ml", "tbsp", 1)]
    [InlineData(1000,    "ml", "l",    1)]
    public void Convert_Volume_MetricToImperial(double value, string from, string to, double expected)
    {
        var result = _sut.Convert((decimal)value, from, to);
        Assert.Equal((decimal)expected, result.ConvertedValue);
    }

    // ── Mass conversions ───────────────────────────────────────────────────

    [Theory]
    [InlineData(1,  "oz", "g",  28.35)]
    [InlineData(1,  "lb", "g",  453.59)]
    [InlineData(1,  "lb", "kg", 0.45)]
    [InlineData(1,  "kg", "g",  1000)]
    [InlineData(28.3495, "g", "oz", 1)]
    public void Convert_Mass(double value, string from, string to, double expected)
    {
        var result = _sut.Convert((decimal)value, from, to);
        Assert.Equal((decimal)expected, result.ConvertedValue);
    }

    // ── Temperature ────────────────────────────────────────────────────────

    [Theory]
    [InlineData(212,  "f", "c", 100)]
    [InlineData(32,   "f", "c", 0)]
    [InlineData(100,  "c", "f", 212)]
    [InlineData(0,    "c", "f", 32)]
    [InlineData(180,  "°F", "°C", 82.22)]
    public void Convert_Temperature(double value, string from, string to, double expected)
    {
        var result = _sut.Convert((decimal)value, from, to);
        Assert.Equal((decimal)expected, result.ConvertedValue);
    }

    // ── Cross-category: volume ↔ mass ──────────────────────────────────────

    [Fact]
    public void Convert_CupsFlour_ToGrams()
    {
        // 1 cup flour ≈ 120 g  (236.588 mL × 0.529 g/mL)
        var result = _sut.Convert(1, "cup", "g", "flour");
        Assert.Equal(125.16m, result.ConvertedValue); // 236.588 * 0.529 = 125.155... → rounds to 125.16
    }

    [Fact]
    public void Convert_GramsWater_ToCups()
    {
        // 236.588 g water (density=1) ≈ 1 cup
        var result = _sut.Convert(236.588m, "g", "cup", "water");
        Assert.Equal(1.0m, result.ConvertedValue);
    }

    // ── Unit aliases ───────────────────────────────────────────────────────

    [Theory]
    [InlineData("teaspoon")]
    [InlineData("teaspoons")]
    [InlineData("tsp")]
    public void Convert_AcceptsTspAliases(string alias)
    {
        var result = _sut.Convert(1, alias, "ml");
        Assert.Equal(4.93m, result.ConvertedValue);
    }

    [Theory]
    [InlineData("tablespoon")]
    [InlineData("tablespoons")]
    [InlineData("tbsp")]
    [InlineData("tbs")]
    public void Convert_AcceptsTbspAliases(string alias)
    {
        var result = _sut.Convert(1, alias, "ml");
        Assert.Equal(14.79m, result.ConvertedValue);
    }

    // ── Error cases ────────────────────────────────────────────────────────

    [Fact]
    public void Convert_UnknownUnit_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            _sut.Convert(1, "smidgen", "ml"));
        Assert.Contains("smidgen", ex.Message);
    }

    [Fact]
    public void Convert_CrossCategory_NoIngredient_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            _sut.Convert(1, "cup", "g"));
        Assert.Contains("ingredient", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Convert_CrossCategory_UnknownIngredient_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            _sut.Convert(1, "cup", "g", "unobtainium"));
        Assert.Contains("unobtainium", ex.Message);
    }

    [Fact]
    public void Convert_IncompatibleUnits_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            _sut.Convert(100, "f", "ml"));
        Assert.NotNull(ex);
    }

    // ── Result shape ───────────────────────────────────────────────────────

    [Fact]
    public void Convert_ResultContainsFormattedString()
    {
        var result = _sut.Convert(1, "cup", "ml");
        Assert.Contains("mL", result.Formatted);
        Assert.Equal("cup", result.OriginalUnit);
        Assert.Equal("mL",  result.ConvertedUnit);
    }
}
