namespace RecipeAId.Core.Entities;

public class RecipeIngredient
{
    public string Name { get; set; } = string.Empty;
    public string? Amount { get; set; }
    public string? Unit { get; set; }
    public int SortOrder { get; set; }
}
