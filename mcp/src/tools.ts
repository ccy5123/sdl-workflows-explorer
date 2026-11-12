// The tools as plain functions of the dataset and an input object, so they can be tested without an MCP client. Every
// result goes through `envelope`, which adds the release and its citation; every row names its record id, paper key
// and DOI, and every item read from a paper carries its evidence location. The logic is the explorer's (src/lib/); this
// file only selects, joins and trims.
import type { DurationRow, Evidence, PlatformGraph, TaxonomyClass } from "../../src/data/types";
import { formatCitation } from "../../src/lib/citation";
import { assembleComparison, checkCompareIds } from "../../src/lib/compare";
import { cycleRange, jointOffers, stepSources } from "../../src/lib/cycleRange";
import { MAX_STEP_RUNS, simulate, simUnits, stepRunCount } from "../../src/lib/des";
import { matchingPlatforms, type SearchablePlatform } from "../../src/lib/filterApply";
import { autonomyText, DEFAULT_STATE as DEFAULT_FILTERS, INTEGRATION_MODE_TEXT, type FilterState, type Match } from "../../src/lib/filterState";
import { browseHash } from "../../src/lib/filterUrl";
import { evidenceText } from "../../src/lib/home";
import { displayLabel } from "../../src/lib/labels";
import { searchPlatforms, type PlatformMatch } from "../../src/lib/platformFilter";
import { compareHash, platformHash, workflowHash } from "../../src/lib/route";
import { editDistance, rankPlatforms, workflowSets, type LayoutSets } from "../../src/lib/similarity";
import { sortSteps } from "../../src/lib/steps";
import { caption, countTable, partialNote, RELEASE_SEARCH_DATE, sampleNote, trendsHash, valueLabel, type Split } from "../../src/lib/trends";
import {
  addModule,
  addStep,
  AGENT_MODES,
  chooseJoint,
  DEFAULT_STATE as DEFAULT_WORKFLOW,
  decodeWorkflow,
  encodeWorkflow,
  fromPlatform,
  setAgents,
  setCount,
  setEntered,
  setModule,
  setOption,
  setPerRun,
  setTransfer,
  type AgentMode,
  type EditResult,
  type WorkflowState,
} from "../../src/lib/workflowState";
import { SITE_URL } from "../../scripts/lib/llms";
import type { Dataset } from "./dataset";

export const EXPLORER = SITE_URL;

/** A refusal the model should read and act on (unknown id, unknown code, out-of-range input). */
export class ToolError extends Error {}

export interface Envelope<T> {
  release: { version: string; doi: string; sha256: string; record: string };
  results: T;
  notes: string[];
  cite_as: string;
}

function envelope<T>(ds: Dataset, results: T, notes: string[] = []): Envelope<T> {
  return {
    release: { version: ds.pin.version, doi: ds.pin.doi, sha256: ds.pin.sha256, record: `https://doi.org/${ds.pin.doi}` },
    results,
    notes,
    cite_as: formatCitation(ds.derived.releaseDocs.citation),
  };
}

const url = (hash: string) => `${EXPLORER}${hash}`;

/** Evidence with its one-line form, "SI1 · p. 10 · §2.2.4 ¶1". */
const where = (e: Evidence) => ({ ...e, text: evidenceText(e) });

// ---- Vocabulary ---------------------------------------------------------------------------------------------------

export const VOCABULARY_KINDS = ["module_type", "unit_operation", "transfer_mode", "field_tag", "integration_mode"] as const;
export type VocabularyKind = (typeof VOCABULARY_KINDS)[number];

function codesOf(ds: Dataset, kind: VocabularyKind): string[] {
  if (kind === "integration_mode") return ds.offered.im;
  return ds.derived.taxonomy.classes.filter((c) => c.class_kind === kind).map((c) => c.class);
}

/**
 * The closest codes to an unknown one: codes whose code, label or definition contains it (so "XRD" finds the module
 * type defined as "XRD, XPS or NMR instrument"), then the rest by edit distance over characters.
 */
function closest(code: string, codes: readonly string[], text: (x: string) => string = (x) => x): string[] {
  const c = code.toLowerCase();
  const sub = codes.filter((x) => x.includes(c) || c.includes(x) || text(x).toLowerCase().includes(c));
  const rest = codes
    .filter((x) => !sub.includes(x))
    .map((x) => ({ x, d: editDistance([...c], [...x]) }))
    .sort((a, b) => a.d - b.d || (a.x < b.x ? -1 : 1))
    .map((r) => r.x);
  return [...sub, ...rest].slice(0, 5);
}

