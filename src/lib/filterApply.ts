// Row predicates of the browser (REQ-005 to REQ-007; SPEC-TAXO-001 REQ-007: unit operations as a third platform-level
// filter). Pure: the trends dashboard reuses them.
import type { PaperRow, PlatformRow } from "../data/types";
import type { FilterState, Match } from "./filterState";

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

// @MX:ANCHOR: [AUTO] filter semantics shared by the browser, the unit tests (AC-4, AC-5) and the step-4 trends dashboard
// @MX:REASON: the counts in acceptance.md AC-5 and expected-counts.mjs encode these exact rules; keep them in step
/** Paper rows passing every active filter; platform-level filters need one platform that passes them all. */
export function matchingPapers(state: FilterState, papers: readonly PaperRow[], platforms: readonly PlatformRow[]): PaperRow[] {
  const q = state.q.trim().toLowerCase();
  const platformLevel = state.mt.length > 0 || state.tm.length > 0 || state.uo.length > 0;
  const passing = new Set(platformLevel ? platforms.filter((l) => platformLevelOk(l, state)).map((l) => l.paper_id) : []);
  return papers.filter(
    (p) =>
      yearOk(p.first_public_year, state) &&
      fieldOk(p.field_tags, state) &&
      paperLevelOk(p, state) &&
      (!platformLevel || passing.has(p.paper_id)) &&
      (!q || contains(p.paper_id, q) || contains(p.title, q)),
  );
}

/** Platform rows passing every active filter; paper-level filters are tested on the row of the platform's paper. */
export function matchingPlatforms(state: FilterState, papers: readonly PaperRow[], platforms: readonly PlatformRow[]): PlatformRow[] {
  const q = state.q.trim().toLowerCase();
  const byId = new Map(papers.map((p) => [p.paper_id, p]));
  return platforms.filter((l) => {
    const paper = byId.get(l.paper_id);
    return (
      yearOk(l.first_public_year, state) &&
      fieldOk(l.field_tags, state) &&
      (paper ? paperLevelOk(paper, state) : !paperLevelActive(state)) &&
      platformLevelOk(l, state) &&
      (!q || contains(l.platform_id, q) || contains(l.platform_name, q))
    );
  });
}
