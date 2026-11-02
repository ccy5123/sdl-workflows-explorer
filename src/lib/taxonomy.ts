// Taxonomy explorer rules (SPEC-TAXO-001 REQ-011 to REQ-016): kind labels and unit nouns, count and caption texts, the
// browse-link rule of a class, the correspondence table rows and the family grouping. Pure: no UI code. Reference
// texts, dois and the release's relation meanings come from taxonomy.json, never from this module; the two relation
// glosses and the vocabulary display labels are site text and live here (REQ-005).
import type {
  CorrespondenceEntry,
  CorrespondenceSource,
  TaxonomyClass,
  TaxonomyRelation,
  TaxonomySource,
  TaxonomyVocabulary,
} from "../data/types";
import { DEFAULT_STATE, type FilterState, type Offered, type View } from "./filterState";
import { browseHash } from "./filterUrl";
import { taxonomySourceHash } from "./route";

type BrowseGroup = "field" | "mt" | "tm" | "uo";

interface KindWords {
  label: string;
  plural: string;
  unit: [string, string];
  group: BrowseGroup;
}

const KINDS: Record<string, KindWords> = {
  field_tag: { label: "Field tag", plural: "field tags", unit: ["paper", "papers"], group: "field" },
  module_type: { label: "Module type", plural: "module types", unit: ["module", "modules"], group: "mt" },
  transfer_mode: { label: "Transfer mode", plural: "transfer modes", unit: ["connection", "connections"], group: "tm" },
  unit_operation: { label: "Unit operation", plural: "unit operations", unit: ["step", "steps"], group: "uo" },
};

const words = (kind: string): KindWords | undefined => KINDS[kind];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Field tag", "Module type", …; an unknown kind as written. */
export const kindLabel = (kind: string): string => words(kind)?.label ?? kind;
/** Plural in running text: "field tags". */
export const kindPlural = (kind: string): string => words(kind)?.plural ?? kind;
/** Section heading of a kind: "Field tags". */
export const kindHeading = (kind: string): string => capitalize(kindPlural(kind));

/** "<n> <noun>", with the singular noun for exactly 1. */
export const countText = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`;
export const platformsText = (n: number): string => countText(n, "platform", "platforms");
export const papersText = (n: number): string => countText(n, "paper", "papers");

const unitText = (kind: string, n: number): string => {
  const [one, many] = words(kind)?.unit ?? ["item", "items"];
  return countText(n, one, many);
};

/** "<n_items> <unit noun>": papers, modules, connections or steps. */
export const itemsText = (c: Pick<TaxonomyClass, "class_kind" | "n_items">): string => unitText(c.class_kind, c.n_items);
/** "(<n> <unit noun>)" after an example platform. */
export const exampleCount = (kind: string, n: number): string => `(${unitText(kind, n)})`;

/** "a", "a and b", "a, b and c". */
export function joinWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Kinds in the order their classes first appear (classes.csv order). */
export const kindsInOrder = (classes: readonly TaxonomyClass[]): string[] => [...new Set(classes.map((c) => c.class_kind))];

/** Caption under the overview heading (REQ-011). */
export function overviewCaption(classes: readonly TaxonomyClass[]): string {
  const kinds = kindsInOrder(classes);
  const parts = kinds.map((k) => countText(classes.filter((c) => c.class_kind === k).length, kindLabel(k).toLowerCase(), kindPlural(k)));
  const units = kinds.map((k) => `${words(k)?.unit[1] ?? "items"} for ${kindPlural(k)}`);
  return (
    `The ${classes.length} classes of the release taxonomy: ${joinWords(parts)}. Item counts are ${joinWords(units)}. ` +
    "A paper can carry several field tags, so the paper counts of the field tags need not add up to the number of papers."
  );
}

/** Name of the overview's jump list to the kind sections (REQ-011). */
export const JUMP_LIST_NAME = "On this page";

/** Site glosses for relations whose release meaning is null (REQ-011). */
export const RELATION_GLOSSES: Readonly<Record<string, string>> = {
  exact: "the same concept",
  none: "no counterpart in that vocabulary; the listed source was searched",
};

/** Meaning column of the Relations table: the release's meaning, else the site gloss, else an em dash. */
export const relationMeaning = (r: TaxonomyRelation): string => r.meaning ?? RELATION_GLOSSES[r.match] ?? "—";

/** Unit-operation classes grouped by family, families in alphabetical order (REQ-011). */
export function familyGroups(classes: readonly TaxonomyClass[]): { family: string; classes: TaxonomyClass[] }[] {
  const groups = new Map<string, TaxonomyClass[]>();
  for (const c of classes.filter((x) => x.class_kind === "unit_operation")) {
    const family = c.family ?? "";
    groups.set(family, [...(groups.get(family) ?? []), c]);
  }
  return [...groups.keys()].sort().map((family) => ({ family, classes: groups.get(family)! }));
}

// ---- Browse links (REQ-012, REQ-015) ----

export const NO_PLATFORM_NOTE = "No platform uses this class, so the browser has no filter for it.";

export const unfilteredNote = (cls: string, platforms: number): string =>
  `${cls} is not offered by the browser's filters. It is recorded on all ${platforms} platforms, so these links open the full lists.`;

