using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.ParserServices;

/// <summary>
/// Calls the Mistral AI public API to parse raw ingredient text into structured
/// <see cref="IngredientLineDto"/> records.
/// Replaces the local Ollama/ingredient-parser sidecar.
/// </summary>
/// <remarks>
/// <para>
/// The API key is read from the <c>INGREDIENT_PARSER_API_KEY</c> environment variable
/// and injected at registration time — it is never hardcoded or committed.
/// </para>
/// <para>
/// Security layers applied in order:
/// <list type="number">
///   <item>Input sanitisation — truncation, control-char stripping, role-marker removal</item>
///   <item>XML delimiter wrapping inside the prompt</item>
///   <item>Schema validation of the parsed output</item>
///   <item>Semantic sanity bounds (item count, name length, numeric amount range)</item>
/// </list>
/// </para>
/// </remarks>
public sealed class PublicLlmIngredientParserService(
    HttpClient httpClient,
    string apiKey,
    ILogger<PublicLlmIngredientParserService> logger)
    : IIngredientParserService
{
    // ── Configuration ────────────────────────────────────────────────────────

    private const string MistralModel = "mistral-small-latest";
    // Defence-in-depth: the controller already rejects inputs > 5 000 chars,
    // but this bound protects callers that bypass the controller (e.g. the OCR pipeline).
    private const int MaxInputChars   = 10_000;
    private const int MaxOutputItems  = 50;
    private const int MaxNameLength   = 100;
    private const double MaxAmount    = 5_000;

    private static readonly JsonSerializerOptions CaseInsensitiveJson =
        new() { PropertyNameCaseInsensitive = true };

    // ── Public API ───────────────────────────────────────────────────────────

    public async Task<IngredientParseResult> ParseAsync(
        string text,
        string lang,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError("INGREDIENT_PARSER_API_KEY is not configured — ingredient parsing unavailable");
            return new IngredientParseResult([], false, "Ingredient parser API key not configured", IsProviderUnavailable: true);
        }

        var sanitized = Sanitize(text);
        logger.LogInformation("Calling Mistral ingredient parser — {Chars} chars (lang={Lang})", sanitized.Length, lang);

        var requestBody = BuildRequestBody(sanitized, lang);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/chat/completions")
        {
            Headers = { { "Authorization", $"Bearer {apiKey}" } },
            Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json")
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, ct);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Mistral API unreachable — ingredient parsing unavailable");
            return new IngredientParseResult([], false, "Ingredient parser API unreachable", IsProviderUnavailable: true);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Mistral API returned {Status}: {Body}", (int)response.StatusCode, errorBody);
            return new IngredientParseResult([], false,
                $"Ingredient parser API error ({(int)response.StatusCode})", IsProviderUnavailable: true);
        }

        string content;
        try
        {
            var responseJson = await response.Content.ReadAsStringAsync(ct);
            var apiResponse  = JsonSerializer.Deserialize<MistralChatResponse>(responseJson);
            content = apiResponse?.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
        }
        catch (Exception ex) when (ex is JsonException)
        {
            logger.LogWarning(ex, "Could not read Mistral API response");
            return new IngredientParseResult([], false, "Invalid response from ingredient parser API");
        }

        var ingredients = ParseAndValidate(content);
        if (ingredients is null)
        {
            logger.LogWarning("Mistral response content could not be parsed as ingredient list");
            return new IngredientParseResult([], false, "Unparseable response from ingredient parser API");
        }

        logger.LogInformation("Mistral parser returned {Count} ingredients", ingredients.Count);
        return new IngredientParseResult(ingredients, true, null, IsProviderUnavailable: false);
    }

    // ── Sanitiser ────────────────────────────────────────────────────────────

    private static string Sanitize(string input)
    {
        // 1. Truncate
        if (input.Length > MaxInputChars)
            input = input[..MaxInputChars];

        // 2. Strip control characters (keep \n \r \t)
        var sb = new StringBuilder(input.Length);
        foreach (var ch in input)
        {
            if (ch is '\n' or '\r' or '\t' || !char.IsControl(ch))
                sb.Append(ch);
        }
        input = sb.ToString();

        // 3. Strip prompt-injection role markers from line starts
        var lines = input.Split('\n');
        var cleaned = new StringBuilder();
        foreach (var line in lines)
        {
            var trimmed = line.TrimStart();
            if (StartsWithRoleMarker(trimmed))
                continue;
            cleaned.AppendLine(line);
        }

        return cleaned.ToString().Trim();
    }

    private static bool StartsWithRoleMarker(string line)
    {
        ReadOnlySpan<string> markers = ["system:", "user:", "assistant:", "<|system|>", "<|user|>", "<|assistant|>"];
        foreach (var marker in markers)
        {
            if (line.StartsWith(marker, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    // ── Prompt builder ───────────────────────────────────────────────────────

    private static MistralChatRequest BuildRequestBody(string sanitizedText, string lang)
    {
        // XML delimiters prevent the model from treating content as instructions.
        var prompt =
            $"""
             Parse the following recipe ingredient text into a JSON array.
             Each element must have exactly three string fields: "name", "amount", "unit".
             Use empty string for amount or unit when not present.
             Return ONLY the JSON array — no explanation, no markdown fences.

             Language: {lang}

             <ingredients>
             {sanitizedText}
             </ingredients>
             """;

        return new MistralChatRequest(
            Model: MistralModel,
            Messages: [new MistralMessage(Role: "user", Content: prompt)],
            Temperature: 0,
            MaxTokens: 2048);
    }

    // ── Output parser + validator ─────────────────────────────────────────────

    private static List<IngredientLineDto>? ParseAndValidate(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return null;

        // Strip optional markdown code fences the model may emit despite instructions.
        var trimmed = content.Trim();
        if (trimmed.StartsWith("```"))
        {
            var end = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            trimmed = end > 3 ? trimmed[(trimmed.IndexOf('\n') + 1)..end] : trimmed.TrimStart('`');
        }

        List<RawIngredientItem>? items;
        try
        {
            items = JsonSerializer.Deserialize<List<RawIngredientItem>>(trimmed, CaseInsensitiveJson);
        }
        catch (JsonException)
        {
            return null;
        }

        if (items is null)
            return null;

        // Semantic sanity bounds
        var validated = new List<IngredientLineDto>(Math.Min(items.Count, MaxOutputItems));
        foreach (var item in items.Take(MaxOutputItems))
        {
            var name = (item.Name ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(name))
                continue;

            // Truncate overlong names rather than dropping the whole item.
            if (name.Length > MaxNameLength)
                name = name[..MaxNameLength].TrimEnd();

            var amount = (item.Amount ?? string.Empty).Trim();
            if (amount.Length > 0
                && double.TryParse(amount, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var numeric)
                && (numeric < 0 || numeric > MaxAmount))
            {
                amount = string.Empty;   // out-of-range numeric → clear rather than reject
            }

            var unit = (item.Unit ?? string.Empty).Trim();

            validated.Add(new IngredientLineDto(name, amount, unit));
        }

        return validated;
    }

    // ── JSON shapes ──────────────────────────────────────────────────────────

    private sealed record MistralChatRequest(
        [property: JsonPropertyName("model")]       string Model,
        [property: JsonPropertyName("messages")]    List<MistralMessage> Messages,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("max_tokens")]  int MaxTokens);

    private sealed record MistralMessage(
        [property: JsonPropertyName("role")]    string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed class MistralChatResponse
    {
        [JsonPropertyName("choices")]
        public List<MistralChoice>? Choices { get; set; }
    }

    private sealed class MistralChoice
    {
        [JsonPropertyName("message")]
        public MistralResponseMessage? Message { get; set; }
    }

    private sealed class MistralResponseMessage
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    private sealed class RawIngredientItem
    {
        [JsonPropertyName("name")]   public string? Name   { get; set; }
        [JsonPropertyName("amount")] public string? Amount { get; set; }
        [JsonPropertyName("unit")]   public string? Unit   { get; set; }
    }
}
