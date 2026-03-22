import { inputCls } from "../../styles/shared";

interface StepBookProps {
  bookTitle: string;
  onChange: (value: string) => void;
  bookSuggestions: string[];
  servings: string;
  onServingsChange: (value: string) => void;
}

export default function StepBook({
  bookTitle,
  onChange,
  bookSuggestions,
  servings,
  onServingsChange,
}: StepBookProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-ghost text-sm">Which cookbook or source is this from? (Optional)</p>
        <input
          className={inputCls}
          list="book-suggestions"
          autoFocus
          value={bookTitle}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Ottolenghi Simple"
        />
        {bookSuggestions.length > 0 && (
          <datalist id="book-suggestions">
            {bookSuggestions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-ghost text-sm" htmlFor="recipe-servings">
          Base servings (optional)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="recipe-servings"
            type="number"
            min="1"
            max="999"
            step="1"
            inputMode="numeric"
            className={`${inputCls} w-24`}
            value={servings}
            onChange={(e) => onServingsChange(e.target.value)}
            placeholder="e.g. 4"
          />
          <span className="text-ghost text-sm">portions</span>
        </div>
      </div>
    </div>
  );
}
