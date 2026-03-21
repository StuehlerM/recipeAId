using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.OcrServices;

public sealed class MistralOcrService(
    HttpClient httpClient,
    string apiKey,
    ILogger<MistralOcrService> logger) : IOcrService
{
    public async Task<OcrResult> ExtractTextAsync(Stream imageStream, string mimeType, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError("MISTRAL_OCR_API_KEY is not configured");
            return new OcrResult(string.Empty, false, "OCR API key not configured");
        }

        byte[] bytes;
        using (var ms = new MemoryStream())
        {
            await imageStream.CopyToAsync(ms, ct);
            bytes = ms.ToArray();
        }

        var base64Image = Convert.ToBase64String(bytes);
        var dataUri = $"data:{mimeType};base64,{base64Image}";

        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/ocr")
        {
            Content = JsonContent.Create(new MistralOcrRequest(
                "mistral-ocr-latest",
                new MistralOcrDocument("image_url", dataUri)))
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Mistral OCR provider unreachable");
            return new OcrResult(string.Empty, false, "OCR provider unreachable");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Mistral OCR returned {Status}: {Body}", (int)response.StatusCode, body);
            return new OcrResult(string.Empty, false, $"OCR provider error ({(int)response.StatusCode})");
        }

        var result = await response.Content.ReadFromJsonAsync<MistralOcrResponse>(ct);
        var rawText = string.Join(
            "\n\n",
            result?.Pages?.Select(p => p.Markdown?.Trim())
                .Where(m => !string.IsNullOrWhiteSpace(m))!
                ?? []);
        rawText = rawText.Replace("\\n", "\n");

        if (string.IsNullOrWhiteSpace(rawText))
        {
            return new OcrResult(string.Empty, false, "OCR provider returned no text");
        }

        return new OcrResult(rawText, true, null);
    }

    private sealed record MistralOcrRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("document")] MistralOcrDocument Document);

    private sealed record MistralOcrDocument(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("image_url")] string ImageUrl);

    private sealed class MistralOcrResponse
    {
        [JsonPropertyName("pages")]
        public List<MistralPage>? Pages { get; set; }
    }

    private sealed class MistralPage
    {
        [JsonPropertyName("markdown")]
        public string? Markdown { get; set; }
    }
}

