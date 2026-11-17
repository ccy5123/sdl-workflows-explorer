// SPEC-SITE-001 AC-1, AC-2: release documents (CITATION.cff, DATA_CARD.md) derived into release-docs.json. The
// real-data cases read public/data/ and skip with a message when build-data has not run. The last block compares the
// pinned release with the previous release named in release.config.json.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readCsv } from "../scripts/lib/csv";
import { deriveAll, type Derived } from "../scripts/lib/derive";
import type { IndexJson, ReleaseDocs } from "../src/data/types";
import { tempDir } from "./fixtures/zip";
import {
  PINNED_DOI,
  PINNED_RELEASE_DIR,
  PINNED_VERSION,
  PREVIOUS_RELEASE_DIR,
  PREVIOUS_VERSION,
  previousReleaseAvailable,
} from "./pinned-release";
import { pinnedReleaseExtracted } from "./release-expect";

const MINI = "tests/fixtures/release-mini";
const DATA_DIR = "public/data";

function miniCopy(edit: (dir: string) => void): string {
  const dir = join(tempDir(), "release");
  cpSync(MINI, dir, { recursive: true });
  edit(dir);
  return dir;
}

const editFile = (dir: string, rel: string, f: (s: string) => string) =>
  writeFileSync(join(dir, rel), f(readFileSync(join(dir, rel), "utf8")));

describe("releaseDocs on the fixture release (AC-1)", () => {
  const d = deriveAll(MINI);

  it("carries the parsed citation", () => {
    expect(d.releaseDocs.citation).toEqual({
      title: "mini: a two-paper fixture release",
      version: "1.0.0",
      date_released: "2026-11-01",
      doi: "10.5281/zenodo.1",
      license: "CC-BY-4.0",
      authors: [
        { family: "Tester", given: "Ada Mae", orcid: "https://orcid.org/0000-0000-0000-0001" },
        { family: "Second", given: "Jean-Luc", orcid: null },
      ],
    });
  });

  it("carries CITATION.cff and DATA_CARD.md verbatim", () => {
    expect(d.releaseDocs.citation_cff).toBe(readFileSync(join(MINI, "CITATION.cff"), "utf8"));
    expect(d.releaseDocs.data_card).toBe(readFileSync(join(MINI, "DATA_CARD.md"), "utf8"));
  });

  it("does not copy affiliation or e-mail into the citation fields", () => {
    const fields = JSON.stringify(d.releaseDocs.citation);
    expect(fields).not.toContain("Fixture Lab");
    expect(fields).not.toContain("ada@example.org");
  });
});

describe("bad release documents stop the build (AC-2)", () => {
  it("names a missing CITATION.cff", () => {
    const dir = miniCopy((x) => rmSync(join(x, "CITATION.cff")));
    expect(() => deriveAll(dir)).toThrow(/CITATION\.cff/);
  });

  it("names a missing DATA_CARD.md", () => {
    const dir = miniCopy((x) => rmSync(join(x, "DATA_CARD.md")));
    expect(() => deriveAll(dir)).toThrow(/DATA_CARD\.md/);
  });

  it("names a version that differs from core/release.csv", () => {
    const dir = miniCopy((x) => editFile(x, "CITATION.cff", (s) => s.replace('version: "1.0.0"', 'version: "9.9.9"')));
    expect(() => deriveAll(dir)).toThrow(/CITATION\.cff.*version.*9\.9\.9/);
  });

  it("names a doi that differs from core/release.csv", () => {
    const dir = miniCopy((x) => editFile(x, "CITATION.cff", (s) => s.replace("zenodo.1", "zenodo.2")));
    expect(() => deriveAll(dir)).toThrow(/CITATION\.cff.*doi/);
  });

  it("names an unsupported line", () => {
    const dir = miniCopy((x) => editFile(x, "CITATION.cff", (s) => s.replace("type: dataset", "identifiers:\n  type: doi")));
    expect(() => deriveAll(dir)).toThrow(/CITATION\.cff line 3/);
  });
});

const built = existsSync(join(DATA_DIR, "release-docs.json"));

describe.skipIf(!built)("release-docs.json of the pinned release (AC-1)", () => {
  if (!built) console.warn("release-docs.json absent: run `npm run build-data` for the real-data cases");
  const docs = (built ? JSON.parse(readFileSync(join(DATA_DIR, "release-docs.json"), "utf8")) : null) as ReleaseDocs;
  const index = (built ? JSON.parse(readFileSync(join(DATA_DIR, "index.json"), "utf8")) : null) as IndexJson;

  it("agrees with index.json and starts the data card as released", () => {
    expect(docs.citation.version).toBe(index.release.version);
    expect(docs.citation.version).toBe(PINNED_VERSION);
    expect(docs.citation.doi).toBe(PINNED_DOI);
    expect(docs.citation.doi).toBe(index.release.doi);
    expect(docs.citation.authors[0]!.family).toBe("Joe");
    expect(docs.data_card.startsWith(`# Data card: sdl-workflows ${PINNED_VERSION}`)).toBe(true);
  });

});

