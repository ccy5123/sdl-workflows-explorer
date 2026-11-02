// Release timing tables -> simulation.json (SPEC-SIM-001 REQ-001 to REQ-004): step durations in seconds with their
// markers and joint runs, platform throughputs with a per-day value where the unit grammar allows one, recorded
// transfer times, and one layout per platform for the workflow builder.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Bound,
  DurationRow,
  DurationUnit,
  Evidence,
  PlatformGraph,
  PlatformLayout,
  SimulationJson,
  ThroughputBasis,
  ThroughputRow,
  TransferAgent,
  TransferTimeRow,
} from "../../src/data/types";
import { type CsvRow, nullIfEmpty, readCsv, toBool01, toInt } from "./csv";

type Graph = Pick<PlatformGraph, "platform_id" | "paper_id" | "doi" | "first_public_year" | "name" | "modules" | "steps" | "connections">;

const TIMING = "modes/simulation/step_timing.csv";
const VALUES = "modes/simulation/process_values.csv";

const DURATION_SECONDS: Record<DurationUnit, number> = { s: 1, min: 60, h: 3600, d: 86400 };
const isDurationUnit = (u: string): u is DurationUnit => Object.hasOwn(DURATION_SECONDS, u);

const SECONDS: Record<string, number> = { s: 1, min: 60, h: 3600, d: 86400, week: 604800 };
const PLURAL: Record<string, "experiments" | "samples" | "batches"> = {
  experiment: "experiments",
  sample: "samples",
  batch: "batches",
};

/** Count per day of a throughput unit: a rate `<count>/<k><time>` or a cycle time `<time>/<count>` (design §2). */
export function perDay(value: number, unit: string): { count: "experiments" | "samples" | "batches"; perDay: number } | null {
  const rate = /^(experiments|samples|batches)\/(\d*)(s|min|h|d|week)$/.exec(unit);
  if (rate) {
    const k = rate[2] === "" ? 1 : Number(rate[2]);
    if (k === 0) return null;
    return { count: rate[1] as "experiments" | "samples" | "batches", perDay: (value * 86400) / (k * SECONDS[rate[3]!]!) };
  }
  const cycle = /^(s|min|h|d|week)\/(experiment|sample|batch)$/.exec(unit);
  if (cycle && value > 0) return { count: PLURAL[cycle[2]!]!, perDay: 86400 / (value * SECONDS[cycle[1]!]!) };
  return null;
}

function num(value: string, where: string): number {
  const n = Number(value);
  if (value === "" || !Number.isFinite(n)) throw new Error(`${where}: expected a number, got "${value}"`);
  return n;
}

const numOrNull = (value: string, where: string): number | null => (value === "" ? null : num(value, where));

function bound(value: string, where: string): Bound {
  if (value === "") return null;
  if (value === "lower" || value === "upper") return value;
  throw new Error(`${where}: bound must be lower, upper or empty, got "${value}"`);
}

function evidenceOf(r: CsvRow, where: string): Evidence {
  return {
    doc: r.ev_doc ?? "",
    page: r.ev_page ? toInt(r.ev_page, `${where} ev_page`) : null,
    locator: nullIfEmpty(r.ev_locator ?? ""),
  };
}

function readClasses(dir: string): Pick<SimulationJson, "unit_operations" | "module_types" | "transfer_modes"> {
  return {
    unit_operations: readCsv(join(dir, "core/unit_operation.csv")).map((r) => ({
      id: r.unit_operation!,
      family: r.family!,
      definition: r.definition!,
    })),
    module_types: readCsv(join(dir, "core/module_type.csv")).map((r) => ({ id: r.module_type!, definition: r.definition! })),
    transfer_modes: readCsv(join(dir, "core/transfer_mode.csv")).map((r) => ({
      id: r.transfer_mode!,
      is_material: toBool01(r.is_material!, `core/transfer_mode.csv (${r.transfer_mode})`),
      definition: r.definition!,
    })),
  };
}

interface StepInfo {
  unit_operation: string;
  graph: Graph;
}

