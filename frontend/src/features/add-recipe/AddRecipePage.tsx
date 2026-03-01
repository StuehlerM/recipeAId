import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createRecipe, getRecipes } from "../../api/client";
import OcrCaptureButton from "../../components/OcrCaptureButton";
import type { RecipeOcrDraftDto } from "../../api/types";
import StepIndicator from "./StepIndicator";
import type { Step } from "./StepIndicator";
import UnitCombobox from "./UnitCombobox";

type IngredientRow = { name: string; amount: string; unit: string };

export default function AddRecipePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [touched, setTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ name: "", amount: "", unit: "" }]);
  const [instructions, setInstructions] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<RecipeOcrDraftDto | null>(null);

  // Load existing recipes for book autocomplete
  const { data: existingRecipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => getRecipes(),
  });
  const bookSuggestions = Array.from(
    new Set(
      (existingRecipes ?? [])
        .map((r) => r.bookTitle)
        .filter((b): b is string => !!b)
    )
  ).sort();

  const saveMutation = useMutation({
    mutationFn: () =>
      createRecipe({
        title,
        instructions: instructions.trim() || null,
        bookTitle: bookTitle.trim() || null,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({
            name: i.name.trim(),
            amount: i.amount.trim() || null,
            unit: i.unit.trim() || null,
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
    setStep((s) => Math.min(s + 1, 4) as Step);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1) as Step);
  }

  // OCR handlers
  function handleTitleScan(draft: RecipeOcrDraftDto) {
    if (draft.detectedTitle) setTitle(draft.detectedTitle);
  }

  function mapIngredients(draft: RecipeOcrDraftDto) {
    if (draft.detectedIngredients.length > 0) {
      return draft.detectedIngredients.map((i) => ({
        name: i.name,
        amount: i.amount ?? "",
        unit: i.unit ?? "",
      }));
    }
    // Fallback: split raw OCR text into one ingredient per line
    return draft.rawOcrText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => ({ name: l, amount: "", unit: "" }));
  }

  function handleIngredientScan(draft: RecipeOcrDraftDto) {
    const hasRows = ingredients.some((r) => r.name.trim());
    const mapped = mapIngredients(draft);
    if (mapped.length === 0) return;
    if (!hasRows) {
      setIngredients(mapped);
    } else {
      setPendingDraft(draft);
      setReplaceConfirm(true);
    }
  }

  function confirmReplace() {
    if (!pendingDraft) return;
    const mapped = mapIngredients(pendingDraft);
    setIngredients(mapped.length > 0 ? mapped : [{ name: "", amount: "", unit: "" }]);
    setPendingDraft(null);
    setReplaceConfirm(false);
  }

  function handleInstructionScan(draft: RecipeOcrDraftDto) {
    // Use parsed instructions, or fall back to raw OCR text
    const text = draft.detectedInstructions ?? draft.rawOcrText;
    if (text) setInstructions(text);
  }

  const inputBase =
    "bg-spruce-mid border border-border rounded-lg py-3 text-text text-base placeholder-muted focus:outline-none focus:border-olive transition-colors";
  const inputCls = `w-full ${inputBase} px-3`;
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
          <div className="flex items-center justify-between">
            <p className="text-muted text-sm">What's the name of this recipe?</p>
            <OcrCaptureButton onResult={handleTitleScan} label="Scan" />
          </div>
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
          <div className="flex items-center justify-between">
            <p className="text-muted text-sm">Add ingredients. You can skip and fill in later.</p>
            <OcrCaptureButton onResult={handleIngredientScan} label="Scan" />
          </div>

          {replaceConfirm && (
            <div className="bg-spruce-mid border border-olive rounded-lg p-3 space-y-2">
              <p className="text-text text-sm">Replace existing ingredients with scanned ones?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmReplace}
                  className="px-3 py-1.5 bg-olive text-spruce-dark rounded-lg text-sm font-medium"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => { setReplaceConfirm(false); setPendingDraft(null); }}
                  className="px-3 py-1.5 border border-border text-muted rounded-lg text-sm"
                >
                  Keep existing
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <input
                  className={`${inputBase} px-2 flex-1 min-w-0`}
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  placeholder="Ingredient"
                />
                <input
                  className={`${inputBase} px-2 w-14 shrink-0`}
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                  placeholder="Amt"
                />
                <div className="w-20 shrink-0">
                  <UnitCombobox
                    value={ing.unit}
                    onChange={(v) => updateIngredient(idx, "unit", v)}
                    inputCls={`${inputBase} px-2 w-full`}
                  />
                </div>
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-walnut-light hover:text-walnut text-xl leading-none shrink-0 w-6 h-8 flex items-center justify-center"
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
            onClick={() => setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }])}
            className="w-full py-2 border border-dashed border-border text-muted rounded-lg text-sm hover:border-olive hover:text-olive transition-colors"
          >
            + Add ingredient
          </button>
        </div>
      )}

      {/* ── Step 3: Instructions ── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted text-sm">Describe how to make it. (Optional)</p>
            <OcrCaptureButton onResult={handleInstructionScan} label="Scan" />
          </div>
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

      {/* ── Step 4: Book ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-muted text-sm">Which cookbook or source is this from? (Optional)</p>
          <input
            className={inputCls}
            list="book-suggestions"
            autoFocus
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="e.g. Ottolenghi Simple"
          />
          {bookSuggestions.length > 0 && (
            <datalist id="book-suggestions">
              {bookSuggestions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          )}
          {saveMutation.isError && (
            <p className="text-walnut-light text-sm">Failed to save. Please try again.</p>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className={`mt-6 flex gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
        {step > 1 && (
          <button type="button" className={btnSecondary} onClick={handleBack}>
            ← Back
          </button>
        )}
        {step < 4 ? (
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
