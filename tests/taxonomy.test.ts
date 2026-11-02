// SPEC-TAXO-001 AC-5 and AC-10: the link rule, count consistency with the browser, texts and family grouping of
// src/lib/taxonomy.ts (REQ-005, REQ-012, REQ-013, REQ-015, REQ-016). Real-data cases read public/data/ after
// `npm run build-data` and skip with a message when it is absent.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TaxonomyClass, TaxonomyJson } from "../src/data/types";
import { matchingPapers, matchingPlatforms } from "../src/lib/filterApply";
import { offeredValues, type Offered } from "../src/lib/filterState";
import { decodeFilters } from "../src/lib/filterUrl";
import { parseRoute } from "../src/lib/route";
import {
  BACK_LINK_TEXT,
  JUMP_LIST_NAME,
  NO_EXAMPLE_TEXT,
  NO_PLATFORM_NOTE,
  NO_ROW_TEXT,
  NOT_FOUND_HEADING,
  RELATION_GLOSSES,
  VOCABULARY_LABELS,
  classLinks,
  correspondenceRows,
  countText,
  exampleCaption,
  exampleCount,
  familyGroups,
  itemsText,
  joinWords,
  kindHeading,
  kindIsMapped,
  kindLabel,
  loadErrorText,
  noMappingText,
  notCoveredText,
  notFoundText,
  overviewCaption,
  papersText,
  platformsText,
  referenceOf,
  relationMeaning,
  sourceText,
  sourcesText,
  splitReference,
  unfilteredNote,
  isNoneEntry,
  vocabularyLabel,
  type CorrespondenceRow,
} from "../src/lib/taxonomy";
import { contrastRatio } from "../src/lib/chartTokens";
import { BANNED_SUBSTRINGS } from "../src/lib/trends";
import { dataAvailable, readIndex, readTaxonomy, warnIfMissing } from "./viewer-data";

warnIfMissing("taxonomy.test.ts");

const klass = (patch: Partial<TaxonomyClass>): TaxonomyClass => ({
  class_kind: "module_type",
  class: "flow_reactor",
  family: null,
  definition: "",
  n_items: 0,
  n_platforms: 0,
  n_papers: 0,
  examples: [],
  correspondence: null,
  ...patch,
});

const OFFERED: Offered = { field: ["catalysis"], im: [], sw: [], hw: [], mt: ["flow_reactor"], tm: ["fixed_tubing"], uo: ["sonicate"] };
const TOTALS = { platforms: 280, papers: 238 };

describe("count and item texts", () => {
  it("uses the singular noun for 1 only", () => {
    expect(countText(1, "step", "steps")).toBe("1 step");
    expect(countText(0, "step", "steps")).toBe("0 steps");
    expect(platformsText(1)).toBe("1 platform");
    expect(papersText(1)).toBe("1 paper");
    expect(platformsText(0)).toBe("0 platforms");
    expect(papersText(0)).toBe("0 papers");
    expect(platformsText(127)).toBe("127 platforms");
  });

  it("names the items of each kind with its unit noun", () => {
    expect(itemsText(klass({ class_kind: "module_type", n_items: 139 }))).toBe("139 modules");
    expect(itemsText(klass({ class_kind: "field_tag", n_items: 23 }))).toBe("23 papers");
    expect(itemsText(klass({ class_kind: "transfer_mode", n_items: 1 }))).toBe("1 connection");
    expect(itemsText(klass({ class_kind: "unit_operation", n_items: 1 }))).toBe("1 step");
    expect(exampleCount("module_type", 1)).toBe("(1 module)");
    expect(exampleCount("unit_operation", 6)).toBe("(6 steps)");
  });

  it("labels kinds, headings and unknown kinds", () => {
    expect(["field_tag", "module_type", "transfer_mode", "unit_operation"].map(kindLabel)).toEqual([
      "Field tag", "Module type", "Transfer mode", "Unit operation",
    ]);
    expect(["field_tag", "module_type", "transfer_mode", "unit_operation"].map(kindHeading)).toEqual([
      "Field tags", "Module types", "Transfer modes", "Unit operations",
    ]);
    expect(kindLabel("x")).toBe("x");
  });
});

