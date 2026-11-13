// Row predicates of the browser (REQ-005 to REQ-007; SPEC-TAXO-001 REQ-007: unit operations as a third platform-level
// filter; SPEC-TECH-001 REQ-005, REQ-008: the shared text search and the technique filter). Pure: the trends dashboard
// reuses them. The text search reads the module names the papers state (search.json) and the technique tags
// (techniques.json); rows without them are searched by ids, titles and names only.
import type { PaperRow, PlatformRow } from "../data/types";
import type { FilterState, Match } from "./filterState";
import { displayLabel } from "./labels";
import { searchWithTechniques, type ModuleRef, type SearchRow, type TechniqueData } from "./techniqueMatch";

/**
 * A platform row as the browser searches it; `module_names` and `module_refs` come from search.json and `techniques`
 * from techniques.json, all absent until those files load.
 */
export type SearchablePlatform = PlatformRow & {
  module_names?: readonly string[];
  module_refs?: readonly ModuleRef[];
  techniques?: readonly string[];
};

const setMatch = (have: readonly string[], want: readonly string[], mode: Match) =>
  want.length === 0 || (mode === "any" ? want.some((w) => have.includes(w)) : want.every((w) => have.includes(w)));

const yearOk = (year: number, s: FilterState) =>
  (s.years.from === null || year >= s.years.from) && (s.years.to === null || year <= s.years.to);

const fieldOk = (tags: readonly string[], s: FilterState) => s.field.length === 0 || s.field.some((f) => tags.includes(f));

const paperLevelActive = (s: FilterState) => s.im.length > 0 || s.sw.length > 0 || s.hw.length > 0;

const paperLevelOk = (p: PaperRow, s: FilterState) =>
  (s.im.length === 0 || s.im.includes(p.integration_mode)) &&
  (s.sw.length === 0 || s.sw.includes(p.sw_autonomy)) &&
  (s.hw.length === 0 || s.hw.includes(p.hw_autonomy));

/**
 * The platform-level filters (module types, transfer modes, unit operations, techniques) on one platform. The technique
 * filter is not applied while the platform's techniques have not loaded (SPEC-TECH-001 REQ-008).
 */
const platformLevelOk = (l: SearchablePlatform, s: FilterState) =>
  setMatch(l.module_types, s.mt, s.mtMatch) &&
  setMatch(l.material_transfer_modes, s.tm, s.tmMatch) &&
  setMatch(l.unit_operations, s.uo, s.uoMatch) &&
  (l.techniques === undefined || setMatch(l.techniques, s.tech, s.techMatch));

const platformLevelActive = (s: FilterState) => s.mt.length > 0 || s.tm.length > 0 || s.uo.length > 0 || s.tech.length > 0;

/** Platform ids matching the text search (SPEC-TECH-001 REQ-005). */
const textHits = (q: string, rows: readonly SearchRow[], tech: TechniqueData | null) =>
  new Set(searchWithTechniques(rows, q, tech, displayLabel).hits.map((h) => h.row.platform_id));

// @MX:ANCHOR: [AUTO] filter semantics shared by the browser, the unit tests (AC-4, AC-5) and the step-4 trends dashboard
// @MX:REASON: the counts in acceptance.md AC-5 and expected-counts.mjs encode these exact rules; keep them in step
/**
 * Paper rows passing every active filter; platform-level filters need one platform that passes them all. The search
 * matches a paper when its id and title match the query, or when one of its platforms matches it.
 */
export function matchingPapers(
  state: FilterState,
  papers: readonly PaperRow[],
  platforms: readonly SearchablePlatform[],
  tech: TechniqueData | null = null,
): PaperRow[] {
  const q = state.q.trim();
  const platformLevel = platformLevelActive(state);
  const passing = new Set(platformLevel ? platforms.filter((l) => platformLevelOk(l, state)).map((l) => l.paper_id) : []);
  let byText: Set<string> | null = null;
  if (q) {
    const paperOf = new Map(platforms.map((l) => [l.platform_id, l.paper_id]));
    const viaPlatform = [...textHits(q, platforms, tech)].map((id) => paperOf.get(id)!);
    const own = textHits(
      q,
      papers.map((p) => ({ platform_id: p.paper_id, paper_id: p.paper_id, platform_name: p.title, module_types: [], unit_operations: [] })),
      null,
    );
    byText = new Set([...viaPlatform, ...own]);
  }
  return papers.filter(
    (p) =>
      yearOk(p.first_public_year, state) &&
      fieldOk(p.field_tags, state) &&
      paperLevelOk(p, state) &&
      (!platformLevel || passing.has(p.paper_id)) &&
      (byText === null || byText.has(p.paper_id)),
  );
}

/**
 * Platform rows passing every active filter; paper-level filters are tested on the row of the platform's paper. The
 * search is the shared technique search over the platform (SPEC-TECH-001 REQ-005).
 */
export function matchingPlatforms<T extends SearchablePlatform>(
  state: FilterState,
  papers: readonly PaperRow[],
  platforms: readonly T[],
  tech: TechniqueData | null = null,
): T[] {
  const q = state.q.trim();
  const byId = new Map(papers.map((p) => [p.paper_id, p]));
  const byText = q ? textHits(q, platforms, tech) : null;
  return platforms.filter((l) => {
    const paper = byId.get(l.paper_id);
    return (
      yearOk(l.first_public_year, state) &&
      fieldOk(l.field_tags, state) &&
      (paper ? paperLevelOk(paper, state) : !paperLevelActive(state)) &&
      platformLevelOk(l, state) &&
      (byText === null || byText.has(l.platform_id))
    );
  });
}
