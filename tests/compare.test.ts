// AC-6 and AC-7: comparison id check and comparison assembly (REQ-014, REQ-015, REQ-009).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Connection, Module, PlatformFile, PlatformGraph, PlatformRow, Step } from "../src/data/types";
import { assembleComparison, checkCompareIds, loadFailureMessage, paperFile, pickPlatforms } from "../src/lib/compare";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("compare.test.ts");

const EV = { doc: "main", page: null, locator: null };
const mod = (module_id: string, module_type: string, on_platform = true): Module => ({
  module_id,
  module_type,
  name_in_paper: null,
  on_platform,
  unmapped_note: null,
  evidence: EV,
});
const step = (step_order: number, unit_operation: string, performed_by: string | null): Step => ({
  step_id: `S${step_order}`,
  step_order,
  unit_operation,
  family: null,
  performed_by,
  modules: [],
  uncertain: false,
  unmapped_note: null,
  evidence: EV,
});
const conn = (edge_id: string, transfer_mode: string, is_material: boolean): Connection => ({
  edge_id,
  from_module: "M1",
  to_module: "M2",
  transfer_mode,
  is_material,
  stated: true,
  uncertain: false,
  unmapped_note: null,
  evidence: EV,
});
const graph = (platform_id: string, name: string | null, parts: Partial<PlatformGraph>): PlatformGraph => ({
  platform_id,
  paper_id: platform_id.split("/")[0]!,
  doi: "",
  first_public_year: 2020,
  field_tags: [],
  name,
  commercial_integrated: false,
  identity_id: "",
  evidence: EV,
  modules: [],
  steps: [],
  connections: [],
  campaigns: null,
  shared_with: [],
  ...parts,
});

describe("assembleComparison on a fixture (AC-6)", () => {
  const a = graph("A2020/P1", "Rig A", {
    modules: [mod("M1", "robot"), mod("M2", "fluidics", false), mod("M3", "robot")],
    steps: [step(2, "heat", null), step(1, "dispense", "robot"), step(3, "measure", "instrument")],
    connections: [conn("C1", "fixed_tubing", true), conn("C2", "data_transfer", false), conn("C3", "fixed_tubing", true)],
  });
  const b = graph("B2021/P1", null, {
    first_public_year: 2021,
    modules: [mod("M1", "analyzer")],
    connections: [conn("C1", "human_transfer", true)],
  });
  const c = assembleComparison([a, b]);

  it("heads one column per platform in the given order", () => {
    expect(c.columns).toEqual([
      { platformId: "A2020/P1", name: "Rig A", paperId: "A2020", year: 2020 },
      { platformId: "B2021/P1", name: null, paperId: "B2021", year: 2021 },
    ]);
  });

  it("counts all modules by type, off-platform ones included, rows alphabetical", () => {
    expect(c.moduleRows).toEqual([
      { key: "analyzer", counts: [null, 1] },
      { key: "fluidics", counts: [1, null] },
      { key: "robot", counts: [2, null] },
    ]);
  });

  it("counts only material connections by transfer mode", () => {
    expect(c.transferRows).toEqual([
      { key: "fixed_tubing", counts: [2, null] },
      { key: "human_transfer", counts: [null, 1] },
    ]);
  });

  it("sorts steps by step_order and keeps a null performer null", () => {
    expect(c.steps[0]).toEqual([
      { order: 1, unitOperation: "dispense", performer: "robot" },
      { order: 2, unitOperation: "heat", performer: null },
      { order: 3, unitOperation: "measure", performer: "instrument" },
    ]);
    expect(c.steps[1]).toEqual([]);
  });
});

const row = (platform_id: string): PlatformRow => ({
  platform_id,
  paper_id: platform_id.split("/")[0]!,
  platform_name: null,
  first_public_year: 2020,
  field_tags: [],
  commercial_integrated: false,
  identity_id: "",
  n_modules: 0,
  n_steps: 0,
  module_types: [],
  material_transfer_modes: [],
  unit_operations: [],
});

