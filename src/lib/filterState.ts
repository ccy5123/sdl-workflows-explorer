// Filter state of the browser, its defaults and the offered values (REQ-002, REQ-004, REQ-009). Pure: no UI code.
import type { PaperRow, PlatformRow } from "../data/types";

export type View = "papers" | "platforms";
export type Match = "all" | "any";

/** Applied year range; null on a side means no limit. */
export interface YearRange {
  from: number | null;
  to: number | null;
}

export interface FilterState {
  view: View;
  years: YearRange;
  field: string[];
  im: string[];
  sw: number[];
  hw: number[];
  mt: string[];
  mtMatch: Match;
  tm: string[];
  tmMatch: Match;
  /** Search text as typed; filtering and the URL use it trimmed. */
  q: string;
}

export const DEFAULT_STATE: FilterState = {
  view: "papers",
  years: { from: null, to: null },
  field: [],
  im: [],
  sw: [],
  hw: [],
  mt: [],
  mtMatch: "all",
  tm: [],
  tmMatch: "all",
  q: "",
};

/** Values the checkbox groups offer, as present in index.json. */
export interface Offered {
  field: string[];
  im: string[];
  sw: number[];
  hw: number[];
  mt: string[];
  tm: string[];
}

/** Autonomy category texts of Tom et al. 2024 (release data_dictionary.csv). */
export const SW_LABELS: Record<number, string> = {
  1: "one experiment from a data-driven design",
  2: "closed-loop iteration in which results choose the next experiment",
  3: "closed-loop iteration over an algorithm-generated search space",
};
export const HW_LABELS: Record<number, string> = {
  1: "a device doing one kind of task",
  2: "a workflow joining several tasks",
  3: "a fully automated laboratory running varied experiments without human intervention",
};

export const sortedText = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();
export const sortedNumbers = (xs: Iterable<number>): number[] => [...new Set(xs)].sort((a, b) => a - b);

export function offeredValues(index: {
  papers: readonly Pick<PaperRow, "field_tags" | "integration_mode" | "sw_autonomy" | "hw_autonomy">[];
  platforms: readonly Pick<PlatformRow, "module_types" | "material_transfer_modes">[];
}): Offered {
  const { papers, platforms } = index;
  return {
    field: sortedText(papers.flatMap((p) => p.field_tags)),
    im: sortedText(papers.map((p) => p.integration_mode)),
    sw: sortedNumbers(papers.map((p) => p.sw_autonomy)),
    hw: sortedNumbers(papers.map((p) => p.hw_autonomy)),
    mt: sortedText(platforms.flatMap((l) => l.module_types)),
    tm: sortedText(platforms.flatMap((l) => l.material_transfer_modes)),
  };
}

const YEAR = /^\d{4}$/;

/** Applied year range of the "From" and "To" inputs: non-four-digit text is empty; From after To applies nothing. */
export function yearsFromInputs(from: string, to: string): { years: YearRange; inverted: boolean } {
  const f = YEAR.test(from.trim()) ? Number(from.trim()) : null;
  const t = YEAR.test(to.trim()) ? Number(to.trim()) : null;
  if (f !== null && t !== null && f > t) return { years: { from: null, to: null }, inverted: true };
  return { years: { from: f, to: t }, inverted: false };
}

/** "Clear filters": every filter back to its default; the table shown stays. */
export function clearFilters(state: FilterState): FilterState {
  return { ...DEFAULT_STATE, view: state.view };
}
