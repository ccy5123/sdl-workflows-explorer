// Text of the home and about pages (SPEC-SITE-001 REQ-003, REQ-005, REQ-006; SPEC-UI-001 REQ-010). Every figure of the
// pinned release is filled in from the built data (index.json: counts, and the data-card figures build-data counts
// from the release tables into `about`); the fixed figures (the reference sample of 30 papers, its agreement scores)
// appear as whole numbers in the release's DATA_CARD.md. tests/siteText.test.ts checks every number and its words
// against DATA_CARD.md (SPEC-SITE-001 REQ-007, SPEC-UI-001 REQ-011), so a release whose card says something else fails
// the test instead of showing a stale number. Pure.
import type { AboutFacts, Counts } from "../data/types";

const fmt = (n: number) => n.toLocaleString("en");

export const heroTitle = (platforms: number): string =>
  `The hardware workflows of ${fmt(platforms)} self-driving lab platforms`;

export const heroLead = (papers: number): string =>
  "Modules, cycle steps and material transfers of closed-loop self-driving laboratories (SDLs), coded from " +
  `${fmt(papers)} papers. Every item links to the page in the paper it was read from.`;

export const searchPlaceholder = (platforms: number): string => `Search ${fmt(platforms)} platforms by name, instrument or step`;
/** Accessible names of the Home search and of the Home platform-list filter. */
export const SEARCH_LABEL = "Search platforms by name, instrument or step";
export const FILTER_LABEL = "Filter platforms by name, instrument or step";

/** Caption under the stat tiles. */
export const STATS_CAPTION = "Papers that passed the screening in the data card, not the whole field.";

/**
 * Caption of the papers-per-year preview; the date is the search date of the data card, and the alerts are named when
 * the release holds candidates from them.
 */
export const yearsCaption = (lastYear: number, alertCandidates: number): string =>
  alertCandidates > 0
    ? `Papers per year; ${lastYear} covers the search to 20 October and the Google Scholar alerts after it.`
    : `Papers per year; ${lastYear} covers the search to 20 October.`;

export const fieldsCaption = (shown: number, inUse: number): string =>
  `Papers per field tag, top ${shown} of ${inUse}; a paper can carry several.`;

/** Paragraphs of the "About the sample" card. */
export const sampleText = (candidates: number, papers: number): string[] => [
  `${fmt(candidates)} candidate papers were screened; the ${fmt(papers)} that passed the screening described in the ` +
    "data card were coded. The counts describe those papers, not every self-driving lab.",
  "The release also holds the times, batch sizes, throughput and cost that the papers state, and what each paper " +
    "states about human intervention during its campaign.",
];

export type ViewKey = "platform" | "browse" | "trends" | "taxonomy" | "benchmark" | "workflow";

export interface ViewEntry {
  key: ViewKey;
  name: string;
  description: string;
}

/** The six view cards of Home; each card links to its view (the platform viewer opens the featured platform). */
export const VIEWS: readonly ViewEntry[] = [
  {
    key: "platform",
    name: "Platform viewer",
    description: "One platform's modules and connections as a graph, the steps of one cycle, and the page each item comes from.",
  },
  {
    key: "browse",
    name: "Browse and compare",
    description: "Papers and platforms in filterable tables; pick two or three platforms to compare side by side.",
  },
  {
    key: "trends",
    name: "Trends",
    description:
      "Papers or platforms by first public year, split by integration mode, field tag, autonomy, module type or " +
      "transfer mode.",
  },
  {
    key: "taxonomy",
    name: "Taxonomy",
    description:
      "The classes used in the coding, with definitions, families, usage counts and correspondence to other " +
      "vocabularies.",
  },
  {
    key: "benchmark",
    name: "Benchmark",
    description: "The chrono2023 tasks, their train/test split and the reference results as published.",
  },
  {
    key: "workflow",
    name: "Workflow builder",
    description:
      "Lay out your own steps and modules, then see the coded platforms most like it, a cycle-time range and a " +
      "batch simulation.",
  },
];

/** Author of the dataset and the site, linked from the footer and the about page. */
export const AUTHOR = { name: "Chan Young Joe", url: "https://ccy5123.github.io/" } as const;
export const ABOUT_AUTHOR_LEAD = "The dataset and this site are by";

/** The paper that describes the database, cited on the home page and linked from the footer and the about page. */
export const PREPRINT = {
  doi: "10.26434/chemrxiv.15011572/v1",
  citation:
    "Joe, C. Y. (2026). What Can the Records of Published Self-Driving Laboratories Predict About a New Platform? " +
    "A Step-Level Database and Explorer [Preprint]. ChemRxiv. https://doi.org/10.26434/chemrxiv.15011572/v1",
  linkText: "Preprint (ChemRxiv)",
  aboutLead: "The database and this site are described in",
} as const;