describe("pickPlatforms and loadFailureMessage (REQ-015)", () => {
  const rows = [row("A2020/P1"), row("A2020/P2"), row("B2021/P1")];
  const fileA: PlatformFile = { paper_id: "A2020", platforms: [graph("A2020/P1", null, {}), graph("A2020/P2", null, {})] };

  it("returns the graphs in the order of the ids", () => {
    const fileB: PlatformFile = { paper_id: "B2021", platforms: [graph("B2021/P1", null, {})] };
    const r = pickPlatforms(["B2021/P1", "A2020/P2"], rows, { A2020: fileA, B2021: fileB });
    expect(r.ok && r.graphs.map((g) => g.platform_id)).toEqual(["B2021/P1", "A2020/P2"]);
  });

  it("names the platform and the file when a paper file lacks the platform", () => {
    const r = pickPlatforms(["A2020/P1", "B2021/P1"], rows, { A2020: fileA, B2021: { paper_id: "B2021", platforms: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain("B2021/P1");
      expect(r.message).toContain("data/platforms/B2021.json");
      expect(r.message).not.toContain("A2020");
    }
  });

  it("names the file when a paper file is absent from the loaded set", () => {
    const r = pickPlatforms(["A2020/P1", "B2021/P1"], rows, { A2020: fileA });
    expect(!r.ok && r.message).toContain("data/platforms/B2021.json");
  });

  it("names every file that failed to load", () => {
    const m = loadFailureMessage([
      { file: "data/platforms/A2020.json", reason: "HTTP 500" },
      { file: "data/platforms/B2021.json", reason: "not valid JSON" },
    ]);
    expect(m).toContain("data/platforms/A2020.json (HTTP 500)");
    expect(m).toContain("data/platforms/B2021.json (not valid JSON)");
  });

  it("builds the paper file path with an encoded paper id", () => {
    expect(paperFile("Aand2024")).toBe("data/platforms/Aand2024.json");
    expect(paperFile("A b")).toBe("data/platforms/A%20b.json");
  });
});

describe.skipIf(!dataAvailable)("checkCompareIds on the real index (AC-7)", () => {
  const platforms = dataAvailable ? readIndex().platforms : [];
  const check = (ids: string[]) => checkCompareIds(ids, platforms);

  it("rejects fewer than 2 and more than 3 ids, naming the count", () => {
    for (const ids of [[], ["Aand2024/P1"]]) {
      const r = check(ids);
      expect(r).toMatchObject({ ok: false, problem: "tooFew" });
      expect(!r.ok && r.message).toContain(`${ids.length} platform id`);
    }
    const four = check(["Aand2024/P1", "Li2020/P1", "Angello2022/P1", "Bedard2018/P1"]);
    expect(four).toMatchObject({ ok: false, problem: "tooMany" });
    expect(!four.ok && four.message).toContain("4 platform ids");
    expect(!four.ok && four.message).toContain("2 or 3");
  });

  it("names a duplicate id", () => {
    const r = check(["Aand2024/P1", "Aand2024/P1"]);
    expect(r).toMatchObject({ ok: false, problem: "duplicate", ids: ["Aand2024/P1"] });
    expect(!r.ok && r.message).toContain("Aand2024/P1");
  });

  it("names every unknown id", () => {
    const r = check(["Aand2024/P1", "Nope2000/P1", "Zed"]);
    expect(r).toMatchObject({ ok: false, problem: "unknown", ids: ["Nope2000/P1", "Zed"] });
    expect(!r.ok && r.message).toContain("Nope2000/P1, Zed");
  });

  it("checks count, then duplicates, then unknown ids", () => {
    expect(check(["Aand2024/P1", "Aand2024/P1", "Nope2000/P1", "Zed"])).toMatchObject({ problem: "tooMany" });
    expect(check(["Aand2024/P1", "Aand2024/P1", "Nope2000/P1"])).toMatchObject({ problem: "duplicate" });
  });

  it("returns the distinct paper files in order", () => {
    expect(check(["Aand2024/P1", "Li2020/P1"])).toEqual({ ok: true, paperIds: ["Aand2024", "Li2020"] });
    expect(check(["Bedard2018/P1", "Bedard2018/P2"])).toEqual({ ok: true, paperIds: ["Bedard2018"] });
  });
});

describe.skipIf(!dataAvailable)("assembleComparison on the real data (AC-6)", () => {
  const load = (id: string) =>
    (JSON.parse(readFileSync(join(import.meta.dirname, "..", "public", "data", "platforms", `${id.split("/")[0]}.json`), "utf8")) as PlatformFile)
      .platforms.find((g) => g.platform_id === id)!;
  const text = (rows: { key: string; counts: (number | null)[] }[]) => rows.map((r) => `${r.key} ${r.counts.map((n) => n ?? "—").join(" | ")}`);

  it("compares Aand2024/P1 and Li2020/P1", () => {
    const c = assembleComparison([load("Aand2024/P1"), load("Li2020/P1")]);
    expect(text(c.moduleRows)).toEqual([
      "flow_reactor 1 | 1",
      "fluidics 1 | 1",
      "instrument_optical 1 | 2",
      "liquid_handler — | 1",
      "sample_handling_station 1 | —",
      "software 1 | 1",
    ]);
    expect(text(c.transferRows)).toEqual(["fixed_tubing 3 | 3", "robot_arm_gantry — | 1"]);
    const steps = c.steps.map((s) => s.map((x) => `${x.order} ${x.unitOperation} ${x.performer ?? "—"}`));
    expect(steps.map((s) => s.length)).toEqual([6, 9]);
    expect(steps[0]![0]).toBe("1 dispense_liquid robot");
    expect(steps[1]![0]).toBe("1 dispense_liquid robot");
    expect(steps[0]![5]).toBe("6 plan_next_experiment software");
    expect(steps[1]![8]).toBe("9 generate_instructions software");
  });

  it("adds Angello2022/P1 as a third column", () => {
    const c = assembleComparison([load("Aand2024/P1"), load("Li2020/P1"), load("Angello2022/P1")]);
    expect(c.moduleRows).toHaveLength(8);
    expect(c.moduleRows.map((r) => r.key)).toEqual(expect.arrayContaining(["instrument_separation_ms", "unmapped"]));
    expect(c.transferRows).toHaveLength(3);
    expect(c.transferRows.find((r) => r.key === "human_transfer")?.counts).toEqual([null, null, 1]);
  });
});
