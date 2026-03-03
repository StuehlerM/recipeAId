const STEP_LABELS = ["Title", "Ingredients", "Instructions", "Book"] as const;
const STEPS: Step[] = [1, 2, 3, 4];
const LAST_STEP_INDEX = STEPS.length - 1;

export type Step = 1 | 2 | 3 | 4;

interface StepIndicatorProps {
  step: Step;
  onStepClick?: (step: Step) => void;
}

export default function StepIndicator({ step, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-8 px-2">
      {STEPS.map((stepNumber, index) => {
        const isClickable = onStepClick && stepNumber <= step;

        return (
          <div key={stepNumber} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNumber)}
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                stepNumber < step
                  ? "bg-tint border-2 border-sage text-sage"
                  : stepNumber === step
                  ? "bg-sage text-card"
                  : "border-2 border-edge text-ghost",
                isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
              ].join(" ")}
            >
              {stepNumber < step ? "✓" : stepNumber}
            </button>
            <span
              className={[
                "ml-1 text-[0.6rem] leading-tight",
                stepNumber === step ? "text-sage font-semibold" : "text-ghost",
              ].join(" ")}
            >
              {STEP_LABELS[stepNumber - 1]}
            </span>
            {index < LAST_STEP_INDEX && (
              <div
                className={[
                  "flex-1 h-px mx-2",
                  stepNumber < step ? "bg-sage" : "bg-edge",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
