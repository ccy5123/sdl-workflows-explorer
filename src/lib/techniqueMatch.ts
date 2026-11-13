// The one text-search rule of the Home search, the Browse and Trends text search and the MCP package (SPEC-TECH-001
// REQ-005, REQ-006): technique terms through the tag table, quoted terms as written, plain terms by the earlier text
// rule. Pure: no UI code, no window or document.
import {
  aliasIndex,
  normalise,
  occursIn,
  parseQuery,
  tokens,
  type AliasIndex,
  type CompoundAlias,
  type Technique,
  type TechniqueVocabulary,
  type Term,
} from "./techniqueSearch";

/** A module as the search reads it: id, name as the paper states it, evidence location text. */
export interface ModuleRef {
  id: string;
  name: string;
  evidence: string;
}

/** A platform row as the search reads it (a subset of PlatformRow, plus module refs from search.json). */
export interface SearchRow {
  platform_id: string;
  paper_id: string;
  platform_name: string | null;
  module_types: readonly string[];
  unit_operations: readonly string[];
  module_names?: readonly string[];
  module_refs?: readonly ModuleRef[];
}

interface TaggedModule {
  id: string;
  name: string;
  evidence: string;
  techniques: string[];
}

/** What the search knows about the technique tags (from techniques.json). */
export interface TechniqueData {
  vocabulary: TechniqueVocabulary;
  index: AliasIndex;
  /** platform id → its tagged modules. */
  tagged: Map<string, TaggedModule[]>;
  label: Map<string, string>;
  provenance: string;
}

export interface TechniquesFile {
  vocabulary_version?: string;
  provenance?: string;
  techniques: Technique[];
  compound_aliases: CompoundAlias[];
  modules: { platform_id: string; module_id: string; techniques: string[]; name: string; evidence: string }[];
}

export function techniqueData(json: TechniquesFile): TechniqueData {
  const vocabulary: TechniqueVocabulary = { version: json.vocabulary_version ?? "", techniques: json.techniques, compound_aliases: json.compound_aliases };
  const tagged = new Map<string, TaggedModule[]>();
  for (const m of json.modules) {
    const list = tagged.get(m.platform_id) ?? [];
    list.push({ id: m.module_id, name: m.name, evidence: m.evidence, techniques: m.techniques });
    tagged.set(m.platform_id, list);
  }
  return {
    vocabulary,
    index: aliasIndex(vocabulary),
    tagged,
    label: new Map(json.techniques.map((t) => [t.id, t.label])),
    provenance: json.provenance ?? "",
  };
}

/** Technique ids carried by a platform's tagged modules. */
export const platformTechniques = (data: TechniqueData, platformId: string): string[] =>
  [...new Set((data.tagged.get(platformId) ?? []).flatMap((m) => m.techniques))].sort();

export type Reason =
  | { kind: "technique"; technique: string; label: string; alias: string; module: ModuleRef }
  | { kind: "module"; module: ModuleRef }
  | { kind: "field"; field: "platform id" | "paper" | "platform name"; text: string }
  | { kind: "label"; field: "module type" | "step"; text: string };

export interface PlatformHit<T> {
  row: T;
  /** The reasons of every term, in query order (a term matched on several modules gives one per module). */
  reasons: Reason[];
}

export interface Expansion {
  /** The term as typed. */
  typed: string;
  techniques: { id: string; label: string; aliases: string[] }[];
}

export interface SearchResult<T> {
  hits: PlatformHit<T>[];
  terms: Term[];
  expansions: Expansion[];
  /** Up to five stated module names closest to the query, when fewer than three platforms match. */
  suggestions: string[];
}

/** Fewer platforms than this make the search offer suggestions (REQ-006). */
export const SUGGEST_BELOW = 3;
const MAX_SUGGESTIONS = 5;
/** A plain word of at most this many letters or digits must equal a whole token (REQ-005). */
export const SHORT_WORD = 3;

/** Readable labels of codes, passed in so this module stays independent of the label tables. */
export type Labeller = (kind: "module_type" | "unit_operation", code: string) => string;

