import OcrCaptureButton from "../../components/OcrCaptureButton";
import type { RecipeOcrDraftDto } from "../../api/types";
import { inputCls } from "../../styles/shared";

interface StepTitleProps {
  title: string;
  onChange: (value: string) => void;
  onNext: () => void;
  touched: boolean;
  onScan: (draft: RecipeOcrDraftDto) => void;
}

export default function StepTitle({ title, onChange, onNext, touched, onScan }: StepTitleProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-ghost text-sm">What's the name of this recipe?</p>
        <OcrCaptureButton onResult={onScan} label="Scan" refine={false} />
      </div>
      <input
        className={inputCls}
        autoFocus
        value={title}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onNext()}
        placeholder="e.g. Grandma's Apple Pie"
      />
      {touched && !title.trim() && (
        <p className="text-rose text-sm">Please enter a title to continue.</p>
      )}
    </div>
  );
}
