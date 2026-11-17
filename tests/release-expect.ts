// Expected values of the pinned release, computed afresh from its CSV files (and, for the instrument search, the
// explorer's technique overlay in data-overlay/), for the unit tests and the e2e specs. A test that pins a number the
// release decides (a total, a filter result, a count by year, a benchmark split count) takes it from here, so pinning a
// new release needs no edit to the tests.
//
// This file shares no code with src/lib or scripts/lib/derive (only the CSV reader): the rules below are written again
// from the specs (SPEC-BROWSE-001 §2 filters, SPEC-TECH-001 REQ-005 and REQ-008 search and technique filter,
// SPEC-TRENDS-001 REQ-006 year bins, SPEC-BENCH-001 REQ-001 split and items), as .moai/specs/*/expected-counts.mjs did.
// A test that compares what the site shows with these numbers therefore still checks the site's logic.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type CsvRow, readCsv } from "../scripts/lib/csv";
import { PINNED_RELEASE_DIR } from "./pinned-release";

const ROOT = join(import.meta.dirname, "..");
const OVERLAY = join(ROOT, "data-overlay");

export type Match = "all" | "any";

export interface ExpPaper {
  paper_id: string;
  title: string;
  year: number;
  field_tags: string[];
  im: string;
  sw: number;
  hw: number;
}

export interface ExpPlatform {
  platform_id: string;
  paper_id: string;
  name: string | null;
  year: number;
  field_tags: string[];
  mt: string[];
  tm: string[];
  uo: string[];
  tech: string[];
  module_names: string[];
}

/** A browser filter state, as SPEC-BROWSE-001 §2 and SPEC-TAXO-001 REQ-007 describe it; absent fields are not applied. */
export interface Filter {
  years?: [number | null, number | null];
  field?: string[];
  im?: string[];
  sw?: number[];
  hw?: number[];
  mt?: string[];
  mtMatch?: Match;
  tm?: string[];
  tmMatch?: Match;
  uo?: string[];
  uoMatch?: Match;
  tech?: string[];
  techMatch?: Match;
  q?: string;
}

const list = (v: string | undefined, sep: string) => (v ? v.split(sep).filter(Boolean) : []);
const setMatch = (have: readonly string[], want: readonly string[] | undefined, mode: Match = "all") =>
  !want || want.length === 0 || (mode === "any" ? want.some((w) => have.includes(w)) : want.every((w) => have.includes(w)));

// ---- The instrument search (SPEC-TECH-001 REQ-004, REQ-005), written again from the spec ----

/** Readable names of module types and unit operations (SPEC-UI-001 REQ-007): sentence case unless named here. */
const OVERRIDES: Record<string, Record<string, string>> = {
  module_type: {
    coating_printing_unit: "Coating / printing unit",
    commercial_integrated: "Commercial integrated system",
    instrument_electrochemical: "Electrochemical instrument",
    instrument_imaging: "Imaging instrument",
    instrument_optical: "Optical instrument",
    instrument_physical: "Physical-property instrument",
    instrument_separation_ms: "Separation / MS instrument",
    instrument_structural: "Structural instrument",
    unmapped: "Other module (unmapped)",
  },
  unit_operation: {
    cool_quench: "Cool / quench",
    deposit_coat: "Deposit / coat",
    evaporate_dry: "Evaporate / dry",
    measure_electrochemical: "Electrochemical measurement",
    measure_imaging: "Imaging measurement",
    measure_optical: "Optical measurement",
    measure_physical: "Physical-property measurement",
    measure_separation_ms: "Separation / MS measurement",
    measure_structural: "Structural measurement",
    react_flow: "Flow reaction",
    react_photo_electro: "Photo/electro reaction",
    react_thermal: "Thermal reaction",
    wash_extract: "Wash / extract",
    unmapped: "Other operation (unmapped)",
  },
};
const sentence = (code: string) => {
  const w = code.split("_").filter(Boolean).join(" ");
  return w.charAt(0).toUpperCase() + w.slice(1);
};
const label = (kind: string, code: string) => OVERRIDES[kind]?.[code] ?? sentence(code);

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const toks = (s: string) => s.match(/[\p{L}\p{N}]+/gu) ?? [];
/** An alias occurs in a text when consecutive word tokens of the text, joined, equal the normalised alias. */
const occurs = (alias: string, text: string) => {
  const a = norm(alias);
  const t = toks(text).map((x) => x.toLowerCase());
  for (let i = 0; i < t.length; i++) {
    let j = i;
    let s = "";
    while (j < t.length && s.length < a.length) s += t[j++];
    if (s === a) return true;
  }
  return false;
};

