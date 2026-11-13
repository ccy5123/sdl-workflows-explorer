// The technique overlay (SPEC-TECH-001 REQ-001 to REQ-004): read data-overlay/techniques.json and
// data-overlay/module-techniques.csv, check them against the pinned release, and build public/data/techniques.json.
// The overlay is an explorer-side layer; the release is never changed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import type { PlatformFile, TechniqueModule, TechniquesJson } from "../../src/data/types";
import { evidenceText } from "../../src/lib/home";
import { aliasesIn, aliasIndex, type TechniqueVocabulary } from "../../src/lib/techniqueSearch";

export const OVERLAY_DIR = "data-overlay";
export const VOCABULARY_FILE = "techniques.json";
export const TABLE_FILE = "module-techniques.csv";
export const TABLE_HEADER = ["module_id", "techniques", "name_in_paper"] as const;

/** The sentence every place that shows tags carries (REQ-009). */
export const TAG_PROVENANCE =
  "Technique tags were assigned by a language model from the module names the papers state; they are an explorer " +
  "layer, not part of the Zenodo release.";

export interface TagRow {
  module_id: string;
  /** Empty for `none`. */
  techniques: string[];
  name_in_paper: string;
  /** 1-based line number in the CSV, header = 1. */
  line: number;
  raw: string;
}

export interface Overlay {
  vocabulary: TechniqueVocabulary;
  rows: TagRow[];
}

const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

export function parseVocabulary(text: string): TechniqueVocabulary {
  const v = JSON.parse(text) as TechniqueVocabulary;
  if (!Array.isArray(v.techniques) || v.techniques.length === 0) throw new Error(`${VOCABULARY_FILE}: no techniques`);
  const seen = new Set<string>();
  for (const t of v.techniques) {
    if (!SNAKE.test(t.id)) throw new Error(`${VOCABULARY_FILE}: id "${t.id}" is not snake case`);
    if (seen.has(t.id)) throw new Error(`${VOCABULARY_FILE}: id "${t.id}" appears twice`);
    seen.add(t.id);
    for (const f of ["label", "definition"] as const) if (!t[f]?.trim()) throw new Error(`${VOCABULARY_FILE}: ${t.id} has no ${f}`);
    if (!t.module_types?.length) throw new Error(`${VOCABULARY_FILE}: ${t.id} names no module type`);
    if (!t.aliases?.length) throw new Error(`${VOCABULARY_FILE}: ${t.id} has no alias`);
  }
  v.compound_aliases ??= [];
  aliasIndex(v);
  return v;
}

export function parseTagTable(text: string, v: TechniqueVocabulary): TagRow[] {
  const records = parse(text, { relax_column_count: false, skip_empty_lines: true }) as string[][];
  const header = records[0];
  if (!header || header.join(",") !== TABLE_HEADER.join(",")) {
    throw new Error(`${TABLE_FILE}: the header must be ${TABLE_HEADER.join(",")}`);
  }
  const ids = new Set(v.techniques.map((t) => t.id));
  const problems: string[] = [];
  const rows = records.slice(1).map((r, k) => {
    const [module_id = "", techniques = "", name_in_paper = ""] = r;
    const line = k + 2;
    const parts = techniques.split(";").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) problems.push(`line ${line} (${module_id}): techniques is empty; write none`);
    if (parts.includes("none") && parts.length > 1) problems.push(`line ${line} (${module_id}): none is combined with a technique`);
    for (const p of parts) if (p !== "none" && !ids.has(p)) problems.push(`line ${line} (${module_id}): "${p}" is not a technique of the vocabulary`);
    return { module_id, techniques: parts.filter((p) => p !== "none"), name_in_paper, line, raw: techniques };
  });
  if (problems.length) throw new Error(`${TABLE_FILE}:\n  ${problems.join("\n  ")}`);
  return rows;
}

