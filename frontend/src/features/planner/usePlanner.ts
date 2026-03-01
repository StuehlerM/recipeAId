import { useState } from "react";

const KEY = "recipeaid_planner_v1";

function load(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Number.isInteger);
    return [];
  } catch {
    return [];
  }
}

function save(ids: number[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    console.warn("recipeaid: could not persist planner to localStorage");
  }
}

export function usePlanner() {
  const [planIds, setPlanIds] = useState<number[]>(load);

  function addToPlan(id: number) {
    setPlanIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      save(next);
      return next;
    });
  }

  function removeFromPlan(id: number) {
    setPlanIds((prev) => {
      const next = prev.filter((x) => x !== id);
      save(next);
      return next;
    });
  }

  function clearPlan() {
    save([]);
    setPlanIds([]);
  }

  return { planIds, addToPlan, removeFromPlan, clearPlan };
}
