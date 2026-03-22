namespace RecipeAId.Core.Entities;

public class Recipe
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string? ImagePath { get; set; }
    public string? RawOcrText { get; set; }
    public string? BookTitle { get; set; }
    public int? Servings { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<RecipeIngredient> RecipeIngredients { get; set; } = [];
}
