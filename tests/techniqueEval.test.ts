// SPEC-TECH-001 AC-3, AC-8: on the real release, every spelling of a technique gives one platform set on Home and in
// Browse/Trends; the false positives stay out; and on the evaluation set the technique search never recalls less than
// the earlier search did. Prints the per-query recall and precision.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEval, newSearch, oldSearch, score } from "../scripts/technique-eval";
import { DEFAULT_STATE } from "../src/lib/filterState";
import { matchingPapers, matchingPlatforms, type SearchablePlatform } from "../src/lib/filterApply";
import { searchPlatforms } from "../src/lib/platformFilter";
import { platformTechniques } from "../src/lib/techniqueMatch";
import { readIndex } from "./viewer-data";

const DATA = join(import.meta.dirname, "..", "public", "data");
const available = existsSync(join(DATA, "techniques.json")) && existsSync(join(DATA, "search.json"));

describe.skipIf(!available)("technique search on the real release", () => {
  const { rows, tech, queries } = available ? loadEval() : { rows: [], tech: null, queries: [] };
  const index = available ? readIndex() : null;
  const platforms: SearchablePlatform[] = available
    ? index!.platforms.map((p) => {
        const r = rows.find((x) => x.platform_id === p.platform_id)!;
        return { ...p, module_names: r.module_names, module_refs: r.module_refs, techniques: platformTechniques(tech!, p.platform_id) };
      })
    : [];
  const sorted = (xs: readonly string[]) => [...xs].sort();

  it("never recalls less than the earlier search, and returns no known false positive", () => {
    const lines: string[] = [];
    for (const q of queries) {
      const before = score(q, oldSearch(rows, q.query));
      const after = score(q, newSearch(rows, q.query, tech));
      lines.push(`${q.query.padEnd(22)} recall ${before.recall.toFixed(2)} → ${after.recall.toFixed(2)}, precision ${before.precision?.toFixed(2) ?? "–"} → ${after.precision?.toFixed(2) ?? "–"}`);
      expect(after.recall, q.query).toBeGreaterThanOrEqual(before.recall);
      expect(after.forbidden, q.query).toEqual([]);
    }
    console.log(lines.join("\n"));
  });

  it("gives one platform set for every spelling of a technique, on Home and in Browse/Trends", () => {
    const families = new Map<string, string[]>();
    for (const q of queries) families.set(q.family, [...(families.get(q.family) ?? []), q.query]);
    for (const [family, spellings] of families) {
      if (family === "lc_and_ms") continue;
      const home = spellings.map((s) => sorted(searchPlatforms(platforms, s, tech).map((m) => m.row.platform_id)));
      const browse = spellings.map((s) => sorted(matchingPlatforms({ ...DEFAULT_STATE, view: "platforms", q: s }, index!.papers, platforms, tech).map((l) => l.platform_id)));
      for (let k = 1; k < spellings.length; k++) expect(home[k], `${family}: ${spellings[k]} vs ${spellings[0]}`).toEqual(home[0]);
      expect(browse, family).toEqual(home);
      // A paper matches through any matching platform; its own title may add papers too.
      const papers = new Set(matchingPapers({ ...DEFAULT_STATE, q: spellings[0]! }, index!.papers, platforms, tech).map((p) => p.paper_id));
      for (const id of home[0]!) expect(papers.has(id.split("/")[0]!), `${family}: paper of ${id}`).toBe(true);
    }
  });

  it("matches a quoted spelling as written, without mapping", () => {
    const quoted = searchPlatforms(platforms, '"ReactIR"', tech).map((m) => m.row.platform_id);
    expect(quoted.length).toBeGreaterThan(0);
    expect(quoted.length).toBeLessThan(searchPlatforms(platforms, "ReactIR", tech).length);
    for (const id of quoted) expect(rows.find((r) => r.platform_id === id)!.module_names!.join(" ").toLowerCase()).toContain("reactir");
  });

  it("filters by technique in Browse", () => {
    const ir = sorted(matchingPlatforms({ ...DEFAULT_STATE, view: "platforms", tech: ["ir_spectroscopy"] }, index!.papers, platforms, tech).map((l) => l.platform_id));
    expect(ir).toEqual(sorted(searchPlatforms(platforms, "FTIR", tech).map((m) => m.row.platform_id)));
  });
});
