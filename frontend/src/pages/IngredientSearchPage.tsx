import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { searchRecipesByIngredients, getIngredients } from "../api/client";
import styles from "./IngredientSearchPage.module.css";

export default function IngredientSearchPage() {
  const [chips, setChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allIngredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: getIngredients,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["ingredientSearch", submitted],
    queryFn: () => searchRecipesByIngredients(submitted),
    enabled: submitted.length > 0,
  });

  const suggestions = inputValue.trim()
    ? allIngredients
        .map((i) => i.name)
        .filter(
          (name) =>
            name.includes(inputValue.toLowerCase().trim()) &&
            !chips.includes(name)
        )
        .slice(0, 6)
    : [];

  function addChip(name: string) {
    const normalized = name.toLowerCase().trim();
    if (normalized && !chips.includes(normalized)) {
      setChips((prev) => [...prev, normalized]);
    }
    setInputValue("");
    inputRef.current?.focus();
  }

  function removeChip(name: string) {
    setChips((prev) => prev.filter((c) => c !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addChip(inputValue.trim());
    }
    if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      setChips((prev) => prev.slice(0, -1));
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) addChip(inputValue.trim());
    setSubmitted([...chips, ...(inputValue.trim() ? [inputValue.trim()] : [])]);
  }

  return (
    <div className={styles.page}>
      <h1>Search by Ingredients</h1>
      <p className={styles.hint}>Type an ingredient and press Enter or comma to add it.</p>

      <form className={styles.form} onSubmit={handleSearch}>
        <div className={styles.chipBox} onClick={() => inputRef.current?.focus()}>
          {chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className={styles.chipInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chips.length === 0 ? "e.g. garlic, lemon…" : ""}
          />
        </div>

        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((s) => (
              <li key={s} className={styles.suggestion} onMouseDown={() => addChip(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}

        <button type="submit" className={styles.searchBtn} disabled={chips.length === 0 && !inputValue.trim()}>
          Find Recipes
        </button>
      </form>

      {isLoading && <p className={styles.status}>Searching…</p>}

      {results && results.length === 0 && submitted.length > 0 && (
        <p className={styles.status}>No recipes match those ingredients.</p>
      )}

      {results && results.length > 0 && (
        <ul className={styles.results}>
          {results.map(({ recipe, matchCount, matchRatio }) => (
            <li key={recipe.id} className={styles.card}>
              <Link to={`/recipes/${recipe.id}`} className={styles.cardLink}>
                <span className={styles.cardTitle}>{recipe.title}</span>
                <span className={styles.matchBadge}>
                  {matchCount}/{submitted.length} matched &ensp;({Math.round(matchRatio * 100)}%)
                </span>
                <ul className={styles.matchedList}>
                  {recipe.ingredients
                    .filter((i) => submitted.includes(i.ingredientName.toLowerCase()))
                    .map((i) => (
                      <li key={i.ingredientId} className={styles.matchedChip}>
                        {i.ingredientName}
                      </li>
                    ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
