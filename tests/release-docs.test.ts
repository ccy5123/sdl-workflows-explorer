// SPEC-SITE-001 AC-1, AC-2: release documents (CITATION.cff, DATA_CARD.md) derived into release-docs.json. The
// real-data cases read public/data/ and skip with a message when build-data has not run.
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveAll } from "../scripts/lib/derive";
import type { IndexJson, ReleaseDocs } from "../src/data/types";
import { tempDir } from "./fixtures/zip";
import { PINNED_DOI, PINNED_VERSION } from "./pinned-release";

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

  // Release 1.2.0 against the previous release (SPEC-RELEASE-001 REQ-003, AC-3). Each case pins the 1.2.0 file, then
  // reverts the changes the 1.2.0 CHANGELOG names (the rows of the 7 papers it adds, and the identity group I025 that
  // joins Bai2026a/P2 with Pilon2026/P1 to P7) and compares the result with the 1.1.0 file. Those 1.1.0 hashes were
  // computed by deriving release 1.1.0 (SHA-256 673b2dbb…) with this code, which reproduces the 1.1.0 baselines
  // (index.json a452131e…, taxonomy.json 677615d0…, benchmark.json 585ca400…, benchmark-items.json 0f12de15…, platform
  // files b4212f2b…). Fields the release recomputes with the added rows (usage counts and examples, item summaries) are
  // left out of that comparison and pinned by the derive tests; the benchmark's tasks and reference results are kept in
  // it, since 1.2.0 leaves them as in 1.1.0.
  const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const file = (rel: string) => sha(readFileSync(join(DATA_DIR, rel)));
  const json = (rel: string) => JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8")) as Record<string, unknown>;
  // The papers 1.2.0 adds (CHANGELOG 1.2.0).
  const ADDED = ["Agostini2026", "Bai2026a", "Che2026", "Leutner2026", "Pan2026", "Qin2026", "Regnier2026"];
  const isAdded = (id: string) => ADDED.includes(id.split("/")[0]!);
  type Row = { paper_id: string; platform_id?: string; identity_id?: string | null };
  /** Puts a platform of the new group I025 back to its own 1.1.0 identity; returns 1 when it did. */
  const revertIdentity = (p: Row) => {
    if (p.identity_id !== "I025") return 0;
    expect(p.paper_id).toBe("Pilon2026");
    p.identity_id = p.platform_id!;
    return 1;
  };

  it("adds the platform files of the 7 papers and changes Pilon2026 only in the identity group", () => {
    const dir = join(DATA_DIR, "platforms");
    const names = readdirSync(dir).sort();
    expect(names).toHaveLength(244);
    for (const p of ADDED) expect(names).toContain(`${p}.json`);
    expect(sha(Buffer.concat(names.map((n) => readFileSync(join(dir, n)))))).toBe(
      "c9000e02006b546803db5c67931d4dd3ecd46aa3444ca842e78098d1c46cca4b",
    );
    const read = (n: string) => JSON.parse(readFileSync(join(dir, n), "utf8")) as { platforms: (Row & { shared_with: string[] })[] };
    const bai = read("Bai2026a.json").platforms.find((p) => p.platform_id === "Bai2026a/P2")!;
    expect([bai.identity_id, bai.shared_with]).toEqual(["I025", ["Pilon2026"]]);
    const files = names.filter((n) => !isAdded(n.replace(/\.json$/, ""))).map(read);
    let reverted = 0;
    for (const p of files.flatMap((f) => f.platforms)) {
      if (p.identity_id !== "I025") continue;
      expect(p.shared_with).toEqual(["Bai2026a"]);
      p.shared_with = [];
      reverted += revertIdentity(p);
    }
    expect(reverted).toBe(7);
    expect(sha(JSON.stringify(files))).toBe("12be30169bcbcaf6e0031de13499a61aebc06dbc0859bab6dd4808f044e82070");
  });

  it("adds the 7 papers' rows to benchmark-items.json as excluded and leaves the other rows as in 1.1.0", () => {
    expect(file("benchmark-items.json")).toBe("37034f666bbeeebf6f2c4619311af4df417a3269484e08cb8dc5f6c2ffe0e09f");
    const items = json("benchmark-items.json") as Record<string, { rows: (string | number)[][] }>;
    const added: Record<string, number> = {};
    for (const [task, t] of Object.entries(items)) {
      const rows = t.rows.filter((r) => isAdded(String(r[0])));
      expect(new Set(rows.map((r) => r[1]))).toEqual(new Set(["excluded"]));
      added[task] = rows.length;
      t.rows = t.rows.filter((r) => !isAdded(String(r[0])));
    }
    expect(added).toEqual({ "chrono2023-module_type": 68, "chrono2023-transfer_mode": 16 });
    // The 1.1.0 file itself.
    expect(sha(JSON.stringify(items))).toBe("0f12de153f14285d8ac5b7abe8ab2de2f3dd6dce8a8159317f0e5f336994950d");
  });

  it("changes index.json only in the release object, the counts, the added papers and the identity group", () => {
    expect(file("index.json")).toBe("b78de7345ddd2b5c51f4999411e69906c48e1c66e38e32e1e5e9730328b986f1");
    const { release, counts, ...rest } = json("index.json") as { release: unknown; counts: unknown; papers: Row[]; platforms: Row[] };
    expect(rest.papers.filter((r) => isAdded(r.paper_id)).map((r) => r.paper_id)).toEqual(ADDED);
    expect(rest.platforms.filter((r) => isAdded(r.paper_id))).toHaveLength(10);
    rest.papers = rest.papers.filter((r) => !isAdded(r.paper_id));
    rest.platforms = rest.platforms.filter((r) => !isAdded(r.paper_id));
    expect(rest.platforms.reduce((n, r) => n + revertIdentity(r), 0)).toBe(7);
    expect(sha(JSON.stringify(rest))).toBe("bf3ed8a8bb5660660b57f3fe8c6a81fdee999d07918c6a868602cfac26d2b178");
    // 7 papers more, with their 10 platforms, 50 modules, 68 steps and 43 connections (24 of them material), and the
    // 368 candidates of the alerts.
    expect(counts).toEqual({
      papers: 244,
      platforms: 289,
      modules: 1647,
      steps: 2678,
      connections: 1724,
      material_connections: 1098,
      candidates: 2540,
    });
    expect(release).toEqual({
      version: "1.2.0",
      released_on: "2026-11-17",
      doi: "10.5281/zenodo.24088968",
      taxonomy_version: "v1",
      license: "data: CC-BY-4.0; code: MIT",
    });
  });

  it("changes taxonomy.json only in the usage counts and examples", () => {
    expect(file("taxonomy.json")).toBe("603cac0ce1056c2640c0b921734db1627066a6dbe3e4587a61d44f803e79779c");
    const t = json("taxonomy.json") as { classes: Record<string, unknown>[] };
    // Usage counts and examples follow from the added papers; tests/taxonomy-derive.test.ts pins them.
    for (const c of t.classes) for (const k of ["n_items", "n_platforms", "n_papers", "examples"]) delete c[k];
    expect(sha(JSON.stringify(t))).toBe("fb360e05be4e3a38cdf207d29dd08dfbc55b328919052b630544ce09ad02f7c7");
  });

  it("changes benchmark.json only by the 7 excluded papers; tasks, split and reference results stay those of 1.1.0", () => {
    expect(file("benchmark.json")).toBe("f504ef51f4f42ec29b3f195e7e26018de2eafc38522ecb07c43e56cf137909ec");
    const b = json("benchmark.json") as {
      split_counts: Record<string, number>;
      exclusion_reasons: { reason: string; n: number }[];
      platforms: { platform_id: string; split: string }[];
    } & Record<string, unknown>;
    const added = b.platforms.filter((p) => isAdded(p.platform_id));
    expect(added).toHaveLength(10);
    expect(new Set(added.map((p) => p.split))).toEqual(new Set(["excluded"]));
    b.platforms = b.platforms.filter((p) => !isAdded(p.platform_id));
    expect(b.exclusion_reasons.shift()).toEqual({
      reason: "added after release 1.1.0 by the weekly update; the chrono2023 split keeps the 1.1.0 papers",
      n: 7,
    });
    expect(b.split_counts).toEqual({ train: 135, test: 98, excluded: 11 });
    b.split_counts.excluded = 4;
    // The item summaries count the added excluded items; tests/benchmark-derive.test.ts pins them.
    delete b.summaries;
    expect(sha(JSON.stringify(b))).toBe("975e1ac6878a8c44fd027db9f3ecdf09b7e6565e61d87fe9481943fb3522fc7f");
  });
});
