// SPEC-SIM-001 AC-14, AC-15: the simulation model on hand-computed cases, per-run seeds and determinism.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll } from "../scripts/lib/derive";
import type { DurationRow, SimulationJson } from "../src/data/types";
import { singleStepGroups, stepSources } from "../src/lib/cycleRange";
import { MAX_STEP_RUNS, runOnce, simulate, simUnits, stepRunCount, type SimEvent } from "../src/lib/des";
import { mix32, mulberry32, runSeed } from "../src/lib/prng";
import { catalogOf, DEFAULT_STATE, type Catalog, type WorkflowState } from "../src/lib/workflowState";
import { tempDir } from "./fixtures/zip";

const catalog: Catalog = {
  unitOperations: new Set(["a", "b", "c"]),
  moduleTypes: new Set(["x"]),
  transferModes: new Set(["robot_arm_gantry", "fixed_tubing"]),
  materialModes: new Set(["robot_arm_gantry", "fixed_tubing"]),
  joints: new Map([["J/P1/S1", ["a", "b"]]]),
};
const JOINT: DurationRow = {
  step_id: "J/P1/S1", platform_id: "J/P1", paper_id: "J", doi: "10.1/j", unit_operation: "a", seconds: 30, value: 30, unit: "s",
  bound: null, approximate: false, range_midpoint: false, range_low_s: null, range_high_s: null, samples_per_run: null,
  joint: { step_ids: ["J/P1/S1", "J/P1/S2"], unit_operations: ["a", "b"] }, evidence: { doc: "main", page: 1, locator: null },
};

/** Steps (unit operation, module, entered seconds) on modules with one device each unless stated. */
function wf(steps: [string, number, number][], extra: Partial<WorkflowState> = {}, devices: number[] = []): WorkflowState {
  const nMod = Math.max(...steps.map(([, m]) => m));
  return {
    ...DEFAULT_STATE,
    steps: steps.map(([uo, module]) => ({ uo, module })),
    modules: Array.from({ length: nMod }, (_, k) => ({ type: "x", devices: devices[k] ?? 1 })),
    entered: Object.fromEntries(steps.map(([, , d], k) => [k + 1, d])),
    runs: 1,
    ...extra,
  };
}
const unitsOf = (s: WorkflowState) => simUnits(s, stepSources(s, catalog, new Map(), new Map([[JOINT.step_id, JOINT]]))).units;
const once = (s: WorkflowState) => runOnce(s, unitsOf(s), mulberry32(1));
const spans = (events: SimEvent[], batch: number) =>
  events.filter((e) => e.batch === batch).map((e) => [e.kind, e.start, e.end]);

