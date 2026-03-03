interface StepBookProps {
  bookTitle: string;
  onChange: (value: string) => void;
  bookSuggestions: string[];
  isSaveError: boolean;
  inputCls: string;
}

export default function StepBook({ bookTitle, onChange, bookSuggestions, isSaveError, inputCls }: StepBookProps) {
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
      {isSaveError && (
        <p className="text-rose text-sm">Failed to save. Please try again.</p>
      )}
    </div>
  );
}