// The pinned release against the previous release named in release.config.json (SPEC-RELEASE-001 REQ-003, AC-3):
// both are derived with this code, the rows of the papers the pinned release adds are taken out, and what is left must
// equal the previous release. The only other change allowed is the expected kind a new paper brings: an earlier
// platform joining a platform identity group (its identity_id and shared_with), which each case lists. Fields the
// release recomputes with the added rows (counts, usage counts and examples, item summaries, the excluded split count
// and the exclusion reasons) are checked against the added papers or left to the derive tests. The added papers sit in
// no chrono2023 split, so the benchmark's tasks and reference results stay those of the previous release.
// Skips with a message when the config names no previous release (as when 1.1.0 is pinned) or fetch-release has not
// fetched it.
const comparable = PREVIOUS_VERSION !== null && previousReleaseAvailable() && pinnedReleaseExtracted();
if (PREVIOUS_VERSION === null) console.warn("release-docs.test.ts: release.config.json names no previous release; the release-to-release check skips");
else if (!comparable) {
  console.warn(`release-docs.test.ts: previous release ${PREVIOUS_VERSION} not fetched; run \`npm run fetch-release\` (SDL_PREVIOUS_RELEASE_ZIP=<zip> for a local copy)`);
}

describe.skipIf(!comparable)(`release ${PINNED_VERSION} against the previous release ${PREVIOUS_VERSION}`, () => {
  let cur: Derived;
  let prev: Derived;
  let added: string[];
  let kept: Set<string>;
  /** Earlier platforms whose identity group changed: platform id -> [previous, pinned] identity_id and shared_with. */
  const identityChanges = new Map<string, { from: [string | null, string[]]; to: [string | null, string[]] }>();
  const isKept = (id: string) => kept.has(id.split("/")[0]!);
  const semver = (v: string) => v.split(".").map(Number).reduce((n, x) => n * 1000 + x, 0);

  beforeAll(() => {
    cur = deriveAll(PINNED_RELEASE_DIR);
    prev = deriveAll(PREVIOUS_RELEASE_DIR!);
    const before = new Set(prev.index.papers.map((p) => p.paper_id));
    added = cur.index.papers.map((p) => p.paper_id).filter((id) => !before.has(id));
    kept = before;
    const prevFiles = prev.platformFiles;
    for (const [paper, file] of Object.entries(cur.platformFiles)) {
      if (!kept.has(paper)) continue;
      for (const p of file.platforms) {
        const q = prevFiles[paper]?.platforms.find((x) => x.platform_id === p.platform_id);
        if (q && (p.identity_id !== q.identity_id || JSON.stringify(p.shared_with) !== JSON.stringify(q.shared_with))) {
          identityChanges.set(p.platform_id, { from: [q.identity_id, q.shared_with], to: [p.identity_id, p.shared_with] });
        }
      }
    }
    console.log(
      `release ${PINNED_VERSION} against ${PREVIOUS_VERSION}: ${added.length} added papers (${added.join(", ")}); ` +
        `identity group changes of earlier platforms: ${[...identityChanges].map(([id, c]) => `${id} ${c.from[0]} -> ${c.to[0]} shared with ${c.to[1].join("+")}`).join("; ") || "none"}`,
    );
  });

  /** A clone of a pinned row or platform with an earlier platform's identity put back as the previous release had it. */
  const revertIdentity = <T extends { platform_id: string; identity_id: string | null; shared_with?: string[] }>(p: T): T => {
    const c = identityChanges.get(p.platform_id);
    if (!c) return p;
    const out = { ...p, identity_id: c.from[0] };
    if ("shared_with" in p) out.shared_with = c.from[1];
    return out;
  };

  it("is a later release that keeps every paper of the previous one; the CHANGELOG names the added papers", () => {
    expect(semver(PINNED_VERSION)).toBeGreaterThan(semver(PREVIOUS_VERSION!));
    const now = new Set(cur.index.papers.map((p) => p.paper_id));
    expect([...kept].filter((id) => !now.has(id))).toEqual([]);
    const log = readFileSync(join(PINNED_RELEASE_DIR, "CHANGELOG.md"), "utf8");
    const section = log.slice(log.indexOf(`## ${PINNED_VERSION} `), log.indexOf(`## ${PREVIOUS_VERSION} `));
    expect(section.length).toBeGreaterThan(0);
    for (const id of added) expect(section, id).toContain(id);
  });

  it("changes earlier platforms only by joining an identity group of two or more platforms", () => {
    const members = new Map<string, string[]>();
    for (const l of cur.index.platforms) if (l.identity_id) members.set(l.identity_id, [...(members.get(l.identity_id) ?? []), l.platform_id]);
    for (const [id, c] of identityChanges) {
      const group = members.get(c.to[0]!) ?? [];
      expect(group, id).toContain(id);
      expect(group.length, id).toBeGreaterThan(1);
      // shared_with names the other papers of the group, as the pinned release records it.
      const papers = [...new Set(group.map((g) => g.split("/")[0]!))].filter((p) => p !== id.split("/")[0]).sort();
      expect(c.to[1], id).toEqual(papers);
    }
  });

  it("adds the platform files of the added papers and leaves every earlier file as it was, but for identity groups", () => {
    expect(Object.keys(cur.platformFiles).sort()).toEqual([...Object.keys(prev.platformFiles), ...added].sort());
    for (const [paper, file] of Object.entries(prev.platformFiles)) {
      const now = cur.platformFiles[paper]!;
      expect({ ...now, platforms: now.platforms.map(revertIdentity) }, paper).toEqual(file);
    }
  });

  it("changes index.json only in the release, the counts, the about figures, the added rows and identity groups", () => {
    expect(cur.index.papers.filter((p) => kept.has(p.paper_id))).toEqual(prev.index.papers);
    expect(cur.index.platforms.filter((l) => isKept(l.platform_id)).map(revertIdentity)).toEqual(prev.index.platforms);
    const rows = cur.index.platforms.filter((l) => !isKept(l.platform_id));
    const files = added.flatMap((p) => cur.platformFiles[p]!.platforms);
    const sum = (k: "modules" | "steps" | "connections") => files.reduce((n, p) => n + p[k].length, 0);
    const delta = (k: keyof Derived["index"]["counts"]) => cur.index.counts[k] - prev.index.counts[k];
    expect([delta("papers"), delta("platforms"), delta("modules"), delta("steps"), delta("connections")]).toEqual([
      added.length, rows.length, sum("modules"), sum("steps"), sum("connections"),
    ]);
    expect(delta("candidates")).toBeGreaterThanOrEqual(added.length);
    expect(cur.index.release.version).toBe(PINNED_VERSION);
    expect(prev.index.release.version).toBe(PREVIOUS_VERSION);
    const { version: _v, released_on: _r, doi: _d, ...release } = cur.index.release;
    const { version: _pv, released_on: _pr, doi: _pd, ...prevRelease } = prev.index.release;
    expect(release).toEqual(prevRelease);
  });

  it("puts the rows of the added papers in benchmark-items.json as excluded and leaves the other rows as they were", () => {
    for (const [task, t] of Object.entries(cur.benchmarkItems)) {
      const fresh = t.rows.filter((r) => !isKept(String(r[0])));
      expect(new Set(fresh.map((r) => r[1])), task).toEqual(new Set(fresh.length ? ["excluded"] : []));
      expect({ ...t, rows: t.rows.filter((r) => isKept(String(r[0]))) }, task).toEqual(prev.benchmarkItems[task]);
    }
  });

  it("changes benchmark.json only by the excluded added papers; tasks, split and reference results stay", () => {
    const b = cur.benchmark;
    const p = prev.benchmark;
    const fresh = b.platforms.filter((x) => !isKept(x.platform_id));
    expect(new Set(fresh.map((x) => x.split))).toEqual(new Set(fresh.length ? ["excluded"] : []));
    expect(b.platforms.filter((x) => isKept(x.platform_id))).toEqual(p.platforms);
    expect(b.split_counts).toEqual({ ...p.split_counts, excluded: p.split_counts.excluded + added.length });
    // Every earlier reason keeps its papers; the added papers come under their own reason or an earlier one.
    const reasonOf = new Map(
      readCsv(join(PINNED_RELEASE_DIR, "modes/benchmark/split.csv")).map((r) => [r.paper_id!, r.exclusion_reason ?? ""]),
    );
    const want = new Map(p.exclusion_reasons.map((e) => [e.reason, e.n]));
    for (const id of added) want.set(reasonOf.get(id)!, (want.get(reasonOf.get(id)!) ?? 0) + 1);
    expect(new Map(b.exclusion_reasons.map((e) => [e.reason, e.n]))).toEqual(want);
    const { split_counts: _s, exclusion_reasons: _e, summaries: _m, platforms: _p, ...rest } = b;
    const { split_counts: _ps, exclusion_reasons: _pe, summaries: _pm, platforms: _pp, ...prevRest } = p;
    // benchmark_id, split_rule, tasks, reference_results and their text.
    expect(rest).toEqual(prevRest);
  });

  it("changes taxonomy.json only in the usage counts and examples", () => {
    const strip = (t: Derived["taxonomy"]) => ({
      ...t,
      classes: t.classes.map(({ n_items: _i, n_platforms: _l, n_papers: _p, examples: _x, ...c }) => c),
    });
    expect(strip(cur.taxonomy)).toEqual(strip(prev.taxonomy));
  });

  it("adds the timing data and layouts of the added papers to simulation.json and leaves the rest", () => {
    const s = cur.simulation;
    const q = prev.simulation;
    expect([s.unit_operations, s.module_types, s.transfer_modes]).toEqual([q.unit_operations, q.module_types, q.transfer_modes]);
    for (const k of ["durations", "throughputs", "transfer_times", "platforms"] as const) {
      expect((s[k] as { platform_id: string }[]).filter((x) => isKept(x.platform_id)), k).toEqual(q[k]);
    }
  });
});
