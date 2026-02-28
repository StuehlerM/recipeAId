using System.Text.Json.Serialization;
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

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync("/ocr", content, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OCR service is unreachable");
            return new OcrResult(string.Empty, false, "OCR service is unavailable. Is the Python sidecar running?");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("OCR service returned {Status}: {Body}", (int)response.StatusCode, body);
            return new OcrResult(string.Empty, false, $"OCR service error ({(int)response.StatusCode})");
        }

        var result = await response.Content.ReadFromJsonAsync<OcrResponse>(ct);
        if (result is null || result.RawText is null)
            return new OcrResult(string.Empty, false, "OCR service returned an unexpected response");

        return new OcrResult(result.RawText, true, null);
    }

    private sealed record OcrResponse([property: JsonPropertyName("raw_text")] string RawText);
}
