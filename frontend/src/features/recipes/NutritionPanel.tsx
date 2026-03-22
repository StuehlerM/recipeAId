import { useState, useId } from "react";
import type { NutritionSummaryDto, MacroSetDto } from "../../api/types";
import styles from "./NutritionPanel.module.css";

interface Props {
  /** null → render the "unavailable" state; omit the component entirely when undefined */
  nutrition: NutritionSummaryDto | null;
  /** Servings count from the recipe — used for "Serves N" disclaimer note */
  servings?: number | null;
}

const MACROS: { key: keyof MacroSetDto; label: string; cssVar: string }[] = [
  { key: "proteinGrams", label: "Protein", cssVar: "var(--color-sage)" },
  { key: "carbGrams",    label: "Carbs",   cssVar: "var(--color-amber)" },
  { key: "fatGrams",     label: "Fat",     cssVar: "var(--color-rose)" },
  { key: "fiberGrams",   label: "Fiber",   cssVar: "var(--color-ghost)" },
];

export default function NutritionPanel({ nutrition, servings }: Props) {
  const headingId = useId();
  const hasPerServing = !!nutrition?.perServing;
  const [view, setView] = useState<"total" | "serving">("total");

  const activeData: MacroSetDto | null =
    nutrition === null
      ? null
      : view === "serving" && nutrition.perServing
        ? nutrition.perServing
        : nutrition;

  const totalGrams = activeData
    ? MACROS.reduce((sum, m) => sum + activeData[m.key], 0)
    : 0;

  const servingNote = servings != null ? ` · Serves ${servings}` : "";

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>Nutrition</h2>

        {hasPerServing && (
          <div className={styles.toggle} role="group" aria-label="Nutrition view">
            <button
              type="button"
              className={`${styles.toggleBtn} ${view === "total" ? styles.toggleActive : ""}`}
              onClick={() => setView("total")}
              aria-pressed={view === "total"}
            >
              Total
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${view === "serving" ? styles.toggleActive : ""}`}
              onClick={() => setView("serving")}
              aria-pressed={view === "serving"}
            >
              Per serving
            </button>
          </div>
        )}
      </div>

      <p className={styles.disclaimer}>
        Estimated values{servingNote} · may not reflect actual nutrition
      </p>

      {activeData === null ? (
        <p className={styles.unavailable}>
          Nutrition estimates unavailable for this recipe.
        </p>
      ) : (
        <>
          <dl className={styles.macros} aria-live="polite" aria-atomic="true">
            {MACROS.map(({ key, label, cssVar }) => {
              const grams = activeData[key];
              const pct = totalGrams > 0 ? (grams / totalGrams) * 100 : 0;
              return (
                <div key={key} className={styles.macroRow}>
                  <dt className={styles.macroLabel}>{label}</dt>
                  <div className={styles.macroTrack} aria-hidden="true">
                    <div
                      className={styles.macroFill}
                      style={{ width: `${pct}%`, background: cssVar }}
                    />
                  </div>
                  <dd className={styles.macroValue}>{Math.round(grams)}g</dd>
                </div>
              );
            })}
          </dl>

          {/* Attribution only shown when real data is present */}
          <p className={styles.attribution}>
            <a
              href="https://world.openfoodfacts.org"
              rel="external noopener noreferrer"
              className={styles.attributionLink}
            >
              Data from Open Food Facts
            </a>
          </p>
        </>
      )}
    </section>
  );
}
