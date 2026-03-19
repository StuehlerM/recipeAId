import OcrCaptureButton from "../../components/OcrCaptureButton";
import type { RecipeOcrDraftDto } from "../../api/types";
import { inputCls } from "../../styles/shared";

interface StepInstructionsProps {
  instructions: string;
  onChange: (value: string) => void;
  onScan: (draft: RecipeOcrDraftDto) => void;
}

export default function StepInstructions({ instructions, onChange, onScan }: StepInstructionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-ghost text-sm">Describe how to make it. (Optional)</p>
        <OcrCaptureButton onResult={onScan} label="Scan" refine={false} />
      </div>
      <textarea
        className={`${inputCls} resize-none`}
        rows={9}
        value={instructions}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Step 1: Preheat oven to 180°C…"
        autoFocus
      />
    </div>
  );
}
