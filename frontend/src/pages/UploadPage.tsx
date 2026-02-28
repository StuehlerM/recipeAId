import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { uploadRecipeImage, createRecipe } from "../api/client";
import type { RecipeOcrDraftDto } from "../api/types";
import styles from "./UploadPage.module.css";

type DraftIngredient = { name: string; quantity: string };

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<RecipeOcrDraftDto | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const ocrMutation = useMutation({
    mutationFn: (file: File) => uploadRecipeImage(file),
    onSuccess: (data) => {
      setDraft(data);
      setTitle(data.detectedTitle ?? "");
      setInstructions(data.detectedInstructions ?? "");
      setIngredients(data.detectedIngredients.map((i) => ({ name: i.name, quantity: i.quantity ?? "" })));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      createRecipe({
        title,
        instructions: instructions || null,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({ name: i.name.trim(), quantity: i.quantity.trim() || null, sortOrder: idx })),
      }),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      navigate(`/recipes/${recipe.id}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setDraft(null);
    ocrMutation.mutate(file);
  }

  function updateIngredient(idx: number, field: keyof DraftIngredient, value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }]);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  const isProcessing = ocrMutation.isPending;
  const hasDraft = draft !== null;

  return (
    <div className={styles.page}>
      <h1>Add Recipe</h1>

      {/* ── Step 1: Upload ── */}
      <section className={styles.section}>
        <h2>1. Upload photo</h2>
        <p className={styles.hint}>
          Take a photo of a recipe card or select an image file. OCR will pre-fill the form.
        </p>

        <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
          {previewUrl ? (
            <img src={previewUrl} alt="Recipe preview" className={styles.preview} />
          ) : (
            <span className={styles.uploadPlaceholder}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              <span>Tap to take photo or choose file</span>
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.fileInput}
          onChange={handleFileChange}
        />

        {isProcessing && (
          <p className={styles.processing}>Reading recipe with OCR… please wait.</p>
        )}
        {ocrMutation.isError && (
          <p className={styles.error}>OCR failed. Please try another image or fill in manually below.</p>
        )}
      </section>

      {/* ── Step 2: Review & Edit ── */}
      {(hasDraft || ocrMutation.isError) && (
        <section className={styles.section}>
          <h2>2. Review &amp; edit</h2>

          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recipe title"
          />

          <label className={styles.label}>Ingredients</label>
          <div className={styles.ingredientList}>
            {ingredients.map((ing, idx) => (
              <div key={idx} className={styles.ingredientRow}>
                <input
                  className={styles.input}
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  placeholder="Ingredient name"
                />
                <input
                  className={`${styles.input} ${styles.quantityInput}`}
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
                  placeholder="Quantity"
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeIngredient(idx)}
                  aria-label="Remove ingredient"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={addIngredient}>
              + Add ingredient
            </button>
          </div>

          <label className={styles.label}>Instructions</label>
          <textarea
            className={styles.textarea}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Cooking instructions…"
            rows={8}
          />

          <button
            className={styles.saveBtn}
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save Recipe"}
          </button>
          {saveMutation.isError && (
            <p className={styles.error}>Failed to save. Please try again.</p>
          )}
        </section>
      )}

      {/* Allow manual entry without a photo */}
      {!hasDraft && !isProcessing && !previewUrl && (
        <button
          className={styles.manualBtn}
          onClick={() => {
            setDraft({ detectedTitle: "", detectedInstructions: null, detectedIngredients: [], rawOcrText: "", imagePath: null });
            setTitle("");
            setInstructions("");
            setIngredients([{ name: "", quantity: "" }]);
          }}
        >
          Enter recipe manually instead
        </button>
      )}
    </div>
  );
}
