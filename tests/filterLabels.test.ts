// SPEC-UI-001 AC-25: filter groups, option labels and active-filter pills of the filter bar (REQ-025).
import { describe, expect, it } from "vitest";
import { DISPLAY_GROUPS, FILTER_GROUPS, filterPills, optionLabel } from "../src/lib/filterLabels";
import { DEFAULT_STATE } from "../src/lib/filterState";

describe("FILTER_GROUPS", () => {
  it("lists the eight popover groups in bar order with their legends", () => {
    expect(FILTER_GROUPS.map((g) => [g.key, g.legend])).toEqual([
      ["field", "Field tag"],
      ["im", "Integration mode"],
      ["sw", "Software autonomy"],
      ["hw", "Hardware autonomy"],
      ["mt", "Module types"],
      ["tech", "Techniques"],
      ["tm", "Transfer modes"],
      ["uo", "Unit operations"],
    ]);
    expect(FILTER_GROUPS.filter((g) => g.match).map((g) => g.match)).toEqual(["mtMatch", "techMatch", "tmMatch", "uoMatch"]);
  });
});

describe("optionLabel", () => {
  it("gives readable names with the code for vocabulary groups", () => {
    expect(optionLabel("field", "chemistry_synthesis")).toEqual({ name: "Chemistry synthesis", code: "chemistry_synthesis" });
    expect(optionLabel("mt", "instrument_separation_ms")).toEqual({ name: "Separation / MS instrument", code: "instrument_separation_ms" });
    expect(optionLabel("tm", "robot_arm_gantry")).toEqual({ name: "Robot arm / gantry", code: "robot_arm_gantry" });
    expect(optionLabel("uo", "react_flow")).toEqual({ name: "Flow reaction", code: "react_flow" });
    expect(optionLabel("im", "mixed")).toEqual({ name: "Mixed", code: "mixed" });
  });

  it("gives the autonomy levels their texts and no code", () => {
    expect(optionLabel("sw", 3)).toEqual({ name: "3 — closed-loop iteration over an algorithm-generated search space", code: null });
    expect(optionLabel("hw", 1)).toEqual({ name: "1 — a device doing one kind of task", code: null });
  });
});

describe("filterPills", () => {
  it("is empty for the default state", () => {
    expect(filterPills(DEFAULT_STATE)).toEqual([]);
  });

  it("lists the year range, each selected value in group order, then the search", () => {
    const pills = filterPills({
      ...DEFAULT_STATE,
      years: { from: 2018, to: 2024 },
      mt: ["flow_reactor"],
      field: ["catalysis", "biology_biochem"],
      sw: [2],
      q: "  Aand ",
    });
    expect(pills.map((p) => [p.id, p.text, p.removeLabel])).toEqual([
      ["years", "2018–2024", "Remove Year: 2018–2024"],
      ["field:catalysis", "Catalysis", "Remove Field tag: Catalysis"],
      ["field:biology_biochem", "Biology and biochemistry", "Remove Field tag: Biology and biochemistry"],
      ["sw:2", "Software autonomy 2", "Remove Software autonomy: 2"],
      ["mt:flow_reactor", "Flow reactor", "Remove Module types: Flow reactor"],
      ["q", "“Aand”", "Remove search: Aand"],
    ]);
  });

  it("writes an open-ended year range with a sign", () => {
    expect(filterPills({ ...DEFAULT_STATE, years: { from: 2020, to: null } })[0]!.text).toBe("from 2020");
    expect(filterPills({ ...DEFAULT_STATE, years: { from: null, to: 2015 } })[0]!.text).toBe("to 2015");
  });

  it("removes a pill's filter and nothing else", () => {
    const state = { ...DEFAULT_STATE, view: "platforms" as const, field: ["catalysis", "biology_biochem"], q: "x", years: { from: 2018, to: null } };
    const [years, catalysis, , q] = filterPills(state);
    expect(years!.remove(state)).toEqual({ ...state, years: { from: null, to: null } });
    expect(catalysis!.remove(state)).toEqual({ ...state, field: ["biology_biochem"] });
    expect(q!.remove(state)).toEqual({ ...state, q: "" });
  });
});

describe("DISPLAY_GROUPS", () => {
  it("puts field tag, module types and unit operations first, then the other groups in bar order", () => {
    expect(DISPLAY_GROUPS.map((g) => g.key)).toEqual(["field", "mt", "tech", "uo", "im", "sw", "hw", "tm"]);
  });
});
