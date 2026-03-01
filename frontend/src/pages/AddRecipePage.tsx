import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createRecipe } from "../api/client";

type IngredientRow = { name: string; quantity: string };

const STEP_LABELS = ["Title", "Ingredients", "Instructions"] as const;

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-8 px-2">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
              n < step
                ? "bg-spruce-mid border-2 border-olive text-olive-light"
                : n === step
                ? "bg-olive text-spruce-dark"
                : "border-2 border-border text-muted",
            ].join(" ")}
          >
            {n < step ? "✓" : n}
          </div>
          <span
            className={[
              "ml-1 text-[0.6rem] leading-tight",
              n === step ? "text-olive font-semibold" : "text-muted",
            ].join(" ")}
          >
            {STEP_LABELS[n - 1]}
          </span>
          {i < 2 && (
            <div
              className={[
                "flex-1 h-px mx-2",
                n < step ? "bg-olive" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AddRecipePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [touched, setTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: "", quantity: "" },
  ]);
  const [instructions, setInstructions] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      createRecipe({
        title,
        instructions: instructions.trim() || null,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({
            name: i.name.trim(),
            quantity: i.quantity.trim() || null,
            sortOrder: idx,
          })),
      }),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      navigate(`/recipes/${recipe.id}`);
    },
  });

  function updateIngredient(idx: number, field: keyof IngredientRow, value: string) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  }

  function handleNext() {
    if (step === 1) {
      setTouched(true);
      if (!title.trim()) return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  }

  const inputCls =
    "w-full bg-spruce-mid border border-border rounded-lg px-3 py-3 text-text text-base placeholder-muted focus:outline-none focus:border-olive transition-colors";
  const btnPrimary =
    "w-full bg-olive text-spruce-dark font-bold py-3 rounded-xl text-base transition-opacity disabled:opacity-40";
  const btnSecondary =
    "px-4 py-2 border border-border text-muted rounded-lg text-sm transition-colors hover:border-olive hover:text-olive";

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-text mb-6">New Recipe</h1>

      <StepIndicator step={step} />

      {/* ── Step 1: Title ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted text-sm">What's the name of this recipe?</p>
          <input
            className={inputCls}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            placeholder="e.g. Grandma's Apple Pie"
          />
          {touched && !title.trim() && (
            <p className="text-walnut-light text-sm">Please enter a title to continue.</p>
          )}
        </div>
      )}

      {/* ── Step 2: Ingredients ── */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-muted text-sm">Add your ingredients. You can skip this and fill in later.</p>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className={`${inputCls} flex-[2]`}
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  placeholder="Ingredient"
                />
                <input
                  className={`${inputCls} flex-1`}
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                  placeholder="Amount"
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setIngredients((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-walnut-light hover:text-walnut text-xl leading-none shrink-0 w-8 h-8 flex items-center justify-center"
                    aria-label="Remove ingredient"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setIngredients((prev) => [...prev, { name: "", quantity: "" }])
            }
            className="w-full py-2 border border-dashed border-border text-muted rounded-lg text-sm hover:border-olive hover:text-olive transition-colors"
          >
            + Add ingredient
          </button>
        </div>
      )}

      {/* ── Step 3: Instructions ── */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-muted text-sm">Describe how to make it. (Optional)</p>
          <textarea
            className={`${inputCls} resize-none`}
            rows={9}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step 1: Preheat oven to 180°C…"
            autoFocus
          />
          {saveMutation.isError && (
            <p className="text-walnut-light text-sm">Failed to save. Please try again.</p>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className={`mt-6 flex gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
        {step > 1 && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
          >
            ← Back
          </button>
        )}
        {step < 3 ? (
          <button type="button" className={`${btnPrimary} flex-1`} onClick={handleNext}>
            Next →
          </button>
        ) : (
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save Recipe"}
          </button>
        )}
      </div>
    </div>
  );
}
