// Discrete-event simulation of the visitor's workflow (SPEC-SIM-001 REQ-017 to REQ-020, design §6): batches released
// while fewer than the parallel units are in progress, steps holding one device of their module, transfers with or
// without an agent, queues served by the chosen rule. Every input is the visitor's or the release's; for the same
// inputs and seed the event list is the same. Pure.
import { median, type StepSource } from "./cycleRange";
import { mulberry32, runSeed } from "./prng";
import { AGENT_MODES, isTransferBoundary, NOT_SPECIFIED, transferAt, type AgentMode, type WorkflowState } from "./workflowState";

export const MAX_STEP_RUNS = 5_000_000;

/** One step as the simulation runs it: a single step, or a chosen joint duration over several. */
export interface SimUnit {
  /** First and last workflow step it covers. */
  first: number;
  last: number;
  module: number;
  runs: number;
  /** Fixed seconds per run, or the values one run draws from (sorted). */
  fixed: number | null;
  values: number[];
  /** Transfer after this unit: seconds and the agent mode it needs, or null when the device is kept. */
  after: { seconds: number; agent: AgentMode | null } | null;
}

export interface SimEvent {
  batch: number;
  /** First workflow step of the unit, or the boundary step for a transfer. */
  step: number;
  kind: "step" | "transfer";
  /** "module m, device d", "<agent mode> a" or null for a transfer that holds nothing. */
  module: number | null;
  device: number | null;
  agent: { mode: AgentMode; index: number } | null;
  start: number;
  end: number;
  waited: number;
}

export interface RunResult {
  makespan: number;
  perDay: number | null;
  /** Busy device time / (devices × makespan) per module (1-based index). */
  utilization: Record<number, number>;
  /** Mean waiting before each unit, by its first step. */
  waiting: Record<number, number>;
  events: SimEvent[];
}

export interface SimSummary {
  makespan: { low: number; mid: number; high: number };
  perDay: { low: number | null; mid: number | null; high: number | null };
  utilization: Record<number, number>;
  waiting: Record<number, number>;
  bottleneck: { step: number; module: number; utilization: number } | null;
  run1: RunResult;
  runs: RunResult[];
}

/** The units the simulation runs, or the steps that still need a duration. */
export function simUnits(s: WorkflowState, sources: readonly StepSource[]): { units: SimUnit[]; missing: number[] } {
  const missing = sources.filter((x) => x.kind === "missing").map((x) => x.step);
  const units: SimUnit[] = [];
  for (const src of sources) {
    if (src.kind === "covered") continue;
    const last = src.kind === "joint" ? src.joint!.last : src.step;
    const fixed =
      src.kind === "entered" || src.kind === "joint" ? src.value! : s.draw === "median" && src.used.length > 0 ? median(src.used.map((d) => d.seconds)) : null;
    units.push({
      first: src.step,
      last,
      module: s.steps[src.step - 1]!.module,
      runs: src.runs,
      fixed,
      values: src.used.map((d) => d.seconds),
      after: null,
    });
  }
  for (let u = 0; u + 1 < units.length; u++) {
    const unit = units[u]!;
    const t = isTransferBoundary(s, unit.last) ? transferAt(s, unit.last) : { mode: NOT_SPECIFIED, seconds: 0 };
    const none = t.mode === NOT_SPECIFIED && t.seconds === 0;
    if (none && units[u + 1]!.module === unit.module) continue; // the batch keeps its device
    const agent = (AGENT_MODES as readonly string[]).includes(t.mode) ? (t.mode as AgentMode) : null;
    unit.after = { seconds: t.seconds, agent };
  }
  return { units, missing };
}

/** Step runs the simulation would perform: batches × runs × Σ runs per batch. */
export const stepRunCount = (s: WorkflowState, units: readonly SimUnit[]) =>
  s.n * s.runs * units.reduce((a, u) => a + u.runs, 0);

interface Request {
  batch: number;
  time: number;
  seq: number;
  grant: (time: number, index: number) => void;
}

/** A pool of identical resources with a queue served by the rule, ties by batch number. */
class Pool {
  free: boolean[];
  queue: Request[] = [];
  constructor(size: number) {
    this.free = Array<boolean>(size).fill(true);
  }
}

