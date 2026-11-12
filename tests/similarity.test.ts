// SPEC-SIM-001 AC-8 (self-similarity) and AC-9: the three similarity measures and the ranking.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll } from "../scripts/lib/derive";
import type { PlatformLayout, SimulationJson } from "../src/data/types";
import { editDistance, overlap, platformSets, rankPlatforms, workflowSets } from "../src/lib/similarity";
import { catalogOf, DEFAULT_STATE, fromPlatform, type Catalog, type WorkflowState } from "../src/lib/workflowState";
import { tempDir } from "./fixtures/zip";

const catalog: Catalog = {
  unitOperations: new Set(["a", "b", "c"]),
  moduleTypes: new Set(["x", "y", "z"]),
  transferModes: new Set(["data_transfer", "fixed_tubing", "robot_arm_gantry"]),
  materialModes: new Set(["fixed_tubing", "robot_arm_gantry"]),
  joints: new Map(),
};

const layout = (id: string, steps: [string, string][], types: Record<string, string>, connections: PlatformLayout["connections"] = []): PlatformLayout => ({
  platform_id: id, name: null, paper_id: id.split("/")[0]!, year: 2024,
  steps: steps.map(([unit_operation, module_id], k) => ({ step_id: `${id}/S${k + 1}`, unit_operation, module_id })),
  modules: Object.entries(types).map(([module_id, module_type]) => ({ module_id, module_type, name: null, units: null })),
  connections, batch_size: null, parallel_units: null, transfer_agents: [],
});

describe("AC-9: measures", () => {
  it("step order is 1 − edit distance / longer length", () => {
    expect(editDistance(["a", "b", "c"], ["a", "c"])).toBe(1);
    expect(editDistance([], ["a", "b"])).toBe(2);
    expect(editDistance(["a", "b"], ["b", "a"])).toBe(2);
    const w: WorkflowState = { ...DEFAULT_STATE, steps: [{ uo: "a", module: 1 }, { uo: "b", module: 1 }, { uo: "c", module: 1 }], modules: [{ type: "x", devices: 1 }] };
    const p = layout("P/P1", [["a", "P/P1/M1"], ["c", "P/P1/M1"]], { "P/P1/M1": "x" });
    const [row] = rankPlatforms(workflowSets(w, catalog), [platformSets(p, catalog)]);
    expect(row!.order).toBeCloseTo(1 - 1 / 3, 12);
  });

  it("module types and transfer modes are shares of the union; two empty sets count as the same", () => {
    expect(overlap(new Set(["x", "y"]), new Set(["y", "z"]))).toBeCloseTo(1 / 3, 12);
    expect(overlap(new Set(), new Set())).toBe(1);
    expect(overlap(new Set(["x"]), new Set())).toBe(0);
  });

  it("transfer modes use material modes only, on the platform by the boundary rule", () => {
    const p = layout("P/P1", [["a", "P/P1/M1"], ["b", "P/P1/M2"], ["c", "P/P1/M3"]], { "P/P1/M1": "x", "P/P1/M2": "y", "P/P1/M3": "z" }, [
      { from: "P/P1/M2", to: "P/P1/M1", transfer_mode: "robot_arm_gantry", is_material: true, transfer_time_s: null },
      { from: "P/P1/M2", to: "P/P1/M3", transfer_mode: "data_transfer", is_material: false, transfer_time_s: null },
    ]);
    expect(platformSets(p, catalog).modes).toEqual(new Set(["robot_arm_gantry"]));
    const w: WorkflowState = {
      ...DEFAULT_STATE,
      steps: [{ uo: "a", module: 1 }, { uo: "b", module: 2 }, { uo: "c", module: 3 }],
      modules: [{ type: "x", devices: 1 }, { type: "y", devices: 1 }, { type: "z", devices: 1 }],
      transfers: { 1: { mode: "fixed_tubing", seconds: 0 }, 2: { mode: "data_transfer", seconds: 0 } },
    };
    expect(workflowSets(w, catalog).modes).toEqual(new Set(["fixed_tubing"]));
    expect(workflowSets(w, catalog).types).toEqual(new Set(["x", "y", "z"]));
  });

  it("ranks by step order, then module types, then transfer modes, then platform id", () => {
    const w: WorkflowState = { ...DEFAULT_STATE, steps: [{ uo: "a", module: 1 }, { uo: "b", module: 1 }], modules: [{ type: "x", devices: 1 }] };
    const ps = [
      layout("D/P1", [["a", "D/P1/M1"], ["b", "D/P1/M1"]], { "D/P1/M1": "y" }),
      layout("C/P1", [["a", "C/P1/M1"], ["b", "C/P1/M1"]], { "C/P1/M1": "x" }),
      layout("B/P1", [["a", "B/P1/M1"], ["b", "B/P1/M1"]], { "B/P1/M1": "x" }),
      layout("A/P1", [["a", "A/P1/M1"]], { "A/P1/M1": "x" }),
    ].map((p) => platformSets(p, catalog));
    expect(rankPlatforms(workflowSets(w, catalog), ps).map((r) => r.platform.platform_id)).toEqual(["B/P1", "C/P1", "D/P1", "A/P1"]);
  });
});

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));

describe.skipIf(!available)("AC-8, AC-9 on the real 1.1.0 release", () => {
  let sim: SimulationJson;
  let c: Catalog;
  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    sim = deriveAll(await fetchRelease({ config, cacheDir, localZip })).simulation;
    c = catalogOf(sim);
  });

  it("every platform used as the start scores 1, 1, 1 against itself", () => {
    const all = sim.platforms.map((p) => platformSets(p, c));
    for (let k = 0; k < sim.platforms.length; k++) {
      const w = workflowSets(fromPlatform(sim.platforms[k]!, c).state, c);
      const [row] = rankPlatforms(w, [all[k]!]);
      expect([row!.order, row!.types, row!.modes], sim.platforms[k]!.platform_id).toEqual([1, 1, 1]);
    }
  });

  it("Aand2024/P1 started from itself is in the first 10 rows", () => {
    const p = sim.platforms.find((x) => x.platform_id === "Aand2024/P1")!;
    const rows = rankPlatforms(workflowSets(fromPlatform(p, c).state, c), sim.platforms.map((x) => platformSets(x, c)));
    expect(rows.slice(0, 10).map((r) => r.platform.platform_id)).toContain("Aand2024/P1");
  });
});
