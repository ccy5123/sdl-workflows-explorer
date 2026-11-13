// Technique search (SPEC-TECH-001): the vocabulary rules (normalisation, "an alias occurs in a text") and the one
// matching function shared by the Home search, the Browse and Trends text search and the MCP package. Pure: no UI code,
// no window or document.

// ---- Vocabulary ----------------------------------------------------------------------------------------------------

export interface Technique {
  id: string;
  label: string;
  definition: string;
  module_types: string[];
  aliases: string[];
}

export interface CompoundAlias {
  alias: string;
  techniques: string[];
}

export interface TechniqueVocabulary {
  version: string;
  note?: string;
  techniques: Technique[];
  compound_aliases: CompoundAlias[];
}

/** Lower case with every character that is not a letter or a digit removed: "UV–Vis", "UV/Vis", "uv vis" → "uvvis". */
export const normalise = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Maximal runs of letters and digits: "in-line FT-IR (ReactIR 15)" → in, line, FT, IR, ReactIR, 15. */
export const tokens = (text: string): string[] => text.match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * True when the normalised alias equals the concatenation of one or more consecutive tokens of the text, compared in
 * lower case: FTIR occurs in "in-line FT-IR"; IR occurs in "IR lamp" and in "FT-IR" but not in "stirrer".
 */
export function occursIn(alias: string, text: string): boolean {
  const a = normalise(alias);
  if (!a) return false;
  const ts = tokens(text).map((t) => t.toLowerCase());
  for (let i = 0; i < ts.length; i++) {
    let joined = "";
    for (let j = i; j < ts.length && joined.length < a.length; j++) {
      joined += ts[j];
      if (joined === a) return true;
    }
  }
  return false;
}

/** Normalised alias → the techniques it names (one for an alias, two or more for a compound alias). */
export type AliasIndex = Map<string, string[]>;

/** Builds the alias index; throws when one normalised alias would name two different technique sets. */
export function aliasIndex(v: TechniqueVocabulary): AliasIndex {
  const index: AliasIndex = new Map();
  const add = (alias: string, ids: string[], where: string) => {
    const key = normalise(alias);
    if (!key) throw new Error(`techniques.json: empty alias in ${where}`);
    const had = index.get(key);
    if (had && had.join(";") !== ids.join(";")) {
      throw new Error(`techniques.json: alias "${alias}" (${key}) names both ${had.join("+")} and ${ids.join("+")}`);
    }
    index.set(key, ids);
  };
  const ids = new Set(v.techniques.map((t) => t.id));
  for (const t of v.techniques) for (const a of t.aliases) add(a, [t.id], t.id);
  for (const c of v.compound_aliases) {
    for (const id of c.techniques) if (!ids.has(id)) throw new Error(`techniques.json: compound alias ${c.alias} names unknown technique ${id}`);
    add(c.alias, [...c.techniques], `compound alias ${c.alias}`);
  }
  return index;
}

/** The aliases of the vocabulary (single and compound) that occur in a text. */
export function aliasesIn(v: TechniqueVocabulary, text: string): string[] {
  const out: string[] = [];
  for (const t of v.techniques) for (const a of t.aliases) if (occursIn(a, text)) out.push(a);
  for (const c of v.compound_aliases) if (occursIn(c.alias, text)) out.push(c.alias);
  return out;
}

// ---- Query terms ---------------------------------------------------------------------------------------------------

export type Term =
  | { kind: "quoted"; text: string }
  | { kind: "technique"; text: string; techniques: string[] }
  | { kind: "plain"; text: string };

/** Longest run of space-separated words that one alias covers. */
const MAX_ALIAS_WORDS = 4;

/**
 * Splits a query into terms, left to right:
 * - "double-quoted text" is one quoted term, matched as written;
 * - the longest run of one to four words whose normalised concatenation is an alias is one technique term;
 * - a word whose tokens are each an alias ("LC-MS" → LC, MS; "UPLC-DAD/MS") gives one technique term per token;
 * - any other word is a plain term.
 */
export function parseQuery(query: string, index: AliasIndex): Term[] {
  const terms: Term[] = [];
  const parts: { text: string; quoted: boolean }[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  for (let m = re.exec(query); m !== null; m = re.exec(query)) {
    if (m[1] !== undefined) {
      if (m[1].trim()) parts.push({ text: m[1].trim(), quoted: true });
    } else parts.push({ text: m[2]!, quoted: false });
  }
  let i = 0;
  while (i < parts.length) {
    const p = parts[i]!;
    if (p.quoted) {
      terms.push({ kind: "quoted", text: p.text });
      i++;
      continue;
    }
    let taken = 0;
    for (let n = Math.min(MAX_ALIAS_WORDS, parts.length - i); n >= 1; n--) {
      const run = parts.slice(i, i + n);
      if (run.some((r) => r.quoted)) continue;
      const text = run.map((r) => r.text).join(" ");
      const hit = index.get(normalise(text));
      if (hit) {
        terms.push({ kind: "technique", text, techniques: hit });
        taken = n;
        break;
      }
    }
    if (taken > 0) {
      i += taken;
      continue;
    }
    const ts = tokens(p.text);
    if (ts.length > 1 && ts.every((t) => index.has(normalise(t)))) {
      for (const t of ts) terms.push({ kind: "technique", text: t, techniques: index.get(normalise(t))! });
    } else terms.push({ kind: "plain", text: p.text });
    i++;
  }
  return terms;
}
