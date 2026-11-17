// What the pages should show for the pinned release, for the e2e specs: totals and filter results computed afresh from
// the extracted release's CSV files by tests/release-expect.ts (rules written again from the specs, no code shared
// with src/lib), so pinning a new release needs no edit to the specs. Needs `npm run fetch-release` first, as the
// e2e build does.
import { expectedRelease, type Filter } from "../tests/release-expect";

export { expectedBenchmark, expectedDurations, expectedTaxonomyUse, uoLabel, total, type Filter } from "../tests/release-expect";

export const R = expectedRelease();
/** Papers and platforms of the pinned release. */
export const PAPERS = R.papers.length;
export const PLATFORMS = R.platforms.length;

/** A count line of the browser and the dashboards, "n of N papers". */
export const papersOf = (f: Filter = {}): string => `${R.countPapers(f)} of ${PAPERS} papers`;
/** "n of N platforms". */
export const platformsOf = (f: Filter = {}): string => `${R.countPlatforms(f)} of ${PLATFORMS} platforms`;
/** The latest first public year among the platforms (the first row of the Home list, newest first). */
export const LATEST_YEAR = Math.max(...R.platforms.map((l) => l.year));

/** Figures of the about summary, counted from the release tables (the page fills them in from index.json). */
export const ABOUT = (() => {
  const count = (rel: string, ok: (r: Record<string, string>) => boolean) => R.csv(rel).filter(ok).length;
  const timing = R.csv("modes/simulation/step_timing.csv");
  const values = R.csv("modes/simulation/process_values.csv");
  return {
    decisionsModel: count("modes/trends/screening.csv", (r) => r.decided_by === "model"),
    stepDurations: timing.filter((r) => r.quantity === "duration").length,
    papersWithTiming: new Set([...timing, ...values].map((r) => r.platform_id!.split("/")[0])).size,
    humanQuantified: count("modes/trends/human_intervention.csv", (r) => r.category === "quantified"),
    humanNotReported: count("modes/trends/human_intervention.csv", (r) => r.category === "not_reported"),
    /** Candidates after the 2172 of the searches of 20 October 2026 came from the Google Scholar alerts. */
    alertCandidates: count("core/candidate.csv", (r) => Number(r.cand_id!.slice(1)) > 2172),
  };
})();

/** The Home search count, "n of N platforms match". */
export const platformsMatch = (q: string): string => `${R.countPlatforms({ q })} of ${PLATFORMS} platforms match`;