function readDurations(dir: string, steps: Map<string, StepInfo>): DurationRow[] {
  const rows = readCsv(join(dir, TIMING));
  const at = (i: number) => `${TIMING} row ${i + 1} (${rows[i]!.step_id})`;
  const samples = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!steps.has(r.step_id!)) throw new Error(`${at(i)}: unknown step (not in modes/builder/platform_graphs.jsonl)`);
    if (r.quantity === "duration_batch_size") samples.set(r.step_id!, num(r.value!, at(i)));
  });
  const out: DurationRow[] = [];
  rows.forEach((r, i) => {
    if (r.quantity !== "duration") return;
    const where = at(i);
    const unit = r.unit!;
    if (!isDurationUnit(unit)) throw new Error(`${where}: duration unit "${unit}" is not s, min, h or d`);
    const toS = (v: number | null) => (v === null ? null : v * DURATION_SECONDS[unit]);
    let joint: DurationRow["joint"] = null;
    if (r.covers_steps) {
      const ids = r.covers_steps.split(";");
      if (ids[0] !== r.step_id) throw new Error(`${where}: covers_steps must start with the row's step, starts with ${ids[0]}`);
      const unknown = ids.find((id) => !steps.has(id));
      if (unknown !== undefined) throw new Error(`${where}: covers_steps names unknown step ${unknown}`);
      joint = { step_ids: ids, unit_operations: ids.map((id) => steps.get(id)!.unit_operation) };
    }
    const step = steps.get(r.step_id!)!;
    const value = num(r.value!, where);
    out.push({
      step_id: r.step_id!,
      platform_id: step.graph.platform_id,
      paper_id: step.graph.paper_id,
      doi: step.graph.doi,
      unit_operation: step.unit_operation,
      seconds: toS(value)!,
      value,
      unit,
      bound: bound(r.bound!, where),
      approximate: toBool01(r.approximate!, `${where} approximate`),
      range_midpoint: toBool01(r.range_midpoint!, `${where} range_midpoint`),
      range_low_s: toS(numOrNull(r.range_low!, where)),
      range_high_s: toS(numOrNull(r.range_high!, where)),
      samples_per_run: samples.get(r.step_id!) ?? null,
      joint,
      evidence: evidenceOf(r, where),
    });
  });
  return out;
}

const TARGET_KINDS = new Set(["platform", "module", "connection"]);

function readValues(dir: string): { rows: CsvRow[]; at: (i: number) => string } {
  const rows = readCsv(join(dir, VALUES));
  const at = (i: number) => `${VALUES} row ${i + 1} (${rows[i]!.target_id})`;
  rows.forEach((r, i) => {
    if (!TARGET_KINDS.has(r.target_kind!)) {
      throw new Error(`${at(i)}: target_kind "${r.target_kind}" is not platform, module or connection`);
    }
  });
  return { rows, at };
}

function platformValue(rows: CsvRow[], quantity: string, at: (i: number) => string): Map<string, number> {
  const out = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.target_kind === "platform" && r.quantity === quantity) out.set(r.target_id!, num(r.value!, at(i)));
  });
  return out;
}

function readThroughputs(rows: CsvRow[], at: (i: number) => string, graphs: Map<string, Graph>): ThroughputRow[] {
  const batch = platformValue(rows, "batch_size", at);
  const epc = platformValue(rows, "experiments_per_count", at);
  const out: ThroughputRow[] = [];
  rows.forEach((r, i) => {
    if (r.quantity !== "throughput") return;
    const where = at(i);
    const g = graphs.get(r.platform_id!);
    if (!g) throw new Error(`${where}: unknown platform ${r.platform_id}`);
    const kind = r.throughput_kind;
    if (kind !== "measured" && kind !== "nominal") throw new Error(`${where}: throughput_kind "${kind}" is not measured or nominal`);
    const value = num(r.value!, where);
    const rate = perDay(value, r.unit!);
    let per_day: number | null = null;
    let basis: ThroughputBasis | null = null;
    let not_converted: string | null = null;
    if (rate === null) not_converted = "unit not converted";
    else if (rate.count === "experiments") [per_day, basis] = [rate.perDay, "experiments"];
    else if (rate.count === "samples") {
      const f = epc.get(r.platform_id!);
      if (f === undefined) not_converted = "counts samples; no experiments per sample is recorded";
      else [per_day, basis] = [rate.perDay * f, "samples × experiments per sample"];
    } else {
      const b = batch.get(r.platform_id!);
      if (b === undefined) not_converted = "counts batches; no batch size is recorded";
      else [per_day, basis] = [rate.perDay * b, "batches × batch size"];
    }
    out.push({
      platform_id: g.platform_id,
      paper_id: g.paper_id,
      doi: g.doi,
      kind,
      value,
      unit: r.unit!,
      per_working_day: r.per_working_day === "1",
      bound: bound(r.bound!, where),
      approximate: toBool01(r.approximate!, `${where} approximate`),
      range_midpoint: toBool01(r.range_midpoint!, `${where} range_midpoint`),
      range_low: numOrNull(r.range_low!, where),
      range_high: numOrNull(r.range_high!, where),
      n_experiments: numOrNull(r.n_experiments!, where),
      elapsed_time: numOrNull(r.elapsed_time!, where),
      elapsed_time_unit: nullIfEmpty(r.elapsed_time_unit!),
      per_day,
      basis,
      not_converted,
      evidence: evidenceOf(r, where),
    });
  });
  return out;
}

