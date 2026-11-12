// SPEC-SIM-001 AC-6, AC-7, AC-8: builder edits, the hash-query grammar and the fill from a coded platform.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll } from "../scripts/lib/derive";
import type { PlatformLayout, SimulationJson } from "../src/data/types";
import {
  addModule,
  addStep,
  boundaryConnection,
  catalogOf,
  chooseJoint,
  decodeWorkflow,
  DEFAULT_STATE,
  encodeWorkflow,
  fromPlatform,
  ignoredMessage,
  moveStep,
  removeModule,
  removeStep,
  setAgents,
  setCount,
  setEntered,
  setModule,
  setPerRun,
  setStep,
  setTransfer,
  type Catalog,
  type EditResult,
  type WorkflowState,
} from "../src/lib/workflowState";
import { tempDir } from "./fixtures/zip";

const catalog: Catalog = {
  unitOperations: new Set(["dispense_liquid", "react_thermal", "measure_optical", "analyze_data", "unmapped"]),
  moduleTypes: new Set(["fluidics", "heater", "spectrometer", "software", "unmapped"]),
  transferModes: new Set(["data_transfer", "fixed_tubing", "robot_arm_gantry", "mobile_robot", "human_transfer", "unmapped"]),
  materialModes: new Set(["fixed_tubing", "robot_arm_gantry", "mobile_robot", "human_transfer", "unmapped"]),
  joints: new Map([
    ["X/P1/S1", ["dispense_liquid", "react_thermal"]],
    ["X/P2/S4", ["react_thermal", "measure_optical"]],
  ]),
};

function ok(r: EditResult): { state: WorkflowState; notes: string[] } {
  if (!r.ok) throw new Error(`edit refused: ${r.error}`);
  return r;
}

/** Three modules and three steps: dispense on fluidics, react on heater, measure on spectrometer. */
function threeSteps(): WorkflowState {
  let s = DEFAULT_STATE;
  s = ok(addStep(s, catalog, "dispense_liquid", { type: "fluidics" })).state;
  s = ok(addStep(s, catalog, "react_thermal", { type: "heater" })).state;
  s = ok(addStep(s, catalog, "measure_optical", { type: "spectrometer" })).state;
  return s;
}