export type ClassLinks =
  | { kind: "filtered"; platforms: string; papers: string; note: null }
  | { kind: "unfiltered"; platforms: string; papers: string; note: string }
  | { kind: "none"; note: string | null };

// @MX:NOTE: [AUTO] REQ-015 — each linked count equals the count line of its link; tests/taxonomy.test.ts checks all classes
/**
 * Platform and paper links of a class: the browse lists filtered on the class when the browser offers it; the full
 * lists when it is not offered but recorded on every platform and paper; otherwise none. Build-time checks (REQ-004 g,
 * h) leave a not-offered class with platforms only in the second case; any other gets no link and no note.
 */
export function classLinks(
  cls: TaxonomyClass,
  offered: Offered,
  totals: { platforms: number; papers: number },
): ClassLinks {
  const group = words(cls.class_kind)?.group;
  const link = (view: View, patch: Partial<FilterState>) => browseHash({ ...DEFAULT_STATE, view, ...patch });
  if (group && offered[group].includes(cls.class)) {
    return {
      kind: "filtered",
      platforms: link("platforms", { [group]: [cls.class] }),
      papers: link("papers", { [group]: [cls.class] }),
      note: null,
    };
  }
  if (cls.n_platforms > 0 && cls.n_platforms === totals.platforms && cls.n_papers === totals.papers) {
    return { kind: "unfiltered", platforms: link("platforms", {}), papers: link("papers", {}), note: unfilteredNote(cls.class, totals.platforms) };
  }
  return { kind: "none", note: cls.n_platforms === 0 ? NO_PLATFORM_NOTE : null };
}

// ---- Examples (REQ-012) ----

export const NO_EXAMPLE_TEXT = "No platform uses this class.";

export function exampleCaption(kind: string): string {
  if (kind === "field_tag") return "The first five platforms with this field tag, in platform id order.";
  return `Up to five platforms with the most ${words(kind)?.unit[1] ?? "items"} of this class; ties in platform id order.`;
}

// ---- Correspondence (REQ-013) ----

export const NO_ROW_TEXT = "The correspondence table has no row for this class.";

export const noMappingText = (kind: string): string => `The correspondence table does not map ${kindPlural(kind)}.`;

/** Display labels of the vocabularies, keyed by correspondence-table column name. */
export const VOCABULARY_LABELS: Readonly<Record<string, string>> = {
  XDL: "XDL",
  WCSO: "WCSO",
  Leong2022: "MAP (Leong2022)",
  OntoLab_SAREF: "OntoLab/SAREF",
  Gottstein2026: "Gottstein2026 orchestration levels",
};

/** The vocabulary's display label; a column with no label shows its name. */
export const vocabularyLabel = (vocabulary: string): string => VOCABULARY_LABELS[vocabulary] ?? vocabulary;