/** Refuses any code that is not a class of the release, naming the closest valid ones. */
function checkCodes(ds: Dataset, kind: VocabularyKind, codes: readonly string[] | undefined): string[] {
  const valid = codesOf(ds, kind);
  const definitions = new Map(ds.derived.taxonomy.classes.filter((c) => c.class_kind === kind).map((c) => [c.class, c.definition]));
  const label = kind === "integration_mode" ? "transfer_mode" : kind;
  const text = (x: string) => `${displayLabel(label, x)} ${definitions.get(x) ?? ""}`;
  for (const code of codes ?? []) {
    if (!valid.includes(code)) {
      throw new ToolError(
        `"${code}" is not a ${kind} code of release ${ds.pin.version}. Closest: ${closest(code, valid, text).join(", ")}. ` +
          `Call list_vocabulary with kind "${kind}" for all codes and definitions.`,
      );
    }
  }
  return [...(codes ?? [])];
}

export interface VocabularyInput {
  kind: VocabularyKind;
  query?: string;
}

export function listVocabulary(ds: Dataset, input: VocabularyInput) {
  const q = input.query?.trim().toLowerCase() ?? "";
  if (input.kind === "integration_mode") {
    const rows = ds.offered.im.map((code) => ({
      code,
      label: displayLabel("transfer_mode", code),
      n_papers: ds.derived.index.papers.filter((p) => p.integration_mode === code).length,
    }));
    return envelope(ds, { kind: input.kind, meaning: INTEGRATION_MODE_TEXT, classes: rows.filter((r) => !q || `${r.code} ${r.label}`.toLowerCase().includes(q)) });
  }
  // For module types, the query is also looked up in the module names the papers state, so a technique the class
  // definition does not spell out ("diffraction" under "XRD, XPS or NMR instrument") still leads to its code.
  const nameHits = new Map<string, { module_id: string; name_in_paper: string }[]>();
  if (q && input.kind === "module_type") {
    const toks = tokens(input.query!.trim());
    for (const g of ds.graphs.values()) {
      for (const m of g.modules) {
        if (!m.name_in_paper || !toks.every((t) => hit(t, m.name_in_paper!))) continue;
        nameHits.set(m.module_type, [...(nameHits.get(m.module_type) ?? []), { module_id: m.module_id, name_in_paper: m.name_in_paper }]);
      }
    }
  }
  const classes = ds.derived.taxonomy.classes
    .filter((c) => c.class_kind === input.kind)
    .map((c: TaxonomyClass) => {
      const hits = nameHits.get(c.class);
      return {
        code: c.class,
        label: displayLabel(c.class_kind, c.class),
        family: c.family,
        definition: c.definition,
        n_items: c.n_items,
        n_platforms: c.n_platforms,
        n_papers: c.n_papers,
        example_platform_ids: c.examples.slice(0, 5).map((e) => e.platform_id),
        module_name_hits: hits ? { n: hits.length, examples: hits.slice(0, 3) } : undefined,
      };
    })
    .filter((c) => !q || c.module_name_hits || `${c.code} ${c.label} ${c.definition}`.toLowerCase().includes(q));
  const notes =
    q && input.kind === "module_type"
      ? ["The query matches codes, labels and definitions, and the module names the papers state; module_name_hits counts the modules of each type whose name contains it."]
      : [];
  return envelope(ds, { kind: input.kind, classes }, notes);
}

// ---- Filters and search -------------------------------------------------------------------------------------------

export interface Filters {
  years?: { from?: number | null; to?: number | null };
  field_tags?: string[];
  integration_modes?: string[];
  sw_autonomy?: number[];
  hw_autonomy?: number[];
  module_types?: string[];
  module_types_match?: Match;
  transfer_modes?: string[];
  transfer_modes_match?: Match;
  unit_operations?: string[];
  unit_operations_match?: Match;
}

function filterState(ds: Dataset, f: Filters = {}, view: FilterState["view"] = "platforms"): FilterState {
  return {
    ...DEFAULT_FILTERS,
    view,
    years: { from: f.years?.from ?? null, to: f.years?.to ?? null },
    field: checkCodes(ds, "field_tag", f.field_tags),
    im: checkCodes(ds, "integration_mode", f.integration_modes),
    sw: [...(f.sw_autonomy ?? [])],
    hw: [...(f.hw_autonomy ?? [])],
    mt: checkCodes(ds, "module_type", f.module_types),
    mtMatch: f.module_types_match ?? "all",
    tm: checkCodes(ds, "transfer_mode", f.transfer_modes),
    tmMatch: f.transfer_modes_match ?? "all",
    uo: checkCodes(ds, "unit_operation", f.unit_operations),
    uoMatch: f.unit_operations_match ?? "all",
  };
}