type HeadField = { field: "platform id" | "paper" | "platform name"; text: string };

const lower = (s: string) => s.toLowerCase();

function headFields(r: SearchRow): HeadField[] {
  const out: HeadField[] = [
    { field: "platform id", text: r.platform_id },
    { field: "paper", text: r.paper_id },
  ];
  if (r.platform_name) out.push({ field: "platform name", text: r.platform_name });
  return out;
}

const refsOf = (r: SearchRow): ModuleRef[] =>
  r.module_refs ? [...r.module_refs] : (r.module_names ?? []).map((name) => ({ id: "", name, evidence: "" }));

const isShort = (w: string) => /^[\p{L}\p{N}]+$/u.test(w) && w.length <= SHORT_WORD;

/** The earlier text rule for one word: case-insensitive substring; for plain terms a short word must be a whole token. */
function textHit(word: string, text: string, strictShort: boolean): boolean {
  if (strictShort && isShort(word)) return tokens(text).some((t) => lower(t) === lower(word));
  return lower(text).includes(lower(word));
}

/** The reasons one term gives a platform, or null when the term does not match it. */
function termReasons(term: Term, r: SearchRow, data: TechniqueData | null, labels: Labeller): Reason[] | null {
  if (term.kind === "technique") {
    const out: Reason[] = [];
    const wanted = new Set(term.techniques);
    // A compound alias (LCMS) needs every technique it names; different modules may carry them.
    const covered = new Set<string>();
    for (const m of data?.tagged.get(r.platform_id) ?? []) {
      for (const t of m.techniques.filter((x) => wanted.has(x))) {
        covered.add(t);
        out.push({ kind: "technique", technique: t, label: data!.label.get(t) ?? t, alias: term.text, module: { id: m.id, name: m.name, evidence: m.evidence } });
      }
    }
    if (out.length > 0 && covered.size === wanted.size) return out;
    for (const f of headFields(r)) if (occursIn(term.text, f.text)) return [{ kind: "field", field: f.field, text: f.text }];
    return null;
  }
  const strictShort = term.kind === "plain";
  for (const f of headFields(r)) if (textHit(term.text, f.text, strictShort)) return [{ kind: "field", field: f.field, text: f.text }];
  const mods = refsOf(r).filter((m) => textHit(term.text, m.name, strictShort));
  if (mods.length > 0) return mods.map((m): Reason => ({ kind: "module", module: m }));
  for (const c of r.module_types) {
    const label = labels("module_type", c);
    if (textHit(term.text, `${label} ${c}`, strictShort)) return [{ kind: "label", field: "module type", text: label }];
  }
  for (const c of r.unit_operations) {
    const label = labels("unit_operation", c);
    if (textHit(term.text, `${label} ${c}`, strictShort)) return [{ kind: "label", field: "step", text: label }];
  }
  return null;
}

/** Edit distance of the best-matching substring of `text` to `pattern` (Sellers). */
function substringDistance(pattern: string, text: string): number {
  let prev = new Array<number>(text.length + 1).fill(0);
  for (let i = 1; i <= pattern.length; i++) {
    const row = [i];
    for (let j = 1; j <= text.length; j++) {
      row.push(Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (pattern[i - 1] === text[j - 1] ? 0 : 1)));
    }
    prev = row;
  }
  return Math.min(...prev);
}

