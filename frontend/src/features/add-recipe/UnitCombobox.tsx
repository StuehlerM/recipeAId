import { useId } from "react";

const UNIT_SUGGESTIONS = [
  "g", "kg", "ml", "l", "cup", "cups", "tbsp", "tsp",
  "oz", "lb", "pcs", "pinch", "to taste", "handful", "cloves", "slices",
];

export default function UnitCombobox({
  value,
  onChange,
  inputCls,
}: {
  value: string;
  onChange: (v: string) => void;
  inputCls: string;
}) {
  const datalistId = `unit-list-${useId()}`;
  return (
    <>
      <input
        className={inputCls}
        list={datalistId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Unit"
      />
      <datalist id={datalistId}>
        {UNIT_SUGGESTIONS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
    </>
  );
}