type Aliases = Map<string, string[]>;
type Term = { kind: "quoted" | "plain"; text: string } | { kind: "technique"; text: string; ids: string[] };

function terms(query: string, aliases: Aliases): Term[] {
  const parts = [...query.matchAll(/"([^"]*)"|(\S+)/g)]
    .map((m) => (m[1] !== undefined ? { text: m[1].trim(), quoted: true } : { text: m[2]!, quoted: false }))
    .filter((p) => p.text);
  const out: Term[] = [];
  for (let i = 0; i < parts.length; ) {
    if (parts[i]!.quoted) {
      out.push({ kind: "quoted", text: parts[i++]!.text });
      continue;
    }
    let n = Math.min(4, parts.length - i);
    for (; n >= 1; n--) {
      const run = parts.slice(i, i + n);
      if (run.some((r) => r.quoted)) continue;
      const text = run.map((r) => r.text).join(" ");
      if (aliases.has(norm(text))) {
        out.push({ kind: "technique", text, ids: aliases.get(norm(text))! });
        break;
      }
    }
    if (n >= 1) {
      i += n;
      continue;
    }
    const ts = toks(parts[i]!.text);
    if (ts.length > 1 && ts.every((t) => aliases.has(norm(t)))) {
      for (const t of ts) out.push({ kind: "technique", text: t, ids: aliases.get(norm(t))! });
    } else out.push({ kind: "plain", text: parts[i]!.text });
    i++;
  }
  return out;
}

type Searchable = Pick<ExpPlatform, "platform_id" | "paper_id" | "name" | "mt" | "uo" | "tech" | "module_names">;
const head = (l: Searchable) => [l.platform_id, l.paper_id, l.name].filter((x): x is string => x != null);
const shortWord = (w: string) => /^[\p{L}\p{N}]+$/u.test(w) && w.length <= 3;
const textHit = (w: string, text: string, plain: boolean) =>
  plain && shortWord(w) ? toks(text).some((t) => t.toLowerCase() === w.toLowerCase()) : text.toLowerCase().includes(w.toLowerCase());

function termHit(t: Term, l: Searchable): boolean {
  if (t.kind === "technique") {
    if (t.ids.every((id) => l.tech.includes(id))) return true;
    return head(l).some((f) => occurs(t.text, f));
  }
  const plain = t.kind === "plain";
  const fields = [
    ...head(l),
    ...l.module_names,
    ...l.mt.map((c) => `${label("module_type", c)} ${c}`),
    ...l.uo.map((c) => `${label("unit_operation", c)} ${c}`),
  ];
  return fields.some((f) => textHit(t.text, f, plain));
}

/** A platform matches the whole plain query in its id, paper or name, or every term of the query somewhere. */
function searchMatches(l: Searchable, query: string, aliases: Aliases): boolean {
  const q = query.trim();
  if (!q) return true;
  const ts = terms(q, aliases);
  if (ts.every((t) => t.kind === "plain") && !shortWord(q) && head(l).some((f) => f.toLowerCase().includes(q.toLowerCase()))) return true;
  return ts.every((t) => termHit(t, l));
}

// ---- The pinned release, read from its CSV files ----

