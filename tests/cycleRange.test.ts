// SPEC-SIM-001 AC-11 to AC-13: range computation, joint offers, recorded throughputs and the verdict-word check.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll } from "../scripts/lib/derive";
import type { DurationRow, SimulationJson } from "../src/data/types";
import {
  cycleRange,
  formatDuration,
  jointOffers,
  median,
  runsPerBatch,
  singleStepGroups,
  stepSources,
  throughputGroups,
} from "../src/lib/cycleRange";
import { catalogOf, DEFAULT_STATE, type Catalog, type WorkflowState } from "../src/lib/workflowState";
import { tempDir } from "./fixtures/zip";

const row = (step_id: string, uo: string, seconds: number, extra: Partial<DurationRow> = {}): DurationRow => ({
  step_id, platform_id: step_id.split("/").slice(0, 2).join("/"), paper_id: step_id.split("/")[0]!, doi: "10.1/x",
  unit_operation: uo, seconds, value: seconds, unit: "s", bound: null, approximate: false, range_midpoint: false,
  range_low_s: null, range_high_s: null, samples_per_run: null, joint: null,
  evidence: { doc: "main", page: 1, locator: null }, ...extra,
});

const DURATIONS: DurationRow[] = [
  row("A/P1/S1", "u", 120),
  row("A/P1/S2", "u", 60),
  row("A/P1/S3", "u", 300),
  row("A/P1/S4", "u", 600, { bound: "upper" }),
  row("B/P1/S1", "v", 50),
  row("C/P1/S2", "v", 900, { joint: { step_ids: ["C/P1/S2", "C/P1/S3"], unit_operations: ["v", "w"] } }),
];
const catalog: Catalog = {
  unitOperations: new Set(["u", "v", "w", "dispense_solid"]),
  moduleTypes: new Set(["x", "y"]),
  transferModes: new Set(["robot_arm_gantry"]),
  materialModes: new Set(["robot_arm_gantry"]),
  joints: new Map([["C/P1/S2", ["v", "w"]]]),
};
const groups = singleStepGroups(DURATIONS);
const jointRows = new Map(DURATIONS.filter((d) => d.joint).map((d) => [d.step_id, d]));
const range = (s: WorkflowState) => cycleRange(s, stepSources(s, catalog, groups, jointRows));
const one = (uo: string, extra: Partial<WorkflowState> = {}): WorkflowState => ({
  ...DEFAULT_STATE, steps: [{ uo, module: 1 }], modules: [{ type: "x", devices: 1 }], ...extra,
});

