import OcrCaptureButton from "../../components/OcrCaptureButton";
import type { RecipeOcrDraftDto } from "../../api/types";

interface StepInstructionsProps {
  instructions: string;
  onChange: (value: string) => void;
  onScan: (draft: RecipeOcrDraftDto) => void;
  isSaveError: boolean;
  inputCls: string;
}

export default function StepInstructions({ instructions, onChange, onScan, isSaveError, inputCls }: StepInstructionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-ghost text-sm">Describe how to make it. (Optional)</p>
        <OcrCaptureButton onResult={onScan} label="Scan" />
      </div>
      <textarea
        className={`${inputCls} resize-none`}
        rows={9}
        value={instructions}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Step 1: Preheat oven to 180°C…"
        autoFocus
      />
      {isSaveError && (
        <p className="text-rose text-sm">Failed to save. Please try again.</p>
      )}
    </div>
  );
}