describe("AC-6: builder edits", () => {
  it("adds, assigns, moves and removes steps and sets transfers and inputs", () => {
    let s = threeSteps();
    s = ok(setTransfer(s, catalog, 2, { mode: "fixed_tubing" })).state;
    const moved = ok(moveStep(s, catalog, 3, -1));
    s = moved.state;
    expect(s.steps.map((x) => x.uo)).toEqual(["dispense_liquid", "measure_optical", "react_thermal"]);
    // steps 2 and 3 swapped: the transfer from step 2 to step 3 now runs the other way, so it is reset and named
    expect(s.transfers).toEqual({});
    expect(moved.notes).toEqual(["Transfer between steps 2 and 3 removed: those steps are no longer next to each other."]);
    s = ok(setTransfer(s, catalog, 2, { mode: "robot_arm_gantry", seconds: "12.5" })).state;
    s = ok(removeStep(s, catalog, 1)).state;
    expect(s.steps).toEqual([{ uo: "measure_optical", module: 3 }, { uo: "react_thermal", module: 2 }]);
    expect(s.transfers).toEqual({ 1: { mode: "robot_arm_gantry", seconds: 12.5 } });
    s = ok(setCount(s, catalog, "batch", "8")).state;
    s = ok(setCount(s, catalog, "parallel", "2")).state;
    expect([s.batch, s.parallel]).toEqual([8, 2]);
  });

  it("refuses values outside the ranges and leaves the state unchanged", () => {
    const s = ok(setModule(threeSteps(), catalog, 1, { devices: "2" })).state;
    const refused: EditResult[] = [
      setModule(s, catalog, 1, { devices: "0" }),
      setModule(s, catalog, 1, { devices: "51" }),
      setCount(s, catalog, "batch", "0"),
      setCount(s, catalog, "batch", "10001"),
      setCount(s, catalog, "batch", "abc"),
      setCount(s, catalog, "samples", "0"),
      setCount(s, catalog, "samples", "1001"),
      setCount(s, catalog, "parallel", "0"),
      setCount(s, catalog, "parallel", "51"),
      setTransfer(s, catalog, 1, { seconds: "-1" }),
      setTransfer(s, catalog, 1, { seconds: "86401" }),
      setTransfer(s, catalog, 1, { seconds: "1.2345" }),
      setTransfer(s, catalog, 1, { mode: "teleport" }),
      setPerRun(s, catalog, 1, "0"),
      setPerRun(s, catalog, 1, "2"),
      setEntered(s, catalog, 1, "-1"),
      setEntered(s, catalog, 1, "10000001"),
      setEntered(s, catalog, 1, "1.0001"),
      addStep(s, catalog, "not_a_class", 1),
      addStep(s, catalog, "dispense_liquid", 9),
      setAgents(s, catalog, "mobile_robot", "51"),
    ];
    for (const r of refused) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
    let full = s;
    while (full.steps.length < 40) full = ok(addStep(full, catalog, "analyze_data", 1)).state;
    expect(addStep(full, catalog, "analyze_data", 1).ok).toBe(false);
    expect(ok(setEntered(s, catalog, 1, "86400.125")).state.entered).toEqual({ 1: 86400.125 });
  });

  it("refuses a transfer between steps on the same module", () => {
    const one = ok(addStep(DEFAULT_STATE, catalog, "dispense_liquid", { type: "fluidics" })).state;
    const two = ok(addStep(one, catalog, "react_thermal", 1)).state;
    expect(setTransfer(two, catalog, 1, { mode: "fixed_tubing" }).ok).toBe(false);
  });

  it("resets inputs a later edit makes invalid and names them", () => {
    let s = ok(setCount(threeSteps(), catalog, "batch", "10")).state;
    s = ok(setPerRun(s, catalog, 2, "8")).state;
    const r = ok(setCount(s, catalog, "batch", "4"));
    expect(r.state.perRun).toEqual({});
    expect(r.notes).toEqual(["Samples per run of step 2 (react_thermal) reset to all samples of the batch."]);

    const used = removeModule(s, catalog, 2);
    expect(used.ok).toBe(false);
    if (!used.ok) expect(used.error).toMatch(/Module 2 is used by step 2/);

    let j = ok(addStep(threeSteps(), catalog, "react_thermal", 2)).state; // steps: dispense, react, measure, react
    j = ok(chooseJoint(j, catalog, 2, "X/P2/S4")).state;
    expect(j.joints).toEqual({ 2: "X/P2/S4" });
    const cleared = ok(removeStep(j, catalog, 3));
    expect(cleared.state.joints).toEqual({});
    expect(cleared.notes.join(" ")).toMatch(/Joint duration chosen from step 2 cleared/);

    let t = ok(setTransfer(threeSteps(), catalog, 1, { mode: "fixed_tubing" })).state;
    const same = ok(setStep(t, catalog, 2, { module: 1 }));
    expect(same.state.transfers).toEqual({});
    expect(same.notes).toEqual(["Transfer between steps 1 and 2 removed: both steps now use module 1."]);
    t = ok(addModule(t, catalog, "software")).state;
    expect(t.modules).toHaveLength(4);
    expect(ok(removeModule(t, catalog, 4)).state.modules).toHaveLength(3);
  });

  it("refuses a joint choice that does not match or overlaps an earlier one", () => {
    let s = ok(addStep(threeSteps(), catalog, "react_thermal", 2)).state;
    expect(chooseJoint(s, catalog, 2, "X/P1/S1").ok).toBe(false);
    s = ok(chooseJoint(s, catalog, 1, "X/P1/S1")).state;
    const overlap = chooseJoint(s, catalog, 2, "X/P2/S4");
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.error).toMatch(/overlaps/);
    expect(ok(chooseJoint(s, catalog, 1, null)).state.joints).toEqual({});
  });
});

