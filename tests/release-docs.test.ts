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

  // Release 1.1.0 against the previous release (SPEC-RELEASE-001 REQ-003, AC-3). Each case pins the 1.1.0 file, then
  // reverts the changes the 1.1.0 CHANGELOG names and compares the result with the previous release's file without the
  // rows of Snapp2023, the paper 1.1.0 removes. Those previous-release hashes were computed from the 1.0.0 build
  // (SPEC-RELEASE-001 progress.md §E.2). Fields the release recomputes after the removal (usage counts and examples,
  // split counts, item summaries, reference results) are left out of that comparison and pinned by the derive tests.
  const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const file = (rel: string) => sha(readFileSync(join(DATA_DIR, rel)));
  const json = (rel: string) => JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8")) as Record<string, unknown>;
  // The seven papers whose paper.doi moved from the preprint to the published version, with their 1.0.0 DOI.
  const PREPRINT_DOI: Record<string, string> = {
    Christensen2021: "10.26434/chemrxiv.13146404.v1",
    Emery2024: "10.48550/arxiv.2407.06051",
    Ginsburg2023: "10.48550/arxiv.2310.00510",
    Sheng2023: "10.26434/chemrxiv-2023-psqxj",
    Tamasi2022: "10.26434/chemrxiv-2022-x2qdz",
    Vescovi2023: "10.48550/arxiv.2308.09793",
    Zhang2023: "10.26434/chemrxiv-2023-dlkgl",
  };
  type Row = { paper_id: string; doi?: string; first_public_year?: number };
  const revertPaper = (r: Row) => {
    if (r.paper_id in PREPRINT_DOI && "doi" in r) {
      expect(r.doi, r.paper_id).not.toBe(PREPRINT_DOI[r.paper_id]);
      r.doi = PREPRINT_DOI[r.paper_id];
    }
    if (r.paper_id === "Snapp2024") {
      expect(r.first_public_year).toBe(2023);
      r.first_public_year = 2024;
    }
  };

  it("removes Snapp2023 from the platform files and changes only the named values", () => {
    const dir = join(DATA_DIR, "platforms");
    const names = readdirSync(dir).sort();
    expect(names).toHaveLength(237);
    expect(names).not.toContain("Snapp2023.json");
    expect(sha(Buffer.concat(names.map((n) => readFileSync(join(dir, n)))))).toBe(
      "b4212f2b4b91640dbdfeb66b0d69d8c944e0f2836a9e8f321d1f3829e50d841e",
    );
    const files = names.map((n) => JSON.parse(readFileSync(join(dir, n), "utf8")) as { platforms: (Row & { identity_id: string | null; shared_with: string[] })[] });
    for (const p of files.flatMap((f) => f.platforms)) {
      revertPaper(p);
      // Snapp2023's platform shared identity I010 with these three.
      if (p.identity_id === "I010") p.shared_with = [...p.shared_with, "Snapp2023"].sort();
    }
    expect(sha(JSON.stringify(files))).toBe("8935ce45100043f6c370c7313465e7426d20eae36d926e5ba9779b928e04d0de");
  });

  it("removes Snapp2023's rows from benchmark-items.json and moves Snapp2024 to the training split", () => {
    expect(file("benchmark-items.json")).toBe("0f12de153f14285d8ac5b7abe8ab2de2f3dd6dce8a8159317f0e5f336994950d");
    const items = json("benchmark-items.json") as Record<string, { rows: (string | number)[][] }>;
    let moved = 0;
    for (const task of Object.values(items)) {
      expect(task.rows.some((r) => String(r[0]).startsWith("Snapp2023/"))).toBe(false);
      for (const row of task.rows) {
        if (String(row[0]).startsWith("Snapp2024/")) {
          expect(row[1]).toBe("train");
          row[1] = "test";
          moved++;
        }
      }
    }
    expect(moved).toBe(12);
    expect(sha(JSON.stringify(items))).toBe("9b4d87abc1209fd3045af9faaf60949550e77debda6e46dbf484ac5632527d55");
  });

  it("changes index.json only in the release object, the counts and the named papers", () => {
    expect(file("index.json")).toBe("a452131e2fc31e3b8c39dd4aa42c00dbd910712ac2034f0f89b1d19adbca8174");
    const { release, counts, ...rest } = json("index.json") as { release: unknown; counts: unknown; papers: Row[]; platforms: Row[] };
    expect(rest.papers.some((r) => r.paper_id === "Snapp2023")).toBe(false);
    expect(rest.platforms.some((r) => r.paper_id === "Snapp2023")).toBe(false);
    for (const r of [...rest.papers, ...rest.platforms]) revertPaper(r);
    expect(sha(JSON.stringify(rest))).toBe("20dc3a0d475520d6bb274750d6132be76a604e7af6549fd5726cbda3c3dd5a7a");
    // One paper less, with its platform's 6 modules, 11 steps and 6 connections (2 of them material).
    expect(counts).toEqual({
      papers: 237,
      platforms: 279,
      modules: 1597,
      steps: 2610,
      connections: 1681,
      material_connections: 1074,
      candidates: 2172,
    });
    expect(release).toEqual({
      version: "1.1.0",
      released_on: "2026-11-02",
      doi: "10.5281/zenodo.23875743",
      taxonomy_version: "v1",
      license: "data: CC-BY-4.0; code: MIT",
    });
  });

  it("changes taxonomy.json only in the Gottstein2026 page locators, the Leong2022 reference and the usage counts", () => {
    expect(file("taxonomy.json")).toBe("677615d0272c7a7dd8c297ccf482c0d4ba743dbb9748bdc1bd6766ba98e7ab47");
    const t = json("taxonomy.json") as {
      classes: ({ correspondence: { sources: { key: string; page: string }[] }[] | null } & Record<string, unknown>)[];
      sources: { keys: string[]; reference: string }[];
    };
    let pages = 0;
    for (const c of t.classes) {
      for (const row of c.correspondence ?? []) {
        for (const s of row.sources) {
          if (s.key === "Gottstein2026" && /^p\.\d+$/.test(s.page)) {
            s.page = `pdf ${s.page}`;
            pages++;
          }
        }
      }
    }
    expect(pages).toBe(56);
    const leong = t.sources.find((s) => s.keys.includes("Leong2022"))!;
    const added =
      ". The locators Proposal, CS1–CS3 and FW1–FW3 are the paper's own section heading and labels of its case " +
      "studies and future-work examples";
    expect(leong.reference.endsWith(added)).toBe(true);
    leong.reference = leong.reference.slice(0, -added.length);
    // Usage counts and examples follow from the removed paper; tests/taxonomy-derive.test.ts pins them.
    for (const c of t.classes) for (const k of ["n_items", "n_platforms", "n_papers", "examples"]) delete c[k];
    expect(sha(JSON.stringify(t))).toBe("2dcc668d48eb606e89d38e3ae8fb0a3c652a7e90659796e0be7bfc01c8509738");
  });

  it("changes benchmark.json only in the exclusion reason, Snapp2024's split and the recomputed results", () => {
    expect(file("benchmark.json")).toBe("585ca40067f3d1d42091c70c8f69d6b0c4e936edbe5ae1e05aad9cc4d6395474");
    const b = json("benchmark.json") as {
      exclusion_reasons: { reason: string }[];
      platforms: { platform_id: string; split: string }[];
      tasks: Record<string, unknown>[];
    } & Record<string, unknown>;
    expect(b.exclusion_reasons[0]!.reason).toBe("one of the 10 development papers of the coding instructions");
    b.exclusion_reasons[0]!.reason = "used to develop the extraction instructions";
    expect(b.platforms.some((p) => p.platform_id.startsWith("Snapp2023/"))).toBe(false);
    const snapp = b.platforms.find((p) => p.platform_id === "Snapp2024/P1")!;
    expect(snapp.split).toBe("train");
    snapp.split = "test";
    // Recomputed on the corrected database; tests/benchmark-derive.test.ts pins them.
    for (const k of ["split_counts", "summaries", "reference_results", "reference_results_text"]) delete b[k];
    for (const task of b.tasks) {
      for (const k of ["baseline_top1", "reference_model_top1", "diff_ci95_low", "diff_ci95_high", "n_test_items", "n_test_papers", "recorded_in"]) {
        delete task[k];
      }
    }
    expect(sha(JSON.stringify(b))).toBe("21de595d2b9bcfbc802de4eefff68b79b7942c9c8ad8b927777ab8a85e7404a7");
  });
});
