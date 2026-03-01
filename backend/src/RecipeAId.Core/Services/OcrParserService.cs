using System.Text.RegularExpressions;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

/// <summary>
/// Parses raw OCR text into a structured recipe draft.
///
/// Strategy:
///   1. Split into lines, strip blank lines at edges.
///   2. Look for section headers (case-insensitive): "Ingredients:", "Instructions:",
///      "Directions:", "Method:", "Recipe:".
///   3. If headers are found, use them to partition the text.
///   4. If no headers, treat the first line as the title, then heuristically classify
///      remaining lines as ingredients (numbered/bulleted or short) vs. instructions.
/// </summary>
public sealed partial class OcrParserService : IOcrParser
{
    private static readonly string[] IngredientHeaders =
        ["ingredients", "ingredient list", "you will need", "you'll need"];

    private static readonly string[] InstructionHeaders =
        ["instructions", "directions", "method", "steps", "preparation", "how to make", "procedure"];

    // Matches "2 cups flour", "1/2 tsp salt", "200g butter", "1 1/2 cups sugar"
    [GeneratedRegex(
        @"^(?<amount>[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+(?:\s+[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+)?)\s*(?<unit>(?:cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter|litre|pinch|dash|clove|slice|can|bunch|handful|large|medium|small|package|pkg|stick)\S*)\s+(?<name>.+)$",
        RegexOptions.IgnoreCase)]
    private static partial Regex AmountUnitNamePattern();

    // Matches leading bullets/numbers: "1." "1)" "-" "*" "•"
    [GeneratedRegex(@"^\s*(?:\d+[.)]\s*|[-*•]\s*)")]
    private static partial Regex LeadingBulletPattern();

    // Matches lines starting with a digit or fraction character
    [GeneratedRegex(@"^\s*[\d½⅓⅔¼¾⅛⅜⅝⅞]")]
    private static partial Regex StartsWithQuantityPattern();

    public RecipeOcrDraftDto Parse(string rawOcrText, string? imagePath = null)
    {
        var lines = rawOcrText
            .Split('\n')
            .Select(l => l.Trim())
            .ToList();

        // Remove leading/trailing empty lines
        while (lines.Count > 0 && lines[0].Length == 0) lines.RemoveAt(0);
        while (lines.Count > 0 && lines[^1].Length == 0) lines.RemoveAt(lines.Count - 1);

        if (lines.Count == 0)
            return new RecipeOcrDraftDto(null, null, [], rawOcrText, imagePath);

        // Find section header positions
        int ingredientStart = -1;
        int instructionStart = -1;
        int titleLineIndex = -1;

        for (int i = 0; i < lines.Count; i++)
        {
            var lower = lines[i].ToLowerInvariant().TrimEnd(':');

            if (titleLineIndex == -1 && lower == "recipe")
            {
                titleLineIndex = i; // title is the next non-empty line
                continue;
            }

            if (ingredientStart == -1 && IngredientHeaders.Contains(lower))
            {
                ingredientStart = i;
                continue;
            }

            if (instructionStart == -1 && InstructionHeaders.Contains(lower))
            {
                instructionStart = i;
            }
        }

        bool hasHeaders = ingredientStart != -1 || instructionStart != -1;

        if (hasHeaders)
            return ParseStructured(lines, titleLineIndex, ingredientStart, instructionStart, rawOcrText, imagePath);

        return ParseUnstructured(lines, rawOcrText, imagePath);
    }

    // ── Structured (section headers present) ────────────────────────────────

    private static RecipeOcrDraftDto ParseStructured(
        List<string> lines,
        int titleLineIndex,
        int ingredientStart,
        int instructionStart,
        string rawOcrText,
        string? imagePath)
    {
        // Determine the end boundary of each section
        var sectionStarts = new List<int>();
        if (ingredientStart != -1) sectionStarts.Add(ingredientStart);
        if (instructionStart != -1) sectionStarts.Add(instructionStart);
        sectionStarts.Sort();

        // Title: either the line after "Recipe:" header, or the first line before any section
        string? title = null;
        int firstSection = sectionStarts.Count > 0 ? sectionStarts[0] : lines.Count;

        if (titleLineIndex != -1)
        {
            // Next non-empty line after "Recipe:" header
            for (int i = titleLineIndex + 1; i < firstSection; i++)
            {
                if (lines[i].Length > 0) { title = lines[i]; break; }
            }
        }
        else
        {
            // First non-empty line before any section header
            for (int i = 0; i < firstSection; i++)
            {
                if (lines[i].Length > 0) { title = lines[i]; break; }
            }
        }

        var ingredients = new List<IngredientLineDto>();
        string? instructions = null;

        if (ingredientStart != -1)
        {
            int end = NextSection(ingredientStart, sectionStarts);
            ingredients = ParseIngredientLines(lines, ingredientStart + 1, end);
        }

        if (instructionStart != -1)
        {
            int end = NextSection(instructionStart, sectionStarts);
            var instrLines = lines
                .Skip(instructionStart + 1)
                .Take(end - instructionStart - 1)
                .Where(l => l.Length > 0);
            instructions = string.Join("\n", instrLines);
            if (instructions.Length == 0) instructions = null;
        }

        return new RecipeOcrDraftDto(title, instructions, ingredients, rawOcrText, imagePath);
    }

    private static int NextSection(int current, List<int> allStarts)
    {
        foreach (var s in allStarts)
            if (s > current) return s;
        return int.MaxValue; // go to end of file
    }

    // ── Unstructured (no headers — heuristic classification) ────────────────

    private static RecipeOcrDraftDto ParseUnstructured(
        List<string> lines,
        string rawOcrText,
        string? imagePath)
    {
        // First non-empty line → title
        var title = lines.FirstOrDefault(l => l.Length > 0);

        var rest = lines.Skip(1).Where(l => l.Length > 0).ToList();

        var ingredients = new List<IngredientLineDto>();
        var instrParts = new List<string>();

        foreach (var line in rest)
        {
            if (LooksLikeIngredient(line))
                ingredients.Add(ParseIngredientLine(line));
            else
                instrParts.Add(line);
        }

        var instructions = instrParts.Count > 0 ? string.Join("\n", instrParts) : null;
        return new RecipeOcrDraftDto(title, instructions, ingredients, rawOcrText, imagePath);
    }

    // ── Ingredient line helpers ──────────────────────────────────────────────

    private static List<IngredientLineDto> ParseIngredientLines(List<string> lines, int from, int to)
    {
        var result = new List<IngredientLineDto>();
        int end = Math.Min(to == int.MaxValue ? lines.Count : to, lines.Count);
        for (int i = from; i < end; i++)
        {
            if (lines[i].Length > 0)
                result.Add(ParseIngredientLine(lines[i]));
        }
        return result;
    }

    private static IngredientLineDto ParseIngredientLine(string line)
    {
        var stripped = StripLeadingBullet(line);

        var match = AmountUnitNamePattern().Match(stripped);
        if (match.Success)
            return new IngredientLineDto(
                match.Groups["name"].Value.Trim(),
                match.Groups["amount"].Value.Trim(),
                match.Groups["unit"].Value.Trim());

        return new IngredientLineDto(stripped, null, null);
    }

    private static string StripLeadingBullet(string line)
    {
        return LeadingBulletPattern().Replace(line, "").Trim();
    }

    private static bool LooksLikeIngredient(string line)
    {
        if (LeadingBulletPattern().IsMatch(line))
            return true;

        if (StartsWithQuantityPattern().IsMatch(line))
            return true;

        if (line.Length < 40 && !line.Contains('.'))
            return true;

        return false;
    }
}
