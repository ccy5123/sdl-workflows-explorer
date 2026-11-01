// Number of active filters shown on the filter toggle (follow-up to SPEC-BROWSE-001).
import { describe, expect, it } from "vitest";
import { activeFilterCount, DEFAULT_STATE } from "../src/lib/filterState";

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
