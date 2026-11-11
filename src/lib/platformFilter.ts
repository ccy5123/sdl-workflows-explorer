// Home-page platform search and list filter (REQ-003): case-insensitive match on the platform id, name and paper id,
// and also on the module names stated in the paper, the readable module types and the readable unit operations of the
// steps, so a reader can search by instrument ("FT-IR") or by step ("photo"). Every word of the query must match
// somewhere in the platform. Pure.
import type { PlatformRow } from "../data/types";
import { displayLabel } from "./labels";

/** A platform row as the search reads it; `module_names` come from search.json and may not have loaded yet. */
export type SearchableRow = Pick<PlatformRow, "platform_id" | "paper_id" | "platform_name" | "module_types" | "unit_operations"> & {
  module_names?: readonly string[];
};

/** A matching row and why it matched: null for a match on the name, id or paper, else the module or step that did. */
export interface PlatformMatch<T> {
  row: T;
  reason: string | null;
}

/** Fields searched after the name, id and paper, with the text the reason shows for each. */
function detailFields(r: SearchableRow): { text: string; reason: string }[] {
  return [
    ...(r.module_names ?? []).map((n) => ({ text: n, reason: `Module: ${n}` })),
    ...r.module_types.map((c) => {
      const label = displayLabel("module_type", c);
      return { text: `${label} ${c}`, reason: `Module type: ${label}` };
    }),
    ...r.unit_operations.map((c) => {
      const label = displayLabel("unit_operation", c);
      return { text: `${label} ${c}`, reason: `Step: ${label}` };
    }),
  ];
}

/**
 * Rows matching every word of `query`, those matched on the name, id or paper first, each group in input order. A
 * blank query returns every row with no reason.
 */
export function searchPlatforms<T extends SearchableRow>(rows: readonly T[], query: string): PlatformMatch<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.map((row) => ({ row, reason: null }));
  const words = q.split(/\s+/);
  const direct: PlatformMatch<T>[] = [];
  const detailed: PlatformMatch<T>[] = [];
  for (const row of rows) {
    const head = [row.platform_id, row.paper_id, row.platform_name ?? ""].join(" ").toLowerCase();
    if (head.includes(q)) {
      direct.push({ row, reason: null });
      continue;
    }
    const fields = detailFields(row).map((f) => ({ ...f, lower: f.text.toLowerCase() }));
    const reasons: string[] = [];
    const all = words.every((w) => {
      if (head.includes(w)) return true;
      const f = fields.find((x) => x.lower.includes(w));
      if (f && !reasons.includes(f.reason)) reasons.push(f.reason);
      return !!f;
    });
    if (all) detailed.push({ row, reason: reasons.length > 0 ? reasons.slice(0, 2).join(" · ") : null });
  }
  return [...direct, ...detailed];
}

/** The rows of `searchPlatforms`, without the reasons. */
export function filterPlatforms<T extends SearchableRow>(rows: readonly T[], query: string): T[] {
  return searchPlatforms(rows, query).map((m) => m.row);
}
