// Home-page platform search and list filter (REQ-003; SPEC-TECH-001 REQ-005): the shared technique search over the
// platform id, name and paper id, the module names stated in the paper, the readable module types and the readable unit
// operations of the steps. Every term of the query must match somewhere in the platform; an instrument named in any of
// its spellings ("FTIR", "ReactIR") is found through the technique tags. Pure.
import type { PlatformRow } from "../data/types";
import { displayLabel } from "./labels";
import { reasonText, searchWithTechniques, type ModuleRef, type Reason, type SearchResult, type TechniqueData } from "./techniqueMatch";

/** A platform row as the search reads it; module names and refs come from search.json and may not have loaded yet. */
export type SearchableRow = Pick<PlatformRow, "platform_id" | "paper_id" | "platform_name" | "module_types" | "unit_operations"> & {
  module_names?: readonly string[];
  module_refs?: readonly ModuleRef[];
};

/** A matching row and why it matched: null for a match on the name, id or paper, else the modules or steps that did. */
export interface PlatformMatch<T> {
  row: T;
  reason: string | null;
  reasons: Reason[];
}

/** The full result of the shared search: hits, the technique expansions and the suggestions (SPEC-TECH-001 REQ-006). */
export function searchDetails<T extends SearchableRow>(rows: readonly T[], query: string, tech: TechniqueData | null = null): SearchResult<T> {
  return searchWithTechniques(rows, query, tech, displayLabel);
}

/**
 * Rows matching every term of `query`, those matched on the name, id or paper for the whole query first, each group in
 * input order. A blank query returns every row with no reason.
 */
export function searchPlatforms<T extends SearchableRow>(rows: readonly T[], query: string, tech: TechniqueData | null = null): PlatformMatch<T>[] {
  return searchDetails(rows, query, tech).hits.map((h) => {
    const shown = [...new Set(h.reasons.filter((r) => r.kind !== "field").map(reasonText))];
    return { row: h.row, reasons: h.reasons, reason: shown.length > 0 ? shown.slice(0, 2).join(" · ") : null };
  });
}

/** The rows of `searchPlatforms`, without the reasons. */
export function filterPlatforms<T extends SearchableRow>(rows: readonly T[], query: string, tech: TechniqueData | null = null): T[] {
  return searchPlatforms(rows, query, tech).map((m) => m.row);
}
