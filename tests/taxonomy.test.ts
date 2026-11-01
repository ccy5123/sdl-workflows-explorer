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
  NO_COUNTERPART_TEXT,
  NO_EXAMPLE_TEXT,
  NO_PLATFORM_NOTE,
  NO_ROW_TEXT,
  NOT_FOUND_HEADING,
  classLinks,
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
  sourceText,
  splitReference,
  targetText,
  unfilteredNote,
  isNoneEntry,
} from "../src/lib/taxonomy";
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
    expect(notCoveredText("OntoLab_SAREF", ["module_type"])).toBe("Not covered: OntoLab_SAREF maps module types only.");
    expect(notCoveredText("V", ["module_type", "unit_operation"])).toBe("Not covered: V maps module types and unit operations only.");
  });

  it("writes targets with their relation and sources as recorded", () => {
    expect(targetText({ target: "Heater/chiller", match: "exact" })).toBe("Heater/chiller — exact");
    expect(sourceText({ key: "Mehr2020", page: "p.10", locator: "Fig. 5" })).toBe("Mehr2020 ; p.10 ; Fig. 5");
    expect(sourceText({ key: "Bai2024", page: null, locator: null })).toBe("Bai2024");
    expect(isNoneEntry({ vocabulary: "X", targets: [{ target: "none", match: "none" }], sources: [] })).toBe(true);
    expect(isNoneEntry({ vocabulary: "X", targets: [{ target: "a", match: "exact" }], sources: [] })).toBe(false);
  });

  it("states missing mappings", () => {
    expect(noMappingText("field_tag")).toBe("The correspondence table does not map field tags.");
    expect(NO_ROW_TEXT).toBe("The correspondence table has no row for this class.");
    expect(NO_COUNTERPART_TEXT).toBe("No counterpart in this vocabulary.");
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
        "Item counts are papers for field tags, modules for module types, connections for transfer modes and steps for unit operations.",
    );
    const saref = taxonomy.vocabularies.find((v) => v.vocabulary === "OntoLab_SAREF")!;
    expect(notCoveredText(saref.vocabulary, saref.kinds)).toBe("Not covered: OntoLab_SAREF maps module types only.");
    expect(familyGroups(taxonomy.classes).map((g) => `${g.family} ${g.classes.length}`)).toEqual([
      "analyze 1", "form 2", "handle 2", "measure 6", "mix 2", "plan 2", "prepare 4", "react 6", "separate 5", "unmapped 1",
    ]);
  });

  it("REQ-016: no built text with the real values contains a banned substring", () => {
    const texts = [
      overviewCaption(taxonomy.classes),
      ...["field_tag", "module_type", "transfer_mode", "unit_operation"].flatMap((k) => [exampleCaption(k), noMappingText(k)]),
      ...taxonomy.classes.map((c) => unfilteredNote(c.class, totals.platforms)),
      NO_PLATFORM_NOTE,
      NO_EXAMPLE_TEXT,
      NO_ROW_TEXT,
      NO_COUNTERPART_TEXT,
      ...taxonomy.vocabularies.map((v) => notCoveredText(v.vocabulary, v.kinds)),
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
});