describe("classLinks (REQ-012)", () => {
  it("links the browse lists filtered on the class when it is offered", () => {
    expect(classLinks(klass({ class_kind: "module_type", class: "flow_reactor", n_platforms: 127, n_papers: 99 }), OFFERED, TOTALS)).toEqual({
      kind: "filtered",
      platforms: "#/browse?view=platforms&mt=flow_reactor",
      papers: "#/browse?mt=flow_reactor",
      note: null,
    });
    expect(classLinks(klass({ class_kind: "field_tag", class: "catalysis", n_platforms: 1 }), OFFERED, TOTALS)).toMatchObject({
      platforms: "#/browse?view=platforms&field=catalysis",
    });
    expect(classLinks(klass({ class_kind: "unit_operation", class: "sonicate", n_platforms: 5 }), OFFERED, TOTALS)).toMatchObject({
      papers: "#/browse?uo=sonicate",
    });
  });

  it("links the full lists with a note for a class on every platform that is not offered", () => {
    expect(
      classLinks(klass({ class_kind: "transfer_mode", class: "data_transfer", n_platforms: 280, n_papers: 238 }), OFFERED, TOTALS),
    ).toEqual({
      kind: "unfiltered",
      platforms: "#/browse?view=platforms",
      papers: "#/browse",
      note: "data_transfer is not offered by the browser's filters. It is recorded on all 280 platforms, so these links open the full lists.",
    });
  });

  it("gives no link for a class no platform uses, and no note for a case REQ-004 rules out", () => {
    expect(classLinks(klass({ class_kind: "field_tag", class: "unmapped" }), OFFERED, TOTALS)).toEqual({
      kind: "none",
      note: NO_PLATFORM_NOTE,
    });
    expect(classLinks(klass({ class_kind: "transfer_mode", class: "odd", n_platforms: 3, n_papers: 3 }), OFFERED, TOTALS)).toEqual({
      kind: "none",
      note: null,
    });
  });
});