export interface ExpRelease {
  dir: string;
  /** A release table, e.g. "core/step.csv" or "modes/benchmark/split.csv". */
  csv(rel: string): CsvRow[];
  papers: ExpPaper[];
  platforms: ExpPlatform[];
  /** Platforms matching a browser filter state (SPEC-BROWSE-001 §2). */
  platformsMatching(f: Filter): ExpPlatform[];
  /** Papers matching it: paper-level filters on the paper, platform-level ones on one of its platforms. */
  papersMatching(f: Filter): ExpPaper[];
  countPlatforms(f?: Filter): number;
  countPapers(f?: Filter): number;
  /** Year bins of the trends chart over all papers (SPEC-TRENDS-001 REQ-006): label and the years each covers. */
  yearBins(): { label: string; years: [number | null, number | null] }[];
}

const cache = new Map<string, ExpRelease>();

/** Before 2015 the years are grouped into one bin; the year of the literature search (20 October 2026) is partial. */
const GROUP_END = 2014;
const SEARCH_YEAR = 2026;

export function expectedRelease(dir: string = PINNED_RELEASE_DIR): ExpRelease {
  const hit = cache.get(dir);
  if (hit) return hit;
  const tables = new Map<string, CsvRow[]>();
  const csv = (rel: string) => {
    if (!tables.has(rel)) tables.set(rel, readCsv(join(dir, rel)));
    return tables.get(rel)!;
  };

  const papers: ExpPaper[] = csv("modes/trends/papers.csv").map((r) => ({
    paper_id: r.paper_id!,
    title: r.title!,
    year: Number(r.first_public_year),
    field_tags: list(r.field_tags, ";"),
    im: r.integration_mode!,
    sw: Number(r.sw_autonomy),
    hw: Number(r.hw_autonomy),
  }));

  // Technique tags of the release's modules (data-overlay/module-techniques.csv; "none" carries no technique).
  const tagOf = new Map<string, string[]>();
  for (const r of readCsv(join(OVERLAY, "module-techniques.csv"))) {
    tagOf.set(r.module_id!, list(r.techniques, ";").map((s) => s.trim()).filter((s) => s !== "none"));
  }
  const uo = new Map<string, Set<string>>();
  for (const s of csv("core/step.csv")) {
    if (!uo.has(s.platform_id!)) uo.set(s.platform_id!, new Set());
    uo.get(s.platform_id!)!.add(s.unit_operation!);
  }
  const names = new Map<string, string[]>();
  const tech = new Map<string, Set<string>>();
  for (const m of csv("core/module.csv")) {
    if (!names.has(m.platform_id!)) names.set(m.platform_id!, []);
    if (m.name_in_paper) names.get(m.platform_id!)!.push(m.name_in_paper);
    if (!tech.has(m.platform_id!)) tech.set(m.platform_id!, new Set());
    for (const t of tagOf.get(m.module_id!) ?? []) tech.get(m.platform_id!)!.add(t);
  }
  const platforms: ExpPlatform[] = csv("modes/builder/platforms.csv").map((r) => ({
    platform_id: r.platform_id!,
    paper_id: r.paper_id!,
    name: r.platform_name || null,
    year: Number(r.first_public_year),
    field_tags: list(r.field_tags, ";"),
    mt: list(r.module_types, ","),
    tm: list(r.material_transfer_modes, ","),
    uo: [...(uo.get(r.platform_id!) ?? [])],
    tech: [...(tech.get(r.platform_id!) ?? [])],
    module_names: names.get(r.platform_id!) ?? [],
  }));

  const vocabulary = JSON.parse(readFileSync(join(OVERLAY, "techniques.json"), "utf8")) as {
    techniques: { id: string; aliases: string[] }[];
    compound_aliases?: { alias: string; techniques: string[] }[];
  };
  const aliases: Aliases = new Map();
  for (const t of vocabulary.techniques) for (const a of t.aliases) aliases.set(norm(a), [t.id]);
  for (const c of vocabulary.compound_aliases ?? []) aliases.set(norm(c.alias), c.techniques);

  const paperById = new Map(papers.map((p) => [p.paper_id, p]));
  const yearOk = (y: number, f: Filter) => !f.years || ((f.years[0] === null || y >= f.years[0]) && (f.years[1] === null || y <= f.years[1]));
  const fieldOk = (tags: string[], f: Filter) => !f.field || f.field.length === 0 || f.field.some((t) => tags.includes(t));
  const paperLevel = (p: ExpPaper, f: Filter) =>
    (!f.im?.length || f.im.includes(p.im)) && (!f.sw?.length || f.sw.includes(p.sw)) && (!f.hw?.length || f.hw.includes(p.hw));
  const platformLevel = (l: ExpPlatform, f: Filter) =>
    setMatch(l.mt, f.mt, f.mtMatch) && setMatch(l.tm, f.tm, f.tmMatch) && setMatch(l.uo, f.uo, f.uoMatch) && setMatch(l.tech, f.tech, f.techMatch);
  const platformLevelActive = (f: Filter) => !!(f.mt?.length || f.tm?.length || f.uo?.length || f.tech?.length);

  const platformsMatching = (f: Filter) =>
    platforms.filter(
      (l) =>
        yearOk(l.year, f) &&
        fieldOk(l.field_tags, f) &&
        paperLevel(paperById.get(l.paper_id)!, f) &&
        platformLevel(l, f) &&
        (!f.q?.trim() || searchMatches(l, f.q, aliases)),
    );
  // A paper matches the search through one of its platforms, or through its own id and title (titles carry no tags).
  const paperText = (p: ExpPaper, q: string) =>
    platforms.some((l) => l.paper_id === p.paper_id && searchMatches(l, q, aliases)) ||
    searchMatches({ platform_id: p.paper_id, paper_id: p.paper_id, name: p.title, mt: [], uo: [], tech: [], module_names: [] }, q, new Map());
  const papersMatching = (f: Filter) =>
    papers.filter(
      (p) =>
        yearOk(p.year, f) &&
        fieldOk(p.field_tags, f) &&
        paperLevel(p, f) &&
        (!platformLevelActive(f) || platforms.some((l) => l.paper_id === p.paper_id && platformLevel(l, f))) &&
        (!f.q?.trim() || paperText(p, f.q)),
    );

  const yearBins = () => {
    const years = papers.map((p) => p.year);
    const [earliest, latest] = [Math.min(...years), Math.max(...years)];
    const bins: { label: string; years: [number | null, number | null] }[] = [];
    if (earliest <= GROUP_END) bins.push({ label: `before ${GROUP_END + 1}`, years: [null, GROUP_END] });
    for (let y = GROUP_END + 1; y <= latest; y++) bins.push({ label: y === SEARCH_YEAR ? `${y}*` : `${y}`, years: [y, y] });
    return bins;
  };

  const release: ExpRelease = {
    dir,
    csv,
    papers,
    platforms,
    platformsMatching,
    papersMatching,
    countPlatforms: (f = {}) => platformsMatching(f).length,
    countPapers: (f = {}) => papersMatching(f).length,
    yearBins,
  };
  cache.set(dir, release);
  return release;
}

