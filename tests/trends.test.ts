// SPEC-TRENDS-001 AC-2 to AC-6 and AC-8 (texts): trends URL, bins, offered split values, link state, count tables
// and caption texts (REQ-002, REQ-006 to REQ-009, REQ-013, REQ-014). Pure functions only: no Plot, no browser.
import { describe, expect, it } from "vitest";
import { matchingPapers } from "../src/lib/filterApply";
import { DEFAULT_STATE, offeredValues, yearsFromInputs, type FilterState, type Offered } from "../src/lib/filterState";
import { browseHash, decodeFilters } from "../src/lib/filterUrl";
import {
  BANNED_SUBSTRINGS,
  PARTIAL_YEAR,
  PLATFORMS_LINE,
  RELEASE_SEARCH_DATE,
  SPLITS,
  SPLIT_LABELS,
  caption,
  countTable,
  decodeTrends,
  emptyMessage,
  encodeTrends,
  integerTicks,
  linkState,
  offeredSplitValues,
  partialNote,
  rowCount,
  sampleNote,
  segmentName,
  totalName,
  trendsHash,
  valueLabel,
  yearBins,
  yearLabel,
  type Bin,
  type Split,
} from "../src/lib/trends";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("trends.test.ts");

const OFFERED: Offered = {
  field: ["catalysis", "nanomaterials"],
  im: ["fixed_tubing", "mixed"],
  sw: [2, 3],
  hw: [1, 2, 3],
  mt: ["flow_reactor", "liquid_handler"],
  tm: ["fixed_tubing", "robot_arm_gantry"],
  uo: ["mix", "sonicate"],
};

const state = (patch: Partial<FilterState>): FilterState => ({ ...DEFAULT_STATE, ...patch });
const yearsText = (b: Bin) => `${b.years.from ?? ""}-${b.years.to ?? ""}`;

describe("trends URL (AC-2)", () => {
  it("encodes the default state with split im to an empty query and #/trends", () => {
    expect(encodeTrends(DEFAULT_STATE, "im")).toBe("");
    expect(trendsHash(DEFAULT_STATE, "im")).toBe("#/trends");
    expect(trendsHash(DEFAULT_STATE, "hw")).toBe("#/trends?split=hw");
  });

  it("appends split after the filter parameters unless it is im", () => {
    const s = state({ view: "platforms", years: { from: 2018, to: 2024 }, field: ["catalysis"] });
    expect(trendsHash(s, "mt")).toBe("#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt");
    expect(trendsHash(s, "im")).toBe("#/trends?view=platforms&years=2018-2024&field=catalysis");
  });

  it.each<[string, Split]>([
    ["split=mt", "mt"],
    ["split=xx", "im"],
    ["split=", "im"],
    ["split=mt&split=bad", "im"],
    ["split=bad&split=tm", "tm"],
    ["", "im"],
    ["view=platforms", "im"],
  ])("decodes %j to split %s", (query, split) => {
    expect(decodeTrends(query, OFFERED).split).toBe(split);
  });

  it("decodes the filter state with decodeFilters and re-encodes canonically", () => {
    const decoded = decodeTrends("split=im&view=platforms", OFFERED);
    expect(decoded).toEqual({ state: state({ view: "platforms" }), split: "im" });
    expect(encodeTrends(decoded.state, decoded.split)).toBe("view=platforms");
  });

  it("leaves the browser ignoring split", () => {
    expect(decodeFilters("split=mt&im=mixed", OFFERED)).toEqual(decodeFilters("im=mixed", OFFERED));
  });

  it("round-trips each split with each single-parameter state", () => {
    const states: FilterState[] = [
      state({ view: "platforms" }),
      state({ years: { from: 2018, to: 2024 } }),
      state({ field: ["catalysis"] }),
      state({ im: ["fixed_tubing", "mixed"] }),
      state({ sw: [3] }),
      state({ hw: [1, 3] }),
      state({ mt: ["flow_reactor", "liquid_handler"] }),
      state({ mtMatch: "any" }),
      state({ tm: ["robot_arm_gantry"] }),
      state({ tmMatch: "any" }),
      state({ q: "chem speed" }),
    ];
    expect(SPLITS).toEqual(["im", "field", "sw", "hw", "mt", "tm"]);
    for (const split of SPLITS) {
      for (const s of states) {
        const decoded = decodeTrends(encodeTrends(s, split), OFFERED);
        expect(decoded).toEqual({ state: s, split });
        expect(decodeTrends(encodeTrends(decoded.state, decoded.split), OFFERED)).toEqual(decoded);
      }
    }
  });
});

