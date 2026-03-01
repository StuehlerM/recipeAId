import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRecipe, deleteRecipe } from "../../api/client";
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
      navigate("/");
    },
  });

  if (isLoading) return <p className={styles.status}>Loading…</p>;
  if (isError || !recipe) return <p className={styles.error}>Recipe not found.</p>;

  const ingredientsSorted = [...recipe.ingredients].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Back to recipes</Link>

      <h1 className={styles.title}>{recipe.title}</h1>
      <p className={styles.meta}>
        Added {new Date(recipe.createdAt).toLocaleDateString()}
        {recipe.bookTitle && <> &middot; <span className={styles.bookBadge}>📖 {recipe.bookTitle}</span></>}
      </p>

      <section className={styles.section}>
        <h2>Ingredients</h2>
        <ul className={styles.ingredients}>
          {ingredientsSorted.map((ing) => (
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
