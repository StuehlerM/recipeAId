import OcrCaptureButton from "../../components/OcrCaptureButton";
import IngredientRowInput from "../../components/IngredientRowInput";
import type { RecipeOcrDraftDto } from "../../api/types";
import type { IngredientRow } from "./types";

interface StepIngredientsProps {
  ingredients: IngredientRow[];
  onUpdate: (idx: number, field: keyof IngredientRow, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  replaceConfirm: boolean;
  onConfirmReplace: () => void;
  onDismissReplace: () => void;
  onScan: (draft: RecipeOcrDraftDto) => void;
}

export default function StepIngredients({
  ingredients,
  onUpdate,
  onAdd,
  onRemove,
  replaceConfirm,
  onConfirmReplace,
  onDismissReplace,
  onScan,
}: StepIngredientsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-ghost text-sm">Add ingredients. You can skip and fill in later.</p>
        <OcrCaptureButton onResult={onScan} label="Scan" />
      </div>

      {replaceConfirm && (
        <div className="bg-tint border border-sage rounded-lg p-3 space-y-2">
          <p className="text-ink text-sm">Replace existing ingredients with scanned ones?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmReplace}
              className="px-3 py-1.5 bg-sage text-card rounded-lg text-sm font-medium"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onDismissReplace}
              className="px-3 py-1.5 border border-edge text-ghost rounded-lg text-sm"
            >
              Keep existing
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ingredients.map((ing, idx) => (
          <IngredientRowInput
            key={idx}
            name={ing.name}
            amount={ing.amount}
            unit={ing.unit}
            onChange={(field, value) => onUpdate(idx, field, value)}
            onRemove={() => onRemove(idx)}
            showRemove={ingredients.length > 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="w-full py-2 border border-dashed border-edge text-ghost rounded-lg text-sm hover:border-sage hover:text-sage transition-colors"
      >
        + Add ingredient
      </button>
    </div>
  );
}
