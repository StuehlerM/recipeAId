import StepIndicator from "./StepIndicator";
import StepTitle from "./StepTitle";
import StepIngredients from "./StepIngredients";
import StepInstructions from "./StepInstructions";
import StepBook from "./StepBook";
import { btnPrimary, btnSecondary } from "../../styles/shared";
import { useAddRecipeWizard } from "./useAddRecipeWizard";

export default function AddRecipePage() {
  const {
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
  } = useAddRecipeWizard();

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-ink mb-6">New Recipe</h1>

      <StepIndicator step={step} onStepClick={handleStepClick} />

      {step === 1 && (
        <StepTitle title={title} onChange={setTitle} onNext={handleNext} touched={touched} onScan={handleTitleScan} />
      )}
      {step === 2 && (
        <StepIngredients
          ingredients={ingredients}
          onUpdate={updateIngredient}
          onAdd={addIngredient}
          onRemove={removeIngredient}
          replaceConfirm={replaceConfirm}
          onConfirmReplace={confirmReplace}
          onDismissReplace={handleDismissReplace}
          onScan={handleIngredientScan}
        />
      )}
      {step === 3 && (
        <StepInstructions instructions={instructions} onChange={setInstructions} onScan={handleInstructionScan} />
      )}
      {step === 4 && (
        <StepBook bookTitle={bookTitle} onChange={setBookTitle} bookSuggestions={bookSuggestions} />
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