describe("AC-14: hand-computed cases", () => {
  it("one step of 60 s, three batches", () => {
    expect(once(wf([["a", 1, 60]], { n: 3, parallel: 1 })).makespan).toBe(180);
    const p3 = once(wf([["a", 1, 60]], { n: 3, parallel: 3 }));
    expect(p3.makespan).toBe(180);
    expect(p3.waiting[1]).toBe(60);
    expect(once(wf([["a", 1, 60]], { n: 3, parallel: 3 }, [3])).makespan).toBe(60);
  });

  it("A 10 s, robot transfer 5 s with one agent, B 20 s, two batches", () => {
    const s = wf([["a", 1, 10], ["b", 2, 20]], { n: 2, parallel: 2, transfers: { 1: { mode: "robot_arm_gantry", seconds: 5 } } });
    const r = once(s);
    expect(spans(r.events, 1)).toEqual([["step", 0, 10], ["transfer", 10, 15], ["step", 15, 35]]);
    expect(spans(r.events, 2)).toEqual([["step", 10, 20], ["transfer", 20, 25], ["step", 35, 55]]);
    expect(r.makespan).toBe(55);
    expect(r.utilization).toEqual({ 1: 20 / 55, 2: 40 / 55 });
    expect(r.events.find((e) => e.kind === "transfer")!.agent).toEqual({ mode: "robot_arm_gantry", index: 1 });
    expect(simulate(s, unitsOf(s)).bottleneck).toEqual({ step: 2, module: 2, utilization: 40 / 55 });
  });

  it("two steps on the same module keep the device", () => {
    const r = once(wf([["a", 1, 10], ["b", 1, 10]], { n: 2, parallel: 2 }));
    expect(r.makespan).toBe(40);
    expect(spans(r.events, 1)).toEqual([["step", 0, 10], ["step", 10, 20]]);
    expect(spans(r.events, 2)).toEqual([["step", 20, 30], ["step", 30, 40]]);
  });

  it("first come, first served against earliest-released batch first", () => {
    const steps: [string, number, number][] = [["a", 1, 10], ["b", 2, 1], ["c", 1, 10]];
    expect(once(wf(steps, { n: 3, parallel: 3 })).makespan).toBe(60);
    expect(once(wf(steps, { n: 3, parallel: 3, rule: "released" })).makespan).toBe(61);
  });

  it("a joint duration occupies only its first step's module", () => {
    const r = once(wf([["a", 1, 0], ["b", 2, 0]], { n: 1, joints: { 1: "J/P1/S1" } }));
    expect(r.events.map((e) => [e.module, e.start, e.end])).toEqual([[1, 0, 30]]);
    expect(r.utilization).toEqual({ 1: 1 });
  });

  it("a joint run keeps its device for the next step on the same module unless a transfer is set", () => {
    const base = { n: 2, parallel: 2, joints: { 1: "J/P1/S1" }, transfers: { 1: { mode: "robot_arm_gantry", seconds: 5 } } };
    const kept = once(wf([["a", 1, 0], ["b", 2, 0], ["c", 1, 10]], base));
    expect(kept.makespan).toBe(80);
    expect(spans(kept.events, 1)).toEqual([["step", 0, 30], ["step", 30, 40]]);
    expect(spans(kept.events, 2)).toEqual([["step", 40, 70], ["step", 70, 80]]);
    const moved = once(wf([["a", 1, 0], ["b", 2, 0], ["c", 1, 10]], {
      ...base, transfers: { ...base.transfers, 2: { mode: "na", seconds: 5 } },
    }));
    expect(moved.makespan).toBe(80);
    expect(spans(moved.events, 1)).toEqual([["step", 0, 30], ["transfer", 30, 35], ["step", 60, 70]]);
    expect(spans(moved.events, 2)).toEqual([["step", 30, 60], ["transfer", 60, 65], ["step", 70, 80]]);
    expect(moved.events.filter((e) => e.kind === "transfer").every((e) => e.agent === null)).toBe(true);
  });

  it("per-run seeds mix the run number, so seeds 1 and 2 share no run", () => {
    expect(runSeed(1, 1)).toBe(mix32((1 ^ 0x9e3779b9) >>> 0));
    const a = new Set(Array.from({ length: 100 }, (_, r) => runSeed(1, r + 1)));
    const b = Array.from({ length: 100 }, (_, r) => runSeed(2, r + 1));
    expect(a.size).toBe(100);
    expect(b.filter((x) => a.has(x))).toEqual([]);
    expect(runSeed(4294967295, 100)).toBeGreaterThanOrEqual(0);
  });

  it("counts step runs for the size limit", () => {
    const s = wf([["a", 1, 1]], { n: 500, runs: 100, batch: 100, perRun: { 1: 1 } });
    expect(stepRunCount(s, unitsOf(s))).toBe(5_000_000);
    expect(stepRunCount({ ...s, batch: 101 }, unitsOf({ ...s, batch: 101 }))).toBeGreaterThan(MAX_STEP_RUNS);
  });
});

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));

describe.skipIf(!available)("AC-15: determinism on real data", () => {
  let sim: SimulationJson;
  let c: Catalog;
  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    sim = deriveAll(await fetchRelease({ config, cacheDir, localZip })).simulation;
    c = catalogOf(sim);
  });
  const run = (extra: Partial<WorkflowState>) => {
    const s: WorkflowState = {
      ...DEFAULT_STATE,
      steps: [{ uo: "react_flow", module: 1 }, { uo: "measure_separation_ms", module: 2 }],
      modules: [{ type: "flow_reactor", devices: 1 }, { type: "instrument_separation_ms", devices: 1 }],
      ...extra,
    };
    const sources = stepSources(s, c, singleStepGroups(sim.durations), new Map());
    return simulate(s, simUnits(s, sources).units);
  };

  it("the same seed gives the same events and results; another seed differs; median draws do not depend on the seed", () => {
    const a = run({ seed: 1 });
    expect(run({ seed: 1 })).toEqual(a);
    expect(run({ seed: 2 }).run1.events).not.toEqual(a.run1.events);
    expect(run({ seed: 1, draw: "median" }).run1.events).toEqual(run({ seed: 2, draw: "median" }).run1.events);
  });
});
