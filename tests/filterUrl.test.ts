// AC-2 and AC-3: filter state, offered values and the browse URL format (REQ-002, REQ-004).
import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  clearFilters,
  offeredValues,
  yearsFromInputs,
  type FilterState,
  type Offered,
} from "../src/lib/filterState";
import { browseHash, decodeFilters, encodeFilters } from "../src/lib/filterUrl";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("filterUrl.test.ts");

// Offered values of a small index; the real index is used in the AC-3 block below.
const OFFERED: Offered = {
  field: ["catalysis", "nanomaterials"],
  im: ["fixed_tubing", "mixed"],
  sw: [2, 3],
  hw: [1, 2, 3],
  mt: ["flow_reactor", "liquid_handler"],
  tm: ["fixed_tubing", "robot_arm_gantry"],
};

const state = (patch: Partial<FilterState>): FilterState => ({ ...DEFAULT_STATE, ...patch });

const EXAMPLE = state({
  view: "platforms",
  years: { from: 2018, to: 2024 },
  field: ["nanomaterials", "catalysis"],
  mt: ["flow_reactor"],
  mtMatch: "any",
  q: "chem speed",
});

describe("encodeFilters (AC-2)", () => {
  it("encodes the default state to an empty query and the hash #/browse", () => {
    expect(encodeFilters(DEFAULT_STATE)).toBe("");
    expect(browseHash(DEFAULT_STATE)).toBe("#/browse");
  });

  it("writes only non-default parameters, in table order, lists sorted", () => {
    expect(encodeFilters(EXAMPLE)).toBe(
      "view=platforms&years=2018-2024&field=catalysis,nanomaterials&mt=flow_reactor&mtMatch=any&q=chem%20speed",
    );
    expect(browseHash(EXAMPLE)).toBe(`#/browse?${encodeFilters(EXAMPLE)}`);
  });

  it("encodes open year ranges", () => {
    expect(encodeFilters(state({ years: { from: 2026, to: null } }))).toBe("years=2026-");
    expect(encodeFilters(state({ years: { from: null, to: 2014 } }))).toBe("years=-2014");
  });

  it("percent-encodes the search text, trims it and drops duplicates in lists", () => {
    expect(encodeFilters(state({ q: "a,b&c" }))).toBe("q=a%2Cb%26c");
    expect(decodeFilters("q=a%2Cb%26c", OFFERED).q).toBe("a,b&c");
    expect(encodeFilters(state({ q: "  x  " }))).toBe("q=x");
    expect(encodeFilters(state({ q: "   " }))).toBe("");
    expect(encodeFilters(state({ sw: [3, 2, 3] }))).toBe("sw=2,3");
  });

  it("round-trips each parameter alone and the example state", () => {
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
      EXAMPLE,
    ];
    for (const s of states) {
      const decoded = decodeFilters(encodeFilters(s), OFFERED);
      expect(decodeFilters(encodeFilters(decoded), OFFERED)).toEqual(decoded);
      expect(decoded).toEqual({
        ...s,
        field: [...s.field].sort(),
        q: s.q.trim(),
      });
    }
  });
});

describe("decodeFilters (AC-3, small index)", () => {
  it("returns the default state for an empty query", () => {
    expect(decodeFilters("", OFFERED)).toEqual(DEFAULT_STATE);
  });

  it("reads only the last occurrence; an invalid last occurrence gives the default", () => {
    expect(decodeFilters("view=papers&view=platforms", OFFERED).view).toBe("platforms");
    expect(decodeFilters("view=platforms&view=tables", OFFERED).view).toBe("papers");
    expect(decodeFilters("field=catalysis&field=bogus", OFFERED).field).toEqual([]);
  });

  it("drops malformed year ranges", () => {
    for (const q of ["years=18-24", "years=2018", "years=abcd-2020", "years=2024-2018", "years=-", "years=2018-2020-2022"]) {
      expect(decodeFilters(q, OFFERED).years).toEqual({ from: null, to: null });
    }
    expect(decodeFilters("years=2018-", OFFERED).years).toEqual({ from: 2018, to: null });
    expect(decodeFilters("years=-2014", OFFERED).years).toEqual({ from: null, to: 2014 });
    expect(decodeFilters("years=2020-2020", OFFERED).years).toEqual({ from: 2020, to: 2020 });
  });

  it("sorts and de-duplicates lists, numerically for autonomy", () => {
    expect(decodeFilters("field=nanomaterials,catalysis", OFFERED).field).toEqual(["catalysis", "nanomaterials"]);
    expect(decodeFilters("field=catalysis,catalysis", OFFERED).field).toEqual(["catalysis"]);
    expect(decodeFilters("sw=3,2", OFFERED).sw).toEqual([2, 3]);
    expect(decodeFilters("hw=03,1.0,2", OFFERED).hw).toEqual([2]);
  });

  it("keeps + literally, trims the search and ignores malformed escapes", () => {
    expect(decodeFilters("q=a+b", OFFERED).q).toBe("a+b");
    expect(decodeFilters("q=%20x%20", OFFERED).q).toBe("x");
    expect(decodeFilters("q=%E0%A4%A", OFFERED).q).toBe("");
    expect(decodeFilters("q=x&q=%E0%A4%A", OFFERED).q).toBe("");
  });

  it("ignores parameters without a value and bare words", () => {
    expect(decodeFilters("view&mtMatch=&=x&tmMatch=any", OFFERED)).toEqual(state({ tmMatch: "any" }));
  });

  it("never throws on odd input", () => {
    for (const q of ["%", "&&&", "field=%E0%A4%A", "mt=,,", "view=%"]) {
      expect(() => decodeFilters(q, OFFERED)).not.toThrow();
    }
    expect(decodeFilters("field=%E0%A4%A,catalysis", OFFERED).field).toEqual(["catalysis"]);
  });
});

