using System.Text;
using Moq;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using Xunit;

namespace RecipeAId.Tests.Services;

public class RecipeImageServiceTests
{
    private readonly Mock<IImageStorage> _storage = new();
    private readonly RecipeImageService  _sut;

    public RecipeImageServiceTests()
    {
        _sut = new RecipeImageService(_storage.Object);
    }

    // ── StoreTemporaryImageAsync ───────────────────────────────────────────

    [Fact]
    public async Task StoreTemporaryImageAsync_StoresUnderTempPrefix()
    {
        string? capturedKey = null;
        _storage
            .Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
            .Callback<string, Stream, string, CancellationToken>((key, _, _, _) => capturedKey = key)
            .Returns(Task.CompletedTask);

        await _sut.StoreTemporaryImageAsync(Stream.Null, "image/jpeg");

        Assert.NotNull(capturedKey);
        Assert.StartsWith("temp/", capturedKey);
    }

    [Fact]
    public async Task StoreTemporaryImageAsync_ReturnsKeyThatMatchesStoredPath()
    {
        string? capturedKey = null;
        _storage
            .Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
            .Callback<string, Stream, string, CancellationToken>((key, _, _, _) => capturedKey = key)
            .Returns(Task.CompletedTask);

        var returnedKey = await _sut.StoreTemporaryImageAsync(Stream.Null, "image/jpeg");

        Assert.NotNull(returnedKey);
        Assert.Equal($"temp/{returnedKey}", capturedKey);
    }

    [Fact]
    public async Task StoreTemporaryImageAsync_PassesContentTypeToStorage()
    {
        string? capturedContentType = null;
        _storage
            .Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
            .Callback<string, Stream, string, CancellationToken>((_, _, ct, _) => capturedContentType = ct)
            .Returns(Task.CompletedTask);

        await _sut.StoreTemporaryImageAsync(Stream.Null, "image/png");

        Assert.Equal("image/png", capturedContentType);
    }

    // ── CommitImagesAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task CommitImagesAsync_MovesImageToRecipeSlotKey()
    {
        var imageData = new MemoryStream(Encoding.UTF8.GetBytes("img"));
        _storage
            .Setup(s => s.FindAsync("temp/key1", default))
            .ReturnsAsync((imageData, "image/jpeg"));

        string? storedKey = null;
        _storage
            .Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
            .Callback<string, Stream, string, CancellationToken>((key, _, _, _) => storedKey = key)
            .Returns(Task.CompletedTask);

        await _sut.CommitImagesAsync(42, new Dictionary<string, string> { ["title"] = "key1" });

        Assert.Equal("recipe/42/title", storedKey);
    }

    [Fact]
    public async Task CommitImagesAsync_DeletesTempKeyAfterMove()
    {
        var imageData = new MemoryStream([0x01]);
        _storage.Setup(s => s.FindAsync("temp/key1", default)).ReturnsAsync((imageData, "image/jpeg"));
        _storage.Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
                .Returns(Task.CompletedTask);

        await _sut.CommitImagesAsync(42, new Dictionary<string, string> { ["title"] = "key1" });

        _storage.Verify(s => s.DeleteAsync("temp/key1", default), Times.Once);
    }

    [Fact]
    public async Task CommitImagesAsync_SkipsInvalidSlots()
    {
        await _sut.CommitImagesAsync(42, new Dictionary<string, string> { ["photo"] = "key1" });

        _storage.Verify(s => s.FindAsync(It.IsAny<string>(), default), Times.Never);
        _storage.Verify(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task CommitImagesAsync_SkipsMissingTempImages()
    {
        _storage.Setup(s => s.FindAsync("temp/missing", default))
                .ReturnsAsync((ValueTuple<Stream, string>?)null);

        await _sut.CommitImagesAsync(42, new Dictionary<string, string> { ["title"] = "missing" });

        _storage.Verify(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task CommitImagesAsync_HandlesMultipleSlots()
    {
        foreach (var slot in new[] { "title", "ingredients" })
        {
            var data = new MemoryStream([0x01]);
            _storage.Setup(s => s.FindAsync($"temp/{slot}key", default)).ReturnsAsync((data, "image/jpeg"));
        }
        _storage.Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
                .Returns(Task.CompletedTask);

        var sessions = new Dictionary<string, string>
        {
            ["title"]       = "titlekey",
            ["ingredients"] = "ingredientskey",
        };
        await _sut.CommitImagesAsync(7, sessions);

        _storage.Verify(s => s.StoreAsync("recipe/7/title",       It.IsAny<Stream>(), It.IsAny<string>(), default), Times.Once);
        _storage.Verify(s => s.StoreAsync("recipe/7/ingredients", It.IsAny<Stream>(), It.IsAny<string>(), default), Times.Once);
    }

    // ── GetImageAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetImageAsync_ReturnsNullWhenImageNotFound()
    {
        _storage.Setup(s => s.FindAsync("recipe/1/title", default))
                .ReturnsAsync((ValueTuple<Stream, string>?)null);

        var result = await _sut.GetImageAsync(1, "title");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetImageAsync_ReturnsStreamAndContentType()
    {
        var imageData = new MemoryStream([0xFF, 0xD8]);
        _storage.Setup(s => s.FindAsync("recipe/5/ingredients", default))
                .ReturnsAsync((imageData, "image/png"));

        var result = await _sut.GetImageAsync(5, "ingredients");

        Assert.NotNull(result);
        Assert.Equal("image/png", result!.Value.ContentType);
        Assert.Same(imageData, result.Value.Data);
    }

    [Fact]
    public async Task GetImageAsync_BuildsCorrectStorageKey()
    {
        _storage.Setup(s => s.FindAsync(It.IsAny<string>(), default))
                .ReturnsAsync((ValueTuple<Stream, string>?)null);

        await _sut.GetImageAsync(99, "instructions");

        _storage.Verify(s => s.FindAsync("recipe/99/instructions", default), Times.Once);
    }

    // ── StoreDirectAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task StoreDirectAsync_StoresUnderRecipeSlotKey()
    {
        string? capturedKey = null;
        _storage
            .Setup(s => s.StoreAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), default))
            .Callback<string, Stream, string, CancellationToken>((key, _, _, _) => capturedKey = key)
            .Returns(Task.CompletedTask);

        await _sut.StoreDirectAsync(12, "title", Stream.Null, "image/jpeg");

        Assert.Equal("recipe/12/title", capturedKey);
    }

    // ── DeleteAllImagesAsync ──────────────────────────────────────────────

    [Fact]
    public async Task DeleteAllImagesAsync_DeletesAllThreeSlots()
    {
        await _sut.DeleteAllImagesAsync(7);

        _storage.Verify(s => s.DeleteAsync("recipe/7/title",        default), Times.Once);
        _storage.Verify(s => s.DeleteAsync("recipe/7/ingredients",  default), Times.Once);
        _storage.Verify(s => s.DeleteAsync("recipe/7/instructions", default), Times.Once);
    }

    // ── IsValidSlot ───────────────────────────────────────────────────────

    [Theory]
    [InlineData("title",        true)]
    [InlineData("ingredients",  true)]
    [InlineData("instructions", true)]
    [InlineData("photo",        false)]
    [InlineData("TITLE",        false)]
    [InlineData("",             false)]
    public void IsValidSlot_ReturnsExpected(string slot, bool expected)
    {
        Assert.Equal(expected, _sut.IsValidSlot(slot));
    }
}
