// SPEC-TECH-001 AC-1, AC-3: the vocabulary file, normalisation, "an alias occurs in a text", query terms and the
// matching rule on a small fixture.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseVocabulary } from "../scripts/lib/techniques";
import { quoteTerm, reasonText, searchWithTechniques, techniqueData, type SearchRow } from "../src/lib/techniqueMatch";
import { aliasIndex, normalise, occursIn, parseQuery, tokens } from "../src/lib/techniqueSearch";

const vocab = parseVocabulary(readFileSync(join(import.meta.dirname, "..", "data-overlay", "techniques.json"), "utf8"));
const index = aliasIndex(vocab);

describe("vocabulary", () => {
  it("parses, with unique snake-case ids and no alias naming two techniques", () => {
    expect(vocab.techniques.length).toBeGreaterThanOrEqual(11);
    expect(new Set(vocab.techniques.map((t) => t.id)).size).toBe(vocab.techniques.length);
  });

  it("refuses an alias that two techniques share after normalisation", () => {
    const bad = JSON.parse(JSON.stringify(vocab));
    bad.techniques[1].aliases.push("F.T.I.R.");
    expect(() => parseVocabulary(JSON.stringify(bad))).toThrow(/names both/);
  });
});

describe("normalisation and occurrence (spec §2)", () => {
  it("normalises separators and case", () => {
    for (const s of ["UV-Vis", "UV/Vis", "UV–vis", "uv vis"]) expect(normalise(s)).toBe("uvvis");
    expect(tokens("in-line FT-IR (ReactIR 15)")).toEqual(["in", "line", "FT", "IR", "ReactIR", "15"]);
  });

  it("finds an alias only as whole consecutive tokens", () => {
    expect(occursIn("FTIR", "in-line FT-IR")).toBe(true);
    expect(occursIn("IR", "IR lamp")).toBe(true);
    expect(occursIn("IR", "in-line FT-IR")).toBe(true);
    expect(occursIn("IR", "magnetic stirrer")).toBe(false);
    expect(occursIn("MS", "LC-MS")).toBe(true);
    expect(occursIn("SEM", "TSEMO algorithm")).toBe(false);
    expect(occursIn("X-ray diffraction", "high-throughput wide-angle X-ray diffraction")).toBe(true);
  });
});

describe("query terms", () => {
  const kinds = (q: string) => parseQuery(q, index).map((t) => (t.kind === "technique" ? `${t.kind}:${t.techniques.join("+")}` : `${t.kind}:${t.text}`));

  it("maps every spelling of a technique to one term", () => {
    for (const q of ["FTIR", "FT-IR", "ft/ir", "ReactIR", "infrared spectroscopy"]) expect(kinds(q)).toEqual(["technique:ir_spectroscopy"]);
  });

  it("keeps quoted text as written and other words plain", () => {
    expect(kinds('"ReactIR"')).toEqual(["quoted:ReactIR"]);
    expect(kinds("in-line FT-IR")).toEqual(["plain:in-line", "technique:ir_spectroscopy"]);
  });

  it("splits a word whose tokens are each an alias, and reads compound aliases", () => {
    // "LC-MS" normalises to the compound alias LCMS; "UPLC-DAD/MS" is split into its tokens.
    expect(kinds("LC-MS")).toEqual(["technique:liquid_chromatography+mass_spectrometry"]);
    expect(kinds("LCMS")).toEqual(["technique:liquid_chromatography+mass_spectrometry"]);
    expect(kinds("HPLC/ESI")).toEqual(["technique:liquid_chromatography", "technique:mass_spectrometry"]);
    expect(kinds("GC-FID")).toEqual(["technique:gas_chromatography"]);
  });
});

describe("matching on a fixture", () => {
  const data = techniqueData({
    techniques: vocab.techniques,
    compound_aliases: vocab.compound_aliases,
    modules: [
      { platform_id: "A/P1", module_id: "A/P1/M2", techniques: ["ir_spectroscopy"], name: "in-line FT-IR (ReactIR 15)", evidence: "SI1 · p. 10" },
      { platform_id: "B/P1", module_id: "B/P1/M1", techniques: ["liquid_chromatography", "mass_spectrometry"], name: "LC/MS (Agilent 6120)", evidence: "main · p. 3" },
    ],
  });
  const row = (id: string, names: string[]): SearchRow => ({
    platform_id: id,
    paper_id: id.split("/")[0]!,
    platform_name: null,
    module_types: [],
    unit_operations: [],
    module_refs: names.map((name, k) => ({ id: `${id}/M${k + 1}`, name, evidence: "main · p. 1" })),
  });
  const rows = [row("A/P1", ["pumps", "in-line FT-IR (ReactIR 15)"]), row("B/P1", ["LC/MS (Agilent 6120)"]), row("C/P1", ["IR lamp", "magnetic stirrer"])];
  const ids = (q: string) => searchWithTechniques(rows, q, data, (_k, c) => c).hits.map((h) => h.row.platform_id);

  it("finds the tagged platform for every spelling and leaves the IR lamp out", () => {
    for (const q of ["FTIR", "FT-IR", "ReactIR", "IR", "infrared spectroscopy"]) expect(ids(q)).toEqual(["A/P1"]);
  });

  it("matches a quoted term as written, without mapping", () => {
    expect(ids('"IR"')).toEqual(["A/P1", "C/P1"]);
    expect(ids('"reactir"')).toEqual(["A/P1"]);
  });

  it("requires every term and reads compound aliases", () => {
    expect(ids("LC-MS")).toEqual(["B/P1"]);
    expect(ids("LCMS")).toEqual(["B/P1"]);
    expect(ids("FT-IR pumps")).toEqual(["A/P1"]);
    expect(ids("FT-IR lamp")).toEqual([]);
  });

  it("gives reasons with module id, name and evidence, the expansion, and suggestions when few match", () => {
    const r = searchWithTechniques(rows, "FTIR", data, (_k, c) => c);
    expect(reasonText(r.hits[0]!.reasons[0]!)).toBe("IR spectroscopy: A/P1/M2 in-line FT-IR (ReactIR 15) · SI1 · p. 10");
    expect(r.expansions.map((e) => e.techniques.map((t) => t.id))).toEqual([["ir_spectroscopy"]]);
    expect(searchWithTechniques(rows, "stirer", data, (_k, c) => c).suggestions).toContain("magnetic stirrer");
  });

  it("holds a short plain query to whole tokens in the platform id, paper and name too", () => {
    const titled: SearchRow[] = [
      { platform_id: "HamediRad2019", paper_id: "HamediRad2019", platform_name: "Bioinspired lignans", module_types: [], unit_operations: [] },
      { platform_id: "X2020", paper_id: "X2020", platform_name: "An Ir catalyst screen", module_types: [], unit_operations: [] },
    ];
    expect(searchWithTechniques(titled, "ir", null, (_k, c) => c).hits.map((h) => h.row.platform_id)).toEqual(["X2020"]);
    expect(searchWithTechniques(titled, "Bioinspired", null, (_k, c) => c).hits.map((h) => h.row.platform_id)).toEqual(["HamediRad2019"]);
  });

  it("quotes a typed term for the 'only' button", () => {
    expect(quoteTerm("in-line FTIR", "FTIR")).toBe('in-line "FTIR"');
  });
});
