using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeAId.Api.OcrServices;
using Xunit;

namespace RecipeAId.Tests.Services;

public class MistralOcrServiceTests
{
    [Fact]
    public async Task ExtractTextAsync_ValidResponse_ReturnsSuccessWithRawText()
    {
        // Arrange
        const string body = """
            {
              "pages": [
                {
                  "markdown": "Recipe\\nIngredients:\\n2 eggs"
                }
              ]
            }
            """;
        var sut = BuildSut(HttpStatusCode.OK, body);

        // Act
        var result = await sut.ExtractTextAsync(new MemoryStream([0x1]), "image/jpeg");

        // Assert
        Assert.True(result.Success);
        Assert.Equal("Recipe\nIngredients:\n2 eggs", result.RawText);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractTextAsync_HttpError_ReturnsFailure()
    {
        // Arrange
        var sut = BuildSut(HttpStatusCode.BadGateway, "{\"error\":\"down\"}");

        // Act
        var result = await sut.ExtractTextAsync(new MemoryStream([0x1]), "image/jpeg");

        // Assert
        Assert.False(result.Success);
        Assert.NotNull(result.ErrorMessage);
    }

    [Fact]
    public async Task ExtractTextAsync_UnreachableProvider_ReturnsFailure()
    {
        // Arrange
        var handler = new ThrowingHandler();
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://api.mistral.ai") };
        var sut = new MistralOcrService(client, "test-key", NullLogger<MistralOcrService>.Instance);

        // Act
        var result = await sut.ExtractTextAsync(new MemoryStream([0x1]), "image/jpeg");

        // Assert
        Assert.False(result.Success);
        Assert.NotNull(result.ErrorMessage);
    }

    private static MistralOcrService BuildSut(HttpStatusCode code, string body, string apiKey = "test-key")
    {
        var handler = new StaticHandler(code, body);
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://api.mistral.ai") };
        return new MistralOcrService(client, apiKey, NullLogger<MistralOcrService>.Instance);
    }

    private sealed class StaticHandler(HttpStatusCode code, string body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(new HttpResponseMessage(code)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => throw new HttpRequestException("network down");
    }
}