describe("correspondence texts (REQ-013)", () => {
  it("joins kind names with commas and 'and'", () => {
    expect(joinWords(["module types"])).toBe("module types");
    expect(joinWords(["a", "b"])).toBe("a and b");
    expect(joinWords(["a", "b", "c"])).toBe("a, b and c");
    expect(notCoveredText("OntoLab_SAREF", ["module_type"])).toBe("OntoLab/SAREF maps module types only");
    expect(notCoveredText("V", ["module_type", "unit_operation"])).toBe("V maps module types and unit operations only");
  });

  it("writes sources as '<key>, <page>, <locator>' joined with '; '", () => {
    expect(sourceText({ key: "Mehr2020", page: "p.10", locator: "Fig. 5" })).toBe("Mehr2020, p.10, Fig. 5");
    expect(sourceText({ key: "Bai2024", page: null, locator: null })).toBe("Bai2024");
    expect(
      sourcesText([
        { key: "Leong2022", page: "p.4", locator: "Table 1" },
        { key: "Leong2022", page: "p.7", locator: "Fig. 4, CS3" },
      ]),
    ).toBe("Leong2022, p.4, Table 1; Leong2022, p.7, Fig. 4, CS3");
    expect(isNoneEntry({ vocabulary: "X", targets: [{ target: "none", match: "none" }], sources: [] })).toBe(true);
    expect(isNoneEntry({ vocabulary: "X", targets: [{ target: "a", match: "exact" }], sources: [] })).toBe(false);
  });

  it("labels vocabularies with the site constants, else the column name", () => {
    expect(["XDL", "WCSO", "Leong2022", "OntoLab_SAREF", "Gottstein2026", "Foo"].map(vocabularyLabel)).toEqual([
      "XDL", "WCSO", "MAP (Leong2022)", "OntoLab/SAREF", "Gottstein2026 orchestration levels", "Foo",
    ]);
  });

  it("gives a relation its release meaning, else the site gloss, else an em dash", () => {
    expect(relationMeaning({ match: "exact", meaning: null })).toBe("the same concept");
    expect(relationMeaning({ match: "none", meaning: null })).toBe("no counterpart in that vocabulary; the listed source was searched");
    expect(relationMeaning({ match: "broader", meaning: "wider" })).toBe("wider");
    expect(relationMeaning({ match: "partial", meaning: null })).toBe("—");
    expect(relationMeaning({ match: "exact", meaning: "x" })).toBe("x");
  });

  it("builds one table row per target, a searched row for none and a not-covered row (REQ-013)", () => {
    const vocabularies = [
      { vocabulary: "A", kinds: ["module_type"], source_keys: ["A2"] },
      { vocabulary: "B", kinds: ["module_type"], source_keys: ["B1"] },
      { vocabulary: "C", kinds: ["unit_operation"], source_keys: ["C1"] },
      { vocabulary: "D", kinds: ["module_type"], source_keys: ["Nobody"] },
    ];
    const sources = [
      { keys: ["A1", "A2"], vocabulary: "A", reference: "", doi: "" },
      { keys: ["B1"], vocabulary: "B", reference: "", doi: "" },
      { keys: ["C1"], vocabulary: "C", reference: "", doi: "" },
    ];
    const cls = klass({
      correspondence: [
        { vocabulary: "A", targets: [{ target: "t1", match: "exact" }, { target: "t2", match: "narrower" }], sources: [{ key: "A2", page: "p.1", locator: "Fig. 1" }] },
        { vocabulary: "B", targets: [{ target: "none", match: "none" }], sources: [{ key: "B1", page: null, locator: null }] },
        { vocabulary: "D", targets: [{ target: "d", match: "broader" }], sources: [{ key: "Nobody", page: null, locator: null }] },
      ],
    });
    expect(correspondenceRows(cls, vocabularies, sources)).toEqual<CorrespondenceRow[]>([
      { vocabulary: "A", label: "A", link: "#/taxonomy?source=A1", term: "t1", relation: "exact", source: "A2, p.1, Fig. 1", span: 2 },
      { vocabulary: "A", label: "A", link: "#/taxonomy?source=A1", term: "t2", relation: "narrower", source: "A2, p.1, Fig. 1", span: 0 },
      { vocabulary: "B", label: "B", link: "#/taxonomy?source=B1", term: "—", relation: "none", source: "searched: B1", span: 1 },
      { vocabulary: "C", label: "C", link: "#/taxonomy?source=C1", term: "—", relation: "not covered", source: "C maps unit operations only", span: 1 },
      { vocabulary: "D", label: "D", link: null, term: "d", relation: "broader", source: "Nobody", span: 1 },
    ]);
    expect(correspondenceRows(klass({ correspondence: null }), vocabularies, sources)).toEqual([]);
  });

  it("states missing mappings", () => {
    expect(noMappingText("field_tag")).toBe("The correspondence table does not map field tags.");
    expect(NO_ROW_TEXT).toBe("The correspondence table has no row for this class.");
    expect(JUMP_LIST_NAME).toBe("On this page");
    const classes = [klass({ class_kind: "field_tag" }), klass({ correspondence: [] })];
    expect(kindIsMapped("field_tag", classes)).toBe(false);
    expect(kindIsMapped("module_type", classes)).toBe(true);
  });

  it("finds the README reference of a vocabulary and splits out its doi", () => {
    const sources = [
      { keys: ["A1"], vocabulary: "A", reference: "A et al., doi:10.1/a. More", doi: "10.1/a" },
      { keys: ["B1", "B2"], vocabulary: "B", reference: "B et al.", doi: "10.1/b" },
    ];
    expect(referenceOf({ vocabulary: "V", kinds: [], source_keys: ["B2"] }, sources)).toBe(sources[1]);
    expect(referenceOf({ vocabulary: "V", kinds: [], source_keys: [] }, sources)).toBeNull();
    expect(splitReference(sources[0]!)).toEqual({ before: "A et al., ", doiText: "doi:10.1/a", after: ". More" });
    expect(splitReference(sources[1]!)).toEqual({ before: "B et al.", doiText: null, after: "" });
  });
});