/** Stated module names closest to the query (normalised substring edit distance, then name), at most five. */
export function suggestNames(query: string, rows: readonly SearchRow[]): string[] {
  const q = normalise(query.replace(/"/g, ""));
  if (!q) return [];
  const names = [...new Set(rows.flatMap((r) => refsOf(r).map((m) => m.name)))];
  return names
    .map((name) => ({ name, d: substringDistance(q, normalise(name)) }))
    .filter((x) => x.d <= Math.max(1, Math.floor(q.length / 3)))
    .sort((a, b) => a.d - b.d || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .slice(0, MAX_SUGGESTIONS)
    .map((x) => x.name);
}

// @MX:ANCHOR: [AUTO] searchWithTechniques — the one text-search rule of Home, Browse/Trends and the MCP (SPEC-TECH-001)
// @MX:REASON: the three paths must return the same platforms for every spelling; the SPECs' expected-counts.mjs follow it
/**
 * Platforms matching every term of the query: those whose own id, paper or name contains the whole (plain) query
 * first, as the Home search ordered them, then the rest, each group in input order; with the reasons, the technique
 * expansions and, when fewer than three match, suggestions. A blank query returns every row with no reason.
 */
export function searchWithTechniques<T extends SearchRow>(
  rows: readonly T[],
  query: string,
  data: TechniqueData | null,
  labels: Labeller,
): SearchResult<T> {
  const q = query.trim();
  if (!q) return { hits: rows.map((row) => ({ row, reasons: [] })), terms: [], expansions: [], suggestions: [] };
  const terms = parseQuery(q, data ? data.index : new Map());
  // Rows whose id, paper or name contains the whole plain query come first, as the Home search ordered them; a short
  // word must be a whole token there too ("ir" must not find "HamediRad" or "Bioinspired").
  const whole = terms.every((t) => t.kind === "plain") ? lower(q) : null;
  const direct: PlatformHit<T>[] = [];
  const other: PlatformHit<T>[] = [];
  for (const row of rows) {
    const head = whole === null ? undefined : headFields(row).find((f) => textHit(whole, f.text, true));
    if (head) {
      direct.push({ row, reasons: [{ kind: "field", field: head.field, text: head.text }] });
      continue;
    }
    const reasons: Reason[] = [];
    let all = true;
    for (const t of terms) {
      const r = termReasons(t, row, data, labels);
      if (!r) {
        all = false;
        break;
      }
      reasons.push(...r);
    }
    if (all) other.push({ row, reasons });
  }
  const hits = [...direct, ...other];
  const seen = new Set<string>();
  const expansions: Expansion[] = [];
  for (const t of terms) {
    if (t.kind !== "technique" || !data || seen.has(normalise(t.text))) continue;
    seen.add(normalise(t.text));
    expansions.push({
      typed: t.text,
      techniques: t.techniques.map((id) => {
        const tech = data.vocabulary.techniques.find((x) => x.id === id)!;
        return { id, label: tech.label, aliases: tech.aliases };
      }),
    });
  }
  return { hits, terms, expansions, suggestions: hits.length < SUGGEST_BELOW ? suggestNames(q, rows) : [] };
}

/** "FTIR: searched as IR spectroscopy (IR, FTIR, FT-IR, FT/IR, ATR-IR, ATR-FTIR, …)" — at most six aliases shown. */
export function expansionText(e: Expansion): string {
  const parts = e.techniques.map((t) => `${t.label} (${t.aliases.slice(0, 6).join(", ")}${t.aliases.length > 6 ? ", …" : ""})`);
  return `${e.typed}: searched as ${parts.join(" and ")}`;
}

/** One line per reason: "IR spectroscopy: Aand2024/P1/M4 in-line FT-IR (…) · SI1 · p. 10 · §2.2.4 ¶1". */
export function reasonText(r: Reason): string {
  const mod = (m: ModuleRef) => [m.id, m.name].filter(Boolean).join(" ") + (m.evidence ? ` · ${m.evidence}` : "");
  switch (r.kind) {
    case "technique":
      return `${r.label}: ${mod(r.module)}`;
    case "module":
      return `Module: ${mod(r.module)}`;
    case "field":
      return r.field === "platform name" ? `Platform name: ${r.text}` : r.field === "paper" ? `Paper: ${r.text}` : `Platform id: ${r.text}`;
    case "label":
      return r.field === "module type" ? `Module type: ${r.text}` : `Step: ${r.text}`;
  }
}

/** Puts a typed term in double quotes inside the query, so it is searched as written (the "only" button). */
export function quoteTerm(query: string, typed: string): string {
  const i = query.indexOf(typed);
  if (i < 0) return query;
  return `${query.slice(0, i)}"${typed}"${query.slice(i + typed.length)}`;
}