describe("AC-7: hash-query grammar", () => {
  it("encodes the default state as an empty query", () => {
    expect(encodeWorkflow(DEFAULT_STATE)).toBe("");
    expect(decodeWorkflow("", catalog)).toEqual({ state: DEFAULT_STATE, ignored: [] });
  });

  it("writes parameters in the grammar's order with only non-default values", () => {
    let s = ok(setModule(threeSteps(), catalog, 2, { devices: "3" })).state;
    s = ok(setTransfer(s, catalog, 1, { mode: "robot_arm_gantry", seconds: "45.7" })).state;
    s = ok(setTransfer(s, catalog, 2, { mode: "fixed_tubing" })).state;
    s = ok(setCount(s, catalog, "batch", "4")).state;
    s = ok(setPerRun(s, catalog, 2, "2")).state;
    s = ok(setEntered(s, catalog, 3, "30")).state;
    s = ok(chooseJoint(s, catalog, 1, "X/P1/S1")).state;
    s = ok(setAgents(s, catalog, "robot_arm_gantry", "2")).state;
    s = { ...s, bounds: true, rule: "released", draw: "median", n: 12, runs: 5, seed: 7 };
    expect(encodeWorkflow(s)).toBe(
      "s=dispense_liquid~1,react_thermal~2,measure_optical~3&m=fluidics,heater~3,spectrometer" +
        "&t=1~robot_arm_gantry~45.7,2~fixed_tubing&b=4&k=2~2&d=3~30&j=1~X%2FP1%2FS1&bounds=1" +
        "&ag=robot_arm_gantry~2&rule=released&draw=median&n=12&runs=5&seed=7",
    );
    expect(decodeWorkflow(encodeWorkflow(s), catalog)).toEqual({ state: s, ignored: [] });
  });

  it("round-trips 200 generated valid states", () => {
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const uos = [...catalog.unitOperations];
    const types = [...catalog.moduleTypes];
    const modes = ["na", ...catalog.transferModes];
    for (let t = 0; t < 200; t++) {
      let s: WorkflowState = structuredClone(DEFAULT_STATE);
      const nm = 1 + rnd(4);
      for (let m = 0; m < nm; m++) s = ok(addModule(s, catalog, types[rnd(types.length)]!)).state;
      for (let m = 1; m <= nm; m++) if (rnd(2)) s = ok(setModule(s, catalog, m, { devices: String(1 + rnd(50)) })).state;
      const ns = rnd(9);
      for (let k = 0; k < ns; k++) s = ok(addStep(s, catalog, uos[rnd(uos.length)]!, 1 + rnd(nm))).state;
      s = ok(setCount(s, catalog, "batch", String(1 + rnd(10000)))).state;
      s = ok(setCount(s, catalog, "samples", String(1 + rnd(1000)))).state;
      s = ok(setCount(s, catalog, "parallel", String(1 + rnd(50)))).state;
      for (let i = 1; i < s.steps.length; i++) {
        if (s.steps[i - 1]!.module !== s.steps[i]!.module && rnd(2)) {
          const secs = `${rnd(86400)}${rnd(2) ? `.${rnd(1000)}` : ""}`;
          s = ok(setTransfer(s, catalog, i, { mode: modes[rnd(modes.length)]!, seconds: secs })).state;
        }
      }
      for (let i = 1; i <= s.steps.length; i++) {
        if (rnd(3) === 0) s = ok(setPerRun(s, catalog, i, String(1 + rnd(s.batch * s.samples)))).state;
        if (rnd(3) === 0) s = ok(setEntered(s, catalog, i, `${rnd(10000000)}.${rnd(1000)}`)).state;
        for (const id of catalog.joints.keys()) {
          const r = chooseJoint(s, catalog, i, id);
          if (r.ok && rnd(2)) s = r.state;
        }
      }
      for (const a of ["robot_arm_gantry", "mobile_robot", "human_transfer"] as const) {
        if (rnd(2)) s = ok(setAgents(s, catalog, a, String(1 + rnd(50)))).state;
      }
      s = {
        ...s,
        bounds: rnd(2) === 1,
        rule: rnd(2) ? "fifo" : "released",
        draw: rnd(2) ? "sample" : "median",
        n: 1 + rnd(500),
        runs: 1 + rnd(100),
        seed: rnd(2) ? rnd(2 ** 31) * 2 + rnd(2) : 4294967295,
      };
      const q = encodeWorkflow(s);
      expect(decodeWorkflow(q, catalog)).toEqual({ state: s, ignored: [] });
    }
  });

  it("drops parts that do not parse, names each once and restores the rest", () => {
    const q = [
      "s=dispense_liquid~1,teleport~1,react_thermal~9,react_thermal~2,dispense_liquid~2,measure_optical~2",
      "m=fluidics,heater",
      "t=1~fixed_tubing~5,3~fixed_tubing",
      "b=abc",
      "j=2~X/P2/S4,1~X/P1/S1,3~X%2FP2%2FS4",
      "seed=-1",
      "zzz=1",
    ].join("&");
    const { state, ignored } = decodeWorkflow(q, catalog);
    expect(state.steps).toEqual([
      { uo: "dispense_liquid", module: 1 },
      { uo: "react_thermal", module: 2 },
      { uo: "dispense_liquid", module: 2 },
      { uo: "measure_optical", module: 2 },
    ]);
    expect(state.transfers).toEqual({ 1: { mode: "fixed_tubing", seconds: 5 } });
    expect(state.batch).toBe(1);
    expect(state.joints).toEqual({ 1: "X/P1/S1" });
    expect(ignored).toEqual([
      "zzz=1",
      "s=teleport~1",
      "s=react_thermal~9",
      "b=abc",
      "t=3~fixed_tubing",
      "j=2~X/P2/S4",
      "j=3~X/P2/S4",
      "seed=-1",
    ]);
    expect(ignoredMessage(ignored)).toMatch(/^Ignored from the link: zzz=1, s=teleport~1, /);
    expect(ignoredMessage([])).toBeNull();
    expect(() => decodeWorkflow("s=%E0%A4%A&m=%&&&b", catalog)).not.toThrow();
  });

  it("drops a joint choice that overlaps an earlier one", () => {
    const q = "s=dispense_liquid~1,react_thermal~2,measure_optical~1&m=fluidics,heater&j=1~X%2FP1%2FS1,2~X%2FP2%2FS4";
    const { state, ignored } = decodeWorkflow(q, catalog);
    expect(state.joints).toEqual({ 1: "X/P1/S1" });
    expect(ignored).toEqual(["j=2~X/P2/S4"]);
  });
});

