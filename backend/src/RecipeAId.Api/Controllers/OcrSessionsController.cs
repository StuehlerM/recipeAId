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
    [HttpGet("{sessionId}/events")]
    public async Task StreamEvents(string sessionId, CancellationToken ct)
    {
        Response.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        // Send an immediate heartbeat so the browser knows the connection is alive
        await Response.WriteAsync("data: {\"status\":\"processing\"}\n\n", ct);
        await Response.Body.FlushAsync(ct);

        var tcs = sessionStore.TryGetTcs(sessionId);
        if (tcs is null)
        {
            logger.LogWarning("SSE session {SessionId} not found", sessionId);
            await Response.WriteAsync("data: {\"status\":\"failed\",\"error\":\"session not found\"}\n\n", ct);
            await Response.Body.FlushAsync(ct);
            return;
        }

        // Timeout slightly longer than the nginx proxy_read_timeout so the backend
        // always sends a failure event rather than the connection being cut silently.
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(215));

        try
        {
            var result = await tcs.Task.WaitAsync(timeoutCts.Token);

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

            await Response.WriteAsync(payload, ct);
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("SSE session {SessionId} timed out", sessionId);
            await Response.WriteAsync("data: {\"status\":\"failed\",\"error\":\"timeout\"}\n\n", ct);
        }
        finally
        {
            sessionStore.Remove(sessionId);
            await Response.Body.FlushAsync(CancellationToken.None);
        }
    }
}
