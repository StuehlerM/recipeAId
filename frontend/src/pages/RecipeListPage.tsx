import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRecipes } from "../api/client";
import styles from "./RecipeListPage.module.css";

export default function RecipeListPage() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: recipes, isLoading, isError } = useQuery({
    queryKey: ["recipes", submitted],
    queryFn: () => getRecipes(submitted || undefined),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(search.trim());
  }

  return (
    <div className={styles.page}>
      <h1>Recipes</h1>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value === "") setSubmitted("");
          }}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchBtn}>Search</button>
      </form>

      {isLoading && <p className={styles.status}>Loading…</p>}
      {isError && <p className={styles.error}>Failed to load recipes.</p>}

      {recipes && recipes.length === 0 && (
        <p className={styles.status}>No recipes found{submitted ? ` for "${submitted}"` : ""}.</p>
      )}

      <ul className={styles.list}>
        {recipes?.map((recipe) => (
          <li key={recipe.id} className={styles.card}>
            <Link to={`/recipes/${recipe.id}`} className={styles.cardLink}>
              <span className={styles.cardTitle}>{recipe.title}</span>
              <span className={styles.cardMeta}>
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                &ensp;·&ensp;
                {new Date(recipe.createdAt).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
