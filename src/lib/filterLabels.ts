// Groups, option labels and active-filter pills of the filter bar (SPEC-UI-001 REQ-025). Options show readable names
// with the vocabulary code beside them (REQ-007); the autonomy levels keep their texts. Pure: no UI code.
import { displayLabel } from "./labels";
import { HW_LABELS, SW_LABELS, type FilterState } from "./filterState";

export type ListKey = "field" | "im" | "sw" | "hw" | "mt" | "tm" | "uo";
export type MatchKey = "mtMatch" | "tmMatch" | "uoMatch";

export interface FilterGroup {
  key: ListKey;
  legend: string;
  /** Vocabulary kind for displayLabel; null for the numbered autonomy levels. */
  kind: string | null;
  /** The all/any control that belongs to the group. */
  match?: MatchKey;
}

/** The popover groups, in the order of the bar. Integration mode values are transfer modes, "mixed" or "none". */
export const FILTER_GROUPS: readonly FilterGroup[] = [
  { key: "field", legend: "Field tag", kind: "field_tag" },
  { key: "im", legend: "Integration mode", kind: "transfer_mode" },
  { key: "sw", legend: "Software autonomy", kind: null },
  { key: "hw", legend: "Hardware autonomy", kind: null },
  { key: "mt", legend: "Module types", kind: "module_type", match: "mtMatch" },
  { key: "tm", legend: "Transfer modes", kind: "transfer_mode", match: "tmMatch" },
  { key: "uo", legend: "Unit operations", kind: "unit_operation", match: "uoMatch" },
];

const groupOf = (key: ListKey) => FILTER_GROUPS.find((g) => g.key === key)!;

/** Name shown for an option, and its code (null for the autonomy levels, which have no code). */
export function optionLabel(key: ListKey, value: string | number): { name: string; code: string | null } {
  if (key === "sw") return { name: `${value} — ${SW_LABELS[Number(value)] ?? ""}`, code: null };
  if (key === "hw") return { name: `${value} — ${HW_LABELS[Number(value)] ?? ""}`, code: null };
  const code = String(value);
  return { name: displayLabel(groupOf(key).kind!, code), code };
}

export interface FilterPill {
  id: string;
  text: string;
  removeLabel: string;
  remove: (state: FilterState) => FilterState;
}

function yearsText(from: number | null, to: number | null): string {
  if (from !== null && to !== null) return `${from}–${to}`;
  return from !== null ? `from ${from}` : `to ${to}`;
}

/** One pill per active filter: the year range, each selected value in group order, then the search. */
export function filterPills(state: FilterState): FilterPill[] {
  const pills: FilterPill[] = [];
  const { from, to } = state.years;
  if (from !== null || to !== null) {
    const text = yearsText(from, to);
    pills.push({ id: "years", text, removeLabel: `Remove Year: ${text}`, remove: (s) => ({ ...s, years: { from: null, to: null } }) });
  }
  for (const group of FILTER_GROUPS) {
    const values = state[group.key] as (string | number)[];
    for (const value of values) {
      const short = group.kind ? optionLabel(group.key, value).name : String(value);
      pills.push({
        id: `${group.key}:${value}`,
        text: group.kind ? short : `${group.legend} ${value}`,
        removeLabel: `Remove ${group.legend}: ${short}`,
        remove: (s) => ({ ...s, [group.key]: (s[group.key] as (string | number)[]).filter((v) => v !== value) }),
      });
    }
  }
  const q = state.q.trim();
  if (q) pills.push({ id: "q", text: `“${q}”`, removeLabel: `Remove search: ${q}`, remove: (s) => ({ ...s, q: "" }) });
  return pills;
}
