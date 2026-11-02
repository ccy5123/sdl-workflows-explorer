// Text of the home and about pages (SPEC-SITE-001 REQ-003, REQ-005, REQ-006). Every number here is either filled in
// from index.json or appears as a whole number in the pinned release's DATA_CARD.md; tests/siteText.test.ts checks
// this (REQ-007), so a later release with different figures fails the test instead of leaving a stale number. Pure.

export function homeIntro(version: string, platforms: number, papers: number): string {
  return (
    "sdl-workflows records which modules published closed-loop self-driving laboratories use, in what order one " +
    "experimental cycle runs its steps on them, and how material moves between the modules. " +
    `Release ${version} codes ${platforms} platforms described in ${papers} papers that one literature search found.`
  );
}

export interface ViewEntry {
  name: string;
  description: string;
  /** Route of the view; null for the platform viewer, which needs a platform chosen first. */
  href: string | null;
}

export const VIEWS: readonly ViewEntry[] = [
  {
    name: "Platform viewer",
    description:
      "One platform's modules and connections as a graph, the steps of one cycle, and the page each item comes from. " +
      "Choose a platform from the list on this page or from Browse.",
    href: null,
  },
  {
    name: "Browse and compare",
    description: "Papers and platforms in filterable tables; pick two or three platforms to compare side by side.",
    href: "#/browse",
  },
  {
    name: "Trends",
    description:
      "Papers or platforms counted by first public year, split by integration mode, field tag, autonomy, module type " +
      "or transfer mode.",
    href: "#/trends",
  },
  {
    name: "Taxonomy",
    description:
      "The classes used in the coding, with definitions, families, usage counts and correspondence to other " +
      "vocabularies.",
    href: "#/taxonomy",
  },
  {
    name: "Benchmark",
    description: "The chrono2023 tasks, their train/test split and the reference results as published.",
    href: "#/benchmark",
  },
];

export const PLATFORM_LIST_BUTTON = "Go to the platform list";

export const aboutIntro = (version: string): string =>
  `This page summarises the data card (DATA_CARD.md) of release ${version}. Its full text is at the end of the page ` +
  "and in the release files on Zenodo.";

export interface AboutSection {
  heading: string;
  text: string;
}

export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    heading: "How the papers were found",
    text:
      "The 2172 candidates came from the reference lists of three reviews and from keyword searches of Crossref and " +
      "arXiv, both run on 20 October 2026. They were screened on titles (2172), abstracts (655) and full texts (469). " +
      "A paper was eligible when it is an original research paper; an algorithm chose the next experiment from " +
      "earlier results, at least once on the physical system; automated hardware ran the experiments, with isolated " +
      "manual steps allowed; something was made or processed in the loop; and the hardware is described. 238 papers " +
      "were eligible. A language model working from the written criteria made 3240 of the 3298 screening decisions; " +
      "the researcher made 58.",
  },
  {
    heading: "How the papers were coded",
    text:
      "Each paper was coded once by a language model (Claude Opus 5.5) from its main text and supplements, following " +
      "written coding instructions and a taxonomy that were settled on 10 development papers and then frozen. For " +
      "each platform the coding records its modules, the steps of one experimental cycle in order (unit operation, " +
      "whether a robot, a person or software performs it, and the modules involved) and the connections between " +
      "modules (transfer mode, and whether the paper states the transfer or it was inferred from context). Every " +
      "item carries the document, page and figure, table or section that describes it. An item that fits no class " +
      "is coded unmapped.",
  },
  {
    heading: "How far the labels can be trusted",
    text:
      "A second coding of every paper by the same model with the same instructions was compared with the released " +
      "coding item by item; items without a counterpart of the same class are marked uncertain (340 of 2621 steps " +
      "and 156 of 1687 connections). For 30 papers, a different model, Claude Fable 5.1, coded the papers under the " +
      "same instructions as a reference. Against it, the released coding reached a field-wise strict micro-F1 of " +
      "0.905 for the unit operation of steps, 0.898 for module type and 0.891 for transfer mode; the lower bounds of " +
      "the 95% intervals were 0.862, 0.858 and 0.847. These figures are agreement between two language models, not " +
      "accuracy against human coding; the release contains no human coding.",
  },
  {
    heading: "Limits",
    text:
      "The search ran once, on one date, in two indexes. The 238 papers are the eligible candidates that this search " +
      "found, not every closed-loop self-driving laboratory paper published, so counts by year reflect the search as " +
      "well as the field. Page numbers refer to the file versions that were read; 30 main texts are preprints, and 13 " +
      "of them belong to papers with a journal version whose pages differ. Paper text and abstracts, process " +
      "conditions, the coders' general notes on each paper and the second coding are not included.",
  },
];

/** Whole number tokens of a text: maximal runs of digits with "." or "," between digits. */
export const numbersIn = (text: string): string[] => text.match(/\d+(?:[.,]\d+)*/g) ?? [];

/** Numbers of `text` that are neither in `allowed` nor a whole number token of `source` (REQ-007). */
export function unsourcedNumbers(text: string, source: string, allowed: readonly string[] = []): string[] {
  const known = new Set([...numbersIn(source), ...allowed]);
  return numbersIn(text).filter((n) => !known.has(n));
}
