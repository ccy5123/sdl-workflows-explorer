// Cycle-time and throughput range from recorded step durations (SPEC-SIM-001 REQ-011 to REQ-015, design §5): per step
// the lowest, median and highest recorded single-step duration of its unit operation (or the visitor's value, or a
// chosen joint duration), times the runs per batch, plus transfer times. Pure.
import type { DurationRow, ThroughputRow } from "../data/types";
import { jointRuns, transferAt, isTransferBoundary, type Catalog, type WorkflowState } from "./workflowState";

/** Single-step durations per unit operation (joint rows left out), each sorted by (seconds, step_id). */
export function singleStepGroups(durations: readonly DurationRow[]): Map<string, DurationRow[]> {
  const groups = new Map<string, DurationRow[]>();
  for (const d of durations) {
    if (d.joint) continue;
    const list = groups.get(d.unit_operation) ?? [];
    list.push(d);
    groups.set(d.unit_operation, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.seconds - b.seconds || (a.step_id < b.step_id ? -1 : a.step_id > b.step_id ? 1 : 0));
  }
  return groups;
}

/** The values used: recorded bounds only when the visitor includes them. */
export const usedRows = (rows: readonly DurationRow[], bounds: boolean): DurationRow[] =>
  bounds ? [...rows] : rows.filter((d) => d.bound === null);

