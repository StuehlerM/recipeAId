import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRecipe } from "../../api/client";

type WakeLockState = "active" | "unsupported" | "denied";

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
  };
};

function splitInstructions(instructions: string): string[] {
  const normalized = instructions.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return [];
  }

  const paragraphSteps = normalized
    .split(/\n\s*\n/g)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
  if (paragraphSteps.length > 1) {
    return paragraphSteps;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const numberedSteps: string[] = [];
  for (const line of lines) {
    const match = line.match(/^(?:\d+[\).:-]|[-*•])\s*(.+)$/);
    if (match) {
      numberedSteps.push(match[1].trim());
      continue;
    }

    if (numberedSteps.length > 0) {
      numberedSteps[numberedSteps.length - 1] = `${numberedSteps[numberedSteps.length - 1]} ${line}`.trim();
    }
  }

  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  if (lines.length > 1) {
    return lines;
  }

  return [normalized];
}

function buildFallbackSteps(instructions: string | null, instructionSteps?: string[]): string[] {
  if (instructionSteps && instructionSteps.length > 0) {
    return instructionSteps;
  }

  if (instructions && instructions.trim().length > 0) {
    const splitSteps = splitInstructions(instructions);
    if (splitSteps.length > 0) {
      return splitSteps;
    }
  }

  return ["No detailed instructions were provided for this recipe yet."];
}

export default function CookModePage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wakeLockState, setWakeLockState] = useState<WakeLockState>("unsupported");

  const { data: recipe, isLoading, isError } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => getRecipe(recipeId),
    enabled: !isNaN(recipeId),
  });

  const steps = useMemo(
    () => buildFallbackSteps(recipe?.instructions ?? null, recipe?.instructionSteps),
    [recipe?.instructions, recipe?.instructionSteps]
  );

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [steps.length]);

  useEffect(() => {
    let released = false;
    let wakeLockSentinel: { release: () => Promise<void> } | null = null;

    async function requestWakeLock() {
      const wakeLockApi = (navigator as WakeLockNavigator).wakeLock;
      if (!wakeLockApi) {
        setWakeLockState("unsupported");
        return;
      }

      try {
        wakeLockSentinel = await wakeLockApi.request("screen");
        if (released) {
          await wakeLockSentinel.release();
          return;
        }
        setWakeLockState("active");
      } catch {
        setWakeLockState("denied");
      }
    }

    void requestWakeLock();

    return () => {
      released = true;
      if (wakeLockSentinel) {
        void wakeLockSentinel.release();
      }
    };
  }, []);

  if (isLoading) return <p className="mx-auto my-8 text-center text-ghost">Loading…</p>;
  if (isError || !recipe) return <p className="mx-auto my-8 text-center text-rose-dark">Recipe not found.</p>;

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] ?? steps[0];

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-card px-4 pb-8 pt-4 text-ink">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{recipe.title}</h1>
        <Link
          to={`/recipes/${recipeId}`}
          className="rounded-md border border-edge px-3 py-2 text-sm font-medium text-ghost"
        >
          Exit cook mode
        </Link>
      </div>

      <p className="mb-4 text-sm text-ghost">
        {wakeLockState === "active" && "Screen wake lock is active."}
        {wakeLockState === "unsupported" && "This device/browser does not support wake lock."}
        {wakeLockState === "denied" && "Wake lock could not be enabled. Keep your screen on manually."}
      </p>

      <section className="mb-5 rounded-xl border border-edge bg-tint p-4">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-sage">
          Step {currentStepIndex + 1} of {totalSteps}
        </p>
        <p className="text-xl leading-relaxed">{currentStep}</p>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCurrentStepIndex((stepIndex) => Math.max(0, stepIndex - 1))}
          disabled={currentStepIndex === 0}
          className="min-h-12 rounded-lg border border-edge px-4 py-3 text-base font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous step
        </button>
        <button
          type="button"
          onClick={() => setCurrentStepIndex((stepIndex) => Math.min(totalSteps - 1, stepIndex + 1))}
          disabled={currentStepIndex >= totalSteps - 1}
          className="min-h-12 rounded-lg bg-sage px-4 py-3 text-base font-medium text-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next step
        </button>
      </div>

      <section className="rounded-xl border border-edge p-4">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-sage">Ingredients</h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-ghost">No ingredients listed.</p>
        ) : (
          <ul className="space-y-2">
            {recipe.ingredients
              .slice()
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((ingredient) => (
                <li
                  key={ingredient.ingredientId}
                  className="flex items-start justify-between gap-4 rounded-md bg-tint px-3 py-2"
                >
                  <span className="text-base capitalize">{ingredient.ingredientName}</span>
                  <span className="text-sm text-ghost">
                    {[ingredient.amount, ingredient.unit].filter(Boolean).join(" ")}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
