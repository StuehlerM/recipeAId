using LiteDB;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Data.Repositories;

public class LiteDbImageStorage(ILiteDatabase db) : IImageStorage
{
    private ILiteStorage<string> Storage => db.FileStorage;

    public Task StoreAsync(string key, Stream data, string contentType, CancellationToken ct = default)
    {
        var metadata = new BsonDocument { ["contentType"] = contentType };
        Storage.Upload(key, key, data, metadata);
        return Task.CompletedTask;
    }

    public Task<(Stream Data, string ContentType)?> FindAsync(string key, CancellationToken ct = default)
    {
        var info = Storage.FindById(key);
        if (info is null) return Task.FromResult<(Stream, string)?>(null);

        var ms = new MemoryStream();
        info.CopyTo(ms);
        ms.Position = 0;
        var contentType = info.Metadata?["contentType"]?.AsString ?? "image/jpeg";
        return Task.FromResult<(Stream, string)?>((ms, contentType));
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        Storage.Delete(key);
        return Task.CompletedTask;
    }
}
