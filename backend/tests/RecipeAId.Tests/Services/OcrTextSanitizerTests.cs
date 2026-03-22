using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class OcrTextSanitizerTests
{
    private readonly OcrTextSanitizer _sut = new();

    [Fact]
    public void Sanitize_RemovesControlAndZeroWidthChars()
    {
        // Arrange
        var raw = "  Title\u0000\u200B\nLine\u200C two\t\u0007  ";

        // Act
        var result = _sut.Sanitize(raw);

        // Assert
        Assert.Equal("Title\nLine two", result);
    }

    [Fact]
    public void Sanitize_CollapsesExcessBlankLines()
    {
        // Arrange
        var raw = "A\n\n\n\nB\n\n\nC";

        // Act
        var result = _sut.Sanitize(raw);

        // Assert
        Assert.Equal("A\n\nB\n\nC", result);
    }
}