describe("AC-8: start from a coded platform (rules)", () => {
  const layout: PlatformLayout = {
    platform_id: "X/P9", name: null, paper_id: "X", year: 2024,
    steps: [
      { step_id: "X/P9/S1", unit_operation: "dispense_liquid", module_id: "X/P9/M1" },
      { step_id: "X/P9/S2", unit_operation: "react_thermal", module_id: "X/P9/M2" },
      { step_id: "X/P9/S3", unit_operation: "measure_optical", module_id: "X/P9/M3" },
      { step_id: "X/P9/S4", unit_operation: "analyze_data", module_id: "X/P9/M4" },
      { step_id: "X/P9/S5", unit_operation: "analyze_data", module_id: "X/P9/M4" },
    ],
    modules: [
      { module_id: "X/P9/M1", module_type: "fluidics", name: null, units: 2.5 },
      { module_id: "X/P9/M2", module_type: "heater", name: null, units: null },
      { module_id: "X/P9/M3", module_type: "spectrometer", name: null, units: 4 },
      { module_id: "X/P9/M4", module_type: "software", name: null, units: null },
    ],
    connections: [
      { from: "X/P9/M2", to: "X/P9/M1", transfer_mode: "robot_arm_gantry", is_material: true, transfer_time_s: null },
      { from: "X/P9/M1", to: "X/P9/M2", transfer_mode: "fixed_tubing", is_material: true, transfer_time_s: 45.7 },
      { from: "X/P9/M1", to: "X/P9/M2", transfer_mode: "mobile_robot", is_material: true, transfer_time_s: 9 },
      { from: "X/P9/M3", to: "X/P9/M2", transfer_mode: "human_transfer", is_material: true, transfer_time_s: null },
      { from: "X/P9/M3", to: "X/P9/M4", transfer_mode: "data_transfer", is_material: false, transfer_time_s: null },
    ],
    batch_size: 4.5, parallel_units: 2, transfer_agents: [{ agent: "human", count: 3 }],
  };

  it("applies the boundary rule: forward material, then reverse, then data, then not specified", () => {
    expect(boundaryConnection(layout, "X/P9/M1", "X/P9/M2")).toEqual({ mode: "fixed_tubing", seconds: 45.7 });
    expect(boundaryConnection(layout, "X/P9/M2", "X/P9/M3")).toEqual({ mode: "human_transfer", seconds: null });
    expect(boundaryConnection(layout, "X/P9/M3", "X/P9/M4")).toEqual({ mode: "data_transfer", seconds: null });
    expect(boundaryConnection(layout, "X/P9/M1", "X/P9/M4")).toEqual({ mode: "na", seconds: null });
  });

  it("fills steps, modules, transfers and recorded values, rounding counts up, and lists them", () => {
    const { state, filled } = fromPlatform(layout, catalog);
    expect(state.steps.map((s) => [s.uo, s.module])).toEqual([
      ["dispense_liquid", 1], ["react_thermal", 2], ["measure_optical", 3], ["analyze_data", 4], ["analyze_data", 4],
    ]);
    expect(state.modules).toEqual([
      { type: "fluidics", devices: 3 }, { type: "heater", devices: 1 }, { type: "spectrometer", devices: 4 },
      { type: "software", devices: 1 },
    ]);
    expect(state.transfers).toEqual({
      1: { mode: "fixed_tubing", seconds: 45.7 },
      2: { mode: "human_transfer", seconds: 0 },
      3: { mode: "data_transfer", seconds: 0 },
    });
    expect([state.batch, state.parallel, state.agents]).toEqual([5, 2, { human_transfer: 3 }]);
    expect(filled).toEqual([
      "steps and their unit operations", "modules and their types", "transfer modes", "devices per module",
      "transfer times", "batch size", "parallel units", "transfer agents",
    ]);
    expect(decodeWorkflow(encodeWorkflow(state), catalog).state).toEqual(state);
  });
});

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));

