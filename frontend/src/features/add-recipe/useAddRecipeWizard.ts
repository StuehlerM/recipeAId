import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createRecipe, getRecipes } from "../../api/client";
import type { RecipeOcrDraftDto } from "../../api/types";
import type { Step } from "./StepIndicator";
import type { IngredientRow } from "./types";

export function mapIngredients(draft: RecipeOcrDraftDto): IngredientRow[] {
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

const EMPTY_ROW: IngredientRow = { name: "", amount: "", unit: "" };

export function useAddRecipeWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [touched, setTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ ...EMPTY_ROW }]);
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

  function addIngredient() {
    setIngredients((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
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
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, title: draft.imageKey }));
  }

  function handleIngredientScan(draft: RecipeOcrDraftDto) {
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, ingredients: draft.imageKey }));
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
    setIngredients(mapped.length > 0 ? mapped : [{ ...EMPTY_ROW }]);
    setPendingDraft(null);
    setReplaceConfirm(false);
  }

  function handleDismissReplace() {
    setReplaceConfirm(false);
    setPendingDraft(null);
  }

  function handleInstructionScan(draft: RecipeOcrDraftDto) {
    if (draft.imageKey) setImageKeys((prev) => ({ ...prev, instructions: draft.imageKey }));
    const text = draft.detectedInstructions ?? draft.rawOcrText;
    if (text) setInstructions(text);
  }

  return {
    step,
    touched,
    title,
    setTitle,
    ingredients,
    instructions,
    setInstructions,
    bookTitle,
    setBookTitle,
    replaceConfirm,
    bookSuggestions,
    saveMutation,
    updateIngredient,
    addIngredient,
    removeIngredient,
    handleNext,
    handleBack,
    handleStepClick,
    handleTitleScan,
    handleIngredientScan,
    confirmReplace,
    handleDismissReplace,
    handleInstructionScan,
  };
}