describe("example captions, notes and family grouping", () => {
  it("captions the examples by kind", () => {
    expect(exampleCaption("field_tag")).toBe("The first five platforms with this field tag, in platform id order.");
    expect(exampleCaption("module_type")).toBe("Up to five platforms with the most modules of this class; ties in platform id order.");
    expect(exampleCaption("unit_operation")).toBe("Up to five platforms with the most steps of this class; ties in platform id order.");
    expect(NO_EXAMPLE_TEXT).toBe("No platform uses this class.");
    expect(unfilteredNote("x", 3)).toBe("x is not offered by the browser's filters. It is recorded on all 3 platforms, so these links open the full lists.");
  });

  it("groups unit operations by family in alphabetical order", () => {
    const groups = familyGroups([
      klass({ class_kind: "field_tag", class: "f" }),
      klass({ class_kind: "unit_operation", class: "mix", family: "mix" }),
      klass({ class_kind: "unit_operation", class: "analyze_data", family: "analyze" }),
      klass({ class_kind: "unit_operation", class: "sonicate", family: "mix" }),
    ]);
    expect(groups.map((g) => [g.family, g.classes.map((c) => c.class)])).toEqual([
      ["analyze", ["analyze_data"]],
      ["mix", ["mix", "sonicate"]],
    ]);
  });

  it("writes the not-found and load-failure texts", () => {
    expect(NOT_FOUND_HEADING).toBe("Class not found");
    expect(notFoundText("module_type", "nonexistent")).toBe("The taxonomy has no class nonexistent of kind module_type.");
    expect(BACK_LINK_TEXT).toBe("Back to the taxonomy");
    expect(loadErrorText("HTTP 500")).toBe("Could not load the taxonomy: HTTP 500");
  });
});

