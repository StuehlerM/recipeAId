import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createRecipe, getRecipes } from "../../api/client";
import type { RecipeOcrDraftDto } from "../../api/types";
import StepIndicator from "./StepIndicator";
import type { Step } from "./StepIndicator";
import StepTitle from "./StepTitle";
import StepIngredients from "./StepIngredients";
import StepInstructions from "./StepInstructions";
import StepBook from "./StepBook";
import type { IngredientRow } from "./types";

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
  const [imageKeys, setImageKeys] = useState<Record<string, string>>({});

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
        imageKeys: Object.keys(imageKeys).length > 0 ? imageKeys : undefined,
      }),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe saved!");
      navigate(`/recipes/${recipe.id}`);
    },
    onError: () => {
      toast.error("Failed to save recipe. Please try again.");
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

  function handleStepClick(target: Step) {
    if (target > step) return;
    setStep(target);
  }

  function handleTitleScan(draft: RecipeOcrDraftDto) {
    if (draft.detectedTitle) setTitle(draft.detectedTitle);
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, title: draft.imageKey! }));
  }

  function mapIngredients(draft: RecipeOcrDraftDto) {
    if (draft.detectedIngredients.length > 0) {
      return draft.detectedIngredients.map((i) => ({
        name: i.name,
        amount: i.amount ?? "",
        unit: i.unit ?? "",
      }));
    }
    return draft.rawOcrText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => ({ name: l, amount: "", unit: "" }));
  }

  function handleIngredientScan(draft: RecipeOcrDraftDto) {
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, ingredients: draft.imageKey! }));
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
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, instructions: draft.imageKey! }));
    const text = draft.detectedInstructions ?? draft.rawOcrText;
    if (text) setInstructions(text);
  }

  const inputBase =
    "bg-card border border-edge rounded-lg py-3 text-ink text-base placeholder-ghost focus:outline-none focus:border-sage transition-colors";
  const inputCls = `w-full ${inputBase} px-3`;
  const btnPrimary =
    "w-full bg-sage text-card font-bold py-3 rounded-xl text-base transition-opacity disabled:opacity-40";
  const btnSecondary =
    "px-4 py-2 border border-edge text-ghost rounded-lg text-sm transition-colors hover:border-sage hover:text-sage";

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-ink mb-6">New Recipe</h1>

      <StepIndicator step={step} onStepClick={handleStepClick} />

      {step === 1 && (
        <StepTitle
          title={title}
          onChange={setTitle}
          onNext={handleNext}
          touched={touched}
          onScan={handleTitleScan}
          inputCls={inputCls}
        />
      )}

      {step === 2 && (
        <StepIngredients
          ingredients={ingredients}
          onUpdate={updateIngredient}
          onAdd={() => setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }])}
          onRemove={(idx) => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
          replaceConfirm={replaceConfirm}
          onConfirmReplace={confirmReplace}
          onDismissReplace={() => { setReplaceConfirm(false); setPendingDraft(null); }}
          onScan={handleIngredientScan}
          inputBase={inputBase}
        />
      )}

      {step === 3 && (
        <StepInstructions
          instructions={instructions}
          onChange={setInstructions}
          onScan={handleInstructionScan}
          inputCls={inputCls}
        />
      )}

      {step === 4 && (
        <StepBook
          bookTitle={bookTitle}
          onChange={setBookTitle}
          bookSuggestions={bookSuggestions}
          inputCls={inputCls}
        />
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