/** Words of at most this many letters or digits are matched as whole words (see textSearch). */
export const SHORT_WORD = 3;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeWord = (word: string, text: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(word)}([^a-z0-9]|$)`).test(text.toLowerCase());

/**
 * A search word and how it matches: "case" for a word written in capitals ("IR", "STEM", "UPLC"), which must appear in
 * capitals in the field, not run into other capitals (so "IR" finds "ReactIR" and "FT-IR" but not "stirrer", "STEM"
 * finds "UltraSTEM100" but not "system", "SEM" does not find "TSEMO"); "word" for another word of at most SHORT_WORD letters or digits ("ir"), which must be a whole word; "any"
 * for the rest, the site's rule (anywhere, any case).
 */
interface Token {
  w: string;
  raw: string;
  mode: "case" | "word" | "any";
}

function tokens(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const w = raw.toLowerCase();
      const alnum = /^[A-Za-z0-9]+$/.test(raw);
      const capitals = alnum && raw.length >= 2 && /[A-Z]/.test(raw) && raw === raw.toUpperCase();
      return { w, raw, mode: capitals ? "case" : alnum && w.length <= SHORT_WORD ? "word" : "any" } as Token;
    });
}
const strict = (t: Token) => t.mode !== "any";
/** The capitals not run into other capitals: "IR" in "ReactIR" or "FT-IR", "STEM" in "UltraSTEM100", but "SEM" not in "TSEMO". */
const inCapitals = (raw: string, text: string) => new RegExp(`(?<![A-Z])${escapeRe(raw)}(?![A-Z])`).test(text);
const hit = (t: Token, text: string) =>
  t.mode === "case" ? inCapitals(t.raw, text) : t.mode === "word" ? wholeWord(t.w, text) : text.toLowerCase().includes(t.w);

/** The texts the site's search reads for a platform, each with the reason text it shows: module names, types, steps. */
function detailFields(p: SearchablePlatform): { text: string; reason: string }[] {
  return [
    ...(p.module_names ?? []).map((n) => ({ text: n, reason: `Module: ${n}` })),
    ...p.module_types.map((c) => ({ text: `${displayLabel("module_type", c)} ${c}`, reason: `Module type: ${displayLabel("module_type", c)}` })),
    ...p.unit_operations.map((c) => ({ text: `${displayLabel("unit_operation", c)} ${c}`, reason: `Step: ${displayLabel("unit_operation", c)}` })),
  ];
}
const headText = (p: SearchablePlatform) => [p.platform_id, p.paper_id, p.platform_name ?? ""].join(" ");

/** Why a platform matched under the token rules, in the site's form ("Module: …", at most two); null for a name hit. */
function reasonOf(p: SearchablePlatform, toks: readonly Token[]): string | null {
  const head = headText(p);
  const fields = detailFields(p);
  const reasons: string[] = [];
  for (const t of toks) {
    if (hit(t, head)) continue;
    const f = fields.find((x) => hit(t, x.text));
    if (f && !reasons.includes(f.reason)) reasons.push(f.reason);
  }
  return reasons.length > 0 ? reasons.slice(0, 2).join(" · ") : null;
}

/**
 * The site's search (every word must match, anywhere in a field), except that whole-word tokens must match as whole
 * words; their reasons are recomputed under the same rule, so a reason never names a word that only contains them.
 */
function textSearch(rows: readonly SearchablePlatform[], text: string): { matches: PlatformMatch<SearchablePlatform>[]; anywhere: number } {
  const site = searchPlatforms(rows, text);
  const toks = tokens(text);
  if (!toks.some(strict)) return { matches: site, anywhere: site.length };
  const matches = site
    .filter((m) => toks.every((t) => hit(t, headText(m.row)) || detailFields(m.row).some((f) => hit(t, f.text))))
    .map((m) => ({ row: m.row, reason: reasonOf(m.row, toks) }));
  return { matches, anywhere: site.length };
}

/** Modules of a platform whose name in the paper contains a word of the text, with their evidence locations. */
function matchedModules(ds: Dataset, platformId: string, text: string) {
  const toks = tokens(text);
  if (toks.length === 0) return undefined;
  const hits = ds.graphs
    .get(platformId)!
    .modules.filter((m) => m.name_in_paper && toks.some((t) => hit(t, m.name_in_paper!)))
    .map((m) => ({ module_id: m.module_id, module_type: m.module_type, name_in_paper: m.name_in_paper, evidence: evidenceText(m.evidence) }));
  return hits;
}

function platformRow(ds: Dataset, platformId: string, reason: string | null = null, text = "") {
  const p = ds.platforms.get(platformId)!;
  const paper = ds.papers.get(p.paper_id);
  if (reason === null && text) reason = `Platform name, id or paper: ${p.platform_name ?? p.platform_id}`;
  return {
    platform_id: p.platform_id,
    paper_id: p.paper_id,
    doi: paper?.doi ?? null,
    title: paper?.title ?? null,
    platform_name: p.platform_name,
    year: p.first_public_year,
    field_tags: p.field_tags,
    module_types: p.module_types,
    unit_operations: p.unit_operations,
    material_transfer_modes: p.material_transfer_modes,
    n_modules: p.n_modules,
    n_steps: p.n_steps,
    match_reason: reason,
    matched_modules: matchedModules(ds, platformId, text),
    explorer_url: url(platformHash(p.platform_id)),
  };
}

export interface SearchInput {
  text?: string;
  filters?: Filters;
  limit?: number;
  offset?: number;
}

export function searchPlatformsTool(ds: Dataset, input: SearchInput) {
  const state = filterState(ds, input.filters);
  const filtered = matchingPlatforms(state, ds.derived.index.papers, ds.searchable);
  const text = input.text?.trim() ?? "";
  const { matches, anywhere } = textSearch(filtered, text);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const notes: string[] = [];
  let per_word: { word: string; platforms: number }[] | undefined;
  if (text && matches.length === 0) {
    per_word = tokens(text).map((t) => ({ word: t.raw, platforms: textSearch(filtered, t.raw).matches.length }));
    notes.push(
      "No platform matches every word of the text. per_word gives the platforms each word matches on its own; drop the " +
        "words that match nothing, or use the coded filters (list_vocabulary) instead of descriptive words.",
    );
  }
  if (text) {
    notes.push(
      "The text matches platform ids, names, paper keys, module names as the papers state them, module types and unit " +
        "operations; every word must match. Papers spell instruments differently (FT-IR, FTIR, ReactIR, FlowIR; XRD, " +
        "diffractometer): search each spelling, or filter by module type, before saying a platform is absent. " +
        "matched_modules gives the module ids and evidence locations of module-name hits.",
    );
  }
  const caps = tokens(text).filter((t) => t.mode === "case").map((t) => t.raw);
  const short = tokens(text).filter((t) => t.mode === "word").map((t) => t.raw);
  if (caps.length + short.length > 0) {
    const rules = [
      caps.length > 0 ? `words in capitals (${caps.join(", ")}) must appear in capitals` : "",
      short.length > 0 ? `short words (${short.join(", ")}) must be whole words` : "",
    ].filter(Boolean);
    notes.push(
      `${rules.join("; ")}: ${matches.length} platforms, against ${anywhere} when they may match inside longer words in ` +
        "any case, as the explorer's search box does.",
    );
  }
  if (!text) notes.push("match_reason is null for filter-only searches: every row meets all the filters.");
  return envelope(
    ds,
    {
      total: matches.length,
      offset,
      platforms: matches.slice(offset, offset + limit).map((m) => platformRow(ds, m.row.platform_id, m.reason, text)),
      per_word,
      browse_url_filters_only: url(browseHash(state)),
    },
    notes,
  );
}

// ---- One platform, one paper --------------------------------------------------------------------------------------

function requirePlatform(ds: Dataset, platformId: string): PlatformGraph {
  const g = ds.graphs.get(platformId);
  if (!g) {
    const near = closest(platformId, [...ds.graphs.keys()]).join(", ");
    throw new ToolError(`No platform "${platformId}" in release ${ds.pin.version}. Platform ids look like "Aand2024/P1". Closest: ${near}.`);
  }
  return g;
}

export const PLATFORM_PARTS = ["modules", "steps", "connections", "timing"] as const;
export type PlatformPart = (typeof PLATFORM_PARTS)[number];

export interface PlatformInput {
  platform_id: string;
  include?: PlatformPart[];
}

export function getPlatform(ds: Dataset, input: PlatformInput) {
  const g = requirePlatform(ds, input.platform_id);
  const parts = new Set(input.include && input.include.length > 0 ? input.include : PLATFORM_PARTS);
  const paper = ds.papers.get(g.paper_id)!;
  const sim = ds.derived.simulation;
  const result = {
    platform_id: g.platform_id,
    name: g.name,
    paper: {
      paper_id: paper.paper_id,
      doi: paper.doi,
      title: paper.title,
      venue: paper.venue,
      year: paper.first_public_year,
      field_tags: paper.field_tags,
      integration_mode: paper.integration_mode,
      sw_autonomy: autonomyText("sw", paper.sw_autonomy).long,
      hw_autonomy: autonomyText("hw", paper.hw_autonomy).long,
      hardware_location: paper.hardware_location,
    },
    commercial_integrated: g.commercial_integrated,
    identity_id: g.identity_id,
    shared_with: g.shared_with,
    campaigns: g.campaigns,
    evidence: where(g.evidence),
    explorer_url: url(platformHash(g.platform_id)),
    modules: parts.has("modules")
      ? g.modules.map((m) => ({
          module_id: m.module_id,
          module_type: m.module_type,
          module_type_label: displayLabel("module_type", m.module_type),
          name_in_paper: m.name_in_paper,
          on_platform: m.on_platform,
          unmapped_note: m.unmapped_note,
          evidence: where(m.evidence),
        }))
      : undefined,
    steps: parts.has("steps")
      ? sortSteps(g.steps).map((s) => ({
          step_id: s.step_id,
          order: s.step_order,
          unit_operation: s.unit_operation,
          unit_operation_label: displayLabel("unit_operation", s.unit_operation),
          family: s.family,
          performed_by: s.performed_by,
          modules: s.modules,
          uncertain: s.uncertain,
          unmapped_note: s.unmapped_note,
          evidence: where(s.evidence),
        }))
      : undefined,
    connections: parts.has("connections")
      ? g.connections.map((c) => ({
          edge_id: c.edge_id,
          from_module: c.from_module,
          to_module: c.to_module,
          transfer_mode: c.transfer_mode,
          is_material: c.is_material,
          stated: c.stated,
          uncertain: c.uncertain,
          unmapped_note: c.unmapped_note,
          evidence: where(c.evidence),
        }))
      : undefined,
    timing: parts.has("timing")
      ? {
          step_durations: sim.durations
            .filter((d) => d.platform_id === g.platform_id)
            .map((d) => ({
              step_id: d.step_id,
              unit_operation: d.unit_operation,
              seconds: d.seconds,
              stated: `${d.value} ${d.unit}`,
              bound: d.bound,
              approximate: d.approximate,
              range_s: d.range_low_s === null ? null : [d.range_low_s, d.range_high_s],
              samples_per_run: d.samples_per_run,
              joint_steps: d.joint?.step_ids ?? null,
              evidence: where(d.evidence),
            })),
          throughputs: sim.throughputs
            .filter((t) => t.platform_id === g.platform_id)
            .map((t) => ({
              kind: t.kind,
              stated: `${t.value} ${t.unit}`,
              per_day: t.per_day,
              basis: t.basis,
              bound: t.bound,
              approximate: t.approximate,
              not_converted: t.not_converted,
              evidence: where(t.evidence),
            })),
          transfer_times: sim.transfer_times
            .filter((t) => t.platform_id === g.platform_id)
            .map((t) => ({ edge_id: t.edge_id, seconds: t.seconds, stated: `${t.value} ${t.unit}`, evidence: where(t.evidence) })),
        }
      : undefined,
  };
  return envelope(ds, result, [
    "uncertain marks an item the coder could not settle from the paper; stated=false marks a connection inferred rather than stated. A null field is not recorded.",
  ]);
}

export function getPaper(ds: Dataset, input: { paper_id: string }) {
  const p = ds.papers.get(input.paper_id);
  if (!p) {
    throw new ToolError(`No paper "${input.paper_id}" in release ${ds.pin.version}. Paper keys look like "Aand2024". Closest: ${closest(input.paper_id, [...ds.papers.keys()]).join(", ")}.`);
  }
  const platforms = ds.derived.platformFiles[p.paper_id]?.platforms ?? [];
  return envelope(ds, {
    ...p,
    sw_autonomy_text: autonomyText("sw", p.sw_autonomy).long,
    hw_autonomy_text: autonomyText("hw", p.hw_autonomy).long,
    platforms: platforms.map((g) => ({ platform_id: g.platform_id, name: g.name, explorer_url: url(platformHash(g.platform_id)) })),
  });
}

// ---- Workflows: similar platforms and cycle time ------------------------------------------------------------------

export interface WorkflowSpec {
  modules: { type: string; devices?: number }[];
  steps: { unit_operation: string; module: number }[];
  transfers?: { after_step: number; mode?: string; seconds?: number }[];
}

export interface WorkflowOptions {
  batch?: number;
  samples?: number;
  parallel?: number;
  n?: number;
  runs?: number;
  seed?: number;
  per_run?: { step: number; samples: number }[];
  entered?: { step: number; seconds: number }[];
  joints?: { first_step: number; duration_step_id: string }[];
  agents?: { mode: AgentMode; count: number }[];
  bounds?: boolean;
  rule?: WorkflowState["rule"];
  draw?: WorkflowState["draw"];
}

export interface WorkflowSource {
  from_platform?: string;
  workflow_query?: string;
  workflow?: WorkflowSpec;
}

function apply(r: EditResult, notes: string[]): WorkflowState {
  if (!r.ok) throw new ToolError(r.error);
  notes.push(...r.notes);
  return r.state;
}

/** The builder state of a source, built with the explorer's edit functions so every limit and message is the page's. */
function buildWorkflow(ds: Dataset, src: WorkflowSource, notes: string[]): WorkflowState {
  const given = [src.from_platform, src.workflow_query, src.workflow].filter((x) => x !== undefined).length;
  if (given !== 1) throw new ToolError("Give exactly one of from_platform, workflow_query or workflow.");
  const c = ds.catalog;
  if (src.from_platform !== undefined) {
    requirePlatform(ds, src.from_platform);
    const layout = ds.layouts.get(src.from_platform)!;
    const r = fromPlatform(layout, c);
    notes.push(`Filled from ${src.from_platform}: ${r.filled.join(", ")}.`);
    return r.state;
  }
  if (src.workflow_query !== undefined) {
    const q = src.workflow_query.replace(/^.*#\/workflow\??/, "").replace(/^\?/, "");
    const r = decodeWorkflow(q, c);
    if (r.ignored.length > 0) notes.push(`Ignored from the query: ${r.ignored.join(", ")}.`);
    return r.state;
  }
  const w = src.workflow!;
  let s: WorkflowState = structuredClone(DEFAULT_WORKFLOW);
  w.modules.forEach((m, k) => {
    s = apply(addModule(s, c, m.type), notes);
    if (m.devices !== undefined) s = apply(setModule(s, c, k + 1, { devices: String(m.devices) }), notes);
  });
  for (const st of w.steps) s = apply(addStep(s, c, st.unit_operation, st.module), notes);
  for (const t of w.transfers ?? []) {
    s = apply(setTransfer(s, c, t.after_step, { mode: t.mode, seconds: t.seconds === undefined ? undefined : String(t.seconds) }), notes);
  }
  return s;
}

function applyOptions(ds: Dataset, s: WorkflowState, o: WorkflowOptions, notes: string[]): WorkflowState {
  const c = ds.catalog;
  for (const key of ["batch", "samples", "parallel", "n", "runs", "seed"] as const) {
    if (o[key] !== undefined) s = apply(setCount(s, c, key, String(o[key])), notes);
  }
  for (const p of o.per_run ?? []) s = apply(setPerRun(s, c, p.step, String(p.samples)), notes);
  for (const e of o.entered ?? []) s = apply(setEntered(s, c, e.step, String(e.seconds)), notes);
  for (const j of o.joints ?? []) s = apply(chooseJoint(s, c, j.first_step, j.duration_step_id), notes);
  for (const a of o.agents ?? []) s = apply(setAgents(s, c, a.mode, String(a.count)), notes);
  // Only the options given: setOption spreads its argument over the state, so an undefined key would erase a default.
  const change: Parameters<typeof setOption>[2] = {};
  if (o.bounds !== undefined) change.bounds = o.bounds;
  if (o.rule !== undefined) change.rule = o.rule;
  if (o.draw !== undefined) change.draw = o.draw;
  if (Object.keys(change).length > 0) s = apply(setOption(s, c, change), notes);
  return s;
}

const workflowSummary = (s: WorkflowState) => ({
  modules: s.modules.map((m, k) => ({ module: k + 1, type: m.type, label: displayLabel("module_type", m.type), devices: m.devices })),
  steps: s.steps.map((st, k) => ({ step: k + 1, unit_operation: st.uo, label: displayLabel("unit_operation", st.uo), module: st.module })),
  transfers: Object.entries(s.transfers).map(([i, t]) => ({ after_step: Number(i), mode: t.mode, seconds: t.seconds })),
});

export interface SimilarInput extends Omit<WorkflowSource, "from_platform"> {
  platform_id?: string;
  limit?: number;
}

export function similarPlatforms(ds: Dataset, input: SimilarInput) {
  const notes: string[] = [];
  let sets: LayoutSets;
  let self: string | null = null;
  if (input.platform_id !== undefined) {
    if (input.workflow_query !== undefined || input.workflow !== undefined) throw new ToolError("Give either platform_id or a workflow, not both.");
    requirePlatform(ds, input.platform_id);
    self = input.platform_id;
    sets = ds.layoutSets.find((p) => p.platform.platform_id === self)!;
  } else {
    sets = workflowSets(buildWorkflow(ds, input, notes), ds.catalog);
  }
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const rows = rankPlatforms(sets, ds.layoutSets)
    .filter((r) => r.platform.platform_id !== self)
    .slice(0, limit)
    .map((r) => ({
      platform_id: r.platform.platform_id,
      paper_id: r.platform.paper_id,
      doi: ds.papers.get(r.platform.paper_id)?.doi ?? null,
      name: r.platform.name,
      year: r.platform.year,
      order: r.order,
      types: r.types,
      modes: r.modes,
      explorer_url: url(platformHash(r.platform.platform_id)),
    }));
  notes.push(
    "order = 1 − step-order edit distance / longer step list; types = shared module types / all module types either uses; " +
      "modes = the same for material transfer modes between consecutive steps. Ranked by order, then types, then modes. " +
      "The measures compare structure only; they do not rate a platform.",
  );
  return envelope(ds, { compared_to: self ?? "the given workflow", platforms: rows }, notes);
}

export interface SimulateInput extends WorkflowSource, WorkflowOptions {
  include_events?: boolean;
  /** Every recorded duration row used, instead of the lowest, median and highest ones. */
  include_durations?: boolean;
}

const durationRow = (d: DurationRow) => ({
  step_id: d.step_id,
  platform_id: d.platform_id,
  paper_id: d.paper_id,
  doi: d.doi,
  seconds: d.seconds,
  bound: d.bound,
  approximate: d.approximate,
  evidence: evidenceText(d.evidence),
});

/** The rows a step's range is built from: lowest, median (two rows for an even count) and highest, or all of them. */
function durationsUsed(rows: readonly DurationRow[], all: boolean) {
  if (rows.length === 0) return null;
  const mid = rows.length % 2 === 1 ? [rows[(rows.length - 1) / 2]!] : [rows[rows.length / 2 - 1]!, rows[rows.length / 2]!];
  return {
    n: rows.length,
    lowest: durationRow(rows[0]!),
    median: mid.map(durationRow),
    highest: durationRow(rows.at(-1)!),
    all: all ? rows.map(durationRow) : undefined,
  };
}

export function simulateCycleTime(ds: Dataset, input: SimulateInput) {
  const notes: string[] = [];
  const state = applyOptions(ds, buildWorkflow(ds, input, notes), input, notes);
  if (state.steps.length === 0) throw new ToolError("The workflow has no steps.");
  const sources = stepSources(state, ds.catalog, ds.groups, ds.jointRows);
  const range = cycleRange(state, sources);
  const steps = range.steps.map((r) => ({
    step: r.step,
    unit_operation: r.uo,
    source: r.kind,
    runs_per_batch: r.runs,
    seconds_per_batch: r.range,
    durations_used: r.kind === "recorded" ? durationsUsed(sources[r.step - 1]!.used, input.include_durations === true) : null,
    joint: r.joint,
  }));
  const short = [...new Set(state.steps.map((st) => st.module))]
    .filter((m) => state.modules[m - 1]!.devices < state.parallel)
    .map((m) => `module ${m} (${state.modules[m - 1]!.type}, ${state.modules[m - 1]!.devices} device${state.modules[m - 1]!.devices === 1 ? "" : "s"})`);
  if (short.length > 0) {
    const one = short.length === 1;
    notes.push(
      `parallel is ${state.parallel}, but ${short.join(", ")} ${one ? "has" : "have"} fewer devices, so batches queue for ` +
        `${one ? "it" : "them"}. cycle_range assumes the parallel batches never wait for a device; the simulation models the ` +
        "queue, so its experiments per day are lower. Set devices on the module (workflow.modules[].devices) if the user has that many.",
    );
  }
  for (const r of range.steps) {
    const used = sources[r.step - 1]!.used;
    if (r.kind === "recorded" && used.length === 1) {
      notes.push(
        `Step ${r.step} (${r.uo}) has only one recorded duration (${used[0]!.step_id}, ${used[0]!.seconds} s), so its range ` +
          "is that single value. Ask the user for a duration (entered), or offer a joint duration from joint_duration_offers if one covers this step.",
      );
    }
  }
  const offers = [...jointOffers(state, ds.derived.simulation.durations)].map(([first, rows]) => ({
    first_step: first,
    durations: rows.map((d) => ({ duration_step_id: d.step_id, platform_id: d.platform_id, paper_id: d.paper_id, seconds: d.seconds, covers: d.joint!.unit_operations })),
  }));
  const { units, missing } = simUnits(state, sources);
  let simulation: unknown = null;
  if (missing.length > 0) {
    notes.push(
      `Steps ${missing.join(", ")} have no recorded duration for their unit operation; ask the user for a duration and pass it in entered.`,
    );
  } else {
    const count = stepRunCount(state, units);
    if (count > MAX_STEP_RUNS) {
      throw new ToolError(
        `These inputs need ${count.toLocaleString("en")} step runs (batches × simulation runs × runs per batch over all steps); ` +
          `the limit is ${MAX_STEP_RUNS.toLocaleString("en")}. Use fewer batches, fewer simulation runs or more samples per run.`,
      );
    }
    const summary = simulate(state, units);
    if (state.draw === "median" && summary.makespan.low === summary.makespan.high) {
      notes.push(
        "With draw = median every run uses the same durations, so the simulation's low, mid and high are equal; use " +
          "draw = sample (the default) for a spread over the recorded durations.",
      );
    }
    simulation = {
      batches: state.n,
      simulation_runs: state.runs,
      seed: state.seed,
      makespan_s: summary.makespan,
      experiments_per_day: summary.perDay,
      utilization: Object.entries(summary.utilization).map(([m, u]) => ({ module: Number(m), type: state.modules[Number(m) - 1]!.type, utilization: u })),
      waiting_s: Object.entries(summary.waiting).map(([step, w]) => ({ step: Number(step), mean_wait: w })),
      bottleneck: summary.bottleneck,
      first_run_events: input.include_events ? summary.run1.events.slice(0, 500) : undefined,
    };
  }
  notes.push(
    "Step durations are durations recorded on other platforms for the same unit operation (durations_used names the " +
      "lowest, median and highest rows and the number used; include_durations lists them all). The cycle range uses their " +
      `lowest, median and highest values; the simulation ${state.draw === "median" ? "uses their median" : "draws from them at random"} ` +
      "and models queues for devices and transfer agents. These are simulated figures, not measurements of any platform.",
  );
  return envelope(
    ds,
    {
      workflow: workflowSummary(state),
      batch_size: state.batch,
      samples_per_experiment: state.samples,
      parallel_units: state.parallel,
      transfer_agents: AGENT_MODES.map((m) => ({ mode: m, count: state.agents[m] ?? 1 })),
      cycle_range: { cycle_s: range.cycle, experiments_per_day: range.perDay, transfers: range.transfers, missing: range.missing, steps },
      simulation,
      joint_duration_offers: offers,
      workflow_url: url(workflowHash(encodeWorkflow(state))),
    },
    notes,
  );
}

// ---- Compare and trends -------------------------------------------------------------------------------------------

export function comparePlatforms(ds: Dataset, input: { platform_ids: string[] }) {
  const check = checkCompareIds(input.platform_ids, ds.derived.index.platforms);
  if (!check.ok) throw new ToolError(check.message);
  const graphs = input.platform_ids.map((id) => ds.graphs.get(id)!);
  const c = assembleComparison(graphs);
  return envelope(ds, {
    platforms: c.columns.map((col) => ({
      platform_id: col.platformId,
      name: col.name,
      paper_id: col.paperId,
      doi: ds.papers.get(col.paperId)?.doi ?? null,
      year: col.year,
      explorer_url: url(platformHash(col.platformId)),
    })),
    module_types: c.moduleRows.map((r) => ({ module_type: r.key, label: displayLabel("module_type", r.key), counts: r.counts })),
    material_transfer_modes: c.transferRows.map((r) => ({ transfer_mode: r.key, label: displayLabel("transfer_mode", r.key), counts: r.counts })),
    // Steps with their ids and evidence (assembleComparison keeps only order, unit operation and performer).
    steps: graphs.map((g) =>
      sortSteps(g.steps).map((s) => ({
        step_id: s.step_id,
        order: s.step_order,
        unit_operation: s.unit_operation,
        performed_by: s.performed_by,
        evidence: evidenceText(s.evidence),
      })),
    ),
    compare_url: url(compareHash(input.platform_ids)),
  }, ["counts and steps are in the order of platforms; a null count means the platform has none."]);
}

export const SPLIT_VALUES = ["im", "field", "sw", "hw", "mt", "tm"] as const;

export interface CountInput {
  unit: FilterState["view"];
  split: Split;
  filters?: Filters;
}

export function countByYear(ds: Dataset, input: CountInput) {
  const state = filterState(ds, input.filters, input.unit);
  const table = countTable(state, input.split, { papers: ds.derived.index.papers, platforms: ds.searchable });
  const idx = ds.derived.index;
  return envelope(
    ds,
    {
      unit: input.unit,
      split: input.split,
      caption: caption(input.split, input.unit),
      total: table.total,
      bins: table.bins.map((b, k) => ({ label: b.label, years: b.years, n: table.n[k] })),
      values: table.values.map((v, i) => ({ value: v, label: valueLabel(input.split, v), counts: table.counts[i] })),
      trends_url: url(trendsHash(state, input.split)),
    },
    [
      partialNote(),
      sampleNote(idx.counts.papers, idx.counts.platforms),
      `Literature search date: ${RELEASE_SEARCH_DATE.text}. counts[k] belongs to bins[k].`,
    ],
  );
}

export function releaseInfo(ds: Dataset) {
  const r = ds.derived.index.release;
  return envelope(ds, {
    version: r.version,
    released_on: r.released_on,
    doi: r.doi,
    zip_sha256: ds.pin.sha256,
    license: r.license,
    taxonomy_version: r.taxonomy_version,
    counts: ds.derived.index.counts,
    explorer: EXPLORER,
    resources: ["sdl://release/DATA_CARD.md", "sdl://release/CITATION.cff"],
  });
}