export const aboutIntro = (version: string): string =>
  `This page summarises the data card (DATA_CARD.md) of release ${version}. Its full text is at the end of the page ` +
  "and in the release files on Zenodo.";

export interface AboutSection {
  heading: string;
  text: string;
}

/** Headings of the about summary, in order; the text of each comes from `aboutSections`. */
export const ABOUT_HEADINGS = [
  "How the papers were found",
  "How the papers were coded",
  "How far the labels can be trusted",
  "Timing data",
  "Human-intervention reporting",
  "Limits",
] as const;

/** What the about summary reads from index.json. */
export interface AboutData {
  counts: Counts;
  about: AboutFacts;
}

const ELIGIBILITY =
  "A paper was eligible when it is an original research paper; an algorithm chose the next experiment from " +
  "earlier results, at least once on the physical system; automated hardware ran the experiments, with isolated " +
  "manual steps allowed; something was made or processed in the loop; and the hardware is described. ";

/**
 * The about summary of the pinned release's data card, its figures filled in from index.json. The sentences on the
 * Google Scholar alerts appear only when the release holds candidates from them (none in 1.1.0).
 */
export function aboutSections({ counts: c, about: a }: AboutData): AboutSection[] {
  const alerts = a.alert_candidates > 0;
  const found = alerts
    ? "The candidates of release 1.1.0 came from the reference lists of three reviews and from keyword searches of " +
      `Crossref and arXiv, both run on 20 October 2026. Since release 1.1.0, ${a.alert_candidates} further candidates ` +
      "came from the researcher's daily Google Scholar alerts (21 October 2026 onward) and were screened against the " +
      `same criteria; ${a.alert_papers} of the ${c.papers} papers were added this way. The ${c.candidates} candidates ` +
      `were screened on titles (${a.screened_titles}), abstracts (${a.screened_second_stage}) and full texts ` +
      `(${a.screened_fulltexts}). `
    : `The ${c.candidates} candidates came from the reference lists of three reviews and from keyword searches of ` +
      "Crossref and arXiv, both run on 20 October 2026. They were screened on titles " +
      `(${a.screened_titles}), abstracts (${a.screened_second_stage}) and full texts (${a.screened_fulltexts}). `;
  const search = alerts
    ? "The search ran once, on one date, in two indexes, and has since been extended only by one researcher's Google " +
      `Scholar alerts. The ${c.papers} papers are the eligible candidates found this way, not every closed-loop ` +
      "self-driving laboratory paper published, so counts by year reflect the search as well as the field. "
    : `The search ran once, on one date, in two indexes. The ${c.papers} papers are the eligible candidates that this ` +
      "search found, not every closed-loop self-driving laboratory paper published, so counts by year reflect the " +
      "search as well as the field. ";
  const texts: Record<(typeof ABOUT_HEADINGS)[number], string> = {
    "How the papers were found":
      found +
      ELIGIBILITY +
      `${c.papers} papers were eligible. Of the ${a.screening_decisions} screening decisions, ${a.decisions_model} ` +
      `were made by a language model working from the written criteria and ${a.decisions_researcher} by the researcher.`,
    "How the papers were coded":
      "Each paper was coded once by a language model (Claude Opus 5.5) from its main text and supplements, following " +
      "written coding instructions and a taxonomy that were settled on 10 development papers and not changed " +
      "afterwards. For " +
      "each platform the coding records its modules, the steps of one experimental cycle in order (unit operation, " +
      "whether a robot, a person or software performs it, and the modules involved) and the connections between " +
      "modules (transfer mode, and whether the paper states the transfer or it was inferred from context). Every " +
      "item carries the document, page and figure, table or section that describes it. An item that fits no class " +
      "is coded unmapped.",
    "How far the labels can be trusted":
      "A second coding of every paper by the same model with the same instructions was compared with the released " +
      `coding item by item; items without a counterpart of the same class are marked uncertain (${a.steps_uncertain} ` +
      `of ${c.steps} steps and ${a.connections_uncertain} of ${c.connections} connections). For 30 papers, a ` +
      "different model, Claude Fable 5.1, coded the papers under the " +
      "same instructions as a reference. Against it, the released coding reached a field-wise strict micro-F1 (an " +
      "item counts when it pairs with a reference item and has the same class) of 0.905 for the unit operation of steps, 0.898 for module type and 0.891 for transfer mode; the lower bounds of " +
      "the 95% intervals were 0.862, 0.858 and 0.847. These figures are agreement between two language models, not " +
      "accuracy against human coding; the release contains no human coding.",
    "Timing data":
      `The release holds the process numbers the papers state: ${a.step_durations} step durations and ` +
      `${a.samples_per_run} numbers of samples one device handles in one run of a step; for platforms, ` +
      `${a.batch_sizes} batch sizes, ${a.throughputs} throughputs (${a.throughputs_measured} measured in a ` +
      `campaign, ${a.throughputs_nominal} nominal), ${a.costs} costs and other quantities; and values for some ` +
      `modules and connections. ${a.papers_with_timing} of the ${c.papers} papers have at least one value. Claude ` +
      "Opus 5.5 extracted the values under written instructions, once per " +
      "paper, from the paper's text and its released coding. The instructions allowed only numbers the paper states, " +
      "with three calculations: the midpoint of a stated range, a measured throughput as a stated number of " +
      "experiments divided by a stated elapsed time of the same campaign, and an expression the paper prints for that " +
      "one quantity; the model was not allowed to estimate a value or derive a time from flow rates, volumes or " +
      "counts. Values are in the paper's unit. A time the paper gives for several consecutive steps sits on the first " +
      `of them (${a.joint_durations} rows). For the same 30 papers as above, Claude Fable 5.1 extracted the timing ` +
      "data under the same " +
      "instructions as a reference. Counting an item as agreeing when both gave a value and the two differed by at " +
      "most 10%, the share of agreeing items was 1.000 for throughput (15 platforms) and 0.870 for step duration (54 " +
      "steps; 95% interval 0.755 to 0.957). This is agreement between two models, not accuracy; the reference values " +
      "are not released.",
    "Human-intervention reporting":
      "For every paper, the release records what it states about human intervention during its closed-loop " +
      `campaign, read by Claude Opus 5.5 under written instructions, once per paper. ${a.human_quantified} papers ` +
      "state a number for it (a count of interventions, person-time, or the frequency of a human task), " +
      `${a.human_described} name tasks people performed without a number, ${a.human_none_stated} state that the ` +
      `campaign ran without human intervention, and ${a.human_not_reported} state none of these. ` +
      "One-time set-up before the first iteration does not count as intervention, and a capability statement or the " +
      `word "autonomous" alone does not count as a statement that the campaign ran without it. ${a.human_run_length} ` +
      "papers state a stretch of the campaign that ran without a person. No second reading exists to compare with.",
    Limits:
      search +
      "Page numbers refer to the file versions that were read; " +
      `${a.preprint_main_texts} main texts are preprints, and ${a.preprints_other_pages} ` +
      "of them belong to papers with a journal version whose pages differ. Paper text and abstracts, process " +
      "conditions other than the stated times, batch sizes, throughput and cost, the coders' general notes on each " +
      "paper, the extracting model's notes and free-text qualifiers, the second coding and the reference values of " +
      "the timing data are not included.",
  };
  return ABOUT_HEADINGS.map((heading) => ({ heading, text: texts[heading] }));
}

