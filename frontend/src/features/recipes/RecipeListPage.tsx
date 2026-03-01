import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRecipes } from "../../api/client";
import styles from "./RecipeListPage.module.css";

export default function RecipeListPage() {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [bookFilter, setBookFilter] = useState("");

  const { data: recipes, isLoading, isError } = useQuery({
    queryKey: ["recipes", submitted],
    queryFn: () => getRecipes(submitted || undefined),
  });

  const bookOptions = useMemo(
    () =>
      Array.from(
        new Set((recipes ?? []).map((r) => r.bookTitle).filter((b): b is string => !!b))
      ).sort(),
    [recipes]
  );

  const displayed = useMemo(
    () =>
      bookFilter
        ? (recipes ?? []).filter((r) => r.bookTitle === bookFilter)
        : (recipes ?? []),
    [recipes, bookFilter]
  );

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

      {bookOptions.length > 0 && (
        <select
          className={styles.bookFilter}
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
        >
          <option value="">All books</option>
          {bookOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      )}

      {isLoading && <p className={styles.status}>Loading…</p>}
      {isError && <p className={styles.error}>Failed to load recipes.</p>}

      {displayed.length === 0 && !isLoading && (
        <p className={styles.status}>No recipes found{submitted ? ` for "${submitted}"` : ""}.</p>
      )}

      <ul className={styles.list}>
        {displayed.map((recipe) => (
          <li key={recipe.id} className={styles.card}>
            <Link to={`/recipes/${recipe.id}`} className={styles.cardLink}>
              <span className={styles.cardTitle}>{recipe.title}</span>
              {recipe.bookTitle && (
                <span className={styles.bookBadge}>{recipe.bookTitle}</span>
              )}
              <span className={styles.cardMeta}>
                {(recipe.ingredientCount ?? recipe.ingredients.length)} ingredient{(recipe.ingredientCount ?? recipe.ingredients.length) !== 1 ? "s" : ""}
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