describe("year bins and labels (AC-3)", () => {
  const bins = (from: number | null, to: number | null) => yearBins({ from, to }, 1974, 2026, PARTIAL_YEAR);
  const years2015to2025 = Array.from({ length: 11 }, (_, i) => String(2015 + i));

  it("reads the partial year from the one search-date constant", () => {
    expect(RELEASE_SEARCH_DATE).toEqual({ year: 2026, month: 10, day: 20, text: "20 October 2026" });
    expect(PARTIAL_YEAR).toBe(2026);
    const starred = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => yearLabel(2015 + i, PARTIAL_YEAR)).filter((l) => l.endsWith("*"));
    expect(starred).toEqual(["2026*"]);
  });

  it("gives 13 bins without an applied range", () => {
    const b = bins(null, null);
    expect(b.map((x) => x.label)).toEqual(["before 2015", ...years2015to2025, "2026*"]);
    expect(b.map(yearsText)).toEqual(["-2014", ...years2015to2025.map((y) => `${y}-${y}`), "2026-2026"]);
  });

  it.each<[string, number | null, number | null, string[], string[]]>([
    ["from 2010", 2010, null, ["2010–2014", ...years2015to2025, "2026*"], ["2010-2014"]],
    ["to 2012", null, 2012, ["before 2013"], ["-2012"]],
    ["2016–2020", 2016, 2020, ["2016", "2017", "2018", "2019", "2020"], ["2016-2016"]],
    ["from 2026", 2026, null, ["2026*"], ["2026-2026"]],
    ["2014–2014", 2014, 2014, ["2014"], ["2014-2014"]],
    ["from 1990 to 2018", 1990, 2018, ["1990–2014", "2015", "2016", "2017", "2018"], ["1990-2014"]],
    ["to 2014", null, 2014, ["before 2015"], ["-2014"]],
    ["to 1970", null, 1970, [], []],
    ["from 2030", 2030, null, [], []],
  ])("%s", (_name, from, to, labels, firstYears) => {
    const b = bins(from, to);
    expect(b.map((x) => x.label)).toEqual(labels);
    expect(b.slice(0, 1).map(yearsText)).toEqual(firstYears);
  });

  it("treats inverted year inputs as no applied range", () => {
    const { years, inverted } = yearsFromInputs("2020", "2018");
    expect(inverted).toBe(true);
    expect(yearBins(years, 1974, 2026, PARTIAL_YEAR)).toHaveLength(13);
  });
});

