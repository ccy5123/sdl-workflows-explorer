// AC-4 and AC-5: row predicates over paper and platform rows (REQ-005, REQ-006, REQ-007).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PaperRow, PlatformRow, SearchJson } from "../src/data/types";
import { matchingPapers, matchingPlatforms } from "../src/lib/filterApply";
import { DEFAULT_STATE, type FilterState } from "../src/lib/filterState";
import { expectedRelease, pinnedReleaseExtracted, type Filter } from "./release-expect";
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
  unit_operations: [],
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
    // SPEC-TECH-001 REQ-005: a paper matches when one of its platforms matches, the platform's name included.
    expect(run({ q: "flow rig" })).toEqual({ papers: ["Alpha2020"], platforms: ["Alpha2020/P1"] });
    expect(run({ q: "screening" })).toEqual({ papers: ["Alpha2020"], platforms: [] });
    expect(run({ q: "null" }).platforms).toEqual([]);
  });

  it("also searches the module names stated in the paper, for the platform and for its paper", () => {
    const named = [
      { ...PLATFORMS[0]!, module_names: ["HPLC pumps", "Chemspeed SWING"] },
      PLATFORMS[1]!,
      { ...PLATFORMS[2]!, module_names: ["syringe pump"] },
    ];
    expect(run({ q: "chemspeed" }, PAPERS, named)).toEqual({ papers: ["Alpha2020"], platforms: ["Alpha2020/P1"] });
    expect(run({ q: " PUMP" }, PAPERS, named)).toEqual({ papers: ["Alpha2020", "Beta2015"], platforms: ["Alpha2020/P1", "Beta2015/P2"] });
    // Rows without module names (search.json not loaded) are searched by ids, titles and names only.
    expect(run({ q: "pump" })).toEqual({ papers: [], platforms: [] });
  });

  it("fails paper-level filters for a platform whose paper row is missing", () => {
    const orphan = platform(paper({ ...alpha, paper_id: "Gone1999" }), "P1", "x", [], []);
    expect(run({ im: ["fixed_tubing"] }, PAPERS, [...PLATFORMS, orphan]).platforms).toEqual(["Alpha2020/P1"]);
    expect(run({}, PAPERS, [...PLATFORMS, orphan]).platforms).toContain("Gone1999/P1");
  });
});

describe("unit-operation filter on the fixture (SPEC-TAXO-001 AC-7)", () => {
  const withUo = (l: PlatformRow, unit_operations: string[]): PlatformRow => ({ ...l, unit_operations });
  const UO_PLATFORMS = [
    withUo(PLATFORMS[0]!, ["mix", "sonicate"]),
    withUo(PLATFORMS[1]!, ["mix"]),
    withUo(PLATFORMS[2]!, ["sonicate"]),
  ];
  const runUo = (patch: Partial<FilterState>) => run(patch, PAPERS, UO_PLATFORMS);

  it("needs every selected unit operation on one platform under 'all', any under 'any'", () => {
    expect(runUo({ uo: ["sonicate"] })).toEqual({ papers: ["Alpha2020", "Beta2015"], platforms: ["Alpha2020/P1", "Beta2015/P2"] });
    expect(runUo({ uo: ["mix", "sonicate"] })).toEqual({ papers: ["Alpha2020"], platforms: ["Alpha2020/P1"] });
    expect(runUo({ uo: ["mix", "sonicate"], uoMatch: "any" })).toEqual({
      papers: ["Alpha2020", "Beta2015"],
      platforms: ["Alpha2020/P1", "Beta2015/P1", "Beta2015/P2"],
    });
  });

  it("applies uo together with mt and tm on the same platform", () => {
    expect(runUo({ uo: ["mix"], mt: ["liquid_handler"] })).toEqual({ papers: ["Beta2015"], platforms: ["Beta2015/P1"] });
    expect(runUo({ uo: ["sonicate"], tm: ["robot_arm_gantry"] })).toEqual({ papers: [], platforms: [] });
  });
});

// The real-index cases compare the site's filter with the counts tests/release-expect.ts takes from the release's CSV
// files under the rules of SPEC-BROWSE-001 §2 (written again there, not imported from src/lib).
const realData = dataAvailable && pinnedReleaseExtracted();
const toFilter = (patch: Partial<FilterState>): Filter => ({
  ...patch,
  years: patch.years ? [patch.years.from, patch.years.to] : undefined,
});
const expectedCount = (patch: Partial<FilterState>) => {
  const r = expectedRelease();
  return [r.countPapers(toFilter(patch)), r.countPlatforms(toFilter(patch))];
};

