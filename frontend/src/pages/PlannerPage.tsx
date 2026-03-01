import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRecipes, getRecipe } from "../api/client";
import { usePlanner } from "../hooks/usePlanner";
import { aggregateIngredients } from "../utils/quantityAggregator";
import type { RecipeDto } from "../api/types";

export default function PlannerPage() {
  const [search, setSearch] = useState("");
  const { planIds, addToPlan, removeFromPlan, clearPlan } = usePlanner();

  const { data: allRecipes = [], isLoading } = useQuery({
    queryKey: ["recipes", search],
    queryFn: () => getRecipes(search || undefined),
  });

  const plannedQueries = useQueries({
    queries: planIds.map((id) => ({
      queryKey: ["recipe", id] as const,
      queryFn: () => getRecipe(id),
      enabled: planIds.length > 0,
    })),
  });

  const plannedRecipes = plannedQueries
    .map((q) => q.data)
    .filter((r): r is RecipeDto => r !== undefined);

  const shoppingList = aggregateIngredients(plannedRecipes);

  const inputCls =
    "w-full bg-spruce-mid border border-border rounded-lg px-3 py-3 text-text text-base placeholder-muted focus:outline-none focus:border-olive transition-colors";

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-bold text-text">Weekly Planner</h1>

      {/* ── Recipe Browser ── */}
      <section className="bg-spruce rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-olive">
          Browse Recipes
        </h2>
        <input
          className={inputCls}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes…"
        />
        <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-1">
          {isLoading && (
            <p className="text-muted text-sm py-2">Loading…</p>
          )}
          {!isLoading && allRecipes.length === 0 && (
            <p className="text-muted text-sm py-2">No recipes found.</p>
          )}
          {allRecipes.map((recipe) => {
            const inPlan = planIds.includes(recipe.id);
            return (
              <div
                key={recipe.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="text-text text-sm flex-1 mr-2 leading-snug hover:text-olive transition-colors"
                >
                  {recipe.title}
                </Link>
                <button
                  type="button"
                  onClick={() => addToPlan(recipe.id)}
                  disabled={inPlan}
                  className={[
                    "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all",
                    inPlan
                      ? "border-border text-muted opacity-40 cursor-not-allowed"
                      : "border-olive text-olive hover:bg-olive hover:text-spruce-dark",
                  ].join(" ")}
                >
                  {inPlan ? "Added" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── This Week's Plan ── */}
      <section className="bg-spruce rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-olive">
            This Week
            {planIds.length > 0 && (
              <span className="ml-2 bg-spruce-mid text-olive-light rounded-full px-2 py-0.5 text-[0.6rem] font-normal">
                {planIds.length}
              </span>
            )}
          </h2>
          {planIds.length > 0 && (
            <button
              type="button"
              onClick={clearPlan}
              className="text-walnut-light text-xs border border-walnut rounded-md px-2 py-1 hover:bg-walnut hover:text-text transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {planIds.length === 0 ? (
          <p className="text-muted text-sm py-1">
            No recipes added yet. Browse above and tap "+ Add".
          </p>
        ) : (
          <ul className="space-y-1.5">
            {plannedRecipes.map((recipe) => (
              <li
                key={recipe.id}
                className="flex items-center justify-between bg-spruce-mid rounded-lg px-3 py-2"
              >
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="text-text text-sm flex-1 mr-2 leading-snug hover:text-olive transition-colors"
                >
                  {recipe.title}
                </Link>
                <button
                  type="button"
                  onClick={() => removeFromPlan(recipe.id)}
                  className="text-muted hover:text-walnut-light text-xl leading-none w-7 h-7 flex items-center justify-center shrink-0 transition-colors"
                  aria-label={`Remove ${recipe.title} from plan`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Shopping List ── */}
      {planIds.length > 0 && (
        <section className="bg-spruce rounded-xl border border-border p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-olive">
            Shopping List
          </h2>
          {shoppingList.length === 0 ? (
            <p className="text-muted text-sm">No ingredients found in selected recipes.</p>
          ) : (
            <ul className="space-y-1.5">
              {shoppingList.map(({ name, quantity }) => (
                <li
                  key={name}
                  className="flex items-baseline justify-between bg-spruce-mid rounded-lg px-3 py-2"
                >
                  <span className="text-text text-sm capitalize">{name}</span>
                  {quantity && (
                    <span className="text-muted text-xs ml-3 shrink-0">{quantity}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
