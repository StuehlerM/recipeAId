namespace RecipeAId.Core.Interfaces;

/// <summary>
/// Low-level key/value blob store. Implementations wrap the actual storage back-end (e.g. LiteDB FileStorage).
/// </summary>
public interface IImageStorage
{
    Task StoreAsync(string key, Stream data, string contentType, CancellationToken ct = default);
    Task<(Stream Data, string ContentType)?> FindAsync(string key, CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
}
