// Step order, highlight set and the selection reducer (REQ-012, REQ-013, REQ-014).
import type { Step } from "../data/types";

export function sortSteps(steps: readonly Step[]): Step[] {
  return [...steps].sort((a, b) => a.step_order - b.step_order);
}

/** Module ids to highlight in the graph when a step is selected. */
export function highlightSet(step: Step): Set<string> {
  return new Set(step.modules);
}

export type SelectionKind = "module" | "connection" | "step" | "platform";
export type Selection = { kind: SelectionKind; id: string } | null;
export type SelectionAction = { type: "select"; selection: NonNullable<Selection> } | { type: "clear" };

/** Selecting the item already selected clears the selection; Escape dispatches "clear". */
export function selectionReducer(state: Selection, action: SelectionAction): Selection {
  if (action.type === "clear") return null;
  const next = action.selection;
  if (state && state.kind === next.kind && state.id === next.id) return null;
  return next;
}
