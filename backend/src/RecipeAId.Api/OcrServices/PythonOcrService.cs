using System.Diagnostics;
using System.Text.Json.Serialization;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.OcrServices;

/// <summary>
/// Calls the Python EasyOCR sidecar service to extract raw text from an image.
/// The sidecar runs at the URL configured in OcrService:BaseUrl (default: http://localhost:8001).
/// </summary>
public sealed class PythonOcrService(IHttpClientFactory httpClientFactory, ILogger<PythonOcrService> logger)
    : IOcrService
{
    public async Task<OcrResult> ExtractTextAsync(Stream imageStream, string mimeType, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("OcrService");

        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(imageStream);
        streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
        content.Add(streamContent, "file", "image");

        logger.LogInformation("Forwarding image to OCR sidecar ({MimeType})", mimeType);
        var sw = Stopwatch.StartNew();

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync("/ocr", content, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OCR sidecar unreachable after {ElapsedMs}ms", sw.ElapsedMilliseconds);
            return new OcrResult(string.Empty, false, "OCR service is unavailable. Is the Python sidecar running?");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("OCR sidecar returned {Status} after {ElapsedMs}ms: {Body}",
                (int)response.StatusCode, sw.ElapsedMilliseconds, body);
            return new OcrResult(string.Empty, false, $"OCR service error ({(int)response.StatusCode})");
        }

        var result = await response.Content.ReadFromJsonAsync<OcrResponse>(ct);
        if (result is null || result.RawText is null)
        {
            return new OcrResult(string.Empty, false, "OCR service returned an unexpected response");
        }

        logger.LogInformation("OCR sidecar responded in {ElapsedMs}ms — {Chars} chars extracted",
            sw.ElapsedMilliseconds, result.RawText.Length);
        return new OcrResult(result.RawText, true, null);
    }

    private sealed record OcrResponse([property: JsonPropertyName("raw_text")] string RawText);
}