describe("offered split values and link state on a fixture (AC-4, AC-5)", () => {
  it("offers every offered value without a selection", () => {
    expect(offeredSplitValues("im", DEFAULT_STATE, OFFERED)).toEqual(["fixed_tubing", "mixed"]);
    expect(offeredSplitValues("hw", DEFAULT_STATE, OFFERED)).toEqual([1, 2, 3]);
  });

  it("offers the selection, in offered order, for exclusive splits, field and match any", () => {
    expect(offeredSplitValues("im", state({ im: ["mixed"] }), OFFERED)).toEqual(["mixed"]);
    expect(offeredSplitValues("sw", state({ sw: [3, 2] }), OFFERED)).toEqual([2, 3]);
    expect(offeredSplitValues("field", state({ field: ["nanomaterials"] }), OFFERED)).toEqual(["nanomaterials"]);
    expect(offeredSplitValues("mt", state({ mt: ["liquid_handler"], mtMatch: "any" }), OFFERED)).toEqual(["liquid_handler"]);
    expect(offeredSplitValues("tm", state({ tm: ["fixed_tubing"], tmMatch: "any" }), OFFERED)).toEqual(["fixed_tubing"]);
  });

  it("offers every value for mt and tm in match mode all, and ignores other groups' selections", () => {
    expect(offeredSplitValues("mt", state({ mt: ["liquid_handler"] }), OFFERED)).toEqual(["flow_reactor", "liquid_handler"]);
    expect(offeredSplitValues("tm", state({ mt: ["liquid_handler"], mtMatch: "any" }), OFFERED)).toEqual(OFFERED.tm);
  });

  it("builds the bin link state from the bin's years and keeps view", () => {
    const bin: Bin = { label: "2021", years: { from: 2021, to: 2021 } };
    const s = state({ view: "platforms", field: ["catalysis"], years: { from: 2018, to: 2024 } });
    expect(linkState(s, bin, "im")).toEqual({ ...s, years: { from: 2021, to: 2021 } });
  });

  it("sets the split group to the value, or adds it to an mt/tm selection under match all", () => {
    const bin: Bin = { label: "2024", years: { from: 2024, to: 2024 } };
    expect(linkState(state({ im: ["mixed", "fixed_tubing"] }), bin, "im", "mixed").im).toEqual(["mixed"]);
    expect(linkState(DEFAULT_STATE, bin, "sw", 2).sw).toEqual([2]);
    expect(linkState(DEFAULT_STATE, bin, "field", "catalysis").field).toEqual(["catalysis"]);
    const all = state({ mt: ["liquid_handler", "flow_reactor"] });
    expect(linkState(all, bin, "mt", "instrument_optical").mt).toEqual(["flow_reactor", "instrument_optical", "liquid_handler"]);
    expect(linkState(all, bin, "mt", "flow_reactor").mt).toEqual(["flow_reactor", "liquid_handler"]);
    expect(linkState(state({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" }), bin, "mt", "flow_reactor").mt).toEqual(["flow_reactor"]);
    expect(linkState(DEFAULT_STATE, bin, "tm", "fixed_tubing").tm).toEqual(["fixed_tubing"]);
    expect(linkState(state({ tm: ["robot_arm_gantry"] }), bin, "tm", "fixed_tubing").tm).toEqual(["fixed_tubing", "robot_arm_gantry"]);
  });
});

describe("value labels, accessible names and integer ticks (REQ-010, REQ-011)", () => {
  it("labels autonomy levels with their category text and other values as stored", () => {
    expect(valueLabel("im", "fixed_tubing")).toBe("fixed_tubing");
    expect(valueLabel("mt", "flow_reactor")).toBe("flow_reactor");
    expect(valueLabel("sw", 2)).toBe("2 — closed-loop iteration in which results choose the next experiment");
    expect(valueLabel("hw", 3)).toBe("3 — a fully automated laboratory running varied experiments without human intervention");
  });

  it("names segments, cells and bin totals", () => {
    expect(segmentName("2021", "fixed_tubing", 9, 17, "papers")).toBe("2021, fixed_tubing: 9 of 17 papers");
    expect(totalName("2024", 37, "platforms")).toBe("2024: 37 platforms");
  });

  it("gives integer ticks from 0 covering the maximum", () => {
    expect(integerTicks(0)).toEqual([0, 1]);
    expect(integerTicks(1)).toEqual([0, 1]);
    expect(integerTicks(3)).toEqual([0, 1, 2, 3]);
    expect(integerTicks(17)).toEqual([0, 5, 10, 15, 20]);
    expect(integerTicks(39)).toEqual([0, 10, 20, 30, 40]);
    expect(integerTicks(42)).toEqual([0, 10, 20, 30, 40, 50]);
    for (const max of [2, 7, 12, 99, 280]) {
      const t = integerTicks(max);
      expect(t.every(Number.isInteger)).toBe(true);
      expect(t.at(-1)!).toBeGreaterThanOrEqual(max);
    }
  });
});

describe("caption and note texts (AC-8)", () => {
  const units = ["papers", "platforms"] as const;

  it("builds the 17 texts of spec §3 exactly", () => {
    const texts = [
      ...units.flatMap((u) => [...SPLITS.map((s) => caption(s, u)), emptyMessage(u)]),
      PLATFORMS_LINE,
      partialNote(),
      sampleNote(238, 280),
    ];
    expect(texts).toEqual([
      "Papers by first public year, split by integration mode. Each bar is the number of papers matching the filters that were first public in that year; n above the bar is the total. Integration mode is how material moves between the modules of a paper's platforms: the one material transfer mode used (which may be unmapped), mixed when several are used, none when no material connection is coded.",
      "Papers by first public year and field tag. Each cell is the number of papers matching the filters that were first public in that year and have the field tag; n is the number of matching papers first public in that year. A paper can have several field tags, so a column does not add up to n.",
      "Papers by first public year, split by software autonomy. Each bar is the number of papers matching the filters that were first public in that year; n above the bar is the total. The levels are the software autonomy categories of Tom et al. (2024).",
      "Papers by first public year, split by hardware autonomy. Each bar is the number of papers matching the filters that were first public in that year; n above the bar is the total. The levels are the hardware autonomy categories of Tom et al. (2024).",
      "Papers by first public year and module type. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the module type and meets the module type, transfer mode and unit operation filters; n is the number of matching papers first public in that year. A paper can have several module types, so a column does not add up to n.",
      "Papers by first public year and transfer mode. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the transfer mode and meets the module type, transfer mode and unit operation filters; n is the number of matching papers first public in that year. A paper can have several transfer modes, so a column does not add up to n.",
      "No papers match these filters.",
      "Platforms by first public year, split by integration mode. Each bar is the number of platforms matching the filters that were first public in that year; n above the bar is the total. Integration mode is how material moves between the modules of a paper's platforms: the one material transfer mode used (which may be unmapped), mixed when several are used, none when no material connection is coded.",
      "Platforms by first public year and field tag. Each cell is the number of platforms matching the filters that were first public in that year and have the field tag; n is the number of matching platforms first public in that year. A platform can have several field tags, so a column does not add up to n.",
      "Platforms by first public year, split by software autonomy. Each bar is the number of platforms matching the filters that were first public in that year; n above the bar is the total. The levels are the software autonomy categories of Tom et al. (2024).",
      "Platforms by first public year, split by hardware autonomy. Each bar is the number of platforms matching the filters that were first public in that year; n above the bar is the total. The levels are the hardware autonomy categories of Tom et al. (2024).",
      "Platforms by first public year and module type. Each cell is the number of platforms matching the filters that were first public in that year and have the module type; n is the number of matching platforms first public in that year. A platform can have several module types, so a column does not add up to n.",
      "Platforms by first public year and transfer mode. Each cell is the number of platforms matching the filters that were first public in that year and have the transfer mode; n is the number of matching platforms first public in that year. A platform can have several transfer modes, so a column does not add up to n.",
      "No platforms match these filters.",
      "Platforms carry the first public year, field tags, integration mode and autonomy of their paper.",
      "* 2026 is partial: the search ran on 20 October 2026.",
      "The counts cover the 238 papers (280 platforms) that passed the screening described in the data card (DATA_CARD.md in the release files on Zenodo), not every paper on self-driving laboratories.",
    ]);
    expect(BANNED_SUBSTRINGS).toHaveLength(17);
    for (const t of texts) {
      expect(t).not.toContain("%");
      for (const b of BANNED_SUBSTRINGS) expect(t.toLowerCase(), `${b} in: ${t}`).not.toContain(b);
    }
  });
});

describe.skipIf(!dataAvailable)("offered values, links and count tables on the real index (AC-4 to AC-6)", () => {
  const index = dataAvailable ? readIndex() : { papers: [], platforms: [] };
  const offered = offeredValues(index);
  const S = (query: string) => decodeTrends(query, offered);
  const table = (query: string) => {
    const { state: s, split } = S(query);
    return countTable(s, split, index);
  };
  const row = (t: ReturnType<typeof countTable>, v: string | number) => t.counts[t.values.indexOf(v)];
  const countLine = (s: FilterState) => matchingPapers(s, index.papers, index.platforms).length;

  it("offers the values of AC-4", () => {
    expect(offeredSplitValues("im", DEFAULT_STATE, offered)).toEqual([
      "fixed_tubing", "human_transfer", "mixed", "mobile_robot", "none", "robot_arm_gantry", "unmapped",
    ]);
    expect(offeredSplitValues("sw", DEFAULT_STATE, offered)).toEqual([2, 3]);
    expect(offeredSplitValues("hw", DEFAULT_STATE, offered)).toEqual([1, 2, 3]);
    expect(offeredSplitValues("field", DEFAULT_STATE, offered)).toHaveLength(9);
    const mt = offeredSplitValues("mt", DEFAULT_STATE, offered);
    expect([mt.length, mt[0], mt.at(-1)]).toEqual([22, "assembly_unit", "unmapped"]);
    expect(offeredSplitValues("tm", DEFAULT_STATE, offered)).toEqual([
      "fixed_tubing", "human_transfer", "mobile_robot", "robot_arm_gantry", "unmapped",
    ]);
    expect(offeredSplitValues("im", S("im=robot_arm_gantry,mixed").state, offered)).toEqual(["mixed", "robot_arm_gantry"]);
    expect(offeredSplitValues("field", S("field=nanomaterials").state, offered)).toEqual(["nanomaterials"]);
    expect(offeredSplitValues("mt", S("mt=flow_reactor,liquid_handler").state, offered)).toHaveLength(22);
    expect(offeredSplitValues("mt", S("mt=flow_reactor,liquid_handler&mtMatch=any").state, offered)).toEqual([
      "flow_reactor", "liquid_handler",
    ]);
    expect(offeredSplitValues("tm", S("mt=flow_reactor,liquid_handler&mtMatch=any").state, offered)).toHaveLength(5);
  });

  it.each<[string, string, string | number, number, number, string]>([
    ["", "2021", "fixed_tubing", 9, 17, "#/browse?years=2021-2021&im=fixed_tubing"],
    ["", "before 2015", "fixed_tubing", 15, 27, "#/browse?years=-2014&im=fixed_tubing"],
    ["view=platforms", "2024", "robot_arm_gantry", 3, 37, "#/browse?view=platforms&years=2024-2024&im=robot_arm_gantry"],
    ["split=sw", "2021", 2, 17, 17, "#/browse?years=2021-2021&sw=2"],
    ["split=field", "2021", "catalysis", 1, 17, "#/browse?years=2021-2021&field=catalysis"],
    ["split=field", "2025", "nanomaterials", 16, 39, "#/browse?years=2025-2025&field=nanomaterials"],
    ["split=mt", "2025", "flow_reactor", 10, 39, "#/browse?years=2025-2025&mt=flow_reactor"],
    ["view=platforms&split=mt", "2025", "flow_reactor", 10, 41, "#/browse?view=platforms&years=2025-2025&mt=flow_reactor"],
    ["mt=flow_reactor,liquid_handler&split=mt", "2024", "instrument_optical", 1, 4, "#/browse?years=2024-2024&mt=flow_reactor,instrument_optical,liquid_handler"],
    ["mt=flow_reactor,liquid_handler&split=mt", "2024", "flow_reactor", 4, 4, "#/browse?years=2024-2024&mt=flow_reactor,liquid_handler"],
    ["mt=flow_reactor,liquid_handler&mtMatch=any&split=mt", "2024", "flow_reactor", 15, 23, "#/browse?years=2024-2024&mt=flow_reactor&mtMatch=any"],
    ["mt=flow_reactor,liquid_handler&mtMatch=any&split=mt", "2024", "liquid_handler", 12, 23, "#/browse?years=2024-2024&mt=liquid_handler&mtMatch=any"],
  ])("trends ?%s, %s, %s → %i of %i, %s", (query, label, value, count, n, link) => {
    const { state: s, split } = S(query);
    const t = countTable(s, split, index);
    const i = t.bins.findIndex((b) => b.label === label);
    expect(row(t, value)![i]).toBe(count);
    expect(t.n[i]).toBe(n);
    expect(browseHash(linkState(s, t.bins[i]!, split, value))).toBe(link);
  });

  it("gives the bin link state of 2010–2014 under years=2010-&split=tm", () => {
    const t = table("years=2010-&split=tm");
    expect(t.bins[0]!.label).toBe("2010–2014");
    expect(t.bins[0]!.years).toEqual({ from: 2010, to: 2014 });
    expect(t.n[0]).toBe(11);
  });

  it("gives the unfiltered bin totals and the full im table (AC-6)", () => {
    expect(table("").n).toEqual([27, 4, 5, 3, 12, 7, 16, 17, 18, 26, 28, 39, 36]);
    expect(table("view=platforms").n).toEqual([28, 4, 6, 4, 24, 8, 22, 17, 20, 27, 37, 41, 42]);
    const t = table("");
    expect(t.values).toEqual(["fixed_tubing", "human_transfer", "mixed", "mobile_robot", "none", "robot_arm_gantry", "unmapped"]);
    expect(t.counts).toEqual([
      [15, 2, 4, 1, 11, 4, 8, 9, 9, 10, 9, 9, 8],
      [1, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 2, 1],
      [2, 2, 1, 2, 1, 2, 3, 3, 5, 7, 14, 13, 10],
      [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 3],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2],
      [7, 0, 0, 0, 0, 1, 4, 4, 1, 7, 3, 12, 11],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ]);
  });

  it("sums every column of an exclusive split to its n", () => {
    for (const split of ["im", "sw", "hw"] as const) {
      for (const view of ["papers", "platforms"] as const) {
        const t = countTable(state({ view }), split, index);
        t.n.forEach((n, i) => expect(t.counts.reduce((sum, r) => sum + r[i]!, 0)).toBe(n));
      }
    }
  });

  it("gives the filtered tables of AC-6", () => {
    const papers = table("years=2018-2024&field=catalysis");
    const platforms = table("view=platforms&years=2018-2024&field=catalysis");
    expect(papers.bins.map((b) => b.label)).toEqual(["2018", "2019", "2020", "2021", "2022", "2023", "2024"]);
    expect(papers.n).toEqual([1, 2, 1, 1, 1, 2, 3]);
    expect(platforms.n).toEqual([1, 2, 1, 1, 1, 2, 3]);
    expect(papers.values).toHaveLength(7);
    expect(row(papers, "fixed_tubing")).toEqual([1, 2, 0, 1, 0, 0, 1]);
    expect(row(papers, "mixed")).toEqual([0, 0, 0, 0, 0, 2, 1]);
    expect(row(papers, "mobile_robot")).toEqual([0, 0, 1, 0, 1, 0, 1]);
    for (const v of ["human_transfer", "none", "robot_arm_gantry", "unmapped"]) expect(row(papers, v)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(countLine(S("years=2018-2024&field=catalysis").state)).toBe(11);

    const all = table("mt=flow_reactor,liquid_handler&split=mt");
    expect(all.n).toEqual([1, 1, 1, 0, 4, 3, 1, 0, 1, 1, 4, 0, 2]);
    expect(all.values).toHaveLength(22);
    expect(row(all, "flow_reactor")).toEqual(all.n);
    expect(row(all, "liquid_handler")).toEqual(all.n);
    expect(countLine(S("mt=flow_reactor,liquid_handler").state)).toBe(19);

    const any = table("mt=flow_reactor,liquid_handler&mtMatch=any&split=mt");
    expect(any.n).toEqual([23, 3, 4, 2, 11, 6, 10, 12, 12, 18, 23, 31, 21]);
    expect(row(any, "flow_reactor")).toEqual([13, 3, 4, 2, 11, 4, 6, 7, 7, 9, 15, 10, 8]);
    expect(row(any, "liquid_handler")).toEqual([11, 1, 1, 0, 4, 5, 5, 5, 6, 10, 12, 22, 15]);
    expect(countLine(S("mt=flow_reactor,liquid_handler&mtMatch=any").state)).toBe(176);

    const im = table("im=mixed,robot_arm_gantry");
    expect(im.values).toEqual(["mixed", "robot_arm_gantry"]);
    expect(im.n[0]).toBe(9);
    expect(countLine(S("im=mixed,robot_arm_gantry").state)).toBe(115);

    for (const t of [papers, all, any, im]) expect(t.n.reduce((a, b) => a + b, 0)).toBe(t.total);
    expect([papers.total, all.total, any.total, im.total]).toEqual([11, 19, 176, 115]);
  });
});

describe("unit-operation filter on the dashboard (SPEC-TAXO-001 AC-8)", () => {
  it("decodes uo with a split and encodes it back; uo is not a split", () => {
    const decoded = decodeTrends("uo=sonicate&split=mt", OFFERED);
    expect(decoded.state.uo).toEqual(["sonicate"]);
    expect(decoded.split).toBe("mt");
    expect(encodeTrends(decoded.state, decoded.split)).toBe("uo=sonicate&split=mt");
    expect(decodeTrends("split=uo", OFFERED).split).toBe("im");
    expect(SPLITS).toEqual(["im", "field", "sw", "hw", "mt", "tm"]);
  });

  it.skipIf(!dataAvailable)("counts 5 of 238 papers for #/trends?uo=sonicate and links the same browse state", () => {
    const index = readIndex();
    const { state: s } = decodeTrends("uo=sonicate", offeredValues(index));
    expect(rowCount(s, index)).toBe(5);
    expect(browseHash(s)).toBe("#/browse?uo=sonicate");
  });
});

// SPEC-RELEASE-001 REQ-009: autonomy written out in the split labels.
describe("split labels (SPEC-RELEASE-001)", () => {
  it("writes software and hardware autonomy in full", () => {
    expect(SPLIT_LABELS.sw).toBe("Software autonomy");
    expect(SPLIT_LABELS.hw).toBe("Hardware autonomy");
  });
});
