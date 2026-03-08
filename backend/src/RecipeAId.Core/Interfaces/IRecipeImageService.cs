namespace RecipeAId.Core.Interfaces;

public interface IRecipeImageService
{
    /// <summary>Stores an image under a temporary key and returns that key (to be sent back by the client on save).</summary>
    Task<string> StoreTemporaryImageAsync(Stream data, string contentType, CancellationToken ct = default);

    /// <summary>Moves temporary images into their permanent recipe slots. Unknown slots and missing temp images are silently skipped.</summary>
    Task CommitImagesAsync(int recipeId, Dictionary<string, string> slotToImageKey, CancellationToken ct = default);

    /// <summary>Returns the stored image for the given recipe and slot, or null if not present.</summary>
    Task<(Stream Data, string ContentType)?> GetImageAsync(int recipeId, string slot, CancellationToken ct = default);

    /// <summary>Stores an image directly into a named recipe slot (bypasses the temp/commit flow).</summary>
    Task StoreDirectAsync(int recipeId, string slot, Stream data, string contentType, CancellationToken ct = default);

    /// <summary>Removes all three slot images when a recipe is deleted.</summary>
    Task DeleteAllImagesAsync(int recipeId, CancellationToken ct = default);

    bool IsValidSlot(string slot);
}