/** The filter values present in the release (SPEC-BROWSE-001 REQ-004): codes alphabetical, autonomy levels numeric. */
export function expectedOffered(r: ExpRelease = expectedRelease()) {
  const alpha = (xs: string[]) => [...new Set(xs)].sort();
  const numeric = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
  return {
    field: alpha(r.papers.flatMap((p) => p.field_tags)),
    im: alpha(r.papers.map((p) => p.im)),
    sw: numeric(r.papers.map((p) => p.sw)),
    hw: numeric(r.papers.map((p) => p.hw)),
    mt: alpha(r.platforms.flatMap((l) => l.mt)),
    tm: alpha(r.platforms.flatMap((l) => l.tm)),
    uo: alpha(r.platforms.flatMap((l) => l.uo)),
    tech: alpha(r.platforms.flatMap((l) => l.tech)),
  };
}

export interface ExpClassUse {
  n_items: number;
  n_platforms: number;
  n_papers: number;
  /** Up to five [platform_id, items of the class on it], most items first, ties in platform id order; field tags: the
   *  first five platforms by id, with null. */
  examples: [string, number | null][];
}

/**
 * Usage of every taxonomy class (SPEC-TAXO-001 REQ-002), keyed "kind/class": items are paper field-tag rows, modules,
 * connections and steps of the class; platforms and papers those with at least one.
 */
