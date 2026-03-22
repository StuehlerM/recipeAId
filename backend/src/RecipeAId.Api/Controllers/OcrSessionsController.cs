using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RecipeAId.Api.OcrSessions;

namespace RecipeAId.Api.Controllers;

/// <summary>
/// Streams Server-Sent Events (SSE) for an in-progress OCR session.
/// The frontend connects immediately after POST /from-image and waits here
/// while the LLM background task runs.
/// </summary>
[ApiController]
[Route("api/v1/ocr-sessions")]
public class OcrSessionsController(
    OcrSessionStore sessionStore,
    ILogger<OcrSessionsController> logger)
    : ControllerBase
{
    // SSE hard timeout: prevent zombie connections if the client never disconnects.
    private const int SseHardTimeoutSeconds = 900; // 15 minutes

    [HttpGet("{sessionId}/events")]
    public async Task StreamEvents(string sessionId, CancellationToken ct)
    {
        Response.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        try
        {
            // Send an immediate heartbeat so the browser knows the connection is alive
            await Response.WriteAsync("data: {\"status\":\"processing\"}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
        catch (Exception ex) when (ex is OperationCanceledException or IOException)
        {
            logger.LogWarning("SSE session {SessionId} — client disconnected during heartbeat", sessionId);
            return;
        }

        var tcs = sessionStore.TryGetTcs(sessionId);
        if (tcs is null)
        {
            logger.LogWarning("SSE session {SessionId} not found", sessionId);
            try
            {
                await Response.WriteAsync("data: {\"status\":\"failed\",\"error\":\"session not found\"}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
            catch (Exception ex) when (ex is OperationCanceledException or IOException)
            {
                logger.LogDebug("Failed to send session-not-found message for {SessionId}", sessionId);
            }
            return;
        }

        // Poll for completion with a hard timeout so clients receive a terminal event.
        using var hardTimeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        hardTimeoutCts.CancelAfter(TimeSpan.FromSeconds(SseHardTimeoutSeconds));

        try
        {
            while (true)
            {
                // Check if result is ready (non-blocking with 5s timeout)
                try
                {
                    await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5), hardTimeoutCts.Token).ConfigureAwait(false);
                    var result = await tcs.Task.ConfigureAwait(false);
                    string payload;
                    if (result.Success && result.Ingredients.Count > 0)
                    {
                        var data = new { status = "done", ingredients = result.Ingredients };
                        payload = $"data: {JsonSerializer.Serialize(data, JsonSerializerOptions.Web)}\n\n";
                        logger.LogInformation("SSE session {SessionId} completed — {Count} ingredients",
                            sessionId, result.Ingredients.Count);
                    }
                    else
                    {
                        var escaped = (result.ErrorMessage ?? "LLM refinement failed").Replace("\"", "\\\"");
                        payload = $"data: {{\"status\":\"failed\",\"error\":\"{escaped}\"}}\n\n";
                        logger.LogWarning("SSE session {SessionId} failed: {Error}", sessionId, result.ErrorMessage);
                    }

                    try
                    {
                        await Response.WriteAsync(payload, ct);
                    }
                    catch (Exception ex) when (ex is OperationCanceledException or IOException)
                    {
                        logger.LogDebug("Failed to send result for SSE session {SessionId}", sessionId);
                    }
                    return;
                }
                catch (TimeoutException)
                {
                    // 5s timeout expired; continue polling
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("SSE session {SessionId} — hard timeout (900s) or client disconnected", sessionId);
            try
            {
                await Response.WriteAsync("data: {\"status\":\"failed\",\"error\":\"timeout\"}\n\n", CancellationToken.None);
            }
            catch (Exception ex) when (ex is IOException or OperationCanceledException)
            {
                logger.LogDebug("Failed to write timeout message for SSE session {SessionId}", sessionId);
            }
        }
        finally
        {
            sessionStore.Remove(sessionId);
            try
            {
                await Response.Body.FlushAsync(CancellationToken.None);
            }
            catch (Exception ex) when (ex is IOException or OperationCanceledException)
            {
                logger.LogDebug("Failed to flush response for SSE session {SessionId}", sessionId);
            }
        }
    }
}