/** Runs the workflow once with the given random source; the event list is kept only when asked for. */
export function runOnce(s: WorkflowState, units: readonly SimUnit[], random: () => number, keepEvents = true): RunResult {
  const heap: { time: number; seq: number; act: () => void }[] = [];
  let seq = 0;
  const push = (time: number, act: () => void) => {
    heap.push({ time, seq: seq++, act });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (before(heap[i]!, heap[p]!)) [heap[i], heap[p]] = [heap[p]!, heap[i]!];
      else break;
      i = p;
    }
  };
  const before = (a: { time: number; seq: number }, b: { time: number; seq: number }) => a.time < b.time || (a.time === b.time && a.seq < b.seq);
  const pop = () => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && before(heap[l]!, heap[m]!)) m = l;
        if (r < heap.length && before(heap[r]!, heap[m]!)) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m]!, heap[i]!];
        i = m;
      }
    }
    return top;
  };

  const devices = new Map<number, Pool>();
  for (const u of units) if (!devices.has(u.module)) devices.set(u.module, new Pool(s.modules[u.module - 1]!.devices));
  const agents = new Map<AgentMode, Pool>(AGENT_MODES.map((m) => [m, new Pool(s.agents[m] ?? 1)]));
  const released: number[] = [];
  const busy = new Map<number, number>();
  const waits = new Map<number, number[]>(units.map((_, k) => [k, []]));
  const events: SimEvent[] = [];
  let nextBatch = 1;
  let makespan = 0;
  let reqSeq = 0;

  const serve = (pool: Pool, time: number) => {
    for (;;) {
      const index = pool.free.indexOf(true);
      if (index < 0 || pool.queue.length === 0) return;
      let best = 0;
      for (let k = 1; k < pool.queue.length; k++) {
        const a = pool.queue[k]!;
        const b = pool.queue[best]!;
        const ka = s.rule === "fifo" ? a.time : released[a.batch]!;
        const kb = s.rule === "fifo" ? b.time : released[b.batch]!;
        if (ka < kb || (ka === kb && (a.batch < b.batch || (a.batch === b.batch && a.seq < b.seq)))) best = k;
      }
      const [req] = pool.queue.splice(best, 1);
      pool.free[index] = false;
      req!.grant(time, index);
    }
  };
  const request = (pool: Pool, batch: number, time: number, grant: (time: number, index: number) => void) => {
    pool.queue.push({ batch, time, seq: reqSeq++, grant });
    serve(pool, time);
  };

  const draw = (u: SimUnit) => {
    if (u.fixed !== null) return u.fixed * u.runs;
    let total = 0;
    for (let r = 0; r < u.runs; r++) total += u.values[Math.floor(random() * u.values.length)]!;
    return total;
  };

  const startUnit = (batch: number, k: number, time: number, requested: number, device: number) => {
    const u = units[k]!;
    const d = draw(u);
    if (keepEvents) {
      events.push({ batch, step: u.first, kind: "step", module: u.module, device: device + 1, agent: null, start: time,
        end: time + d, waited: time - requested });
    }
    waits.get(k)!.push(time - requested);
    busy.set(u.module, (busy.get(u.module) ?? 0) + d);
    push(time + d, () => finishUnit(batch, k, time + d, device));
  };

  const requestUnit = (batch: number, k: number, time: number, kept: number | null) => {
    if (kept !== null) {
      startUnit(batch, k, time, time, kept);
      return;
    }
    request(devices.get(units[k]!.module)!, batch, time, (t, index) => startUnit(batch, k, t, time, index));
  };

  const release = (time: number) => {
    if (nextBatch > s.n) return;
    const batch = nextBatch++;
    released[batch] = time;
    requestUnit(batch, 0, time, null);
  };

  const finishUnit = (batch: number, k: number, time: number, device: number) => {
    const u = units[k]!;
    const pool = devices.get(u.module)!;
    if (k === units.length - 1) {
      pool.free[device] = true;
      serve(pool, time);
      makespan = Math.max(makespan, time);
      release(time);
      return;
    }
    if (u.after === null) {
      requestUnit(batch, k + 1, time, device);
      return;
    }
    pool.free[device] = true;
    serve(pool, time);
    const after = u.after;
    const moved = (start: number, waited: number, agent: { mode: AgentMode; index: number } | null) => {
      const end = start + after.seconds;
      if (keepEvents && (after.seconds > 0 || agent)) {
        events.push({ batch, step: u.last, kind: "transfer", module: null, device: null, agent, start, end, waited });
      }
      push(end, () => {
        if (agent) {
          const ap = agents.get(agent.mode)!;
          ap.free[agent.index - 1] = true;
          serve(ap, end);
        }
        requestUnit(batch, k + 1, end, null);
      });
    };
    if (after.agent) {
      const mode = after.agent;
      request(agents.get(mode)!, batch, time, (t, index) => moved(t, t - time, { mode, index: index + 1 }));
    } else moved(time, 0, null);
  };

  for (let b = 0; b < Math.min(s.parallel, s.n); b++) push(0, () => release(0));
  while (heap.length > 0) pop().act();

  const utilization: Record<number, number> = {};
  for (const [m, pool] of devices) utilization[m] = makespan === 0 ? 0 : (busy.get(m) ?? 0) / (pool.free.length * makespan);
  const waiting: Record<number, number> = {};
  units.forEach((u, k) => {
    const w = waits.get(k)!;
    waiting[u.first] = w.length === 0 ? 0 : w.reduce((a, x) => a + x, 0) / w.length;
  });
  return { makespan, perDay: makespan === 0 ? null : (s.n * s.batch * 86_400) / makespan, utilization, waiting, events };
}

const sortedMedian = (xs: number[]) => median([...xs].sort((a, b) => a - b));

/** All runs, each with its own seeded random source, and the summary over them. */
export function simulate(s: WorkflowState, units: readonly SimUnit[]): SimSummary {
  const runs: RunResult[] = [];
  for (let r = 1; r <= s.runs; r++) runs.push(runOnce(s, units, mulberry32(runSeed(s.seed, r)), r === 1));
  const spans = runs.map((r) => r.makespan).sort((a, b) => a - b);
  const days = runs.map((r) => r.perDay).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const utilization: Record<number, number> = {};
  for (const m of Object.keys(runs[0]!.utilization).map(Number)) utilization[m] = sortedMedian(runs.map((r) => r.utilization[m]!));
  const waiting: Record<number, number> = {};
  for (const step of Object.keys(runs[0]!.waiting).map(Number)) waiting[step] = sortedMedian(runs.map((r) => r.waiting[step]!));
  let bottleneck: SimSummary["bottleneck"] = null;
  for (const u of units) {
    const v = utilization[u.module]!;
    if (bottleneck === null || v > bottleneck.utilization) bottleneck = { step: u.first, module: u.module, utilization: v };
  }
  return {
    makespan: { low: spans[0]!, mid: median(spans), high: spans.at(-1)! },
    perDay: days.length === runs.length ? { low: days[0]!, mid: median(days), high: days.at(-1)! } : { low: null, mid: null, high: null },
    utilization,
    waiting,
    bottleneck,
    run1: runs[0]!,
    runs,
  };
}
