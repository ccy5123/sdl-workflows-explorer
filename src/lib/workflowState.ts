// Workflow builder state: the visitor's steps, modules and transfers plus the inputs of the cycle-time range and the
// simulation, its hash-query grammar, edits that refuse out-of-range values, and the fill from a coded platform
// (SPEC-SIM-001 REQ-006 to REQ-008, design §3 and §4). Pure: decoding never throws.
import type { PlatformLayout, SimulationJson } from "../data/types";

export const AGENT_MODES = ["robot_arm_gantry", "mobile_robot", "human_transfer"] as const;
export type AgentMode = (typeof AGENT_MODES)[number];
export const NOT_SPECIFIED = "na";

export interface WfStep {
  uo: string;
  /** 1-based index into modules. */
  module: number;
}
export interface WfModule {
  type: string;
  devices: number;
}
export interface WfTransfer {
  /** A release transfer mode, or "na" (not specified). */
  mode: string;
  seconds: number;
}

/** Keys of the per-step and per-boundary records are 1-based step or boundary numbers. */
export interface WorkflowState {
  steps: WfStep[];
  modules: WfModule[];
  /** Boundary i lies between steps i and i+1; only non-default transfers are kept. */
  transfers: Record<number, WfTransfer>;
  batch: number;
  samples: number;
  parallel: number;
  perRun: Record<number, number>;
  entered: Record<number, number>;
  /** First step of a chosen joint duration → step_id of its row. */
  joints: Record<number, string>;
  bounds: boolean;
  agents: Partial<Record<AgentMode, number>>;
  rule: "fifo" | "released";
  draw: "sample" | "median";
  n: number;
  runs: number;
  seed: number;
}

export const DEFAULT_STATE: WorkflowState = {
  steps: [],
  modules: [],
  transfers: {},
  batch: 1,
  samples: 1,
  parallel: 1,
  perRun: {},
  entered: {},
  joints: {},
  bounds: false,
  agents: {},
  rule: "fifo",
  draw: "sample",
  n: 10,
  runs: 20,
  seed: 1,
};

export const LIMITS = {
  steps: 40,
  modules: 40,
  devices: [1, 50],
  transferSeconds: 86_400,
  batch: [1, 10_000],
  samples: [1, 1_000],
  parallel: [1, 50],
  enteredSeconds: 10_000_000,
  agents: [1, 50],
  n: [1, 500],
  runs: [1, 100],
  seed: [0, 4_294_967_295],
} as const;

/** Release classes and joint durations the state is checked against. */
export interface Catalog {
  unitOperations: Set<string>;
  moduleTypes: Set<string>;
  transferModes: Set<string>;
  materialModes: Set<string>;
  /** step_id of a joint duration row → unit operations it covers, in order. */
  joints: Map<string, string[]>;
}

export function catalogOf(sim: SimulationJson): Catalog {
  return {
    unitOperations: new Set(sim.unit_operations.map((u) => u.id)),
    moduleTypes: new Set(sim.module_types.map((m) => m.id)),
    transferModes: new Set(sim.transfer_modes.map((t) => t.id)),
    materialModes: new Set(sim.transfer_modes.filter((t) => t.is_material).map((t) => t.id)),
    joints: new Map(sim.durations.filter((d) => d.joint).map((d) => [d.step_id, d.joint!.unit_operations])),
  };
}

// ---- Number parsing ---------------------------------------------------------------------------