describe.skipIf(!dataAvailable)("taxonomy texts and links on the real data (AC-10)", () => {
  const index = dataAvailable ? readIndex() : { papers: [], platforms: [] };
  const taxonomy: TaxonomyJson = dataAvailable ? readTaxonomy() : { classes: [], vocabularies: [], sources: [], relations: [] };
  const offered = offeredValues(index);
  const totals = { platforms: index.platforms.length, papers: index.papers.length };
  const cls = (kind: string, name: string) => taxonomy.classes.find((c) => c.class_kind === kind && c.class === name)!;
  const linksOf = (kind: string, name: string) => classLinks(cls(kind, name), offered, totals);

  it("links the chosen classes as AC-10 lists", () => {
    expect(linksOf("module_type", "flow_reactor")).toMatchObject({
      platforms: "#/browse?view=platforms&mt=flow_reactor",
      papers: "#/browse?mt=flow_reactor",
    });
    expect(linksOf("field_tag", "catalysis")).toMatchObject({
      platforms: "#/browse?view=platforms&field=catalysis",
      papers: "#/browse?field=catalysis",
    });
    expect(linksOf("unit_operation", "sonicate")).toMatchObject({
      platforms: "#/browse?view=platforms&uo=sonicate",
      papers: "#/browse?uo=sonicate",
    });
    expect(linksOf("transfer_mode", "data_transfer")).toMatchObject({
      kind: "unfiltered",
      platforms: "#/browse?view=platforms",
      papers: "#/browse",
    });
    expect(linksOf("field_tag", "unmapped")).toEqual({ kind: "none", note: NO_PLATFORM_NOTE });
  });

  it("REQ-015: every linked class's counts equal the count lines of its links (69 classes)", () => {
    const decode = (hash: string) => {
      const route = parseRoute(hash);
      if (route.kind !== "browse") throw new Error(`not a browse link: ${hash}`);
      return decodeFilters(route.query, offered);
    };
    const kinds = taxonomy.classes.map((c) => [c, classLinks(c, offered, totals)] as const);
    expect(kinds).toHaveLength(69);
    const linked = kinds.filter(([, l]) => l.kind !== "none");
    const unlinked = kinds.filter(([, l]) => l.kind === "none");
    expect(linked).toHaveLength(68);
    expect(linked.filter(([, l]) => l.kind === "unfiltered").map(([c]) => `${c.class_kind}/${c.class}`)).toEqual([
      "transfer_mode/data_transfer",
    ]);
    expect(unlinked.map(([c]) => [`${c.class_kind}/${c.class}`, c.n_platforms, c.n_papers])).toEqual([["field_tag/unmapped", 0, 0]]);
    const mismatches = linked.filter(([c, l]) => {
      if (l.kind === "none") return true;
      const platforms = matchingPlatforms(decode(l.platforms), index.papers, index.platforms).length;
      const papers = matchingPapers(decode(l.papers), index.papers, index.platforms).length;
      return platforms !== c.n_platforms || papers !== c.n_papers;
    });
    expect(mismatches.map(([c]) => `${c.class_kind}/${c.class}`)).toEqual([]);
  });

  it("writes the overview caption, the not-covered text and the family grouping", () => {
    expect(overviewCaption(taxonomy.classes)).toBe(
      "The 69 classes of the release taxonomy: 10 field tags, 22 module types, 6 transfer modes and 31 unit operations. " +
        "Item counts are papers for field tags, modules for module types, connections for transfer modes and steps for unit operations. " +
        "A paper can carry several field tags, so the paper counts of the field tags need not add up to the number of papers.",
    );
    const saref = taxonomy.vocabularies.find((v) => v.vocabulary === "OntoLab_SAREF")!;
    expect(notCoveredText(saref.vocabulary, saref.kinds)).toBe("OntoLab/SAREF maps module types only");
    expect(familyGroups(taxonomy.classes).map((g) => `${g.family} ${g.classes.length}`)).toEqual([
      "analyze 1", "form 2", "handle 2", "measure 6", "mix 2", "plan 2", "prepare 4", "react 6", "separate 5", "unmapped 1",
    ]);
  });

  it("gives the real relations their meanings (release text, then site gloss)", () => {
    expect(taxonomy.relations.map((r) => [r.match, relationMeaning(r)])).toEqual([
      ["exact", "the same concept"],
      ["broader", "the target is wider than our class"],
      ["narrower", "the target is narrower; for Gottstein2026, one of our items may span several of its objects"],
      ["none", "no counterpart in that vocabulary; the listed source was searched"],
    ]);
  });

  const rowsOf = (kind: string, name: string) => correspondenceRows(cls(kind, name), taxonomy.vocabularies, taxonomy.sources);
  /** "label span n | term | relation | source" on a starting row, "term | relation" on the others. */
  const show = (r: CorrespondenceRow) => (r.span > 0 ? `${r.label} span ${r.span} | ${r.term} | ${r.relation} | ${r.source}` : `${r.term} | ${r.relation}`);

  it("builds the correspondence rows of thermal_unit, mobile_robot and human (AC-10)", () => {
    expect(rowsOf("module_type", "thermal_unit").map(show)).toEqual([
      "XDL span 5 | Heater/chiller | exact | Mehr2020, p.10, Fig. 5; Mehr2020, p.4, Fig. 2; Mehr2020, p.11, main text",
      "Low temperature | exact",
      "circulation chiller | exact",
      "heater chiller | exact",
      "stirrer hotplate | exact",
      "WCSO span 3 | heat treatment device | exact | Schilling2026, p.5, Fig. 2",
      "heated magnetic stirrer | exact",
      "temperature change device | exact",
      "MAP (Leong2022) span 3 | furnace | exact | Leong2022, p.4, Table 1; Leong2022, p.7, Fig. 4, CS3",
      "hotplate stirrer | exact",
      "rapid joule heating | exact",
      "OntoLab/SAREF span 1 | — | none | searched: Bai2024",
      "Gottstein2026 orchestration levels span 1 | setup | exact | Gottstein2026, pdf p.3, §Vocabulary and formalism (physical terms)",
    ]);
    expect(rowsOf("transfer_mode", "mobile_robot").map(show)).toEqual([
      "XDL span 1 | — | none | searched: Mehr2020",
      "WCSO span 1 | — | none | searched: Schilling2026",
      "MAP (Leong2022) span 1 | transportation task | broader | Leong2022, p.9, Limitations",
      "OntoLab/SAREF span 1 | — | not covered | OntoLab/SAREF maps module types only",
      "Gottstein2026 orchestration levels span 1 | unit_operation | exact | Gottstein2026, pdf p.4, §Results",
    ]);
    const human = rowsOf("module_type", "human").map(show);
    expect(human).toHaveLength(6);
    expect(human).toContain("MAP (Leong2022) span 2 | Manual task | broader | Leong2022, p.3, Fig. 1; Leong2022, p.7, CS3");
    expect(human[human.indexOf("MAP (Leong2022) span 2 | Manual task | broader | Leong2022, p.3, Fig. 1; Leong2022, p.7, CS3") + 1]).toBe(
      "manual tool | narrower",
    );
    expect(human).toContain("Gottstein2026 orchestration levels span 1 | — | none | searched: Gottstein2026, pdf p.3, Fig. 1");
  });

  it("links each vocabulary label to its sources row (AC-10)", () => {
    const links = rowsOf("module_type", "thermal_unit").filter((r) => r.span > 0).map((r) => [r.label, r.link]);
    expect(links).toEqual([
      ["XDL", "#/taxonomy?source=Mehr2020"],
      ["WCSO", "#/taxonomy?source=Schilling2026"],
      ["MAP (Leong2022)", "#/taxonomy?source=Leong2022"],
      ["OntoLab/SAREF", "#/taxonomy?source=Bai2024"],
      ["Gottstein2026 orchestration levels", "#/taxonomy?source=Gottstein2026"],
    ]);
  });

  it("gives 315 rows over the 56 classes with a correspondence, 280 starting a span that covers them all (AC-10)", () => {
    const mapped = taxonomy.classes.filter((c) => c.correspondence !== null);
    expect(mapped).toHaveLength(56);
    const all = mapped.flatMap((c) => correspondenceRows(c, taxonomy.vocabularies, taxonomy.sources));
    expect(all).toHaveLength(315);
    expect(all.filter((r) => r.relation === "not covered")).toHaveLength(35);
    const starts = all.filter((r) => r.span > 0);
    expect(starts).toHaveLength(280);
    expect(starts.reduce((sum, r) => sum + r.span, 0)).toBe(315);
    expect(all.every((r) => ["exact", "broader", "narrower", "none", "not covered"].includes(r.relation))).toBe(true);
    expect(all.every((r) => r.link !== null)).toBe(true);
  });

  it("REQ-016: no built text with the real values contains a banned substring", () => {
    const rows = taxonomy.classes.flatMap((c) => correspondenceRows(c, taxonomy.vocabularies, taxonomy.sources));
    const texts = [
      overviewCaption(taxonomy.classes),
      JUMP_LIST_NAME,
      ...Object.values(RELATION_GLOSSES),
      ...["field_tag", "module_type", "transfer_mode", "unit_operation"].flatMap((k) => [exampleCaption(k), noMappingText(k)]),
      ...taxonomy.classes.map((c) => unfilteredNote(c.class, totals.platforms)),
      NO_PLATFORM_NOTE,
      NO_EXAMPLE_TEXT,
      NO_ROW_TEXT,
      ...taxonomy.vocabularies.map((v) => notCoveredText(v.vocabulary, v.kinds)),
      ...rows.filter((r) => r.relation === "none" || r.relation === "not covered").flatMap((r) => [r.relation, r.source]),
      ...Object.values(VOCABULARY_LABELS),
      NOT_FOUND_HEADING,
      ...taxonomy.classes.map((c) => notFoundText(c.class_kind, c.class)),
      BACK_LINK_TEXT,
    ];
    const hits = texts.flatMap((t) => BANNED_SUBSTRINGS.filter((b) => t.toLowerCase().includes(b)).map((b) => `${b}: ${t}`));
    expect(hits).toEqual([]);
  });
});

