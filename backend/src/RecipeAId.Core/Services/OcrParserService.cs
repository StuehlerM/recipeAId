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
        ["ingredients", "ingredient list", "you will need", "you'll need",
         "zutaten", "zutatenliste"];

    private static readonly string[] InstructionHeaders =
        ["instructions", "directions", "method", "steps", "preparation", "how to make", "procedure",
         "zubereitung", "anleitung", "so wird's gemacht"];

    // Matches "2 cups flour", "1/2 tsp salt", "200g butter" (amount unit name)
    [GeneratedRegex(
        @"^(?<amount>[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+(?:\s+[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+)?)\s*(?<unit>(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter|litre|pinch|dash|clove|cloves|slice|slices|can|bunch|handful|large|medium|small|package|pkg|stick|el|tl|stk|stück|prise|bund|scheibe|scheiben|dose|päckchen|becher|messerspitze|msp)\S*)\s+(?<name>.+)$",
        RegexOptions.IgnoreCase)]
    private static partial Regex AmountUnitNamePattern();

    // Matches "Flour 200 g", "Butter 50 g", "Mehl 200 g" (name amount unit)
    [GeneratedRegex(
        @"^(?<name>[^\d½⅓⅔¼¾⅛⅜⅝⅞]+?)\s+(?<amount>[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+(?:\s+[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+)?)\s*(?<unit>(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|liter|litre|pinch|dash|clove|cloves|slice|slices|can|bunch|handful|large|medium|small|package|pkg|stick|el|tl|stk|stück|prise|bund|scheibe|scheiben|dose|päckchen|becher|messerspitze|msp)\S*)\s*$",
        RegexOptions.IgnoreCase)]
    private static partial Regex NameAmountUnitPattern();

    // Matches "Eggs 2", "Äpfel 3" (name amount, no unit)
    [GeneratedRegex(
        @"^(?<name>[^\d½⅓⅔¼¾⅛⅜⅝⅞]{2,}?)\s+(?<amount>[\d½⅓⅔¼¾⅛⅜⅝⅞\./\-]+)\s*$",
        RegexOptions.IgnoreCase)]
    private static partial Regex NameAmountPattern();

    // Splits run-on ingredient text at quantity+unit boundaries mid-line.
    // Two branches (alternation):
    //   1. digit + any unit: "pasta 2 tbsp oil" → split before "2 tbsp"
    //   2. bare abbreviation after a letter: "garlic tsp pepper" → split before "tsp"
    //      (requires [a-zA-Z,] before the space so "8 oz" is NOT split)
    [GeneratedRegex(
        @"(?:(?<=\S)\s+(?=[\d½⅓⅔¼¾⅛⅜⅝⅞][\d/]*\s*(?:oz|ounce|tbsp|tsp|tablespoon|teaspoon|cup|cups|lb|pound|g|gram|kg|ml|l|liter|litre|pinch|dash|clove|cloves|slice|slices|can|bunch|handful|package|pkg|stick|el|tl|stk|prise|bund|scheibe|dose|päckchen|becher|msp)\b)|(?<=[a-zA-Z,])\s+(?=(?:tbsp|tsp)\b))",
        RegexOptions.IgnoreCase)]
    private static partial Regex QuantityBoundaryPattern();

    // Splits at case transitions: lowercase/comma followed by Capitalized word
    // e.g. "deveined Salt to taste" → ["deveined", "Salt to taste"]
    [GeneratedRegex(@"(?<=[a-z,])\s+(?=[A-Z][a-z])")]
    private static partial Regex CaseBoundaryPattern();

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
            .SelectMany(l => SplitRunOnIngredientLine(l.Trim()))
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
            int titleFoundAt = -1;
            for (int i = titleLineIndex + 1; i < firstSection; i++)
            {
                if (lines[i].Length > 0) { title = lines[i]; titleFoundAt = i; break; }
            }
            title = MergeTitleContinuation(lines, titleFoundAt, firstSection, title);
        }
        else
        {
            // First non-empty line before any section header
            int titleFoundAt = -1;
            for (int i = 0; i < firstSection; i++)
            {
                if (lines[i].Length > 0) { title = lines[i]; titleFoundAt = i; break; }
            }
            title = MergeTitleContinuation(lines, titleFoundAt, firstSection, title);
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

        // Merge title continuation: if line 1 looks like a title second line, join it
        if (rest.Count > 0 && IsTitleContinuation(rest[0]))
        {
            title = title + " " + rest[0];
            rest = rest.Skip(1).ToList();
        }

        var ingredients = new List<IngredientLineDto>();
        var instrParts = new List<string>();

        foreach (var line in rest)
        {
            if (LooksLikeIngredient(line))
            {
                foreach (var sub in SplitRunOnIngredientLine(line))
                    ingredients.Add(ParseIngredientLine(sub));
            }
            else
                instrParts.Add(line);
        }

        var instructions = instrParts.Count > 0 ? string.Join("\n", instrParts) : null;
        return new RecipeOcrDraftDto(title, instructions, ingredients, rawOcrText, imagePath);
    }

    // ── Ingredient line helpers ──────────────────────────────────────────────

    /// <summary>
    /// Splits a long run-on ingredient line into individual ingredients.
    /// Handles OCR output where multiple ingredients are on one line with no newlines.
    /// </summary>
    private static List<string> SplitRunOnIngredientLine(string line)
    {
        if (line.Length <= 50) return [line];

        var parts = new List<string>();
        // Split on quantity+unit boundaries, then case transitions within each segment
        foreach (var segment in QuantityBoundaryPattern().Split(line))
        {
            foreach (var sub in CaseBoundaryPattern().Split(segment))
            {
                var trimmed = sub.Trim();
                if (trimmed.Length > 0) parts.Add(trimmed);
            }
        }
        return parts.Count > 0 ? parts : [line];
    }

    private static List<IngredientLineDto> ParseIngredientLines(List<string> lines, int from, int to)
    {
        var result = new List<IngredientLineDto>();
        int end = Math.Min(to == int.MaxValue ? lines.Count : to, lines.Count);
        for (int i = from; i < end; i++)
        {
            if (lines[i].Length == 0) continue;
            foreach (var sub in SplitRunOnIngredientLine(lines[i]))
                result.Add(ParseIngredientLine(sub));
        }
        return result;
    }

    private static IngredientLineDto ParseIngredientLine(string line)
    {
        var stripped = StripLeadingBullet(line);

        // Try "amount unit name" first (e.g. "2 cups flour")
        var match = AmountUnitNamePattern().Match(stripped);
        if (match.Success)
            return new IngredientLineDto(
                match.Groups["name"].Value.Trim(),
                match.Groups["amount"].Value.Trim(),
                match.Groups["unit"].Value.Trim());

        // Try "name amount unit" (e.g. "Flour 200 g")
        match = NameAmountUnitPattern().Match(stripped);
        if (match.Success)
            return new IngredientLineDto(
                match.Groups["name"].Value.Trim(),
                match.Groups["amount"].Value.Trim(),
                match.Groups["unit"].Value.Trim());

        // Try "name amount" without unit (e.g. "Eggs 2")
        match = NameAmountPattern().Match(stripped);
        if (match.Success)
            return new IngredientLineDto(
                match.Groups["name"].Value.Trim(),
                match.Groups["amount"].Value.Trim(),
                null);

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

    /// <summary>
    /// Returns true if <paramref name="line"/> could be the second line of a two-line title.
    /// Requires: not a section header, no bullet/quantity prefix, ≤ 60 chars, no trailing period or colon.
    /// </summary>
    private static bool IsTitleContinuation(string line)
    {
        if (line.Length == 0 || line.Length > 60) return false;
        if (line.EndsWith('.') || line.EndsWith(':')) return false;

        var lower = line.ToLowerInvariant().TrimEnd(':');
        if (IngredientHeaders.Contains(lower) || InstructionHeaders.Contains(lower)) return false;

        if (LeadingBulletPattern().IsMatch(line)) return false;
        if (StartsWithQuantityPattern().IsMatch(line)) return false;

        return true;
    }

    /// <summary>
    /// If the line immediately after <paramref name="titleFoundAt"/> (up to <paramref name="upperBound"/>)
    /// qualifies as a title continuation, appends it to <paramref name="title"/> and returns the merged string.
    /// </summary>
    private static string? MergeTitleContinuation(List<string> lines, int titleFoundAt, int upperBound, string? title)
    {
        if (title is null || titleFoundAt == -1) return title;

        for (int i = titleFoundAt + 1; i < upperBound && i < lines.Count; i++)
        {
            if (lines[i].Length == 0) continue;
            if (IsTitleContinuation(lines[i]))
                title += " " + lines[i];
            break; // only check the very next non-empty line
        }

        return title;
    }
}
