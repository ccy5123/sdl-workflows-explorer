// AC-4 and AC-5: row predicates over paper and platform rows (REQ-005, REQ-006, REQ-007).
import { describe, expect, it } from "vitest";
import type { PaperRow, PlatformRow } from "../src/data/types";
import { matchingPapers, matchingPlatforms } from "../src/lib/filterApply";
import { DEFAULT_STATE, type FilterState } from "../src/lib/filterState";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("filterApply.test.ts");

const paper = (p: Pick<PaperRow, "paper_id" | "title" | "first_public_year" | "field_tags" | "integration_mode" | "sw_autonomy" | "hw_autonomy">): PaperRow => ({
  doi: "",
  venue: "",
  hardware_location: "",
  n_platforms: 0,
  ...p,
});

const platform = (
  of: PaperRow,
  suffix: string,
  platform_name: string | null,
  module_types: string[],
  material_transfer_modes: string[],
): PlatformRow => ({
  platform_id: `${of.paper_id}/${suffix}`,
  paper_id: of.paper_id,
  platform_name,
  first_public_year: of.first_public_year,
  field_tags: of.field_tags,
  commercial_integrated: false,
  identity_id: "",
  n_modules: 0,
  n_steps: 0,
  module_types,
  material_transfer_modes,
});

const alpha = paper({
  paper_id: "Alpha2020",
  title: "Catalyst screening",
  first_public_year: 2020,
  field_tags: ["catalysis"],
  integration_mode: "fixed_tubing",
  sw_autonomy: 2,
  hw_autonomy: 2,
});
const beta = paper({
  paper_id: "Beta2015",
  title: "Nanoparticle synthesis",
  first_public_year: 2015,
  field_tags: ["catalysis", "nanomaterials"],
  integration_mode: "mixed",
  sw_autonomy: 3,
  hw_autonomy: 1,
});
const PAPERS = [alpha, beta];
const PLATFORMS = [
  platform(alpha, "P1", "Flow rig", ["flow_reactor", "software"], ["fixed_tubing"]),
  platform(beta, "P1", null, ["liquid_handler"], ["robot_arm_gantry"]),
  platform(beta, "P2", "Beta line", ["flow_reactor"], ["fixed_tubing"]),
];

const run = (patch: Partial<FilterState>, papers = PAPERS, platforms = PLATFORMS) => {
  const s = { ...DEFAULT_STATE, ...patch };
  return {
    papers: matchingPapers(s, papers, platforms).map((p) => p.paper_id),
    platforms: matchingPlatforms(s, papers, platforms).map((p) => p.platform_id),
  };
};

