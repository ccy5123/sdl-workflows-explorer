// Row predicates of the browser (REQ-005 to REQ-007; SPEC-TAXO-001 REQ-007: unit operations as a third platform-level
// filter). Pure: the trends dashboard reuses them. The text search also reads the module names the papers state
// (search.json), so a reader can search by instrument; rows without them are searched by ids, titles and names only.
import type { PaperRow, PlatformRow } from "../data/types";
import type { FilterState, Match } from "./filterState";

/** A platform row as the browser searches it; `module_names` come from search.json and are absent until it loads. */
export type SearchablePlatform = PlatformRow & { module_names?: readonly string[] };

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

/** The three platform-level filters (module types, transfer modes, unit operations) on one platform. */
const platformLevelOk = (l: PlatformRow, s: FilterState) =>
  setMatch(l.module_types, s.mt, s.mtMatch) &&
  setMatch(l.material_transfer_modes, s.tm, s.tmMatch) &&
  setMatch(l.unit_operations, s.uo, s.uoMatch);

const contains = (text: string | null, q: string) => text !== null && text.toLowerCase().includes(q);

/** True when one of the platform's module names, as the paper states it, contains `q`. */
const moduleHit = (l: SearchablePlatform, q: string) => (l.module_names ?? []).some((n) => n.toLowerCase().includes(q));

// @MX:ANCHOR: [AUTO] filter semantics shared by the browser, the unit tests (AC-4, AC-5) and the step-4 trends dashboard
// @MX:REASON: the counts in acceptance.md AC-5 and expected-counts.mjs encode these exact rules; keep them in step
/**
 * Paper rows passing every active filter; platform-level filters need one platform that passes them all. The search
 * matches the paper id, the title, or a module name of one of the paper's platforms.
 */
export function matchingPapers(state: FilterState, papers: readonly PaperRow[], platforms: readonly SearchablePlatform[]): PaperRow[] {
  const q = state.q.trim().toLowerCase();
  const platformLevel = state.mt.length > 0 || state.tm.length > 0 || state.uo.length > 0;
  const passing = new Set(platformLevel ? platforms.filter((l) => platformLevelOk(l, state)).map((l) => l.paper_id) : []);
  const byModule = new Set(q ? platforms.filter((l) => moduleHit(l, q)).map((l) => l.paper_id) : []);
  return papers.filter(
    (p) =>
      yearOk(p.first_public_year, state) &&
      fieldOk(p.field_tags, state) &&
      paperLevelOk(p, state) &&
      (!platformLevel || passing.has(p.paper_id)) &&
      (!q || contains(p.paper_id, q) || contains(p.title, q) || byModule.has(p.paper_id)),
  );
}

/**
 * Platform rows passing every active filter; paper-level filters are tested on the row of the platform's paper. The
 * search matches the platform id, its name, or one of its module names.
 */
export function matchingPlatforms<T extends SearchablePlatform>(state: FilterState, papers: readonly PaperRow[], platforms: readonly T[]): T[] {
  const q = state.q.trim().toLowerCase();
  const byId = new Map(papers.map((p) => [p.paper_id, p]));
  return platforms.filter((l) => {
    const paper = byId.get(l.paper_id);
    return (
      yearOk(l.first_public_year, state) &&
      fieldOk(l.field_tags, state) &&
      (paper ? paperLevelOk(paper, state) : !paperLevelActive(state)) &&
      platformLevelOk(l, state) &&
      (!q || contains(l.platform_id, q) || contains(l.platform_name, q) || moduleHit(l, q))
    );
  });
}