describe.skipIf(!dataAvailable)("file sizes after build-data (SPEC-TAXO-001 AC-5)", () => {
  it("keeps taxonomy.json within 120,000 bytes and index.json within 260,000 bytes", () => {
    const dir = join(import.meta.dirname, "..", "public", "data");
    const taxonomy = statSync(join(dir, "taxonomy.json")).size;
    const index = statSync(join(dir, "index.json")).size;
    console.log(`taxonomy.json ${taxonomy} bytes, index.json ${index} bytes`);
    expect(taxonomy).toBeLessThanOrEqual(120_000);
    expect(index).toBeLessThanOrEqual(260_000);
  });
});

describe("no reference text of the release in src/ (SPEC-TAXO-001 AC-5)", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));

  it("finds no doi, reference author or relation meaning in any file under src/", () => {
    const banned = ["doi:10.", "10.1126/science.abc2986", "Mehr et al", "the target is wider", "Orchestration levels"];
    const hits = files(join(import.meta.dirname, "..", "src")).flatMap((f) => {
      const text = readFileSync(f, "utf8");
      return banned.filter((b) => text.includes(b)).map((b) => `${f}: ${b}`);
    });
    expect(hits).toEqual([]);
  });

  it("keeps the relation glosses and vocabulary labels in src/lib/taxonomy.ts only", () => {
    const site = ["the same concept", "no counterpart in that vocabulary; the listed source was searched", "XDL", "WCSO", "MAP (Leong2022)", "OntoLab/SAREF", "Gottstein2026 orchestration levels"];
    expect(Object.values(RELATION_GLOSSES)).toEqual(site.slice(0, 2));
    expect(Object.values(VOCABULARY_LABELS)).toEqual(site.slice(2));
    const lib = join(import.meta.dirname, "..", "src", "lib", "taxonomy.ts");
    const holders = (text: string) =>
      files(join(import.meta.dirname, "..", "src")).filter((f) => readFileSync(f, "utf8").includes(text)).map((f) => f === lib);
    for (const text of site) expect(holders(text), text).toEqual([true]);
  });
});

