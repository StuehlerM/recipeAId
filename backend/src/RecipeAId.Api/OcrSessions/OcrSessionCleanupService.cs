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
    private const int CleanupIntervalSeconds = 60;
    private const int SessionMaxAgeMinutes = 5;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(CleanupIntervalSeconds), ct);
            store.CleanupStale(TimeSpan.FromMinutes(SessionMaxAgeMinutes));
            logger.LogDebug("OCR session cleanup ran");
        }
    }
}
