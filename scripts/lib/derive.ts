// Verified release tables -> index / platform / taxonomy / benchmark JSON (REQ-009, REQ-010).
// Every output object is built field by field from the lists in REQ-009, so no other release column
// (for example an abstract) can reach the derived data.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BenchmarkJson,
  Connection,
  Counts,
  Evidence,
  IndexJson,
  Module,
  PaperRow,
  PlatformFile,
  PlatformGraph,
  PlatformRow,
  ReleaseInfo,
  Step,
  TaxonomyJson,
} from "../../src/data/types";
import { type CsvRow, nullIfEmpty, readCsv, splitList, toBool01, toInt } from "./csv";

export interface Derived {
  index: IndexJson;
  platformFiles: Record<string, PlatformFile>;
  taxonomy: TaxonomyJson;
  benchmark: BenchmarkJson;
}

// ---- CSV access -------------------------------------------------------------------------------

function table(dir: string, rel: string): { rows: CsvRow[]; col: (i: number, name: string) => string } {
  const rows = readCsv(join(dir, rel));
  const col = (i: number, name: string): string => {
    const value = rows[i]![name];
    if (value === undefined) throw new Error(`${rel}: column "${name}" is missing`);
    return value;
  };
  return { rows, col };
}

// ---- JSON field access (platform_graphs.jsonl) --------------------------------------------------

type Obj = Record<string, unknown>;

