// Trends dashboard rules (SPEC-TRENDS-001 REQ-002, REQ-006 to REQ-009, REQ-013, REQ-014): the trends URL, year bins,
// offered split values, link states, count tables and the caption texts. Pure: no UI code, no chart library.
import type { PaperRow, PlatformRow } from "../data/types";
import { matchingPapers, matchingPlatforms } from "./filterApply";
import { HW_LABELS, SW_LABELS, offeredValues, sortedText, type FilterState, type Offered, type View, type YearRange } from "./filterState";
import { decodeFilters, encodeFilters } from "./filterUrl";

/** Category a dashboard splits the counts by; each is also a filter group of the browser. */
export type Split = "im" | "field" | "sw" | "hw" | "mt" | "tm";
export type SplitValue = string | number;

/** Splits in the order of the "Split by" control. */
export const SPLITS: readonly Split[] = ["im", "field", "sw", "hw", "mt", "tm"];
export const SPLIT_LABELS: Record<Split, string> = {
  im: "Integration mode",
  field: "Field tag",
  sw: "SW autonomy",
  hw: "HW autonomy",
  mt: "Module types",
  tm: "Transfer modes",
};
const DEFAULT_SPLIT: Split = "im";

/** Exclusive splits give every row exactly one value and are drawn as stacked bars; the others as a count table. */
export const isExclusive = (split: Split): boolean => split === "im" || split === "sw" || split === "hw";

// ---- URL (REQ-002) ----

/** `encodeFilters(state)`, then `split=<x>` unless the split is im, joined with `&` (empty parts left out). */
export function encodeTrends(state: FilterState, split: Split): string {
  return [encodeFilters(state), split === DEFAULT_SPLIT ? "" : `split=${split}`].filter(Boolean).join("&");
}

/** `#/trends`, plus `?<query>` when the state or the split is not the default. */
export function trendsHash(state: FilterState, split: Split): string {
  const query = encodeTrends(state, split);
  return query ? `#/trends?${query}` : "#/trends";
}

/** Filter state (decodeFilters ignores `split`) and the split of the last `split` occurrence; invalid gives im. */
export function decodeTrends(query: string, offered: Offered): { state: FilterState; split: Split } {
  let raw: string | undefined;
  for (const part of query.split("&")) if (part.startsWith("split=")) raw = part.slice("split=".length);
  const split = SPLITS.find((s) => s === raw) ?? DEFAULT_SPLIT;
  return { state: decodeFilters(query, offered), split };
}

// ---- Bins (REQ-006, REQ-013) ----

/** Search date of release 1.0.0: the year it ran in is a partial year. */
export const RELEASE_SEARCH_DATE = { year: 2026, month: 10, day: 20, text: "20 October 2026" } as const;
export const PARTIAL_YEAR: number = RELEASE_SEARCH_DATE.year;
/** Last year of the grouped bin: before 2015 there are at most three papers per year. */
const GROUP_END = 2014;

/** One column of the x axis and the years its counts cover (a null side means no limit). */
export interface Bin {
  label: string;
  years: YearRange;
}

export const yearLabel = (year: number, partialYear: number): string => (year === partialYear ? `${year}*` : `${year}`);

/** Bins of the applied year range: the grouped bin up to 2014 when it meets the range, then one bin per year. */
export function yearBins(applied: YearRange, earliest: number, latest: number, partialYear: number): Bin[] {
  const lo = applied.from ?? -Infinity;
  const hi = applied.to ?? Infinity;
  const bins: Bin[] = [];
  if (Math.max(earliest, lo) <= Math.min(GROUP_END, hi)) {
    const end = Math.min(applied.to ?? GROUP_END, GROUP_END);
    let label: string;
    if (applied.from === null) label = `before ${(applied.to === null || applied.to >= GROUP_END ? GROUP_END : applied.to) + 1}`;
    else label = applied.from === end ? `${end}` : `${applied.from}–${end}`;
    bins.push({ label, years: { from: applied.from, to: end } });
  }
  for (let year = GROUP_END + 1; year <= latest; year++) {
    if (year >= lo && year <= hi) bins.push({ label: yearLabel(year, partialYear), years: { from: year, to: year } });
  }
  return bins;
}

// ---- Offered values and link states (REQ-007, REQ-008) ----

/** The split group keeps its selection in the link state only for mt and tm in match mode "all". */
const addsToSelection = (split: Split, state: FilterState): boolean =>
  (split === "mt" && state.mtMatch === "all") || (split === "tm" && state.tmMatch === "all");

/** Values a split offers: the selected values in offered order, except for mt/tm in match mode "all". */
export function offeredSplitValues(split: Split, state: FilterState, offered: Offered): SplitValue[] {
  const values: readonly SplitValue[] = offered[split];
  const selected: readonly SplitValue[] = state[split];
  if (selected.length === 0 || addsToSelection(split, state)) return [...values];
  return values.filter((v) => selected.includes(v));
}

// @MX:NOTE: [AUTO] count/link-state rule: every number on the dashboard is the row count of browseHash(linkState(...))
// @MX:SPEC: SPEC-TRENDS-001 REQ-008 — chart and browser agree by construction; expected-counts.mjs re-implements it
/**
 * Filter state whose browser rows a bin total (no value) or a value count counts: the bin's years, and for a value
 * the split group set to [value], or, for mt/tm in match mode "all" with a selection, the selection plus the value.
 */