describe.skipIf(!realData)("unit-operation filter counts on the real index (SPEC-TAXO-001 AC-7)", () => {
  const index = realData ? readIndex() : { papers: [], platforms: [] };
  const count = (patch: Partial<FilterState>) => {
    const r = run(patch, index.papers, index.platforms);
    return [r.papers.length, r.platforms.length];
  };

  it.each<[string, Partial<FilterState>]>([
    ["uo sonicate", { uo: ["sonicate"] }],
    ["uo mix, sonicate, all", { uo: ["mix", "sonicate"] }],
    ["uo mix, sonicate, any", { uo: ["mix", "sonicate"], uoMatch: "any" }],
    ["mt liquid_handler and uo dispense_solid", { mt: ["liquid_handler"], uo: ["dispense_solid"] }],
    ["uo clean_equipment, dispense_liquid", { uo: ["clean_equipment", "dispense_liquid"] }],
  ])("%s", (_name, patch) => {
    expect(count(patch)).toEqual(expectedCount(patch));
  });

  it("the cases tell all from any and are not empty", () => {
    expect(expectedCount({ uo: ["sonicate"] })[1]).toBeGreaterThan(0);
    expect(expectedCount({ uo: ["mix", "sonicate"], uoMatch: "any" })[1]).toBeGreaterThan(expectedCount({ uo: ["mix", "sonicate"] })[1]!);
  });

  it("counts the remaining browse URLs of AC-7", () => {
    const urls: Partial<FilterState>[] = [
      { tm: ["mobile_robot"], uo: ["handle_sample"] },
      { years: { from: 2018, to: 2024 }, field: ["catalysis"], uo: ["react_thermal"] },
    ];
    for (const patch of urls) expect(count(patch)).toEqual(expectedCount(patch));
  });

  it("needs one platform with both unit operations: Roch2020 is excluded", () => {
    expect(count({ uo: ["clean_equipment", "dispense_liquid"], q: "Roch2020" })[0]).toBe(0);
    expect(count({ q: "Roch2020" })[1]).toBe(5);
  });
});

describe.skipIf(!realData)("filter counts on the real index (AC-5)", () => {
  // The index as Browse searches it: each platform with its module names from search.json.
  const names: SearchJson["module_names"] = realData
    ? JSON.parse(readFileSync(join(import.meta.dirname, "..", "public", "data", "search.json"), "utf8")).module_names
    : {};
  const raw = realData ? readIndex() : { papers: [], platforms: [] };
  const index = { papers: raw.papers, platforms: raw.platforms.map((p) => ({ ...p, module_names: names[p.platform_id] ?? [] })) };
  const count = (patch: Partial<FilterState>) => {
    const r = run(patch, index.papers, index.platforms);
    return [r.papers.length, r.platforms.length];
  };

  it.each<[string, Partial<FilterState>]>([
    ["default", {}],
    ["years 2018-2024", { years: { from: 2018, to: 2024 } }],
    ["years from 2026", { years: { from: 2026, to: null } }],
    ["years to 2014", { years: { from: null, to: 2014 } }],
    ["field catalysis, nanomaterials", { field: ["catalysis", "nanomaterials"] }],
    ["im mixed", { im: ["mixed"] }],
    ["im fixed_tubing, mobile_robot", { im: ["fixed_tubing", "mobile_robot"] }],
    ["sw 3", { sw: [3] }],
    ["hw 1, 3", { hw: [1, 3] }],
    ["mt flow_reactor", { mt: ["flow_reactor"] }],
    ["mt flow_reactor, liquid_handler, all", { mt: ["flow_reactor", "liquid_handler"] }],
    ["mt flow_reactor, liquid_handler, any", { mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" }],
    ["tm fixed_tubing, robot_arm_gantry, all", { tm: ["fixed_tubing", "robot_arm_gantry"] }],
    ["tm fixed_tubing, robot_arm_gantry, any", { tm: ["fixed_tubing", "robot_arm_gantry"], tmMatch: "any" }],
    ["mt flow_reactor and tm robot_arm_gantry", { mt: ["flow_reactor"], tm: ["robot_arm_gantry"] }],
    ["q chemspeed", { q: "chemspeed" }],
    ["years 2018-2024, field catalysis, mt flow_reactor", { years: { from: 2018, to: 2024 }, field: ["catalysis"], mt: ["flow_reactor"] }],
  ])("%s: the release's papers and platforms", (_name, patch) => {
    expect(count(patch)).toEqual(expectedCount(patch));
  });

  it("the default counts are the release's papers and platforms; all and any differ", () => {
    expect(count({})).toEqual([raw.papers.length, raw.platforms.length]);
    expect(count({})).toEqual(expectedCount({}));
    const all = expectedCount({ mt: ["flow_reactor", "liquid_handler"] });
    const any = expectedCount({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" });
    expect(all[1]).toBeGreaterThan(0);
    expect(any[1]).toBeGreaterThan(all[1]!);
  });

  it("excludes Zhang2025b when its values sit on different platforms", () => {
    const all = run({ mt: ["flow_reactor", "liquid_handler"] }, index.papers, index.platforms).papers;
    const mixed = run({ mt: ["flow_reactor"], tm: ["robot_arm_gantry"] }, index.papers, index.platforms).papers;
    const any = run({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" }, index.papers, index.platforms).papers;
    expect(all).not.toContain("Zhang2025b");
    expect(mixed).not.toContain("Zhang2025b");
    expect(any).toContain("Zhang2025b");
  });

  it("matches the platforms named Chemspeed and those with a Chemspeed module for 'chemspeed'", () => {
    const r = expectedRelease();
    const want = r.platformsMatching({ q: "chemspeed" }).map((l) => l.platform_id);
    // Nine in 1.2.0: three by name, six by a Chemspeed module only.
    for (const id of ["Christensen2021/P1", "Moosavi2019/P1", "StriethKalthoff2024/P1", "Vescovi2023/P2"]) expect(want).toContain(id);
    expect(run({ q: "chemspeed" }, index.papers, index.platforms).platforms).toEqual(want);
    // Without the module names (search.json not loaded) only those with Chemspeed in the name, id or paper match.
    const named = r.platforms.filter((l) => [l.platform_id, l.paper_id, l.name ?? ""].some((f) => f.toLowerCase().includes("chemspeed")));
    expect(named.length).toBeLessThan(want.length);
    expect(run({ q: "chemspeed" }, raw.papers, raw.platforms).platforms).toEqual(named.map((l) => l.platform_id));
  });
});
