interface StepBookProps {
  bookTitle: string;
  onChange: (value: string) => void;
  bookSuggestions: string[];
  inputCls: string;
}

export default function StepBook({ bookTitle, onChange, bookSuggestions, inputCls }: StepBookProps) {
  return (
    <div className="space-y-4">
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
  );
}
