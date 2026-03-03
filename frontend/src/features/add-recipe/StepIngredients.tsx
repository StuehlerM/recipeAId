import OcrCaptureButton from "../../components/OcrCaptureButton";
import UnitCombobox from "./UnitCombobox";
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
  inputBase: string;
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
  inputBase,
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
          <div key={idx} className="flex gap-1.5 items-center">
            <input
              className={`${inputBase} px-2 flex-1 min-w-0`}
              value={ing.name}
              onChange={(e) => onUpdate(idx, "name", e.target.value)}
              placeholder="Ingredient"
            />
            <input
              className={`${inputBase} px-2 w-14 shrink-0`}
              value={ing.amount}
              onChange={(e) => onUpdate(idx, "amount", e.target.value)}
              placeholder="Amt"
            />
            <div className="w-20 shrink-0">
              <UnitCombobox
                value={ing.unit}
                onChange={(v) => onUpdate(idx, "unit", v)}
                inputCls={`${inputBase} px-2 w-full`}
              />
            </div>
            {ingredients.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-rose hover:text-rose-dark text-xl leading-none shrink-0 w-6 h-8 flex items-center justify-center"
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
        onClick={onAdd}
        className="w-full py-2 border border-dashed border-edge text-ghost rounded-lg text-sm hover:border-sage hover:text-sage transition-colors"
      >
        + Add ingredient
      </button>
    </div>
  );
}