describe("filter rules on the fixture (AC-4)", () => {
  it("passes everything for the empty state", () => {
    expect(run({})).toEqual({ papers: ["Alpha2020", "Beta2015"], platforms: ["Alpha2020/P1", "Beta2015/P1", "Beta2015/P2"] });
  });

  it("tests platform rows against paper-level filters through their paper", () => {
    expect(run({ im: ["mixed"] })).toEqual({ papers: ["Beta2015"], platforms: ["Beta2015/P1", "Beta2015/P2"] });
    expect(run({ sw: [2] })).toEqual({ papers: ["Alpha2020"], platforms: ["Alpha2020/P1"] });
    expect(run({ hw: [1, 2] }).papers).toEqual(["Alpha2020", "Beta2015"]);
  });

  it("requires one platform with every value under 'all'; any value under 'any'", () => {
    expect(run({ mt: ["flow_reactor", "liquid_handler"] })).toEqual({ papers: [], platforms: [] });
    expect(run({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" })).toEqual({
      papers: ["Alpha2020", "Beta2015"],
      platforms: ["Alpha2020/P1", "Beta2015/P1", "Beta2015/P2"],
    });
    expect(run({ tm: ["fixed_tubing", "robot_arm_gantry"], tmMatch: "any" }).papers).toEqual(["Alpha2020", "Beta2015"]);
    expect(run({ tm: ["fixed_tubing", "robot_arm_gantry"] }).papers).toEqual([]);
  });

  it("applies both platform-level filters to the same platform", () => {
    expect(run({ mt: ["flow_reactor"], tm: ["robot_arm_gantry"] })).toEqual({ papers: [], platforms: [] });
  });

  it("combines paper-level and platform-level filters", () => {
    expect(run({ mt: ["flow_reactor"], im: ["mixed"] })).toEqual({ papers: ["Beta2015"], platforms: ["Beta2015/P2"] });
  });

  it("applies the year range inclusively on both ends", () => {
    expect(run({ years: { from: 2016, to: 2020 } }).papers).toEqual(["Alpha2020"]);
    expect(run({ years: { from: 2015, to: 2015 } }).papers).toEqual(["Beta2015"]);
    expect(run({ years: { from: 2020, to: null } }).platforms).toEqual(["Alpha2020/P1"]);
    expect(run({ years: { from: null, to: 2015 } }).platforms).toEqual(["Beta2015/P1", "Beta2015/P2"]);
  });

  it("applies field tags to each row's own tags", () => {
    expect(run({ field: ["nanomaterials"] })).toEqual({ papers: ["Beta2015"], platforms: ["Beta2015/P1", "Beta2015/P2"] });
  });

  it("searches ids, titles and names, trimmed and case-insensitively", () => {
    expect(run({ q: "  BETA " })).toEqual({ papers: ["Beta2015"], platforms: ["Beta2015/P1", "Beta2015/P2"] });
    expect(run({ q: "flow rig" })).toEqual({ papers: [], platforms: ["Alpha2020/P1"] });
    expect(run({ q: "screening" })).toEqual({ papers: ["Alpha2020"], platforms: [] });
    expect(run({ q: "null" }).platforms).toEqual([]);
  });

  it("fails paper-level filters for a platform whose paper row is missing", () => {
    const orphan = platform(paper({ ...alpha, paper_id: "Gone1999" }), "P1", "x", [], []);
    expect(run({ im: ["fixed_tubing"] }, PAPERS, [...PLATFORMS, orphan]).platforms).toEqual(["Alpha2020/P1"]);
    expect(run({}, PAPERS, [...PLATFORMS, orphan]).platforms).toContain("Gone1999/P1");
  });
});

describe.skipIf(!dataAvailable)("filter counts on the real index (AC-5)", () => {
  const index = dataAvailable ? readIndex() : { papers: [], platforms: [] };
  const count = (patch: Partial<FilterState>) => {
    const r = run(patch, index.papers, index.platforms);
    return [r.papers.length, r.platforms.length];
  };

  it.each<[string, Partial<FilterState>, number, number]>([
    ["default", {}, 238, 280],
    ["years 2018-2024", { years: { from: 2018, to: 2024 } }, 124, 155],
    ["years from 2026", { years: { from: 2026, to: null } }, 36, 42],
    ["years to 2014", { years: { from: null, to: 2014 } }, 27, 28],
    ["field catalysis, nanomaterials", { field: ["catalysis", "nanomaterials"] }, 66, 68],
    ["im mixed", { im: ["mixed"] }, 65, 86],
    ["im fixed_tubing, mobile_robot", { im: ["fixed_tubing", "mobile_robot"] }, 105, 125],
    ["sw 3", { sw: [3] }, 4, 4],
    ["hw 1, 3", { hw: [1, 3] }, 9, 9],
    ["mt flow_reactor", { mt: ["flow_reactor"] }, 99, 127],
    ["mt flow_reactor, liquid_handler, all", { mt: ["flow_reactor", "liquid_handler"] }, 19, 25],
    ["mt flow_reactor, liquid_handler, any", { mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" }, 176, 209],
    ["tm fixed_tubing, robot_arm_gantry, all", { tm: ["fixed_tubing", "robot_arm_gantry"] }, 21, 24],
    ["tm fixed_tubing, robot_arm_gantry, any", { tm: ["fixed_tubing", "robot_arm_gantry"], tmMatch: "any" }, 214, 254],
    ["mt flow_reactor and tm robot_arm_gantry", { mt: ["flow_reactor"], tm: ["robot_arm_gantry"] }, 9, 9],
    ["q chemspeed", { q: "chemspeed" }, 0, 3],
    ["years 2018-2024, field catalysis, mt flow_reactor", { years: { from: 2018, to: 2024 }, field: ["catalysis"], mt: ["flow_reactor"] }, 6, 6],
  ])("%s → %i papers, %i platforms", (_name, patch, papers, platforms) => {
    expect(count(patch)).toEqual([papers, platforms]);
  });

  it("excludes Zhang2025b when its values sit on different platforms", () => {
    const all = run({ mt: ["flow_reactor", "liquid_handler"] }, index.papers, index.platforms).papers;
    const mixed = run({ mt: ["flow_reactor"], tm: ["robot_arm_gantry"] }, index.papers, index.platforms).papers;
    const any = run({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" }, index.papers, index.platforms).papers;
    expect(all).not.toContain("Zhang2025b");
    expect(mixed).not.toContain("Zhang2025b");
    expect(any).toContain("Zhang2025b");
  });

  it("matches exactly three platforms for 'chemspeed'", () => {
    expect(run({ q: "chemspeed" }, index.papers, index.platforms).platforms).toEqual([
      "Christensen2021/P1",
      "Moosavi2019/P1",
      "StriethKalthoff2024/P2",
    ]);
  });
});
