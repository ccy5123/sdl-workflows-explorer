// Verified release tables -> index / platform / taxonomy / benchmark JSON (REQ-009, REQ-010; SPEC-TAXO-001 REQ-001 to
// REQ-004: unit operations on platform rows, per-class counts and examples, the checked correspondence).
// Every output object is built field by field from the lists in REQ-009, so no other release column
// (for example an abstract) can reach the derived data.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BenchmarkJson,
  Connection,
  CorrespondenceEntry,
  CorrespondenceSource,
  CorrespondenceTarget,
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
  TaxonomyExample,
  TaxonomyJson,
  TaxonomyRelation,
  TaxonomySource,
  TaxonomyVocabulary,
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

const sortedDistinct = (xs: string[]): string[] => [...new Set(xs)].sort();

function readPlatformRows(
  dir: string,
  graphs: GraphCore[],
): { rows: PlatformRow[]; campaigns: Map<string, string | null> } {
  const rel = "modes/builder/platforms.csv";
  const { rows, col } = table(dir, rel);
  const unitOperations = new Map(graphs.map((g) => [g.platform_id, sortedDistinct(g.steps.map((s) => s.unit_operation))]));
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
      unit_operations: unitOperations.get(col(i, "platform_id")) ?? [],
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

// ---- Taxonomy (SPEC-DATA-001 REQ-009; SPEC-TAXO-001 REQ-002 to REQ-004) ------------------------

/** Browse column of the platform rows that the browser filters each class kind on. */
const KIND_COLUMN = {
  field_tag: "field_tags",
  module_type: "module_types",
  transfer_mode: "material_transfer_modes",
  unit_operation: "unit_operations",
} as const satisfies Record<string, keyof PlatformRow>;
type Kind = keyof typeof KIND_COLUMN;
const isKind = (kind: string): kind is Kind => Object.hasOwn(KIND_COLUMN, kind);

/** Plain string order (UTF-16 code units, as JavaScript `<`). */
const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function itemsOn(kind: Exclude<Kind, "field_tag">, cls: string, g: GraphCore): number {
  if (kind === "module_type") return g.modules.filter((m) => m.module_type === cls).length;
  if (kind === "transfer_mode") return g.connections.filter((c) => c.transfer_mode === cls).length;
  return g.steps.filter((s) => s.unit_operation === cls).length;
}

interface ClassUse {
  n_platforms: number;
  n_papers: number;
  examples: TaxonomyExample[];
}

/** Platform and paper counts and the first five examples of one class (REQ-002). */
function classUse(kind: Kind, cls: string, nItems: number, rows: PlatformRow[], graphs: GraphCore[]): ClassUse {
  const nameOf = new Map(rows.map((r) => [r.platform_id, r.platform_name]));
  const paperOf = new Map(rows.map((r) => [r.platform_id, r.paper_id]));
  let users: TaxonomyExample[];
  if (kind === "field_tag") {
    users = rows
      .filter((r) => r.field_tags.includes(cls))
      .map((r) => ({ platform_id: r.platform_id, platform_name: r.platform_name, n: null }))
      .sort((a, b) => byString(a.platform_id, b.platform_id));
  } else {
    users = graphs
      .map((g) => ({ platform_id: g.platform_id, platform_name: nameOf.get(g.platform_id) ?? null, n: itemsOn(kind, cls, g) }))
      .filter((u) => u.n > 0)
      .sort((a, b) => b.n - a.n || byString(a.platform_id, b.platform_id));
  }
  const nPapers = kind === "field_tag" ? nItems : new Set(users.map((u) => paperOf.get(u.platform_id) ?? u.platform_id)).size;
  return { n_platforms: users.length, n_papers: nPapers, examples: users.slice(0, 5) };
}

/**
 * REQ-004 (g) and (h): a transfer mode whose connections are all non-material must be on every platform and paper (the
 * browser cannot filter on it); every other class must count exactly the rows its browse column selects.
 */
function checkClassCounts(
  kind: Kind,
  cls: string,
  nItems: number,
  use: ClassUse,
  papers: PaperRow[],
  rows: PlatformRow[],
  materialModes: Set<string>,
): void {
  const at = `taxonomy class ${kind}/${cls}`;
  if (kind === "transfer_mode" && nItems > 0 && !materialModes.has(cls)) {
    if (use.n_platforms !== rows.length || use.n_papers !== papers.length) {
      throw new Error(
        `${at}: a transfer mode with no material connection must be on all ${rows.length} platforms and ` +
          `${papers.length} papers, found ${use.n_platforms} platforms and ${use.n_papers} papers`,
      );
    }
    return;
  }
  const column = KIND_COLUMN[kind];
  const selected = rows.filter((r) => r[column].includes(cls));
  const selectedPapers =
    kind === "field_tag" ? papers.filter((p) => p.field_tags.includes(cls)).length : new Set(selected.map((r) => r.paper_id)).size;
  if (use.n_platforms !== selected.length || use.n_papers !== selectedPapers) {
    throw new Error(
      `${at}: counts ${use.n_platforms} platforms and ${use.n_papers} papers differ from the ${selected.length} ` +
        `platform rows and ${selectedPapers} papers that the ${column} column selects`,
    );
  }
}

const README_HEADING = "## Sources of the correspondence table";

/** REQ-003 `sources`: the first table under the README heading (REQ-004 e). */
function readSourceTable(dir: string): TaxonomySource[] {
  const lines = readFileSync(join(dir, "README.md"), "utf8").split(/\r?\n/);
  const at = lines.findIndex((line) => line.trim() === README_HEADING);
  if (at < 0) throw new Error(`README.md: the heading "${README_HEADING}" is missing`);
  let i = at + 1;
  while (i < lines.length && !lines[i]!.startsWith("|") && !lines[i]!.startsWith("## ")) i++;
  const tableLines: string[] = [];
  for (; i < lines.length && lines[i]!.startsWith("|"); i++) tableLines.push(lines[i]!);
  const cells = (line: string) => line.split("|").slice(1, -1).map((c) => c.trim());
  if (tableLines.length < 3 || cells(tableLines[0]!).join("|") !== "Key|Vocabulary|Reference") {
    throw new Error(`README.md: no table with the columns Key, Vocabulary, Reference under "${README_HEADING}"`);
  }
  return tableLines.slice(2).map((line, n) => {
    const row = cells(line);
    if (row.length !== 3) throw new Error(`README.md: source table row ${n + 1} does not have three cells`);
    const [keys, vocabulary, reference] = row as [string, string, string];
    const doi = /doi:(\S+)/.exec(reference)?.[1]?.replace(/[.,]$/, "");
    if (!doi) throw new Error(`README.md: source table row ${keys} has no doi in its reference`);
    return { keys: keys.split(", "), vocabulary, reference, doi };
  });
}

/** Split at "; " outside parentheses. */
function splitOutsideParentheses(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (depth === 0 && text.startsWith("; ", i)) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

/** REQ-003 `relations`: the data dictionary's description of taxonomy_correspondence.match (REQ-004 e). */
function readRelations(dir: string): TaxonomyRelation[] {
  const row = readCsv(join(dir, "data_dictionary.csv")).find(
    (r) => r.object === "taxonomy_correspondence" && r.column === "match",
  );
  if (!row) throw new Error("data_dictionary.csv: the row of object taxonomy_correspondence, column match is missing");
  return splitOutsideParentheses(row.description ?? "").map((part) => {
    const m = /^(\S+) \((.*)\)$/.exec(part);
    return m ? { match: m[1]!, meaning: m[2]! } : { match: part, meaning: null };
  });
}

/** A `source_ref` split at " · ", each source at " ; " into the key alone or key, page and locator (REQ-004 i). */
function parseSources(ref: string, where: string): CorrespondenceSource[] {
  return ref.split(" · ").map((source) => {
    const parts = source.split(" ; ");
    if (parts.length === 1) return { key: parts[0]!, page: null, locator: null };
    if (parts.length === 3) return { key: parts[0]!, page: parts[1]!, locator: parts[2]! };
    throw new Error(`${where}: the source "${source}" has ${parts.length} parts; one (the key) or three are allowed`);
  });
}

/** A wide-table cell: `term (relation); term (relation)`, or `none` for one target none with relation none. */
function parseWideCell(cell: string, where: string): CorrespondenceTarget[] {
  if (cell === "none") return [{ target: "none", match: "none" }];
  return cell.split("; ").map((part) => {
    const m = /^(.*) \(([^()]*)\)$/.exec(part);
    if (!m) throw new Error(`${where}: cannot read "${part}" as "term (relation)"`);
    return { target: m[1]!, match: m[2]! };
  });
}

interface Correspondence {
  /** Entries per `kind:class` of every wide-table row. */
  entries: Map<string, CorrespondenceEntry[]>;
  vocabularies: TaxonomyVocabulary[];
  sources: TaxonomySource[];
  relations: TaxonomyRelation[];
}

const WIDE = "modes/taxonomy/correspondence.csv";
const LONG = "core/taxonomy_correspondence.csv";

// @MX:NOTE: [AUTO] the long table is the reading shown; the wide table and README only cross-check it (REQ-004)
/** Structured correspondence of the long table, checked against the wide table, README and data dictionary. */
function buildCorrespondence(dir: string, classKeys: Set<string>, kindOrder: string[]): Correspondence {
  const sources = readSourceTable(dir);
  const relations = readRelations(dir);
  const wide = readCsv(join(dir, WIDE));
  const header = Object.keys(wide[0] ?? {});
  const vocabs = header.filter((h) => h !== "class_kind" && h !== "class" && !h.endsWith("_source"));
  for (const v of vocabs) if (!header.includes(`${v}_source`)) throw new Error(`${WIDE}: column "${v}_source" is missing`);
  const wideKeys = new Set(wide.map((w) => `${w.class_kind}:${w.class}`));
  const readmeRow = new Map(sources.flatMap((s, i) => s.keys.map((k) => [k, i] as const)));
  const matches = new Set(relations.map((r) => r.match));

  const { rows: longRaw, col } = table(dir, LONG);
  const long = longRaw.map((_, i) => {
    const row = {
      kind: col(i, "class_kind"),
      cls: col(i, "class"),
      vocabulary: col(i, "vocabulary"),
      target: col(i, "target"),
      match: col(i, "match"),
      source_ref: col(i, "source_ref"),
    };
    const at = `${LONG} row ${i + 2} (${row.kind}/${row.cls}, ${row.vocabulary})`;
    if (!classKeys.has(`${row.kind}:${row.cls}`)) throw new Error(`${at}: the class is not in modes/taxonomy/classes.csv`);
    if (!wideKeys.has(`${row.kind}:${row.cls}`)) throw new Error(`${at}: the class has no row in ${WIDE}`);
    if (!vocabs.includes(row.vocabulary)) throw new Error(`${at}: the vocabulary is not a column of ${WIDE}`);
    for (const s of parseSources(row.source_ref, at)) {
      if (!readmeRow.has(s.key)) throw new Error(`${at}: the source key ${s.key} is not in the README source table`);
    }
    if (!matches.has(row.match)) throw new Error(`${at}: the match value "${row.match}" is not a relation of data_dictionary.csv`);
    return row;
  });

  const covered = new Map(vocabs.map((v) => [v, new Set(long.filter((r) => r.vocabulary === v).map((r) => r.kind))]));
  const entries = new Map<string, CorrespondenceEntry[]>();
  let nTargets = 0;
  for (const w of wide) {
    const kind = w.class_kind ?? "";
    const cls = w.class ?? "";
    const list: CorrespondenceEntry[] = [];
    for (const v of vocabs) {
      const at = `correspondence ${kind}/${cls}, ${v}`;
      const cell = w[v] ?? "";
      const sourceCell = w[`${v}_source`] ?? "";
      const rows = long.filter((r) => r.kind === kind && r.cls === cls && r.vocabulary === v);
      if (cell === "") {
        if (rows.length > 0 || sourceCell !== "") throw new Error(`${at}: the wide cell is empty but ${LONG} has ${rows.length} rows`);
        if (covered.get(v)!.has(kind)) throw new Error(`${at}: the wide cell is empty although ${v} maps ${kind} classes`);
        continue;
      }
      if (rows.length === 0) throw new Error(`${at}: the wide cell "${cell}" has no row in ${LONG}`);
      const wideTargets = parseWideCell(cell, `${WIDE} ${kind}/${cls}, ${v}`);
      const targets = rows.map((r) => ({ target: r.target, match: r.match }));
      if (JSON.stringify(wideTargets) !== JSON.stringify(targets)) {
        throw new Error(`${at}: the wide cell "${cell}" differs from the ${LONG} rows in content or order`);
      }
      const other = rows.find((r) => r.source_ref !== sourceCell);
      if (other) throw new Error(`${at}: the wide source "${sourceCell}" differs from the ${LONG} source "${other.source_ref}"`);
      nTargets += targets.length;
      list.push({ vocabulary: v, targets, sources: parseSources(sourceCell, at) });
    }
    entries.set(`${kind}:${cls}`, list);
  }
  if (nTargets !== long.length) throw new Error(`${LONG}: ${long.length} rows, but ${nTargets} structured targets`);

  const vocabularies = vocabs.map((v) => {
    const keys = [...new Set(long.filter((r) => r.vocabulary === v).flatMap((r) => parseSources(r.source_ref, LONG).map((s) => s.key)))];
    const rowsOfKeys = new Set(keys.map((k) => readmeRow.get(k)));
    if (rowsOfKeys.size > 1) throw new Error(`vocabulary ${v}: its source keys ${keys.join(", ")} belong to different README rows`);
    return { vocabulary: v, kinds: kindOrder.filter((k) => covered.get(v)!.has(k)), source_keys: keys };
  });
  return { entries, vocabularies, sources, relations };
}

function buildTaxonomy(dir: string, papers: PaperRow[], rows: PlatformRow[], graphs: GraphCore[]): TaxonomyJson {
  const rel = "modes/taxonomy/classes.csv";
  const { rows: classRows, col } = table(dir, rel);
  const usage = new Map<string, number>();
  classRows.forEach((_, i) => usage.set(`${col(i, "class_kind")}:${col(i, "class")}`, 0));
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
  const kindOrder = [...new Set(classRows.map((_, i) => col(i, "class_kind")))];
  const corr = buildCorrespondence(dir, new Set(usage.keys()), kindOrder);
  const materialModes = new Set(graphs.flatMap((g) => g.connections).filter((c) => c.is_material).map((c) => c.transfer_mode));
  return {
    classes: classRows.map((_, i) => {
      const kind = col(i, "class_kind");
      const cls = col(i, "class");
      if (!isKind(kind)) throw new Error(`${rel} row ${i + 2}: unknown class_kind "${kind}"`);
      const nItems = usage.get(`${kind}:${cls}`)!;
      const classUsage = classUse(kind, cls, nItems, rows, graphs);
      checkClassCounts(kind, cls, nItems, classUsage, papers, rows, materialModes);
      return {
        class_kind: kind,
        class: cls,
        family: nullIfEmpty(col(i, "family")),
        definition: col(i, "definition"),
        n_items: nItems,
        ...classUsage,
        correspondence: corr.entries.get(`${kind}:${cls}`) ?? null,
      };
    }),
    vocabularies: corr.vocabularies,
    sources: corr.sources,
    relations: corr.relations,
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
  const graphs = readGraphs(releaseDir);
  const { rows: platformRows, campaigns } = readPlatformRows(releaseDir, graphs);
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
    taxonomy: buildTaxonomy(releaseDir, papers, platformRows, graphs),
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