function readTransferTimes(rows: CsvRow[], at: (i: number) => string): TransferTimeRow[] {
  const out: TransferTimeRow[] = [];
  rows.forEach((r, i) => {
    if (r.target_kind !== "connection" || r.quantity !== "transfer_time") return;
    const where = at(i);
    const unit = r.unit!;
    if (!isDurationUnit(unit)) throw new Error(`${where}: transfer_time unit "${unit}" is not s, min, h or d`);
    const value = num(r.value!, where);
    out.push({ edge_id: r.target_id!, platform_id: r.platform_id!, seconds: value * DURATION_SECONDS[unit], value, unit,
      evidence: evidenceOf(r, where) });
  });
  return out;
}

const edgeNumber = (edgeId: string): number => Number(/E(\d+)$/.exec(edgeId)?.[1] ?? Number.MAX_SAFE_INTEGER);
const AGENTS = new Set<string>(["robot_arm_gantry", "mobile_robot", "human"]);

function layouts(graphs: Graph[], rows: CsvRow[], at: (i: number) => string, times: TransferTimeRow[]): PlatformLayout[] {
  const batch = platformValue(rows, "batch_size", at);
  const parallel = platformValue(rows, "parallel_units", at);
  const units = new Map<string, number>();
  const agents = new Map<string, { agent: TransferAgent; count: number }[]>();
  rows.forEach((r, i) => {
    if (r.target_kind === "module" && r.quantity === "units") units.set(r.target_id!, num(r.value!, at(i)));
    if (r.target_kind === "platform" && r.quantity === "transfer_agent_count") {
      if (!AGENTS.has(r.agent!)) throw new Error(`${at(i)}: agent "${r.agent}" is not robot_arm_gantry, mobile_robot or human`);
      const list = agents.get(r.target_id!) ?? [];
      list.push({ agent: r.agent as TransferAgent, count: num(r.value!, at(i)) });
      agents.set(r.target_id!, list);
    }
  });
  const timeOf = new Map(times.map((t) => [t.edge_id, t.seconds]));
  return graphs.map((g) => {
    const steps = [...g.steps]
      .sort((a, b) => a.step_order - b.step_order)
      .map((s) => ({ unit_operation: s.unit_operation, module_id: s.modules[0] ?? null }));
    const used = new Set(steps.map((s) => s.module_id).filter((m): m is string => m !== null));
    return {
      platform_id: g.platform_id,
      name: g.name,
      paper_id: g.paper_id,
      year: g.first_public_year,
      steps,
      modules: g.modules
        .filter((m) => used.has(m.module_id))
        .map((m) => ({ module_id: m.module_id, module_type: m.module_type, name: m.name_in_paper,
          units: units.get(m.module_id) ?? null })),
      connections: g.connections
        .filter((c) => used.has(c.from_module) && used.has(c.to_module))
        .sort((a, b) => edgeNumber(a.edge_id) - edgeNumber(b.edge_id))
        .map((c) => ({ from: c.from_module, to: c.to_module, transfer_mode: c.transfer_mode, is_material: c.is_material,
          transfer_time_s: timeOf.get(c.edge_id) ?? null })),
      batch_size: batch.get(g.platform_id) ?? null,
      parallel_units: parallel.get(g.platform_id) ?? null,
      transfer_agents: agents.get(g.platform_id) ?? [],
    };
  });
}

function readGraphsRaw(dir: string): Graph[] {
  return readFileSync(join(dir, "modes/builder/platform_graphs.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Graph);
}

// @MX:ANCHOR: [AUTO] buildSimulation — the only producer of simulation.json; read by every workflow-builder output
// @MX:REASON: field shapes must stay in step with src/data/types.ts SimulationJson and SPEC-SIM-001 design §1
export function buildSimulation(dir: string, graphs: Graph[] = readGraphsRaw(dir)): SimulationJson {
  const steps = new Map<string, StepInfo>();
  for (const g of graphs) for (const s of g.steps) steps.set(s.step_id, { unit_operation: s.unit_operation, graph: g });
  const durations = readDurations(dir, steps);
  const { rows, at } = readValues(dir);
  const transfer_times = readTransferTimes(rows, at);
  return {
    ...readClasses(dir),
    durations,
    throughputs: readThroughputs(rows, at, new Map(graphs.map((g) => [g.platform_id, g]))),
    transfer_times,
    platforms: layouts(graphs, rows, at, transfer_times),
  };
}