describe("taxonomy colour tokens in styles.css (SPEC-TAXO-001 AC-16)", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "src", "styles.css"), "utf8");
  /** `--taxo-*` declarations of every rule block whose selector is exactly `selector`. */
  const declared = (selector: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (m[1]!.trim() !== selector) continue;
      for (const d of m[2]!.matchAll(/(--taxo-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) out.set(d[1]!, d[2]!);
    }
    return out;
  };
  const named = [...new Set([...css.matchAll(/(--taxo-[\w-]+)\s*:/g)].map((m) => m[1]!))];
  const asText = new Set([...css.matchAll(/(?:^|[;{\s])color\s*:\s*var\((--taxo-[\w-]+)\)/g)].map((m) => m[1]!));

  it("declares each --taxo-* token in both sets with enough contrast (trivially true without tokens)", () => {
    const light = declared(":root");
    const dark = declared(':root[data-theme="dark"]');
    for (const name of named) {
      const min = asText.has(name) ? 4.5 : 3;
      expect(light.get(name), `${name} light`).toBeDefined();
      expect(dark.get(name), `${name} dark`).toBeDefined();
      expect(contrastRatio(light.get(name)!, "#ffffff"), `${name} light`).toBeGreaterThanOrEqual(min);
      expect(contrastRatio(dark.get(name)!, "#1a1a19"), `${name} dark`).toBeGreaterThanOrEqual(min);
    }
    console.log(`--taxo-* tokens in styles.css: ${named.length}`);
  });
});