describe.skipIf(!available)("AC-8: start from a coded platform (real 1.1.0)", () => {
  let sim: SimulationJson;
  let c: Catalog;
  const layoutOf = (id: string) => sim.platforms.find((p) => p.platform_id === id)!;

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    sim = deriveAll(await fetchRelease({ config, cacheDir, localZip })).simulation;
    c = catalogOf(sim);
  });

  it("Aand2024/P1: its 6 steps in order on their primary modules", () => {
    const layout = layoutOf("Aand2024/P1");
    const { state, filled } = fromPlatform(layout, c);
    expect(state.steps).toHaveLength(6);
    expect(state.steps.map((s) => s.uo)).toEqual(layout.steps.map((s) => s.unit_operation));
    state.steps.forEach((s, k) => {
      const mod = layout.modules.find((m) => m.module_id === layout.steps[k]!.module_id)!;
      expect(state.modules[s.module - 1]!.type).toBe(mod.module_type);
    });
    expect(filled.slice(0, 3)).toEqual(["steps and their unit operations", "modules and their types", "transfer modes"]);
  });

  it("fills recorded values: Holmes2016/P1 batch size 5 (4.5), Erps2021/P1 transfer 45.7 s, units, parallel units, agents", () => {
    expect(fromPlatform(layoutOf("Holmes2016/P1"), c).state.batch).toBe(5);
    const erps = fromPlatform(layoutOf("Erps2021/P1"), c).state;
    expect(Object.values(erps.transfers).map((t) => t.seconds)).toContain(45.7);
    const withUnits = sim.platforms.find((p) => p.modules.some((m) => m.units !== null))!;
    const u = withUnits.modules.find((m) => m.units !== null)!;
    const filledUnits = fromPlatform(withUnits, c);
    expect(filledUnits.state.modules.map((m) => m.devices)).toContain(Math.ceil(u.units!));
    const withParallel = sim.platforms.find((p) => p.parallel_units !== null)!;
    expect(fromPlatform(withParallel, c).state.parallel).toBe(Math.ceil(withParallel.parallel_units!));
    const withAgents = sim.platforms.find((p) => p.transfer_agents.some((a) => a.count > 1))!;
    expect(Object.values(fromPlatform(withAgents, c).state.agents)).toContain(withAgents.transfer_agents[0]!.count);
  });

  it("every platform fills a state that survives the hash query", () => {
    for (const p of sim.platforms) {
      const { state } = fromPlatform(p, c);
      expect(decodeWorkflow(encodeWorkflow(state), c)).toEqual({ state, ignored: [] });
    }
  });

  // Decision 11 (2026-11-12): a platform's own recorded step durations are filled as entered values.
  it("Aand2024/P1: fills its own recorded durations of steps 2, 3 and 4 and names them", () => {
    const { state, filled } = fromPlatform(layoutOf("Aand2024/P1"), c, sim.durations);
    expect(state.entered).toEqual({ 2: 135, 3: 15, 4: 120 });
    expect(filled).toContain("its recorded step durations (steps 2, 3, 4: Aand2024/P1/S2, Aand2024/P1/S3, Aand2024/P1/S4)");
  });

  it("fills only the platform's own single-step rows without a bound, or its joint rows, and the state survives the hash query", () => {
    for (const p of sim.platforms) {
      const { state } = fromPlatform(p, c, sim.durations);
      expect(decodeWorkflow(encodeWorkflow(state), c)).toEqual({ state, ignored: [] });
      const own = sim.durations.filter((d) => d.platform_id === p.platform_id);
      for (const [i, seconds] of Object.entries(state.entered)) {
        const row = own.find((d) => !d.joint && d.step_id === p.steps[Number(i) - 1]!.step_id);
        expect(row, `${p.platform_id} step ${i}`).toBeDefined();
        expect(row!.bound).toBeNull();
        expect(seconds).toBe(Math.round(row!.seconds * 1000) / 1000);
      }
      for (const id of Object.values(state.joints)) expect(own.some((d) => d.joint && d.step_id === id)).toBe(true);
    }
  });

  it("leaves a duration recorded only as a bound unfilled, and says so", () => {
    const row = sim.durations.find((d) => d.bound !== null && !d.joint)!;
    const layout = layoutOf(row.platform_id);
    const i = layout.steps.findIndex((s) => s.step_id === row.step_id) + 1;
    const { state, filled } = fromPlatform(layout, c, sim.durations);
    expect(state.entered[i]).toBeUndefined();
    expect(filled.join("; ")).toMatch(/durations recorded only as a bound, not filled \(/);
    expect(filled.join("; ")).toContain(`step ${i}: ${row.step_id}`);
  });

  it("without durations, fills no duration (as before)", () => {
    expect(fromPlatform(layoutOf("Aand2024/P1"), c).state.entered).toEqual({});
  });
});