function asObj(value: unknown, where: string): Obj {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${where}: expected an object`);
  return value as Obj;
}

function field<T>(o: Obj, key: string, where: string, ok: (v: unknown) => boolean, kind: string): T {
  const value = o[key];
  if (!ok(value)) throw new Error(`${where}: field "${key}" must be ${kind}`);
  return value as T;
}

const isStr = (v: unknown) => typeof v === "string";
const isStrOrNull = (v: unknown) => v === null || typeof v === "string";
const isInt = (v: unknown) => Number.isInteger(v);
const isIntOrNull = (v: unknown) => v === null || Number.isInteger(v);
const isBool = (v: unknown) => typeof v === "boolean";
const isStrArray = (v: unknown) => Array.isArray(v) && v.every(isStr);
const isArray = (v: unknown) => Array.isArray(v);

function evidence(o: Obj, where: string): Evidence {
  const e = asObj(o.evidence, `${where} evidence`);
  return {
    doc: field<string>(e, "doc", `${where} evidence`, isStr, "a string"),
    page: field<number | null>(e, "page", `${where} evidence`, isIntOrNull, "an integer or null"),
    locator: field<string | null>(e, "locator", `${where} evidence`, isStrOrNull, "a string or null"),
  };
}

function toModule(raw: unknown, where: string): Module {
  const o = asObj(raw, where);
  return {
    module_id: field(o, "module_id", where, isStr, "a string"),
    module_type: field(o, "module_type", where, isStr, "a string"),
    name_in_paper: field(o, "name_in_paper", where, isStrOrNull, "a string or null"),
    on_platform: field(o, "on_platform", where, isBool, "a boolean"),
    unmapped_note: field(o, "unmapped_note", where, isStrOrNull, "a string or null"),
    evidence: evidence(o, where),
  };
}

function toStep(raw: unknown, where: string): Step {
  const o = asObj(raw, where);
  return {
    step_id: field(o, "step_id", where, isStr, "a string"),
    step_order: field(o, "step_order", where, isInt, "an integer"),
    unit_operation: field(o, "unit_operation", where, isStr, "a string"),
    family: field(o, "family", where, isStrOrNull, "a string or null"),
    performed_by: field(o, "performed_by", where, isStrOrNull, "a string or null"),
    modules: field(o, "modules", where, isStrArray, "a list of strings"),
    uncertain: field(o, "uncertain", where, isBool, "a boolean"),
    unmapped_note: field(o, "unmapped_note", where, isStrOrNull, "a string or null"),
    evidence: evidence(o, where),
  };
}

function toConnection(raw: unknown, where: string): Connection {
  const o = asObj(raw, where);
  return {
    edge_id: field(o, "edge_id", where, isStr, "a string"),
    from_module: field(o, "from_module", where, isStr, "a string"),
    to_module: field(o, "to_module", where, isStr, "a string"),
    transfer_mode: field(o, "transfer_mode", where, isStr, "a string"),
    is_material: field(o, "is_material", where, isBool, "a boolean"),
    stated: field(o, "stated", where, isBool, "a boolean"),
    uncertain: field(o, "uncertain", where, isBool, "a boolean"),
    unmapped_note: field(o, "unmapped_note", where, isStrOrNull, "a string or null"),
    evidence: evidence(o, where),
  };
}

type GraphCore = Omit<PlatformGraph, "campaigns" | "shared_with">;

function toGraph(raw: unknown, where: string): GraphCore {
  const o = asObj(raw, where);
  const id = field<string>(o, "platform_id", where, isStr, "a string");
  const at = `${where} (${id})`;
  const name = field<string | null>(o, "name", at, isStrOrNull, "a string or null");
  return {
    platform_id: id,
    paper_id: field(o, "paper_id", at, isStr, "a string"),
    doi: field(o, "doi", at, isStr, "a string"),
    first_public_year: field(o, "first_public_year", at, isInt, "an integer"),
    field_tags: field(o, "field_tags", at, isStrArray, "a list of strings"),
    name: name === "" ? null : name,
    commercial_integrated: field(o, "commercial_integrated", at, isBool, "a boolean"),
    identity_id: field(o, "identity_id", at, isStr, "a string"),
    evidence: evidence(o, at),
    modules: field<unknown[]>(o, "modules", at, isArray, "a list").map((m, i) => toModule(m, `${at} modules[${i}]`)),
    steps: field<unknown[]>(o, "steps", at, isArray, "a list").map((s, i) => toStep(s, `${at} steps[${i}]`)),
    connections: field<unknown[]>(o, "connections", at, isArray, "a list").map((c, i) =>
      toConnection(c, `${at} connections[${i}]`),
    ),
  };
}

// ---- Derivation ---------------------------------------------------------------------------------

function readRelease(dir: string): ReleaseInfo {
  const rel = "core/release.csv";
  const { rows, col } = table(dir, rel);
  if (rows.length !== 1) throw new Error(`${rel}: expected exactly one row, found ${rows.length}`);
  return {
    version: col(0, "release_version"),
    released_on: col(0, "released_on"),
    doi: col(0, "zenodo_doi"),
    taxonomy_version: col(0, "taxonomy_version"),
    license: col(0, "license"),
  };
}

function readPapers(dir: string): PaperRow[] {
  const rel = "modes/trends/papers.csv";
  const { rows, col } = table(dir, rel);
  return rows.map((_, i) => {
    const at = (name: string) => `${rel} row ${i + 2} ${name}`;
    return {
      paper_id: col(i, "paper_id"),
      doi: col(i, "doi"),
      title: col(i, "title"),
      venue: col(i, "venue"),
      first_public_year: toInt(col(i, "first_public_year"), at("first_public_year")),
      field_tags: splitList(col(i, "field_tags"), ";"),
      integration_mode: col(i, "integration_mode"),
      sw_autonomy: toInt(col(i, "sw_autonomy"), at("sw_autonomy")),
      hw_autonomy: toInt(col(i, "hw_autonomy"), at("hw_autonomy")),
      hardware_location: col(i, "hardware_location"),
      n_platforms: toInt(col(i, "n_platforms"), at("n_platforms")),
    };
  });
}

function readPlatformRows(dir: string): { rows: PlatformRow[]; campaigns: Map<string, string | null> } {
  const rel = "modes/builder/platforms.csv";
  const { rows, col } = table(dir, rel);
  const campaigns = new Map<string, string | null>();
  const out = rows.map((_, i) => {
    const at = (name: string) => `${rel} row ${i + 2} ${name}`;
    campaigns.set(col(i, "platform_id"), nullIfEmpty(col(i, "campaigns")));
    return {
      platform_id: col(i, "platform_id"),
      paper_id: col(i, "paper_id"),
      platform_name: nullIfEmpty(col(i, "platform_name")),
      first_public_year: toInt(col(i, "first_public_year"), at("first_public_year")),
      field_tags: splitList(col(i, "field_tags"), ";"),
      commercial_integrated: toBool01(col(i, "commercial_integrated"), at("commercial_integrated")),
      identity_id: col(i, "identity_id"),
      n_modules: toInt(col(i, "n_modules"), at("n_modules")),
      n_steps: toInt(col(i, "n_steps"), at("n_steps")),
      module_types: splitList(col(i, "module_types"), ","),
      material_transfer_modes: splitList(col(i, "material_transfer_modes"), ","),
    };
  });
  return { rows: out, campaigns };
}

function readGraphs(dir: string): GraphCore[] {
  const rel = "modes/builder/platform_graphs.jsonl";
  return readFileSync(join(dir, rel), "utf8")
    .split("\n")
    .map((line, i) => [line, i] as const)
    .filter(([line]) => line.trim() !== "")
    .map(([line, i]) => toGraph(JSON.parse(line), `${rel} line ${i + 1}`));
}

function buildPlatformFiles(
  papers: PaperRow[],
  graphs: GraphCore[],
  campaigns: Map<string, string | null>,
): Record<string, PlatformFile> {
  const papersByIdentity = new Map<string, Set<string>>();
  for (const g of graphs) {
    const set = papersByIdentity.get(g.identity_id) ?? new Set<string>();
    set.add(g.paper_id);
    papersByIdentity.set(g.identity_id, set);
  }
  const files: Record<string, PlatformFile> = {};
  for (const p of papers) files[p.paper_id] = { paper_id: p.paper_id, platforms: [] };
  for (const g of graphs) {
    const file = files[g.paper_id];
    if (!file) throw new Error(`platform ${g.platform_id}: paper ${g.paper_id} is missing from modes/trends/papers.csv`);
    if (!campaigns.has(g.platform_id)) {
      throw new Error(`platform ${g.platform_id} has no row in modes/builder/platforms.csv`);
    }
    const shared = [...papersByIdentity.get(g.identity_id)!].filter((id) => id !== g.paper_id).sort();
    file.platforms.push({ ...g, campaigns: campaigns.get(g.platform_id) ?? null, shared_with: shared });
  }
  return files;
}

function buildTaxonomy(dir: string, papers: PaperRow[], graphs: GraphCore[]): TaxonomyJson {
  const rel = "modes/taxonomy/classes.csv";
  const { rows, col } = table(dir, rel);
  const usage = new Map<string, number>();
  rows.forEach((_, i) => usage.set(`${col(i, "class_kind")}:${col(i, "class")}`, 0));
  const use = (kind: string, cls: string) => {
    const key = `${kind}:${cls}`;
    const n = usage.get(key);
    if (n === undefined) throw new Error(`class "${cls}" (${kind}) is used in the graphs but missing from ${rel}`);
    usage.set(key, n + 1);
  };
  for (const g of graphs) {
    for (const m of g.modules) use("module_type", m.module_type);
    for (const c of g.connections) use("transfer_mode", c.transfer_mode);
    for (const s of g.steps) use("unit_operation", s.unit_operation);
  }
  for (const p of papers) for (const tag of p.field_tags) use("field_tag", tag);
  return {
    classes: rows.map((_, i) => ({
      class_kind: col(i, "class_kind"),
      class: col(i, "class"),
      family: nullIfEmpty(col(i, "family")),
      definition: col(i, "definition"),
      n_items: usage.get(`${col(i, "class_kind")}:${col(i, "class")}`)!,
    })),
    correspondence: readCsv(join(dir, "modes/taxonomy/correspondence.csv")),
  };
}

function buildBenchmark(dir: string): BenchmarkJson {
  const tasksDir = join(dir, "modes/benchmark/tasks");
  const tasks = readdirSync(tasksDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(tasksDir, name), "utf8")) as unknown);
  const splitCounts: Record<string, number> = {};
  for (const row of readCsv(join(dir, "modes/benchmark/split.csv"))) {
    const split = row.split ?? "";
    splitCounts[split] = (splitCounts[split] ?? 0) + 1;
  }
  const reference = JSON.parse(readFileSync(join(dir, "modes/benchmark/reference_results.json"), "utf8")) as unknown;
  return { tasks, split_counts: splitCounts, reference_results: reference };
}

// @MX:ANCHOR: [AUTO] deriveAll — single source of the derived JSON; used by build-data, the count check and tests
// @MX:REASON: every view reads this output; field lists must stay in step with REQ-009 and src/data/types.ts
export function deriveAll(releaseDir: string): Derived {
  const papers = readPapers(releaseDir);
  const { rows: platformRows, campaigns } = readPlatformRows(releaseDir);
  const graphs = readGraphs(releaseDir);
  const connections = graphs.flatMap((g) => g.connections);
  const counts: Counts = {
    papers: papers.length,
    platforms: platformRows.length,
    modules: graphs.reduce((n, g) => n + g.modules.length, 0),
    steps: graphs.reduce((n, g) => n + g.steps.length, 0),
    connections: connections.length,
    material_connections: connections.filter((c) => c.is_material).length,
    candidates: readCsv(join(releaseDir, "modes/trends/candidates.csv")).length,
  };
  return {
    index: { release: readRelease(releaseDir), counts, papers, platforms: platformRows },
    platformFiles: buildPlatformFiles(papers, graphs, campaigns),
    taxonomy: buildTaxonomy(releaseDir, papers, graphs),
    benchmark: buildBenchmark(releaseDir),
  };
}

export function writeDerived(derived: Derived, outDir: string): void {
  mkdirSync(join(outDir, "platforms"), { recursive: true });
  const write = (rel: string, value: unknown) => writeFileSync(join(outDir, rel), JSON.stringify(value));
  write("index.json", derived.index);
  write("taxonomy.json", derived.taxonomy);
  write("benchmark.json", derived.benchmark);
  for (const [paperId, file] of Object.entries(derived.platformFiles)) write(`platforms/${paperId}.json`, file);
}