export function expectedTaxonomyUse(r: ExpRelease = expectedRelease()): Map<string, ExpClassUse> {
  const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const items = new Map<string, Map<string, number>>();
  const add = (key: string, platformId: string) => {
    if (!items.has(key)) items.set(key, new Map());
    items.get(key)!.set(platformId, (items.get(key)!.get(platformId) ?? 0) + 1);
  };
  for (const m of r.csv("core/module.csv")) add(`module_type/${m.module_type}`, m.platform_id!);
  for (const c of r.csv("core/connection.csv")) add(`transfer_mode/${c.transfer_mode}`, c.platform_id!);
  for (const s of r.csv("core/step.csv")) add(`unit_operation/${s.unit_operation}`, s.platform_id!);
  const fieldRows = new Map<string, number>();
  for (const f of r.csv("core/paper_field_tag.csv")) fieldRows.set(f.field_tag!, (fieldRows.get(f.field_tag!) ?? 0) + 1);
  const paperOf = new Map(r.platforms.map((l) => [l.platform_id, l.paper_id]));
  const out = new Map<string, ExpClassUse>();
  for (const c of r.csv("modes/taxonomy/classes.csv")) {
    const key = `${c.class_kind}/${c.class}`;
    if (c.class_kind === "field_tag") {
      const on = r.platforms.filter((l) => l.field_tags.includes(c.class!)).map((l) => l.platform_id).sort(byId);
      out.set(key, {
        n_items: fieldRows.get(c.class!) ?? 0,
        n_platforms: on.length,
        n_papers: r.papers.filter((p) => p.field_tags.includes(c.class!)).length,
        examples: on.slice(0, 5).map((id) => [id, null]),
      });
      continue;
    }
    const per = items.get(key) ?? new Map<string, number>();
    out.set(key, {
      n_items: [...per.values()].reduce((a, b) => a + b, 0),
      n_platforms: per.size,
      n_papers: new Set([...per.keys()].map((id) => paperOf.get(id))).size,
      examples: [...per].sort((a, b) => b[1] - a[1] || byId(a[0], b[0])).slice(0, 5),
    });
  }
  return out;
}

/** True when `npm run fetch-release` has extracted the pinned release. */
export const pinnedReleaseExtracted = (): boolean => existsSync(join(PINNED_RELEASE_DIR, "core", "paper.csv"));

// ---- Benchmark chrono2023 (SPEC-BENCH-001 REQ-001, REQ-002), from modes/benchmark/ ----

export const BENCH_MT = "chrono2023-module_type";
export const BENCH_TM = "chrono2023-transfer_mode";
export type SplitName = "train" | "test" | "excluded";
export const SPLIT_NAMES: readonly SplitName[] = ["train", "test", "excluded"];
type SplitCounts = Record<SplitName, number>;
const zero = (): SplitCounts => ({ train: 0, test: 0, excluded: 0 });

export interface ExpBenchmark {
  /** Papers per split (split.csv). */
  papers: SplitCounts;
  /** Platforms per split: a platform takes its paper's split. */
  platforms: SplitCounts;
  /** Per task: items, uncertain items, and items per label and split. */
  tasks: Record<string, { items: SplitCounts; uncertain: SplitCounts; labels: Map<string, SplitCounts>; rows: CsvRow[] }>;
  /** Items per platform and task. */
  perPlatform(task: string, platformId: string): number;
}

