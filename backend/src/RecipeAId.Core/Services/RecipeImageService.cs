using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class RecipeImageService(IImageStorage storage) : IRecipeImageService
{
    private static readonly HashSet<string> ValidSlots = ["title", "ingredients", "instructions"];

    public bool IsValidSlot(string slot) => ValidSlots.Contains(slot);

    public async Task<string> StoreTemporaryImageAsync(Stream data, string contentType, CancellationToken ct = default)
    {
        var key = Guid.NewGuid().ToString("N");
        await storage.StoreAsync($"temp/{key}", data, contentType, ct);
        return key;
    }

    public async Task CommitImagesAsync(int recipeId, Dictionary<string, string> slotToImageKey, CancellationToken ct = default)
    {
        foreach (var (slot, imageKey) in slotToImageKey)
        {
            if (!IsValidSlot(slot)) continue;

            var found = await storage.FindAsync($"temp/{imageKey}", ct);
            if (found is null) continue;

            await using var data = found.Value.Data;
            await storage.StoreAsync($"recipe/{recipeId}/{slot}", data, found.Value.ContentType, ct);
            await storage.DeleteAsync($"temp/{imageKey}", ct);
        }
    }

    public Task<(Stream Data, string ContentType)?> GetImageAsync(int recipeId, string slot, CancellationToken ct = default)
        => storage.FindAsync($"recipe/{recipeId}/{slot}", ct);

    public Task StoreDirectAsync(int recipeId, string slot, Stream data, string contentType, CancellationToken ct = default)
        => storage.StoreAsync($"recipe/{recipeId}/{slot}", data, contentType, ct);

    public async Task DeleteAllImagesAsync(int recipeId, CancellationToken ct = default)
    {
        foreach (var slot in ValidSlots)
            await storage.DeleteAsync($"recipe/{recipeId}/{slot}", ct);
    }
}