/** A whole number in [min, max] written in plain digits, else null. */
export function parseCount(text: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

/** Seconds in [0, max] with at most 3 decimal places, else null. */
export function parseSeconds(text: string, max: number): number | null {
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null;
  const n = Number(text);
  return n <= max ? n : null;
}

const secondsText = (s: number) => String(s);

// ---- Helpers ----------------------------------------------------------------------------------

const keys = (r: Record<number, unknown>) => Object.keys(r).map(Number);
const allSamples = (s: WorkflowState) => s.batch * s.samples;
const stepName = (s: WorkflowState, i: number) => `step ${i} (${s.steps[i - 1]?.uo ?? "?"})`;

/** Whether boundary i (between steps i and i+1) joins steps on different modules. */
export function isTransferBoundary(s: WorkflowState, i: number): boolean {
  const a = s.steps[i - 1];
  const b = s.steps[i];
  return a !== undefined && b !== undefined && a.module !== b.module;
}

export function transferAt(s: WorkflowState, i: number): WfTransfer {
  return s.transfers[i] ?? { mode: NOT_SPECIFIED, seconds: 0 };
}

const isDefaultTransfer = (t: WfTransfer) => t.mode === NOT_SPECIFIED && t.seconds === 0;

/** Number of steps a chosen joint duration starting at step `first` covers. */
export function jointLength(c: Catalog, jointId: string): number {
  return c.joints.get(jointId)?.length ?? 0;
}

/** Why a joint choice at step `first` is not possible against the steps and earlier choices, or null. */
function jointProblem(s: WorkflowState, c: Catalog, first: number, jointId: string, taken: Set<number>): string | null {
  const uos = c.joints.get(jointId);
  if (!uos) return "no such joint duration";
  const last = first + uos.length - 1;
  if (first < 1 || last > s.steps.length) return "its steps run past the workflow";
  for (let k = 0; k < uos.length; k++) if (s.steps[first - 1 + k]!.uo !== uos[k]) return "the steps do not match it";
  for (let k = first; k <= last; k++) if (taken.has(k)) return "it overlaps a joint duration already chosen";
  return null;
}

/** Steps covered by chosen joint durations, as first → last. */
export function jointRuns(s: WorkflowState, c: Catalog): { first: number; last: number; id: string }[] {
  return keys(s.joints)
    .sort((a, b) => a - b)
    .map((first) => ({ first, last: first + jointLength(c, s.joints[first]!) - 1, id: s.joints[first]! }));
}

// ---- Reconciling after an edit ----------------------------------------------------------------

/** Resets inputs that an edit made invalid, naming each (REQ-006). */
export function reconcile(s: WorkflowState, c: Catalog): { state: WorkflowState; notes: string[] } {
  const notes: string[] = [];
  const n = s.steps.length;
  const perRun: Record<number, number> = {};
  for (const i of keys(s.perRun)) {
    const v = s.perRun[i]!;
    if (i > n) continue;
    if (v > allSamples(s)) notes.push(`Samples per run of ${stepName(s, i)} reset to all samples of the batch.`);
    else if (v !== allSamples(s)) perRun[i] = v;
  }
  const entered: Record<number, number> = {};
  for (const i of keys(s.entered)) if (i <= n) entered[i] = s.entered[i]!;
  const transfers: Record<number, WfTransfer> = {};
  for (const i of keys(s.transfers)) {
    if (i >= n) continue;
    if (!isTransferBoundary(s, i)) {
      notes.push(`Transfer between steps ${i} and ${i + 1} removed: both steps now use module ${s.steps[i]!.module}.`);
    } else transfers[i] = s.transfers[i]!;
  }
  const joints: Record<number, string> = {};
  const taken = new Set<number>();
  for (const first of keys(s.joints).sort((a, b) => a - b)) {
    const id = s.joints[first]!;
    if (jointProblem(s, c, first, id, taken) !== null) {
      notes.push(`Joint duration chosen from step ${first} cleared: the steps no longer match it.`);
      continue;
    }
    joints[first] = id;
    for (let k = first; k < first + jointLength(c, id); k++) taken.add(k);
  }
  return { state: { ...s, perRun, entered, transfers, joints }, notes };
}

// ---- Edits ------------------------------------------------------------------------------------

export type EditResult = { ok: true; state: WorkflowState; notes: string[] } | { ok: false; error: string };

const refuse = (error: string): EditResult => ({ ok: false, error });
const done = (s: WorkflowState, c: Catalog, extra: string[] = []): EditResult => {
  const r = reconcile(s, c);
  return { ok: true, state: r.state, notes: [...extra, ...r.notes] };
};

/**
 * Rebuilds the step list from `order` (old 1-based step numbers, or null for a new step): per-step inputs follow their
 * step, and a transfer stays only while its two steps stay next to each other.
 */
function reorder(s: WorkflowState, steps: WfStep[], order: (number | null)[]): { state: WorkflowState; notes: string[] } {
  const notes: string[] = [];
  const newOf = new Map<number, number>();
  order.forEach((old, k) => old !== null && newOf.set(old, k + 1));
  const move = <T>(r: Record<number, T>) => {
    const out: Record<number, T> = {};
    for (const i of keys(r)) if (newOf.has(i)) out[newOf.get(i)!] = r[i]!;
    return out;
  };
  const transfers: Record<number, WfTransfer> = {};
  for (const i of keys(s.transfers)) {
    const a = newOf.get(i);
    const b = newOf.get(i + 1);
    if (a !== undefined && b === a + 1) transfers[a] = s.transfers[i]!;
    else notes.push(`Transfer between steps ${i} and ${i + 1} removed: those steps are no longer next to each other.`);
  }
  const joints: Record<number, string> = {};
  for (const first of keys(s.joints)) {
    const at = newOf.get(first);
    if (at !== undefined) joints[at] = s.joints[first]!;
    else notes.push(`Joint duration chosen from step ${first} cleared: its first step was removed.`);
  }
  return {
    state: { ...s, steps, perRun: move(s.perRun), entered: move(s.entered), transfers, joints },
    notes,
  };
}

export function addModule(s: WorkflowState, c: Catalog, type: string): EditResult {
  if (s.modules.length >= LIMITS.modules) return refuse(`A workflow can have at most ${LIMITS.modules} modules.`);
  if (!c.moduleTypes.has(type)) return refuse(`"${type}" is not a module type of the release.`);
  return done({ ...s, modules: [...s.modules, { type, devices: 1 }] }, c);
}

export function removeModule(s: WorkflowState, c: Catalog, m: number): EditResult {
  if (m < 1 || m > s.modules.length) return refuse(`There is no module ${m}.`);
  const users = s.steps.flatMap((st, k) => (st.module === m ? [k + 1] : []));
  if (users.length > 0) {
    return refuse(`Module ${m} is used by step${users.length > 1 ? "s" : ""} ${users.join(", ")}; move ${users.length > 1 ? "them" : "it"} to another module first.`);
  }
  const modules = s.modules.filter((_, k) => k + 1 !== m);
  const steps = s.steps.map((st) => (st.module > m ? { ...st, module: st.module - 1 } : st));
  return done({ ...s, modules, steps }, c);
}

export function setModule(s: WorkflowState, c: Catalog, m: number, change: { type?: string; devices?: string }): EditResult {
  const mod = s.modules[m - 1];
  if (!mod) return refuse(`There is no module ${m}.`);
  const next = { ...mod };
  if (change.type !== undefined) {
    if (!c.moduleTypes.has(change.type)) return refuse(`"${change.type}" is not a module type of the release.`);
    next.type = change.type;
  }
  if (change.devices !== undefined) {
    const d = parseCount(change.devices, ...LIMITS.devices);
    if (d === null) return refuse(`Devices must be a whole number from ${LIMITS.devices[0]} to ${LIMITS.devices[1]}.`);
    next.devices = d;
  }
  return done({ ...s, modules: s.modules.map((x, k) => (k + 1 === m ? next : x)) }, c);
}

/** Adds a step on module `module`, or on a new module of the given type. */
export function addStep(s: WorkflowState, c: Catalog, uo: string, module: number | { type: string }): EditResult {
  if (s.steps.length >= LIMITS.steps) return refuse(`A workflow can have at most ${LIMITS.steps} steps.`);
  if (!c.unitOperations.has(uo)) return refuse(`"${uo}" is not a unit operation of the release.`);
  let base = s;
  let m: number;
  if (typeof module === "number") {
    if (module < 1 || module > s.modules.length) return refuse(`There is no module ${module}.`);
    m = module;
  } else {
    const added = addModule(s, c, module.type);
    if (!added.ok) return added;
    base = added.state;
    m = base.modules.length;
  }
  return done({ ...base, steps: [...base.steps, { uo, module: m }] }, c);
}

export function setStep(s: WorkflowState, c: Catalog, i: number, change: { uo?: string; module?: number }): EditResult {
  const st = s.steps[i - 1];
  if (!st) return refuse(`There is no step ${i}.`);
  const next = { ...st };
  if (change.uo !== undefined) {
    if (!c.unitOperations.has(change.uo)) return refuse(`"${change.uo}" is not a unit operation of the release.`);
    next.uo = change.uo;
  }
  if (change.module !== undefined) {
    if (change.module < 1 || change.module > s.modules.length) return refuse(`There is no module ${change.module}.`);
    next.module = change.module;
  }
  return done({ ...s, steps: s.steps.map((x, k) => (k + 1 === i ? next : x)) }, c);
}

export function removeStep(s: WorkflowState, c: Catalog, i: number): EditResult {
  if (i < 1 || i > s.steps.length) return refuse(`There is no step ${i}.`);
  const order = s.steps.map((_, k) => k + 1).filter((k) => k !== i);
  const r = reorder(s, order.map((k) => s.steps[k - 1]!), order);
  return done(r.state, c, r.notes);
}

export function moveStep(s: WorkflowState, c: Catalog, i: number, by: -1 | 1): EditResult {
  const j = i + by;
  if (i < 1 || i > s.steps.length || j < 1 || j > s.steps.length) return refuse(`Step ${i} cannot move further.`);
  const order = s.steps.map((_, k) => k + 1);
  [order[i - 1], order[j - 1]] = [order[j - 1]!, order[i - 1]!];
  const r = reorder(s, order.map((k) => s.steps[k - 1]!), order);
  return done(r.state, c, r.notes);
}

export function setTransfer(s: WorkflowState, c: Catalog, i: number, change: { mode?: string; seconds?: string }): EditResult {
  if (!isTransferBoundary(s, i)) return refuse(`Steps ${i} and ${i + 1} use the same module, so no transfer is set between them.`);
  const next = { ...transferAt(s, i) };
  if (change.mode !== undefined) {
    if (change.mode !== NOT_SPECIFIED && !c.transferModes.has(change.mode)) return refuse(`"${change.mode}" is not a transfer mode of the release.`);
    next.mode = change.mode;
  }
  if (change.seconds !== undefined) {
    const v = parseSeconds(change.seconds, LIMITS.transferSeconds);
    if (v === null) return refuse(`A transfer time must be from 0 to ${LIMITS.transferSeconds.toLocaleString("en")} s, with at most 3 decimal places.`);
    next.seconds = v;
  }
  const transfers = { ...s.transfers };
  if (isDefaultTransfer(next)) delete transfers[i];
  else transfers[i] = next;
  return done({ ...s, transfers }, c);
}

type CountKey = "batch" | "samples" | "parallel" | "n" | "runs" | "seed";
const COUNT_LABELS: Record<CountKey, string> = {
  batch: "Batch size",
  samples: "Samples per experiment",
  parallel: "Parallel units",
  n: "Batches",
  runs: "Simulation runs",
  seed: "Seed",
};

export function setCount(s: WorkflowState, c: Catalog, key: CountKey, text: string): EditResult {
  const [min, max] = LIMITS[key];
  const v = parseCount(text, min, max);
  if (v === null) return refuse(`${COUNT_LABELS[key]} must be a whole number from ${min.toLocaleString("en")} to ${max.toLocaleString("en")}.`);
  return done({ ...s, [key]: v }, c);
}

/** Samples per run of a step; empty text restores the default (all samples of the batch). */
export function setPerRun(s: WorkflowState, c: Catalog, i: number, text: string): EditResult {
  if (i < 1 || i > s.steps.length) return refuse(`There is no step ${i}.`);
  const perRun = { ...s.perRun };
  if (text === "") delete perRun[i];
  else {
    const v = parseCount(text, 1, allSamples(s));
    if (v === null) return refuse(`Samples per run of step ${i} must be a whole number from 1 to ${allSamples(s)} (batch size × samples per experiment).`);
    perRun[i] = v;
  }
  return done({ ...s, perRun }, c);
}

/** Duration entered by the visitor for a step; empty text clears it. */
export function setEntered(s: WorkflowState, c: Catalog, i: number, text: string): EditResult {
  if (i < 1 || i > s.steps.length) return refuse(`There is no step ${i}.`);
  const entered = { ...s.entered };
  if (text === "") delete entered[i];
  else {
    const v = parseSeconds(text, LIMITS.enteredSeconds);
    if (v === null) return refuse(`A duration must be from 0 to ${LIMITS.enteredSeconds.toLocaleString("en")} s, with at most 3 decimal places.`);
    entered[i] = v;
  }
  return done({ ...s, entered }, c);
}

/** Chooses a joint duration for the steps from `first`, or clears the choice there (null). */
export function chooseJoint(s: WorkflowState, c: Catalog, first: number, jointId: string | null): EditResult {
  const joints = { ...s.joints };
  delete joints[first];
  if (jointId !== null) {
    const taken = new Set<number>();
    for (const r of jointRuns({ ...s, joints }, c)) for (let k = r.first; k <= r.last; k++) taken.add(k);
    const problem = jointProblem(s, c, first, jointId, taken);
    if (problem !== null) return refuse(`This joint duration cannot be chosen from step ${first}: ${problem}.`);
    joints[first] = jointId;
  }
  return done({ ...s, joints }, c);
}

export function setAgents(s: WorkflowState, c: Catalog, mode: AgentMode, text: string): EditResult {
  const v = parseCount(text, ...LIMITS.agents);
  if (v === null) return refuse(`Transfer agents must be a whole number from ${LIMITS.agents[0]} to ${LIMITS.agents[1]}.`);
  const agents = { ...s.agents };
  if (v === 1) delete agents[mode];
  else agents[mode] = v;
  return done({ ...s, agents }, c);
}

export function setOption(
  s: WorkflowState,
  c: Catalog,
  change: { bounds?: boolean; rule?: WorkflowState["rule"]; draw?: WorkflowState["draw"] },
): EditResult {
  return done({ ...s, ...change }, c);
}

// ---- Hash query grammar (design §3) -----------------------------------------------------------

const enc = (field: string) => encodeURIComponent(field).replace(/~/g, "%7E");
const item = (...fields: (string | number)[]) => fields.map((f) => enc(String(f))).join("~");

// @MX:ANCHOR: [AUTO] encodeWorkflow / decodeWorkflow — the shareable-URL contract of the builder (design §3)
// @MX:REASON: links people share must keep decoding; a grammar change needs a round-trip test over generated states
/** Hash query of a state, holding only values that differ from their default (REQ-007). */
export function encodeWorkflow(s: WorkflowState): string {
  const parts: [string, string][] = [];
  const list = (key: string, items: string[]) => items.length > 0 && parts.push([key, items.join(",")]);
  const sorted = (r: Record<number, unknown>) => keys(r).sort((a, b) => a - b);
  list("s", s.steps.map((st) => item(st.uo, st.module)));
  list("m", s.modules.map((m) => (m.devices === 1 ? item(m.type) : item(m.type, m.devices))));
  list("t", sorted(s.transfers).map((i) => {
    const t = s.transfers[i]!;
    return t.seconds === 0 ? item(i, t.mode) : item(i, t.mode, secondsText(t.seconds));
  }));
  const num = (key: CountKey, short: string) => s[key] !== DEFAULT_STATE[key] && parts.push([short, String(s[key])]);
  num("batch", "b");
  num("samples", "e");
  num("parallel", "p");
  list("k", sorted(s.perRun).map((i) => item(i, s.perRun[i]!)));
  list("d", sorted(s.entered).map((i) => item(i, secondsText(s.entered[i]!))));
  list("j", sorted(s.joints).map((i) => item(i, s.joints[i]!)));
  if (s.bounds) parts.push(["bounds", "1"]);
  list("ag", AGENT_MODES.filter((m) => s.agents[m] !== undefined).map((m) => item(m, s.agents[m]!)));
  if (s.rule !== DEFAULT_STATE.rule) parts.push(["rule", s.rule]);
  if (s.draw !== DEFAULT_STATE.draw) parts.push(["draw", s.draw]);
  num("n", "n");
  num("runs", "runs");
  num("seed", "seed");
  return parts.map(([k, v]) => `${k}=${v}`).join("&");
}

function fieldsOf(raw: string): string[] | null {
  try {
    return raw.split("~").map(decodeURIComponent);
  } catch {
    return null;
  }
}

/**
 * State of a hash query: each item is checked against its column and dropped when it fails, every dropped item named
 * in `ignored` (REQ-007). Never throws.
 */
export function decodeWorkflow(query: string, c: Catalog): { state: WorkflowState; ignored: string[] } {
  const ignored: string[] = [];
  const params = new Map<string, string>();
  for (const part of query === "" ? [] : query.split("&")) {
    const eq = part.indexOf("=");
    const key = eq < 0 ? part : part.slice(0, eq);
    const value = eq < 0 ? "" : part.slice(eq + 1);
    if (params.has(key) || !PARAMS.has(key)) ignored.push(safeText(part));
    else params.set(key, value);
  }
  const items = (key: string) => {
    const v = params.get(key);
    return v === undefined || v === "" ? [] : v.split(",").map((raw) => ({ raw, f: fieldsOf(raw) }));
  };
  const drop = (key: string, raw: string) => ignored.push(`${key}=${safeText(raw)}`);
  const s: WorkflowState = structuredClone(DEFAULT_STATE);

  for (const { raw, f } of items("m")) {
    const devices = f && f.length === 2 ? parseCount(f[1]!, ...LIMITS.devices) : 1;
    if (!f || f.length > 2 || !c.moduleTypes.has(f[0]!) || devices === null || s.modules.length >= LIMITS.modules) drop("m", raw);
    else s.modules.push({ type: f[0]!, devices });
  }
  for (const { raw, f } of items("s")) {
    const m = f && f.length === 2 ? parseCount(f[1]!, 1, s.modules.length) : null;
    if (!f || m === null || !c.unitOperations.has(f[0]!) || s.steps.length >= LIMITS.steps) drop("s", raw);
    else s.steps.push({ uo: f[0]!, module: m });
  }
  const single = (short: string, parse: (v: string) => number | null, set: (v: number) => void) => {
    const v = params.get(short);
    if (v === undefined) return;
    const n = parse(v);
    if (n === null) drop(short, v);
    else set(n);
  };
  single("b", (v) => parseCount(v, ...LIMITS.batch), (v) => (s.batch = v));
  single("e", (v) => parseCount(v, ...LIMITS.samples), (v) => (s.samples = v));
  single("p", (v) => parseCount(v, ...LIMITS.parallel), (v) => (s.parallel = v));
  const stepNo = (text: string) => parseCount(text, 1, s.steps.length);

  for (const { raw, f } of items("t")) {
    const i = f && (f.length === 2 || f.length === 3) ? parseCount(f[0]!, 1, s.steps.length - 1) : null;
    const seconds = f && f.length === 3 ? parseSeconds(f[2]!, LIMITS.transferSeconds) : 0;
    const modeOk = f !== null && f.length >= 2 && (f[1] === NOT_SPECIFIED || c.transferModes.has(f[1]!));
    if (i === null || seconds === null || !modeOk || !isTransferBoundary(s, i) || s.transfers[i] !== undefined) drop("t", raw);
    else if (!(f![1] === NOT_SPECIFIED && seconds === 0)) s.transfers[i] = { mode: f![1]!, seconds };
  }
  for (const { raw, f } of items("k")) {
    const i = f && f.length === 2 ? stepNo(f[0]!) : null;
    const v = f && f.length === 2 ? parseCount(f[1]!, 1, s.batch * s.samples) : null;
    if (i === null || v === null || s.perRun[i] !== undefined) drop("k", raw);
    else if (v !== s.batch * s.samples) s.perRun[i] = v;
  }
  for (const { raw, f } of items("d")) {
    const i = f && f.length === 2 ? stepNo(f[0]!) : null;
    const v = f && f.length === 2 ? parseSeconds(f[1]!, LIMITS.enteredSeconds) : null;
    if (i === null || v === null || s.entered[i] !== undefined) drop("d", raw);
    else s.entered[i] = v;
  }
  const taken = new Set<number>();
  for (const { raw, f } of items("j")) {
    const first = f && f.length === 2 ? stepNo(f[0]!) : null;
    if (first === null || s.joints[first] !== undefined || jointProblem(s, c, first, f![1]!, taken) !== null) {
      drop("j", raw);
      continue;
    }
    s.joints[first] = f![1]!;
    for (let k = first; k < first + jointLength(c, f![1]!); k++) taken.add(k);
  }
  const flag = params.get("bounds");
  if (flag !== undefined) {
    if (flag === "1") s.bounds = true;
    else if (flag !== "0") drop("bounds", flag);
  }
  for (const { raw, f } of items("ag")) {
    const v = f && f.length === 2 ? parseCount(f[1]!, ...LIMITS.agents) : null;
    const mode = f?.[0] as AgentMode | undefined;
    if (v === null || mode === undefined || !AGENT_MODES.includes(mode) || s.agents[mode] !== undefined) drop("ag", raw);
    else if (v !== 1) s.agents[mode] = v;
  }
  const choice = <T extends string>(short: string, allowed: readonly T[], set: (v: T) => void) => {
    const v = params.get(short);
    if (v === undefined) return;
    if ((allowed as readonly string[]).includes(v)) set(v as T);
    else drop(short, v);
  };
  choice("rule", ["fifo", "released"] as const, (v) => (s.rule = v));
  choice("draw", ["sample", "median"] as const, (v) => (s.draw = v));
  single("n", (v) => parseCount(v, ...LIMITS.n), (v) => (s.n = v));
  single("runs", (v) => parseCount(v, ...LIMITS.runs), (v) => (s.runs = v));
  single("seed", (v) => parseCount(v, ...LIMITS.seed), (v) => (s.seed = v));
  return { state: s, ignored };
}

const PARAMS = new Set(["s", "m", "t", "b", "e", "p", "k", "d", "j", "bounds", "ag", "rule", "draw", "n", "runs", "seed"]);

function safeText(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** The one message naming the link parts that were dropped. */
export function ignoredMessage(ignored: string[]): string | null {
  return ignored.length === 0 ? null : `Ignored from the link: ${ignored.join(", ")}.`;
}

// ---- Start from a coded platform (REQ-008, design §4) ------------------------------------------

/**
 * Boundary rule: for steps on modules a then b, the mode of a material connection a→b; else b→a; else data_transfer
 * where a data connection joins them; else not specified. Connections are in edge-number order, so the first match is
 * the one with the lowest edge number.
 */
export function boundaryConnection(
  layout: PlatformLayout,
  a: string,
  b: string,
): { mode: string; seconds: number | null } {
  const material = (from: string, to: string) => layout.connections.find((x) => x.is_material && x.from === from && x.to === to);
  const hit =
    material(a, b) ??
    material(b, a) ??
    layout.connections.find((x) => !x.is_material && ((x.from === a && x.to === b) || (x.from === b && x.to === a)));
  return hit ? { mode: hit.transfer_mode, seconds: hit.transfer_time_s } : { mode: NOT_SPECIFIED, seconds: null };
}

const clampCount = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, Math.ceil(v)));
const AGENT_OF: Record<string, AgentMode> = { robot_arm_gantry: "robot_arm_gantry", mobile_robot: "mobile_robot", human: "human_transfer" };