/** Source text of a vocabulary that has no entry for the class: "OntoLab/SAREF maps module types only". */
export const notCoveredText = (vocabulary: string, kinds: readonly string[]): string =>
  `${vocabularyLabel(vocabulary)} maps ${joinWords(kinds.map(kindPlural))} only`;

/** Whether any class of the kind has a row in the correspondence table. */
export const kindIsMapped = (kind: string, classes: readonly TaxonomyClass[]): boolean =>
  classes.some((c) => c.class_kind === kind && c.correspondence !== null);

/** An entry whose single target has the relation none. */
export const isNoneEntry = (e: CorrespondenceEntry): boolean => e.targets.length === 1 && e.targets[0]!.match === "none";

/** A source as "<key>, <page>, <locator>", or the key alone. */
export const sourceText = (s: CorrespondenceSource): string =>
  s.page === null && s.locator === null ? s.key : [s.key, s.page ?? "", s.locator ?? ""].join(", ");

/** An entry's sources joined with "; ". */
export const sourcesText = (sources: readonly CorrespondenceSource[]): string => sources.map(sourceText).join("; ");

/** README source row of a vocabulary's source keys (one row by REQ-004 f), or null. */
export const referenceOf = (vocabulary: TaxonomyVocabulary, sources: readonly TaxonomySource[]): TaxonomySource | null =>
  sources.find((s) => vocabulary.source_keys.some((k) => s.keys.includes(k))) ?? null;

/** One body row of a class page's correspondence table; relations are words, never colour alone (REQ-016). */
export interface CorrespondenceRow {
  vocabulary: string;
  label: string;
  /** Overview hash targeting the vocabulary's sources row, or null when no row holds its keys. */
  link: string | null;
  term: string;
  relation: string;
  source: string;
  /** Rows the Vocabulary and Source cells span when this row starts an entry; 0 on the entry's other rows. */
  span: number;
}

// @MX:NOTE: [AUTO] REQ-013 — one row per target; a "none" entry and a vocabulary with no entry each give one row
/** Rows of the correspondence table of a class, vocabularies in `vocabularies` order; none when it has no row. */
export function correspondenceRows(
  cls: TaxonomyClass,
  vocabularies: readonly TaxonomyVocabulary[],
  sources: readonly TaxonomySource[],
): CorrespondenceRow[] {
  if (cls.correspondence === null) return [];
  return vocabularies.flatMap((v) => {
    const ref = referenceOf(v, sources);
    const cell = { vocabulary: v.vocabulary, label: vocabularyLabel(v.vocabulary), link: ref ? taxonomySourceHash(ref.keys[0]!) : null };
    const entry = cls.correspondence!.find((e) => e.vocabulary === v.vocabulary);
    if (!entry) return [{ ...cell, term: "—", relation: "not covered", source: notCoveredText(v.vocabulary, v.kinds), span: 1 }];
    if (isNoneEntry(entry)) return [{ ...cell, term: "—", relation: "none", source: `searched: ${sourcesText(entry.sources)}`, span: 1 }];
    const source = sourcesText(entry.sources);
    return entry.targets.map((t, i) => ({ ...cell, term: t.target, relation: t.match, source, span: i === 0 ? entry.targets.length : 0 }));
  });
}

/** A reference split around its "doi:<doi>" text, so a view can link the doi. */
export function splitReference(source: TaxonomySource): { before: string; doiText: string | null; after: string } {
  const doiText = `doi:${source.doi}`;
  const at = source.reference.indexOf(doiText);
  if (at < 0) return { before: source.reference, doiText: null, after: "" };
  return { before: source.reference.slice(0, at), doiText, after: source.reference.slice(at + doiText.length) };
}

// ---- Not found and load failure (REQ-010, REQ-014) ----

export const NOT_FOUND_HEADING = "Class not found";
export const notFoundText = (kind: string, cls: string): string => `The taxonomy has no class ${cls} of kind ${kind}.`;
export const BACK_LINK_TEXT = "Back to the taxonomy";
export const loadErrorText = (reason: string): string => `Could not load the taxonomy: ${reason}`;
