const STEP_LABELS = ["Title", "Ingredients", "Instructions", "Book"] as const;
const STEPS: Step[] = [1, 2, 3, 4];
const LAST_STEP_INDEX = STEPS.length - 1;

export type Step = 1 | 2 | 3 | 4;

export default function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center mb-8 px-2">
      {STEPS.map((stepNumber, index) => (
        <div key={stepNumber} className="flex items-center flex-1 last:flex-none">
          <div
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
              stepNumber < step
                ? "bg-spruce-mid border-2 border-olive text-olive-light"
                : stepNumber === step
                ? "bg-olive text-spruce-dark"
                : "border-2 border-border text-muted",
            ].join(" ")}
          >
            {stepNumber < step ? "✓" : stepNumber}
          </div>
          <span
            className={[
              "ml-1 text-[0.6rem] leading-tight",
              stepNumber === step ? "text-olive font-semibold" : "text-muted",
            ].join(" ")}
          >
            {STEP_LABELS[stepNumber - 1]}
          </span>
          {index < LAST_STEP_INDEX && (
            <div
              className={[
                "flex-1 h-px mx-2",
                stepNumber < step ? "bg-olive" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}
