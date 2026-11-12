// SPEC-SIM-001 AC-1 (fixture part), AC-3, AC-4: simulation.json from the mini release (REQ-001 to REQ-004).
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveAll, writeDerived } from "../scripts/lib/derive";
import { buildSimulation, perDay } from "../scripts/lib/simulation";
import { tempDir } from "./fixtures/zip";

const MINI = "tests/fixtures/release-mini";

function copyMini(): string {
  const dir = join(tempDir(), "release");
  cpSync(MINI, dir, { recursive: true });
  return dir;
}

function editLine(dir: string, rel: string, find: string, replace: string): void {
  const path = join(dir, rel);
  const text = readFileSync(path, "utf8");
  if (!text.includes(find)) throw new Error(`fixture edit: "${find}" not in ${rel}`);
  writeFileSync(path, text.replace(find, replace));
}

describe("simulation.json from the mini release", () => {
  const sim = deriveAll(MINI).simulation;

  it("carries the class lists of the release", () => {
    expect(sim.unit_operations.map((u) => u.id)).toEqual(["analyze_data", "dispense_liquid", "measure_optical", "unmapped"]);
    expect(sim.unit_operations[1]).toEqual({ id: "dispense_liquid", family: "dispense", definition: "Adding a liquid." });
    expect(sim.module_types.map((m) => m.id)).toEqual(["fluidics", "robot_arm", "software", "unmapped"]);
    expect(sim.transfer_modes).toEqual([
      { id: "data_transfer", is_material: false, definition: "Data is passed on." },
      { id: "fixed_tubing", is_material: true, definition: "Tubing, fixed." },
    ]);
  });

  it("converts each duration to seconds and keeps its markers, range, samples per run and evidence", () => {
    expect(sim.durations).toHaveLength(4);
    expect(sim.durations[0]).toEqual({
      step_id: "PaperA2024/P1/S1", platform_id: "PaperA2024/P1", paper_id: "PaperA2024", doi: "10.1/a",
      unit_operation: "dispense_liquid", seconds: 120, value: 2, unit: "min",
      bound: null, approximate: false, range_midpoint: true, range_low_s: 60, range_high_s: 180,
      samples_per_run: 4, joint: null,
      evidence: { doc: "main", page: 4, locator: "Table 1" },
    });
    const upper = sim.durations.find((d) => d.step_id === "PaperA2024/P2/S1")!;
    expect([upper.seconds, upper.bound, upper.samples_per_run]).toEqual([90, "upper", null]);
    const day = sim.durations.find((d) => d.step_id === "PaperB2025/P1/S1")!;
    expect([day.seconds, day.evidence]).toEqual([86400, { doc: "main", page: null, locator: "Fig. 2" }]);
  });

  it("AC-3: a covers_steps row is a joint duration with its steps and unit operations in order", () => {
    const joint = sim.durations.find((d) => d.step_id === "PaperA2024/P2/S2")!;
    expect(joint.seconds).toBe(1800);
    expect(joint.approximate).toBe(true);
    expect(joint.joint).toEqual({
      step_ids: ["PaperA2024/P2/S2", "PaperA2024/P2/S3"],
      unit_operations: ["measure_optical", "analyze_data"],
    });
    expect(joint.evidence.locator).toBeNull();
  });

  it("converts each throughput to a per-day value by the unit grammar, or gives the reason", () => {
    const rows = sim.throughputs.map((t) => [t.platform_id, t.unit, t.per_day, t.basis, t.not_converted]);
    expect(rows).toEqual([
      ["PaperA2024/P1", "experiments/h", 240, "experiments", null],
      ["PaperA2024/P1", "min/experiment", 48, "experiments", null],
      ["PaperA2024/P1", "runs/d", null, null, "unit not converted"],
      ["PaperA2024/P2", "samples/4h", 18, "samples × experiments per sample", null],
      ["PaperA2024/P2", "h/batch", null, null, "counts batches; no batch size is recorded"],
      ["PaperA2024/P2", "experiments/week", 2, "experiments", null],
      ["PaperB2025/P1", "batches/d", 16, "batches × batch size", null],
      ["PaperB2025/P1", "samples/h", null, null, "counts samples; no experiments per sample is recorded"],
    ]);
    const first = sim.throughputs[0]!;
    expect(first).toMatchObject({
      paper_id: "PaperA2024", doi: "10.1/a", kind: "measured", value: 10, per_working_day: false, bound: null,
      approximate: false, range_midpoint: false, range_low: null, range_high: null, n_experiments: 160,
      elapsed_time: 16, elapsed_time_unit: "h", evidence: { doc: "main", page: 3, locator: "§Results ¶3" },
    });
    expect(sim.throughputs[1]!.bound).toBe("lower");
    expect(sim.throughputs[5]).toMatchObject({ range_midpoint: true, range_low: 10, range_high: 18, kind: "nominal" });
    expect(sim.throughputs[6]!.per_working_day).toBe(true);
  });

  it("perDay handles rates with a multiplier, cycle times and every time unit", () => {
    expect(perDay(1, "experiments/s")).toEqual({ count: "experiments", perDay: 86400 });
    expect(perDay(3, "experiments/10min")).toEqual({ count: "experiments", perDay: 432 });
    expect(perDay(2, "d/batch")).toEqual({ count: "batches", perDay: 0.5 });
    expect(perDay(1, "s/sample")).toEqual({ count: "samples", perDay: 86400 });
    expect(perDay(1, "experiments/fortnight")).toBeNull();
    expect(perDay(1, "experiments/0h")).toBeNull();
  });

  it("keeps the transfer times with their edge and seconds", () => {
    expect(sim.transfer_times).toEqual([
      { edge_id: "PaperA2024/P2/E1", platform_id: "PaperA2024/P2", seconds: 12.5, value: 12.5, unit: "s",
        evidence: { doc: "SI1", page: 4, locator: "Table S1" } },
    ]);
  });

  it("lays out each platform: steps on their primary module, the modules steps use, connections and values", () => {
    expect(sim.platforms.map((p) => p.platform_id)).toEqual(["PaperA2024/P1", "PaperA2024/P2", "PaperB2025/P1"]);
    const p1 = sim.platforms[0]!;
    expect(p1).toEqual({
      platform_id: "PaperA2024/P1", name: "Rig One", paper_id: "PaperA2024", year: 2024,
      steps: [
        { step_id: "PaperA2024/P1/S1", unit_operation: "dispense_liquid", module_id: "PaperA2024/P1/M2" },
        { step_id: "PaperA2024/P1/S2", unit_operation: "analyze_data", module_id: "PaperA2024/P1/M1" },
      ],
      modules: [
        { module_id: "PaperA2024/P1/M1", module_type: "software", name: "controller", units: null },
        { module_id: "PaperA2024/P1/M2", module_type: "fluidics", name: "pumps", units: 3 },
      ],
      connections: [
        { from: "PaperA2024/P1/M2", to: "PaperA2024/P1/M1", transfer_mode: "data_transfer", is_material: false,
          transfer_time_s: null },
      ],
      batch_size: 4.5, parallel_units: 2, transfer_agents: [],
    });
    const p2 = sim.platforms[1]!;
    expect(p2.steps[2]).toEqual({ step_id: expect.stringMatching(/^PaperA2024\/P2\/S\d+$/), unit_operation: "analyze_data", module_id: null });
    expect(p2.connections.map((c) => [c.from.slice(-2), c.to.slice(-2), c.transfer_mode, c.transfer_time_s])).toEqual([
      ["M1", "M2", "fixed_tubing", 12.5],
      ["M2", "M1", "fixed_tubing", null],
      ["M1", "M2", "data_transfer", null],
    ]);
    expect(p2.transfer_agents).toEqual([{ agent: "robot_arm_gantry", count: 2 }]);
    expect(sim.platforms[2]!.batch_size).toBe(8);
  });

  it("writes simulation.json next to the other derived files", () => {
    const out = join(tempDir(), "out");
    writeDerived(deriveAll(MINI), out);
    expect(existsSync(join(out, "simulation.json"))).toBe(true);
    expect(JSON.parse(readFileSync(join(out, "simulation.json"), "utf8"))).toEqual(sim);
  });
});