describe("AC-11: range computation", () => {
  it("leaves bounds out of min, median and max unless included", () => {
    expect(range(one("u")).cycle).toEqual({ low: 60, mid: 120, high: 300 });
    expect(range(one("u", { bounds: true })).cycle).toEqual({ low: 60, mid: 210, high: 600 });
    const step = range(one("u")).steps[0]!;
    expect([step.recorded.length, step.used.length]).toEqual([4, 3]);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it("multiplies by runs per batch", () => {
    const s = one("u", { batch: 10, perRun: { 1: 4 } });
    expect(runsPerBatch(s, 1)).toBe(3);
    expect(range(s).cycle).toEqual({ low: 180, mid: 360, high: 900 });
    expect(runsPerBatch({ ...s, samples: 2 }, 1)).toBe(5);
  });

  it("counts a chosen joint duration once and drops the transfer inside it", () => {
    const s: WorkflowState = {
      ...DEFAULT_STATE,
      steps: [{ uo: "u", module: 1 }, { uo: "v", module: 1 }, { uo: "w", module: 2 }, { uo: "u", module: 1 }],
      modules: [{ type: "x", devices: 1 }, { type: "y", devices: 1 }],
      transfers: { 2: { mode: "robot_arm_gantry", seconds: 30 }, 3: { mode: "robot_arm_gantry", seconds: 7 } },
      joints: { 2: "C/P1/S2" },
    };
    const r = range(s);
    expect(r.steps.map((x) => x.kind)).toEqual(["recorded", "joint", "covered", "recorded"]);
    expect(r.steps.map((x) => x.range!.mid)).toEqual([120, 900, 0, 120]);
    expect(r.transfers).toEqual([{ boundary: 3, seconds: 7 }]);
    expect(r.cycle).toEqual({ low: 60 + 900 + 60 + 7, mid: 120 + 900 + 120 + 7, high: 300 + 900 + 300 + 7 });
  });

  it("gives experiments per day as batch size × parallel units × 86,400 / cycle", () => {
    const r = range(one("dispense_solid", { batch: 2, parallel: 3, entered: { 1: 600 } }));
    expect(r.perDay).toEqual({ low: 864, mid: 864, high: 864 });
  });

  it("names a step with no recorded duration and gives no result until a value is entered", () => {
    const missing = range(one("dispense_solid"));
    expect([missing.missing, missing.cycle, missing.perDay]).toEqual([[1], null, null]);
    const entered = range(one("dispense_solid", { entered: { 1: 120 } }));
    expect([entered.entered, entered.cycle]).toEqual([[1], { low: 120, mid: 120, high: 120 }]);
  });

  it("gives no per-day value for a cycle of 0 s", () => {
    expect(range(one("u", { entered: { 1: 0 } })).perDay).toEqual({ low: null, mid: null, high: null });
  });

  it("formats durations in the largest unit filled twice", () => {
    expect([formatDuration(0.1755), formatDuration(90), formatDuration(351), formatDuration(7200), formatDuration(259200)])
      .toEqual(["0.1755 s", "90 s", "5.85 min", "2 h", "3 d"]);
  });
});

describe("AC-12: joint offers", () => {
  it("offers the joint rows whose unit operations match a run of steps", () => {
    const s: WorkflowState = { ...DEFAULT_STATE, steps: [{ uo: "u", module: 1 }, { uo: "v", module: 1 }, { uo: "w", module: 1 }],
      modules: [{ type: "x", devices: 1 }] };
    expect([...jointOffers(s, DURATIONS).entries()].map(([i, rows]) => [i, rows.map((d) => d.step_id)])).toEqual([[2, ["C/P1/S2"]]]);
  });
});

const VERDICT_WORDS = /\b(fast|slow|realistic|unrealistic|feasible|infeasible|good|poor|adequate|sufficient|insufficient)\b/i;
const NEW_SOURCES = [
  "src/lib/workflowState.ts", "src/lib/workflowText.ts", "src/lib/similarity.ts", "src/lib/cycleRange.ts", "src/lib/prng.ts",
  "src/lib/des.ts", "src/views/Workflow.tsx", "src/components/WorkflowEditor.tsx", "src/components/SimilarPlatforms.tsx",
  "src/components/DurationStrip.tsx", "src/components/CycleRange.tsx", "src/components/ThroughputPanel.tsx",
  "src/components/SimulationPanel.tsx", "src/components/Timeline.tsx",
];

describe("AC-13: no verdict words in the text the builder writes", () => {
  it.each(NEW_SOURCES.filter((f) => existsSync(f)))("%s", (file) => {
    const hits = readFileSync(file, "utf8").split("\n").filter((l) => VERDICT_WORDS.test(l));
    expect(hits).toEqual([]);
  });

  it("checks every new source file that exists", () => {
    const made = [...readdirSync("src/components"), ...readdirSync("src/lib"), ...readdirSync("src/views")];
    expect(made).toContain("cycleRange.ts");
  });
});

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));

describe.skipIf(!available)("AC-11 to AC-13 on the real 1.1.0 release", () => {
  let sim: SimulationJson;
  let c: Catalog;
  let g: Map<string, DurationRow[]>;
  let j: Map<string, DurationRow>;
  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    sim = deriveAll(await fetchRelease({ config, cacheDir, localZip })).simulation;
    c = catalogOf(sim);
    g = singleStepGroups(sim.durations);
    j = new Map(sim.durations.filter((d) => d.joint).map((d) => [d.step_id, d]));
  });
  const real = (uos: string[], extra: Partial<WorkflowState> = {}): WorkflowState => ({
    ...DEFAULT_STATE, steps: uos.map((uo) => ({ uo, module: 1 })), modules: [{ type: "unmapped", devices: 1 }], ...extra,
  });

  it("react_flow: n = 87 recorded, 86 used; 0.1755, 351, 3900 s; 360 s median with bounds", () => {
    const r = cycleRange(real(["react_flow"]), stepSources(real(["react_flow"]), c, g, j));
    expect([r.steps[0]!.recorded.length, r.steps[0]!.used.length]).toEqual([87, 86]);
    expect(r.cycle).toEqual({ low: 0.1755, mid: 351, high: 3900 });
    const b = real(["react_flow"], { bounds: true });
    expect(cycleRange(b, stepSources(b, c, g, j)).cycle).toEqual({ low: 0.1755, mid: 360, high: 3900 });
  });

  it("react_thermal: 70 recorded, 68 used, with markers", () => {
    const rows = g.get("react_thermal")!;
    expect([rows.length, rows.filter((d) => d.bound === null).length]).toEqual([70, 68]);
  });

  it("[dispense_liquid, react_thermal] is offered the 4 recorded joint durations", () => {
    expect(jointOffers(real(["dispense_liquid", "react_thermal"]), sim.durations).get(1)).toHaveLength(4);
  });

  it("dispense_solid has no recorded single-step duration", () => {
    const r = cycleRange(real(["dispense_solid"]), stepSources(real(["dispense_solid"]), c, g, j));
    expect(r.missing).toEqual([1]);
  });

  it("throughputs: measured and nominal with a per-day value, and 9 without", () => {
    const t = throughputGroups(sim.throughputs);
    expect([t.measured.length + t.nominal.length, t.notConverted.length]).toEqual([126, 9]);
  });
});