/** Builder state filled from a coded platform, and the inputs that came from it. */
export function fromPlatform(layout: PlatformLayout, c: Catalog): { state: WorkflowState; filled: string[] } {
  const s: WorkflowState = structuredClone(DEFAULT_STATE);
  const filled = ["steps and their unit operations", "modules and their types", "transfer modes"];
  const moduleIndex = new Map<string, number>();
  for (const m of layout.modules) {
    if (s.modules.length >= LIMITS.modules) break;
    s.modules.push({ type: c.moduleTypes.has(m.module_type) ? m.module_type : "unmapped", devices: m.units === null ? 1 : clampCount(m.units, LIMITS.devices) });
    moduleIndex.set(m.module_id, s.modules.length);
  }
  if (layout.modules.some((m) => m.units !== null)) filled.push("devices per module");
  const ids: (string | null)[] = [];
  for (const st of layout.steps.slice(0, LIMITS.steps)) {
    let m = st.module_id === null ? undefined : moduleIndex.get(st.module_id);
    if (m === undefined) {
      s.modules.push({ type: "unmapped", devices: 1 });
      m = s.modules.length;
    }
    s.steps.push({ uo: c.unitOperations.has(st.unit_operation) ? st.unit_operation : "unmapped", module: m });
    ids.push(st.module_id);
  }
  let times = false;
  for (let i = 1; i < s.steps.length; i++) {
    if (!isTransferBoundary(s, i) || ids[i - 1] === null || ids[i] === null) continue;
    const hit = boundaryConnection(layout, ids[i - 1]!, ids[i]!);
    const seconds = hit.seconds === null ? 0 : Math.min(LIMITS.transferSeconds, Math.round(hit.seconds * 1000) / 1000);
    if (hit.seconds !== null) times = true;
    if (!(hit.mode === NOT_SPECIFIED && seconds === 0)) s.transfers[i] = { mode: hit.mode, seconds };
  }
  if (times) filled.push("transfer times");
  if (layout.batch_size !== null) {
    s.batch = clampCount(layout.batch_size, LIMITS.batch);
    filled.push("batch size");
  }
  if (layout.parallel_units !== null) {
    s.parallel = clampCount(layout.parallel_units, LIMITS.parallel);
    filled.push("parallel units");
  }
  for (const a of layout.transfer_agents) {
    const mode = AGENT_OF[a.agent];
    const v = clampCount(a.count, LIMITS.agents);
    if (mode && v !== 1) s.agents[mode] = v;
  }
  if (layout.transfer_agents.length > 0) filled.push("transfer agents");
  return { state: s, filled };
}