export function linkState(state: FilterState, bin: Bin, split: Split, value?: SplitValue): FilterState {
  const next: FilterState = { ...state, years: bin.years };
  if (value === undefined) return next;
  if (split === "sw" || split === "hw") return { ...next, [split]: [Number(value)] };
  const text = String(value);
  if (split === "im" || split === "field") return { ...next, [split]: [text] };
  const selected = state[split];
  return { ...next, [split]: selected.length > 0 && addsToSelection(split, state) ? sortedText([...selected, text]) : [text] };
}

interface IndexRows {
  papers: readonly PaperRow[];
  platforms: readonly PlatformRow[];
}

/** Rows of the state's unit that the browser shows for it. */
export function rowCount(state: FilterState, index: IndexRows): number {
  return state.view === "platforms"
    ? matchingPlatforms(state, index.papers, index.platforms).length
    : matchingPapers(state, index.papers, index.platforms).length;
}

export interface CountTable {
  bins: Bin[];
  values: SplitValue[];
  /** Bin totals, one per bin. */
  n: number[];
  /** counts[value][bin]. */
  counts: number[][];
  /** The count line: rows of the unit matching the state. */
  total: number;
}

/** Count table of a split: for each present bin its total n and one count per offered value (REQ-008). */
export function countTable(state: FilterState, split: Split, index: IndexRows, partialYear = PARTIAL_YEAR): CountTable {
  const years = index.papers.map((p) => p.first_public_year);
  const earliest = years.length ? Math.min(...years) : 0;
  const latest = years.length ? Math.max(...years) : -1;
  const bins = yearBins(state.years, earliest, latest, partialYear);
  const values = offeredSplitValues(split, state, offeredValues(index));
  return {
    bins,
    values,
    n: bins.map((b) => rowCount(linkState(state, b, split), index)),
    counts: values.map((v) => bins.map((b) => rowCount(linkState(state, b, split, v), index))),
    total: rowCount(state, index),
  };
}

// ---- Labels and accessible names (REQ-010, REQ-011) ----

/** Value as stored, or "<level> — <category text>" for the autonomy splits. */
export function valueLabel(split: Split, value: SplitValue): string {
  if (split === "sw") return `${value} — ${SW_LABELS[Number(value)] ?? ""}`;
  if (split === "hw") return `${value} — ${HW_LABELS[Number(value)] ?? ""}`;
  return String(value);
}

export const segmentName = (bin: string, value: string, count: number, n: number, unit: View): string =>
  `${bin}, ${value}: ${count} of ${n} ${unit}`;
export const totalName = (bin: string, n: number, unit: View): string => `${bin}: ${n} ${unit}`;

/** Integer y ticks from 0 with a 1-2-5 step, at most five intervals, the last one at or above max. */
export function integerTicks(max: number): number[] {
  if (max <= 1) return [0, 1];
  let step = 1;
  for (let k = 1; Math.ceil(max / step) > 5; k++) step = [1, 2, 5][k % 3]! * 10 ** Math.floor(k / 3);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

// ---- Texts (REQ-004, REQ-013, REQ-014, spec §3) ----

/** Words no caption or note may contain (REQ-014), compared case-insensitively. */
export const BANNED_SUBSTRINGS = [
  "rise", "rose", "rising", "grow", "grew", "growth", "increas", "decreas", "declin",
  "surge", "boom", "drive", "driven", "popular", "dominat", "shift", "trend",
] as const;

const EXCLUSIVE_NAMES: Partial<Record<Split, string>> = { im: "integration mode", sw: "software autonomy", hw: "hardware autonomy" };
const MULTI_NAMES: Partial<Record<Split, [string, string]>> = {
  field: ["field tag", "field tags"],
  mt: ["module type", "module types"],
  tm: ["transfer mode", "transfer modes"],
};

/** Caption above the chart for a split and unit, exactly the text of spec §3. */
export function caption(split: Split, unit: View): string {
  const Unit = unit === "papers" ? "Papers" : "Platforms";
  const one = unit === "papers" ? "paper" : "platform";
  const exclusive = EXCLUSIVE_NAMES[split];
  if (exclusive) {
    return `${Unit} by first public year, split by ${exclusive}. Each bar is the number of ${unit} matching the filters that were first public in that year; n above the bar is the total.`;
  }
  const [name, plural] = MULTI_NAMES[split]!;
  const has =
    split === "field" || unit === "platforms"
      ? `have the ${name}`
      : `have a platform that has the ${name} and meets the module type and transfer mode filters`;
  return `${Unit} by first public year and ${name}. Each cell is the number of ${unit} matching the filters that were first public in that year and ${has}; n is the number of matching ${unit} first public in that year. A ${one} can have several ${plural}, so a column does not add up to n.`;
}

export const emptyMessage = (unit: View): string => `No ${unit} match these filters.`;

export const PLATFORMS_LINE = "Platforms carry the first public year, field tags, integration mode and autonomy of their paper.";

export const partialNote = (): string => `* ${PARTIAL_YEAR} is partial: the search ran on ${RELEASE_SEARCH_DATE.text}.`;

/** Link text inside the sample note; the view links it to the release DOI. */
export const RELEASE_LINK_TEXT = "release files on Zenodo";

export const sampleNote = (papers: number, platforms: number): string =>
  `The counts cover the ${papers} papers (${platforms} platforms) that passed the screening described in the data card (DATA_CARD.md in the ${RELEASE_LINK_TEXT}), not every paper on self-driving laboratories.`;