/**
 * About section on the workflow builder (SPEC-SIM-001 REQ-021): what each of its three outputs shows and does not
 * show. Its figures ("10", and the number of transfer times from index.json) are checked against simulation.json by
 * tests/siteText.test.ts.
 */
export const WORKFLOW_ABOUT = {
  heading: "Workflow builder",
  paragraphs: (transferTimes: number): string[] => [
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
      `release holds ${transferTimes} recorded transfer times. The results show what follows from those inputs, not ` +
      "how a real platform performs.",
  ],
} as const;

/**
 * About section on asking the data with one's own language model (LLM-access plan, 2026-11-12): the site runs no model;
 * the local MCP server and llms.txt let a visitor's own app read the records. The package name matches mcp/package.json
 * (tests/siteText.test.ts).
 */
export const LLM_ABOUT = {
  heading: "Asking with your own language model",
  lead:
    "This site runs no language model. To ask about the data in plain language, use the model you already have: an " +
    "app that starts local MCP servers can run the server below, and a model that reads web pages can read llms.txt.",
  mcpPackage: "sdl-workflows-mcp",
  mcp:
    "The local MCP server downloads this release from Zenodo, checks its checksums and answers with the same search, " +
    "workflow and trends code as this site. It sends nothing anywhere else. Each answer carries the record ids, paper " +
    "keys, DOIs and the page each item was read from. Its command is",
  pageLink: "How to set up Claude, ChatGPT and other apps",
  webBefore: "For a model that reads web pages,",
  webAfter: "lists the data files and a plain-text page for each paper.",
  caution:
    "The records were coded from the papers by a language model and the release contains no human coding, so check a " +
    "claim against the page it cites before relying on it.",
} as const;

/** Whole number tokens of a text: maximal runs of digits with "." or "," between digits. */
export const numbersIn = (text: string): string[] => text.match(/\d+(?:[.,]\d+)*/g) ?? [];

/** Numbers of `text` that are neither in `allowed` nor a whole number token of `source` (REQ-007). */
export function unsourcedNumbers(text: string, source: string, allowed: readonly string[] = []): string[] {
  const known = new Set([...numbersIn(source), ...allowed]);
  return numbersIn(text).filter((n) => !known.has(n));
}
