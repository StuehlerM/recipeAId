using System.Text;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public sealed class OcrTextSanitizer : IOcrTextSanitizer
{
    public string Sanitize(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return string.Empty;
        }

        var normalized = rawText.ReplaceLineEndings("\n");
        var cleaned = new StringBuilder(normalized.Length);
        int emptyRun = 0;

        foreach (var ch in normalized)
        {
            if (ch == '\n')
            {
                emptyRun++;
                if (emptyRun <= 2)
                {
                    cleaned.Append('\n');
                }
                continue;
            }

            if (char.IsControl(ch) && ch != '\t')
            {
                continue;
            }

            if (char.GetUnicodeCategory(ch) == System.Globalization.UnicodeCategory.Format)
            {
                continue;
            }

            if (ch == '\t')
            {
                cleaned.Append(' ');
            }
            else
            {
                cleaned.Append(ch);
            }

            emptyRun = 0;
        }

        return cleaned.ToString().Trim();
    }
}