/** Median of an ascending list; the mean of the two middle values for an even count. */
export function median(sorted: readonly number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Runs per batch of step i: ⌈batch size × samples per experiment / samples per run⌉. */
export function runsPerBatch(s: WorkflowState, i: number): number {
  const all = s.batch * s.samples;
  return Math.ceil(all / (s.perRun[i] ?? all));
}

export type SourceKind = "entered" | "joint" | "covered" | "recorded" | "missing";

/** Where step i's duration comes from, shared by the range and the simulation. */
export interface StepSource {
  step: number;
  uo: string;
  kind: SourceKind;
  /** Recorded single-step values of the unit operation (V) and the ones used (U). */
  recorded: DurationRow[];
  used: DurationRow[];
  runs: number;
  /** The entered value or the joint value, in seconds, for kinds entered and joint. */
  value: number | null;
  /** For kind joint: the chosen row and the last step it covers; for kind covered: the run's first step. */
  joint: { id: string; first: number; last: number } | null;
}

export function stepSources(
  s: WorkflowState,
  c: Catalog,
  groups: Map<string, DurationRow[]>,
  jointRows: Map<string, DurationRow>,
): StepSource[] {
  const runOf = new Map<number, { id: string; first: number; last: number }>();
  for (const r of jointRuns(s, c)) for (let k = r.first; k <= r.last; k++) runOf.set(k, r);
  return s.steps.map((st, k) => {
    const step = k + 1;
    const recorded = groups.get(st.uo) ?? [];
    const used = usedRows(recorded, s.bounds);
    const base = { step, uo: st.uo, recorded, used, runs: runsPerBatch(s, step), value: null, joint: null };
    const run = runOf.get(step);
    if (run) {
      if (run.first !== step) return { ...base, kind: "covered" as const, joint: run };
      return { ...base, kind: "joint" as const, value: jointRows.get(run.id)?.seconds ?? 0, joint: run };
    }
    if (s.entered[step] !== undefined) return { ...base, kind: "entered" as const, value: s.entered[step]! };
    return { ...base, kind: used.length > 0 ? ("recorded" as const) : ("missing" as const) };
  });
}

export interface Triple {
  low: number;
  mid: number;
  high: number;
}

export interface StepRange extends StepSource {
  /** Per batch (× runs); null for a missing step. */
  range: Triple | null;
}

export interface CycleResult {
  steps: StepRange[];
  /** Transfer times counted: boundaries outside chosen joint runs. */
  transfers: { boundary: number; seconds: number }[];
  missing: number[];
  entered: number[];
  cycle: Triple | null;
  /** Experiments per day for the high, mid and low cycle; null where the cycle bound is 0 s. */
  perDay: { low: number | null; mid: number | null; high: number | null } | null;
}

export function cycleRange(s: WorkflowState, sources: readonly StepSource[]): CycleResult {
  const steps: StepRange[] = sources.map((src) => {
    let range: Triple | null = null;
    if (src.kind === "entered" || src.kind === "joint") {
      const v = src.value! * src.runs;
      range = { low: v, mid: v, high: v };
    } else if (src.kind === "covered") range = { low: 0, mid: 0, high: 0 };
    else if (src.kind === "recorded") {
      const xs = src.used.map((d) => d.seconds);
      range = { low: xs[0]! * src.runs, mid: median(xs) * src.runs, high: xs.at(-1)! * src.runs };
    }
    return { ...src, range };
  });
  // a chosen joint run i..j holds boundaries i..j-1, so none of those adds a transfer
  const inside = new Set<number>();
  for (const src of sources) if (src.kind === "covered") inside.add(src.step - 1);
  const transfers: CycleResult["transfers"] = [];
  for (let i = 1; i < s.steps.length; i++) {
    if (!isTransferBoundary(s, i) || inside.has(i)) continue;
    const t = transferAt(s, i);
    if (t.seconds > 0) transfers.push({ boundary: i, seconds: t.seconds });
  }
  const missing = steps.filter((x) => x.kind === "missing").map((x) => x.step);
  const entered = steps.filter((x) => x.kind === "entered").map((x) => x.step);
  if (missing.length > 0) return { steps, transfers, missing, entered, cycle: null, perDay: null };
  const moved = transfers.reduce((a, t) => a + t.seconds, 0);
  const sum = (key: keyof Triple) => steps.reduce((a, x) => a + x.range![key], 0) + moved;
  const cycle = { low: sum("low"), mid: sum("mid"), high: sum("high") };
  const day = (t: number) => (t === 0 ? null : (s.batch * s.parallel * 86_400) / t);
  return { steps, transfers, missing, entered, cycle, perDay: { low: day(cycle.high), mid: day(cycle.mid), high: day(cycle.low) } };
}

/** Joint durations whose unit operations match the visitor's steps from step i on, per first step. */
export function jointOffers(s: WorkflowState, durations: readonly DurationRow[]): Map<number, DurationRow[]> {
  const out = new Map<number, DurationRow[]>();
  for (const d of durations) {
    if (!d.joint) continue;
    const uos = d.joint.unit_operations;
    for (let i = 1; i + uos.length - 1 <= s.steps.length; i++) {
      if (uos.every((u, k) => s.steps[i - 1 + k]!.uo === u)) out.set(i, [...(out.get(i) ?? []), d]);
    }
  }
  return out;
}

/** Recorded throughputs with a per-day value, by kind, and those without one. */
export function throughputGroups(rows: readonly ThroughputRow[]) {
  return {
    measured: rows.filter((t) => t.kind === "measured" && t.per_day !== null),
    nominal: rows.filter((t) => t.kind === "nominal" && t.per_day !== null),
    notConverted: rows.filter((t) => t.per_day === null),
  };
}

const UNITS: [number, string][] = [
  [86_400, "d"],
  [3_600, "h"],
  [60, "min"],
  [1, "s"],
];

/** A duration in the largest unit it fills at least twice (s below 2 min), to 4 significant figures. */
export function formatDuration(seconds: number): string {
  const [size, unit] = UNITS.find(([u]) => seconds >= 2 * u) ?? [1, "s"];
  return `${formatNumber(seconds / size)} ${unit}`;
}

/** A number to 4 significant figures (whole numbers of 1,000 or more in full), with thousands separators. */
export function formatNumber(x: number): string {
  if (x === 0) return "0";
  if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString("en");
  return Number(x.toPrecision(4)).toLocaleString("en", { maximumFractionDigits: 6 });
}