export function readOverlay(dir = OVERLAY_DIR): Overlay {
  const vocabulary = parseVocabulary(readFileSync(join(dir, VOCABULARY_FILE), "utf8"));
  return { vocabulary, rows: parseTagTable(readFileSync(join(dir, TABLE_FILE), "utf8"), vocabulary) };
}

export interface NeedRow {
  platform_id: string;
  module_id: string;
  module_type: string;
  name_in_paper: string;
  /** Aliases of the vocabulary that occur in the stated name. */
  aliases: string[];
}

/** Modules that must have a row (REQ-003 (d)): an instrument_* type, or an alias in the stated name. */
export function modulesNeedingRows(d: { platformFiles: Record<string, PlatformFile> }, v: TechniqueVocabulary): NeedRow[] {
  const out: NeedRow[] = [];
  for (const file of Object.values(d.platformFiles)) {
    for (const g of file.platforms) {
      for (const m of g.modules) {
        const name = m.name_in_paper ?? "";
        const aliases = name ? aliasesIn(v, name) : [];
        if (m.module_type.startsWith("instrument_") || aliases.length > 0) {
          out.push({ platform_id: g.platform_id, module_id: m.module_id, module_type: m.module_type, name_in_paper: name, aliases });
        }
      }
    }
  }
  return out.sort((a, b) => (a.module_id < b.module_id ? -1 : a.module_id > b.module_id ? 1 : 0));
}

/** Throws, naming every offending row or module, when the table does not fit the release (REQ-003 (a)-(e)). */
export function checkOverlay(d: { platformFiles: Record<string, PlatformFile> }, overlay: Overlay): void {
  const modules = new Map<string, { name: string | null }>();
  for (const file of Object.values(d.platformFiles)) for (const g of file.platforms) for (const m of g.modules) modules.set(m.module_id, { name: m.name_in_paper });
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const r of overlay.rows) {
    const m = modules.get(r.module_id);
    if (!m) problems.push(`line ${r.line}: ${r.module_id} is not a module of the pinned release`);
    else if ((m.name ?? "") !== r.name_in_paper) {
      problems.push(`line ${r.line}: ${r.module_id} name_in_paper "${r.name_in_paper}" differs from the release's "${m.name ?? ""}"`);
    }
    const before = seen.get(r.module_id);
    if (before !== undefined) problems.push(`line ${r.line}: ${r.module_id} appears twice (also line ${before})`);
    seen.set(r.module_id, r.line);
  }
  const missing = modulesNeedingRows(d, overlay.vocabulary).filter((m) => !seen.has(m.module_id));
  for (const m of missing) {
    problems.push(`${m.module_id} (${m.module_type}${m.aliases.length ? `; aliases in name: ${m.aliases.join(", ")}` : ""}) has no row; run npm run list-untagged`);
  }
  if (problems.length) throw new Error(`${TABLE_FILE} does not fit the release (${problems.length} problems):\n  ${problems.join("\n  ")}`);
}

/** public/data/techniques.json: the vocabulary, the provenance sentence and every tagged module with its evidence. */
export function buildTechniques(d: { platformFiles: Record<string, PlatformFile> }, overlay: Overlay): TechniquesJson {
  checkOverlay(d, overlay);
  const tags = new Map(overlay.rows.filter((r) => r.techniques.length > 0).map((r) => [r.module_id, r.techniques]));
  const modules: TechniqueModule[] = [];
  for (const paperId of Object.keys(d.platformFiles).sort()) {
    for (const g of d.platformFiles[paperId]!.platforms) {
      for (const m of g.modules) {
        const t = tags.get(m.module_id);
        if (t) modules.push({ platform_id: g.platform_id, module_id: m.module_id, techniques: t, name: m.name_in_paper ?? "", evidence: evidenceText(m.evidence) });
      }
    }
  }
  return {
    vocabulary_version: overlay.vocabulary.version,
    provenance: TAG_PROVENANCE,
    techniques: overlay.vocabulary.techniques,
    compound_aliases: overlay.vocabulary.compound_aliases,
    modules,
  };
}
