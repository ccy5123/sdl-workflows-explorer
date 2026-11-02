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

  // Release 1.1.0 against 1.0.0 (SPEC-RELEASE-001 REQ-003, AC-3). 1.0.0 hashes from SPEC-SITE-001 progress.md §E.1.
  const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const file = (rel: string) => sha(readFileSync(join(DATA_DIR, rel)));
  const json = (rel: string) => JSON.parse(readFileSync(join(DATA_DIR, rel), "utf8")) as Record<string, unknown>;

  it("leaves benchmark-items.json and the platform files byte-identical to 1.0.0", () => {
    expect(file("benchmark-items.json")).toBe("7a709c166912e849597d17302fb4fc09c3befc98b01f3265a8365deb19bb9aeb");
    const dir = join(DATA_DIR, "platforms");
    const names = readdirSync(dir).sort();
    expect(names).toHaveLength(238);
    expect(sha(Buffer.concat(names.map((n) => readFileSync(join(dir, n)))))).toBe(
      "9001ca64126b7bb996076a0b8b172d5c3d5b293171529dcf9aca08d8599889a8",
    );
  });

  it("changes index.json only in the release object", () => {
    expect(file("index.json")).toBe("464b1c6dce9f30f39a89c2f3ac5f32b9d7d0d688d0e9c926a4c7715543a21064");
    const { release, ...rest } = json("index.json");
    expect(sha(JSON.stringify(rest))).toBe("76908d5a24205c4878684f109585156fdfd394db0e6540478ec3df14a3a4b856");
    expect(release).toEqual({
      version: "1.1.0",
      released_on: "2026-11-02",
      doi: "10.5281/zenodo.23875743",
      taxonomy_version: "v1",
      license: "data: CC-BY-4.0; code: MIT",
    });
  });

  it("changes taxonomy.json only in the Gottstein2026 page locators and the Leong2022 reference", () => {
    expect(file("taxonomy.json")).toBe("f4b111b046402fcb332050a67bc19ff9126dc82003b1e5c1e71e9fbdcd392537");
    const t = json("taxonomy.json") as {
      classes: { correspondence: { sources: { key: string; page: string }[] }[] | null }[];
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
    expect(sha(JSON.stringify(t))).toBe("e33f52e3398e1d411f1522c1e3953c41165828a7693e9582c90c6fd9880acdc9");
  });

  it("changes benchmark.json only in the exclusion reason", () => {
    expect(file("benchmark.json")).toBe("bbf945aa945885c420729fc76518040994d72ee8900931af4ae120209b39828e");
    const b = json("benchmark.json") as { exclusion_reasons: { reason: string }[] };
    expect(b.exclusion_reasons[0]!.reason).toBe("one of the 10 development papers of the coding instructions");
    b.exclusion_reasons[0]!.reason = "used to develop the extraction instructions";
    expect(sha(JSON.stringify(b))).toBe("4ca73f0e6d4674debc39dadfdcc6749a5c79709824d2bd7f7b38416ba95ad80d");
  });
});
