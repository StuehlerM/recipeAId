namespace RecipeAId.Api.OcrSessions;

/// <summary>
/// Background service that periodically removes stale OCR sessions
/// (those that were never consumed by an SSE client).
/// </summary>
public sealed class OcrSessionCleanupService(
    OcrSessionStore store,
    ILogger<OcrSessionCleanupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(60), ct);
            store.CleanupStale(TimeSpan.FromMinutes(5));
            logger.LogDebug("OCR session cleanup ran");
        }
    }
}
