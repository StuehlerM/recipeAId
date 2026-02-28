namespace RecipeAId.Core.Interfaces;

// Seam for future LLM-based recipe suggestion (not implemented in Phase 1).
// Implement this when adding AI-powered suggestions beyond database search.
public interface IRecipeSuggestionService
{
    Task<string> SuggestRecipeAsync(IEnumerable<string> availableIngredients, CancellationToken ct = default);
}