export function expectedBenchmark(r: ExpRelease = expectedRelease()): ExpBenchmark {
  const splitOf = new Map<string, SplitName>();
  const papers = zero();
  for (const row of r.csv("modes/benchmark/split.csv")) {
    splitOf.set(row.paper_id!, row.split as SplitName);
    papers[row.split as SplitName]++;
  }
  const platforms = zero();
  for (const l of r.platforms) platforms[splitOf.get(l.paper_id)!]++;
  const tasks: ExpBenchmark["tasks"] = {};
  const per = new Map<string, number>();
  for (const [task, file] of [[BENCH_MT, "items_module_type.csv"], [BENCH_TM, "items_transfer_mode.csv"]] as const) {
    const rows = r.csv(`modes/benchmark/${file}`);
    const t = { items: zero(), uncertain: zero(), labels: new Map<string, SplitCounts>(), rows };
    for (const row of rows) {
      const s = row.split as SplitName;
      t.items[s]++;
      if (row.uncertain === "1") t.uncertain[s]++;
      if (!t.labels.has(row.label!)) t.labels.set(row.label!, zero());
      t.labels.get(row.label!)![s]++;
      const key = `${task} ${row.platform_id}`;
      per.set(key, (per.get(key) ?? 0) + 1);
    }
    tasks[task] = t;
  }
  return { papers, platforms, tasks, perPlatform: (task, id) => per.get(`${task} ${id}`) ?? 0 };
}

export const total = (c: SplitCounts): number => c.train + c.test + c.excluded;

// ---- Timing data (SPEC-SIM-001 REQ-001 to REQ-003), from modes/simulation/ ----

/** Readable name of a unit operation, as the site writes it (SPEC-UI-001 REQ-007). */
export const uoLabel = (code: string): string => label("unit_operation", code);

const DURATION_S: Record<string, number> = { s: 1, min: 60, h: 3600, d: 86400 };

export interface ExpDuration {
  step_id: string;
  platform_id: string;
  uo: string;
  seconds: number;
  /** True when the paper states only a lower or upper bound. */
  bound: boolean;
  /** Unit operations of the steps a joint duration covers, in order; null for a single step. */
  joint: string[] | null;
}

/** Stated step durations in seconds (step_timing rows of quantity duration). */
export function expectedDurations(r: ExpRelease = expectedRelease()): ExpDuration[] {
  const uoOf = new Map(r.csv("core/step.csv").map((s) => [s.step_id!, s.unit_operation!]));
  return r
    .csv("modes/simulation/step_timing.csv")
    .filter((t) => t.quantity === "duration")
    .map((t) => ({
      step_id: t.step_id!,
      platform_id: t.platform_id!,
      uo: uoOf.get(t.step_id!)!,
      seconds: Number(t.value) * DURATION_S[t.unit!]!,
      bound: (t.bound ?? "") !== "",
      joint: t.covers_steps ? t.covers_steps.split(";").map((id) => uoOf.get(id)!) : null,
    }));
}

/** Median of numbers (the mean of the two middle values for an even count). */
export function medianOf(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Platform throughputs, and how many of them have a per-day value: a rate "<count>/<k><time>" or a cycle time
 * "<time>/<count>" converts; samples need the platform's experiments per count, batches its batch size.
 */
export function expectedThroughputs(r: ExpRelease = expectedRelease()): {
  measured: number;
  nominal: number;
  perDay: number;
  notConverted: number;
} {
  const values = r.csv("modes/simulation/process_values.csv");
  const has = (q: string) => new Set(values.filter((v) => v.target_kind === "platform" && v.quantity === q).map((v) => v.target_id));
  const [batch, epc] = [has("batch_size"), has("experiments_per_count")];
  const rows = values.filter((v) => v.quantity === "throughput");
  const converts = (v: CsvRow) => {
    const rate = /^(experiments|samples|batches)\/(\d*)(s|min|h|d|week)$/.exec(v.unit!);
    const cycle = /^(s|min|h|d|week)\/(experiment|sample|batch)$/.exec(v.unit!);
    let count: string;
    if (rate && rate[2] !== "0") count = rate[1]!;
    else if (cycle && Number(v.value) > 0) count = { experiment: "experiments", sample: "samples", batch: "batches" }[cycle[2]!]!;
    else return false;
    if (count === "samples") return epc.has(v.platform_id);
    if (count === "batches") return batch.has(v.platform_id);
    return true;
  };
  const perDay = rows.filter(converts).length;
  return {
    measured: rows.filter((v) => v.throughput_kind === "measured").length,
    nominal: rows.filter((v) => v.throughput_kind === "nominal").length,
    perDay,
    notConverted: rows.length - perDay,
  };
}
