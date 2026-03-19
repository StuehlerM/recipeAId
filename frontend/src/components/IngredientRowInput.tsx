import { inputBase } from "../styles/shared";

const fieldCls = `${inputBase} px-2`;

interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  inputCls?: string;
}

function UnitCombobox({ value, onChange, inputCls }: UnitComboboxProps) {
  return (
    <input
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Unit"
    />
  );
}
interface Props {
  name: string;
  amount: string;
  unit: string;
  onChange: (field: "name" | "amount" | "unit", value: string) => void;
  onRemove: () => void;
  showRemove: boolean;
}

export default function IngredientRowInput({ name, amount, unit, onChange, onRemove, showRemove }: Props) {
  return (
    <div className="flex gap-1.5 items-center">
      <input
        className={`${fieldCls} flex-1 min-w-0`}
        value={name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Ingredient"
      />
      <input
        className={`${fieldCls} w-14 shrink-0`}
        value={amount}
        onChange={(e) => onChange("amount", e.target.value)}
        placeholder="Amt"
      />
      <div className="w-20 shrink-0">
        <UnitCombobox
          value={unit}
          onChange={(v) => onChange("unit", v)}
          inputCls={`${fieldCls} w-full`}
        />
      </div>
      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-rose hover:text-rose-dark text-xl leading-none shrink-0 w-6 h-8 flex items-center justify-center"
          aria-label="Remove ingredient"
        >
          ×
        </button>
      )}
    </div>
  );
}