describe("yearsFromInputs and clearFilters (REQ-004)", () => {
  it("applies four-digit years only, and not when From is after To", () => {
    expect(yearsFromInputs("2018", "2024")).toEqual({ years: { from: 2018, to: 2024 }, inverted: false });
    expect(yearsFromInputs("201", "")).toEqual({ years: { from: null, to: null }, inverted: false });
    expect(yearsFromInputs(" 2026 ", "")).toEqual({ years: { from: 2026, to: null }, inverted: false });
    expect(yearsFromInputs("", "2014")).toEqual({ years: { from: null, to: 2014 }, inverted: false });
    expect(yearsFromInputs("2024", "2018")).toEqual({ years: { from: null, to: null }, inverted: true });
    expect(yearsFromInputs("2024", "20")).toEqual({ years: { from: 2024, to: null }, inverted: false });
  });

  it("clearFilters resets every filter and keeps the view", () => {
    expect(clearFilters(EXAMPLE)).toEqual(state({ view: "platforms" }));
    expect(clearFilters(state({ sw: [3], tmMatch: "any" }))).toEqual(DEFAULT_STATE);
  });

  it("offeredValues sorts alphabetically and autonomy numerically", () => {
    const off = offeredValues({
      papers: [
        { field_tags: ["b", "a"], integration_mode: "mixed", sw_autonomy: 3, hw_autonomy: 10 },
        { field_tags: ["a"], integration_mode: "fixed_tubing", sw_autonomy: 2, hw_autonomy: 9 },
      ],
      platforms: [
        { module_types: ["z", "y"], material_transfer_modes: ["m"] },
        { module_types: ["y"], material_transfer_modes: [] },
      ],
    });
    expect(off).toEqual({ field: ["a", "b"], im: ["fixed_tubing", "mixed"], sw: [2, 3], hw: [9, 10], mt: ["y", "z"], tm: ["m"] });
  });
});

describe.skipIf(!dataAvailable)("decodeFilters and offeredValues on the real index (AC-3)", () => {
  const offered = dataAvailable ? offeredValues(readIndex()) : OFFERED;

  it("drops unknown parameters and values not offered", () => {
    expect(
      decodeFilters("foo=1&view=tables&years=2024-2018&field=catalysis,not_a_tag&sw=4,3&mtMatch=some&q=%E0%A4%A", offered),
    ).toEqual(state({ field: ["catalysis"], sw: [3] }));
  });

  it("offers the values present in index.json", () => {
    expect(offered.field).toEqual([
      "analytical_chemistry",
      "battery_electrochem",
      "biology_biochem",
      "catalysis",
      "chemistry_synthesis",
      "materials_inorganic",
      "materials_polymer_soft",
      "materials_thin_film",
      "nanomaterials",
    ]);
    expect(offered.im).toEqual(["fixed_tubing", "human_transfer", "mixed", "mobile_robot", "none", "robot_arm_gantry", "unmapped"]);
    expect(offered.sw).toEqual([2, 3]);
    expect(offered.hw).toEqual([1, 2, 3]);
    expect(offered.mt).toHaveLength(22);
    expect(offered.mt[0]).toBe("assembly_unit");
    expect(offered.mt[21]).toBe("unmapped");
    expect(offered.mt).toEqual([...offered.mt].sort());
    expect(offered.tm).toEqual(["fixed_tubing", "human_transfer", "mobile_robot", "robot_arm_gantry", "unmapped"]);
  });
});
