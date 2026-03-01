namespace RecipeAId.Core.Entities;

public class RecipeIngredient
{
    public int RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;

    public int IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;

    public string? Amount { get; set; }
    public string? Unit { get; set; }
    public int SortOrder { get; set; }
}
