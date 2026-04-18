using System.Text.RegularExpressions;

namespace RecipeAId.Core.DTOs;

public record RecipeDto(
    int Id,
    string Title,
    string? Instructions,
    string? ImagePath,
    string? BookTitle,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<RecipeIngredientDto> Ingredients,
    int? Servings = null,
    NutritionSummaryDto? NutritionSummary = null
)
{
    private static readonly Regex ParagraphBreakPattern = new(
        @"\n\s*\n",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex NumberedOrBulletedStepPattern = new(
        @"^\s*(?:\d+[\).:-]|[-*•])\s*(.+)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public IReadOnlyList<string> InstructionSteps => SplitInstructionSteps(Instructions);

    private static IReadOnlyList<string> SplitInstructionSteps(string? instructions)
    {
        if (string.IsNullOrWhiteSpace(instructions))
        {
            return [];
        }

        var normalized = instructions.Replace("\r\n", "\n").Trim();

        var paragraphSteps = ParagraphBreakPattern
            .Split(normalized)
            .Select(step => step.Trim())
            .Where(step => step.Length > 0)
            .ToList();

        if (paragraphSteps.Count > 1)
        {
            return paragraphSteps;
        }

        var lines = normalized
            .Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        var numberedOrBulletedSteps = new List<string>();
        foreach (var line in lines)
        {
            var match = NumberedOrBulletedStepPattern.Match(line);
            if (match.Success)
            {
                numberedOrBulletedSteps.Add(match.Groups[1].Value.Trim());
                continue;
            }

            if (numberedOrBulletedSteps.Count > 0)
            {
                numberedOrBulletedSteps[^1] = $"{numberedOrBulletedSteps[^1]} {line}".Trim();
            }
        }

        if (numberedOrBulletedSteps.Count > 0)
        {
            return numberedOrBulletedSteps;
        }

        if (lines.Length > 1)
        {
            return lines.ToList();
        }

        return [normalized];
    }
}
