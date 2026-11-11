// Number of active filters shown on the filter toggle (follow-up to SPEC-BROWSE-001).
import { describe, expect, it } from "vitest";
import { activeFilterCount, autonomyText, clearFilters, DEFAULT_STATE } from "../src/lib/filterState";

describe("activeFilterCount", () => {
  it("is 0 for the default state, whatever table is shown or match mode is set", () => {
    expect(activeFilterCount(DEFAULT_STATE)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_STATE, view: "platforms", mtMatch: "any", tmMatch: "any" })).toBe(0);
  });

  it("counts the year range once, each non-empty group once and a non-blank search", () => {
    expect(activeFilterCount({ ...DEFAULT_STATE, years: { from: 2018, to: null } })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_STATE, years: { from: 2018, to: 2024 } })).toBe(1);
    expect(
      activeFilterCount({
        ...DEFAULT_STATE,
        field: ["catalysis", "nanomaterials"],
        im: ["mixed"],
        sw: [3],
        hw: [1],
        mt: ["flow_reactor"],
        tm: ["fixed_tubing"],
        q: "flow",
      }),
    ).toBe(7);
  });

  it("does not count a search of only spaces", () => {
    expect(activeFilterCount({ ...DEFAULT_STATE, q: "   " })).toBe(0);
  });
});

describe("unit-operation filter state (SPEC-TAXO-001 AC-7)", () => {
  it("defaults to no unit operation and match mode all", () => {
    expect(DEFAULT_STATE.uo).toEqual([]);
    expect(DEFAULT_STATE.uoMatch).toBe("all");
  });

  it("counts a non-empty uo as one filter, and uoMatch alone as none", () => {
    expect(activeFilterCount({ ...DEFAULT_STATE, uo: ["sonicate"] })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_STATE, uo: ["mix", "sonicate"], mt: ["flow_reactor"] })).toBe(2);
    expect(activeFilterCount({ ...DEFAULT_STATE, uoMatch: "any" })).toBe(0);
  });

  it("clearFilters resets uo and uoMatch and keeps the view", () => {
    expect(clearFilters({ ...DEFAULT_STATE, view: "platforms", uo: ["mix"], uoMatch: "any" })).toEqual({
      ...DEFAULT_STATE,
      view: "platforms",
    });
  });
});

describe("autonomyText", () => {
  it("gives the level with its scale and what the level means", () => {
    expect(autonomyText("sw", 2)).toEqual({
      short: "2 of 3",
      long: "Software autonomy level 2 of 3: closed-loop iteration in which results choose the next experiment",
    });
    expect(autonomyText("hw", 1).long).toBe("Hardware autonomy level 1 of 3: a device doing one kind of task");
  });
});
