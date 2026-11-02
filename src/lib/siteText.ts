// Text of the home and about pages (SPEC-SITE-001 REQ-003, REQ-005, REQ-006). Every number here is either filled in
// from index.json or appears as a whole number in the pinned release's DATA_CARD.md; tests/siteText.test.ts checks
// this (REQ-007), so a later release with different figures fails the test instead of leaving a stale number. Pure.

export function homeIntro(version: string, platforms: number, papers: number): string {
  return (
    "sdl-workflows records which modules published closed-loop self-driving laboratories (SDLs) use, in what order one " +
    "experimental cycle runs its steps on them, and how material moves between the modules. " +
    `Release ${version} codes ${platforms} platforms described in ${papers} papers that one literature search found. ` +
    "It also holds the times, batch sizes, throughput and cost that the papers state, and what each paper states " +
    "about human intervention during its campaign."
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

/** Author of the dataset and the site, linked from the footer and the about page. */
export const AUTHOR = { name: "Chan Young Joe", url: "https://ccy5123.github.io/" } as const;
export const ABOUT_AUTHOR_LEAD = "The dataset and this site are by";

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
      "manual steps allowed; something was made or processed in the loop; and the hardware is described. 237 papers " +
      "were eligible. Of the 3298 screening decisions, 3239 were made by a language model working from the written " +
      "criteria and 59 by the researcher.",
  },
  {
    heading: "How the papers were coded",
    text:
      "Each paper was coded once by a language model (Claude Opus 5.5) from its main text and supplements, following " +
      "written coding instructions and a taxonomy that were settled on 10 development papers and not changed " +
      "afterwards. For " +
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
      "coding item by item; items without a counterpart of the same class are marked uncertain (340 of 2610 steps " +
      "and 155 of 1681 connections). For 30 papers, a different model, Claude Fable 5.1, coded the papers under the " +
      "same instructions as a reference. Against it, the released coding reached a field-wise strict micro-F1 (an " +
      "item counts when it pairs with a reference item and has the same class) of 0.905 for the unit operation of steps, 0.898 for module type and 0.891 for transfer mode; the lower bounds of " +
      "the 95% intervals were 0.862, 0.858 and 0.847. These figures are agreement between two language models, not " +
      "accuracy against human coding; the release contains no human coding.",
  },
  {
    heading: "Timing data",
    text:
      "The release holds the process numbers the papers state: 454 step durations and 185 numbers of samples one " +
      "device handles in one run of a step; for platforms, 233 batch sizes, 135 throughputs (91 measured in a " +
      "campaign, 44 nominal), 13 costs and other quantities; and values for some modules and connections. 228 of the " +
      "237 papers have at least one value. Claude Opus 5.5 extracted the values under written instructions, once per " +
      "paper, from the paper's text and its released coding. The instructions allowed only numbers the paper states, " +
      "with three calculations: the midpoint of a stated range, a measured throughput as a stated number of " +
      "experiments divided by a stated elapsed time of the same campaign, and an expression the paper prints for that " +
      "one quantity; the model was not allowed to estimate a value or derive a time from flow rates, volumes or " +
      "counts. Values are in the paper's unit. A time the paper gives for several consecutive steps sits on the first " +
      "of them (57 rows). For the same 30 papers as above, Claude Fable 5.1 extracted the timing data under the same " +
      "instructions as a reference. Counting an item as agreeing when both gave a value and the two differed by at " +
      "most 10%, the share of agreeing items was 1.000 for throughput (15 platforms) and 0.870 for step duration (54 " +
      "steps; 95% interval 0.755 to 0.957). This is agreement between two models, not accuracy; the reference values " +
      "are not released.",
  },
  {
    heading: "Human-intervention reporting",
    text:
      "For every paper, the release records what it states about human intervention during its closed-loop " +
      "campaign, read by Claude Opus 5.5 under written instructions, once per paper. 25 papers state a number for it " +
      "(a count of interventions, person-time, or the frequency of a human task), 73 name tasks people performed " +
      "without a number, 51 state that the campaign ran without human intervention, and 88 state none of these. " +
      "One-time set-up before the first iteration does not count as intervention, and a capability statement or the " +
      'word "autonomous" alone does not count as a statement that the campaign ran without it. 48 papers state a ' +
      "stretch of the campaign that ran without a person. No second reading exists to compare with.",
  },
  {
    heading: "Limits",
    text:
      "The search ran once, on one date, in two indexes. The 237 papers are the eligible candidates that this search " +
      "found, not every closed-loop self-driving laboratory paper published, so counts by year reflect the search as " +
      "well as the field. Page numbers refer to the file versions that were read; 29 main texts are preprints, and 19 " +
      "of them belong to papers with a journal version whose pages differ. Paper text and abstracts, process " +
      "conditions other than the stated times, batch sizes, throughput and cost, the coders' general notes on each " +
      "paper, the extracting model's notes and free-text qualifiers, the second coding and the reference values of " +
      "the timing data are not included.",
  },
];

/**
 * About section on the workflow builder (SPEC-SIM-001 REQ-021): what each of its three outputs shows and does not
 * show. Its figures ("10", "4") are checked against simulation.json by tests/siteText.test.ts.
 */
export const WORKFLOW_ABOUT = {
  heading: "Workflow builder",
  paragraphs: [
    "The workflow builder lets you lay out the steps of an experiment, the modules that perform them and how " +
      "material moves between modules, and gives three outputs from that one layout.",
    "Similar platforms lists the coded platforms whose step order, module types and transfer modes are closest to " +
      "yours. It compares the coded structure only and says nothing about how well any platform worked.",
    "Cycle time and throughput adds up the step durations that papers state for each type of step, as the lowest, " +
      "median and highest recorded value, with the number of values and their sources. Most step types have fewer " +
      "than 10 recorded durations, measured on different chemistries, scales and devices; a step with no recorded " +
      "duration uses the time you enter. The per-day figure assumes the parallel units never wait for a shared module.",
    "The simulation runs your layout on a timeline with shared devices, queues and transfers. Transfer times, " +
      "transfer agents, the queue rule, how durations are drawn and the random seed are your inputs, not data; the " +
      "release holds 4 recorded transfer times. The results show what follows from those inputs, not how a real " +
      "platform performs.",
  ],
} as const;

/** Whole number tokens of a text: maximal runs of digits with "." or "," between digits. */
export const numbersIn = (text: string): string[] => text.match(/\d+(?:[.,]\d+)*/g) ?? [];

/** Numbers of `text` that are neither in `allowed` nor a whole number token of `source` (REQ-007). */
export function unsourcedNumbers(text: string, source: string, allowed: readonly string[] = []): string[] {
  const known = new Set([...numbersIn(source), ...allowed]);
  return numbersIn(text).filter((n) => !known.has(n));
}