describe("AC-4: bad timing or process rows stop the build", () => {
  const T = "modes/simulation/step_timing.csv";
  const V = "modes/simulation/process_values.csv";
  const cases: [string, string, string, string, RegExp][] = [
    ["an unknown step id", T, "PaperA2024/P2/S1,PaperA2024/P2,duration", "PaperA2024/P2/S9,PaperA2024/P2,duration",
      /step_timing\.csv row 3 \(PaperA2024\/P2\/S9\).*unknown step/],
    ["a duration unit week", T, "90.0,s,upper", "90.0,week,upper", /step_timing\.csv row 3 \(PaperA2024\/P2\/S1\).*unit "week"/],
    ["covers_steps starting with another step", T, ",PaperA2024/P2/S2;PaperA2024/P2/S3,", ",PaperA2024/P2/S3;PaperA2024/P2/S2,",
      /step_timing\.csv row 4 \(PaperA2024\/P2\/S2\).*covers_steps/],
    ["covers_steps naming an unknown step", T, ",PaperA2024/P2/S2;PaperA2024/P2/S3,", ",PaperA2024/P2/S2;PaperA2024/P2/S7,",
      /step_timing\.csv row 4 \(PaperA2024\/P2\/S2\).*unknown step PaperA2024\/P2\/S7/],
    ["a target_kind paper", V, "module,PaperA2024/P1/M2", "paper,PaperA2024/P1/M2",
      /process_values\.csv row 14 \(PaperA2024\/P1\/M2\).*target_kind "paper"/],
  ];
  for (const [name, rel, find, replace, message] of cases) {
    it(`${name}: deriveAll throws naming the row`, () => {
      const dir = copyMini();
      editLine(dir, rel, find, replace);
      expect(() => buildSimulation(dir)).toThrow(message);
      expect(() => deriveAll(dir)).toThrow(message);
    });
  }
});
