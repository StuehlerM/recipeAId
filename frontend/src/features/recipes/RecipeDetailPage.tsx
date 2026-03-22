import { useParams, useNavigate, Link } from "react-router-dom";
import { useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getRecipe, deleteRecipe, getRecipeImageUrl } from "../../api/client";
import NutritionPanel from "./NutritionPanel";
import { useServingsScale } from "./useServingsScale";
import { scaleIngredients } from "./scaleIngredients";
import styles from "./RecipeDetailPage.module.css";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const recipeId = Number(id);

  const { data: recipe, isLoading, isError } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => getRecipe(recipeId),
    enabled: !isNaN(recipeId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe deleted.");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to delete recipe. Please try again.");
    },
  });

  const servingsLabelId = useId();
  const { current: displayServings, scale, canScale, isScaled, increment, decrement, reset } =
    useServingsScale(recipe?.servings);

  if (isLoading) return <p className={styles.status}>Loading…</p>;
  if (isError || !recipe) return <p className={styles.error}>Recipe not found.</p>;

  const ingredientsSorted = [...recipe.ingredients].sort((a, b) => a.sortOrder - b.sortOrder);
  const displayedIngredients = scaleIngredients(ingredientsSorted, scale);

  // When display servings differ from base, recompute per-serving nutrition from totals.
  const scaledNutrition =
    recipe.nutritionSummary && isScaled && displayServings && recipe.nutritionSummary !== null
      ? {
          ...recipe.nutritionSummary,
          perServing: {
            proteinGrams: recipe.nutritionSummary.proteinGrams / displayServings,
            carbGrams: recipe.nutritionSummary.carbGrams / displayServings,
            fatGrams: recipe.nutritionSummary.fatGrams / displayServings,
            fiberGrams: recipe.nutritionSummary.fiberGrams / displayServings,
          },
        }
      : recipe.nutritionSummary;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Back to recipes</Link>

      <img
        src={getRecipeImageUrl(recipeId, "title")}
        alt={recipe.title}
        className={styles.recipeImage}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />

      <h1 className={styles.title}>{recipe.title}</h1>
      <p className={styles.meta}>
        Added {new Date(recipe.createdAt).toLocaleDateString()}
        {recipe.bookTitle && <> &middot; <span className={styles.bookBadge}>📖 {recipe.bookTitle}</span></>}
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Ingredients</h2>
          {canScale && displayServings !== null ? (
            <div
              role="group"
              aria-labelledby={servingsLabelId}
              className={styles.stepper}
            >
              <span id={servingsLabelId} className={styles.stepperLabel}>Servings</span>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={decrement}
                disabled={displayServings <= 1}
                aria-label="Decrease servings"
              >
                −
              </button>
              <output
                className={styles.stepperCount}
                aria-live="polite"
                aria-atomic="true"
                aria-label={`${displayServings} servings`}
              >
                {displayServings}
              </output>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={increment}
                disabled={displayServings >= 999}
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
          ) : !canScale && (
            <span className={styles.servingsHint}>
              Add servings to enable scaling
            </span>
          )}
        </div>

        {isScaled && (
          <div role="status" className={styles.scaledBadge}>
            <span>Scaled from {recipe.servings} servings</span>
            <button type="button" onClick={reset} className={styles.scaledReset}>
              Reset
            </button>
          </div>
        )}

        <ul className={styles.ingredients}>
          {displayedIngredients.map((ing) => (
            <li key={ing.ingredientId} className={styles.ingredient}>
              <span className={styles.ingredientName}>{ing.ingredientName}</span>
              {(ing.amount || ing.unit) && (
                <span className={styles.quantity}>
                  {[ing.amount, ing.unit].filter(Boolean).join(" ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {recipe.nutritionSummary !== undefined && (
        <NutritionPanel
          nutrition={scaledNutrition ?? null}
          servings={displayServings ?? recipe.servings}
        />
      )}

      {recipe.instructions && (
        <section className={styles.section}>
          <h2>Instructions</h2>
          <p className={styles.instructions}>{recipe.instructions}</p>
        </section>
      )}

      <button
        className={styles.deleteBtn}
        onClick={() => {
          if (confirm(`Delete "${recipe.title}"?`)) deleteMutation.mutate();
        }}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? "Deleting…" : "Delete recipe"}
      </button>
    </div>
  );
}
