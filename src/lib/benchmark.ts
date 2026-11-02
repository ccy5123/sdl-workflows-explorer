// Benchmark view rules (SPEC-BENCH-001 REQ-006, REQ-008 to REQ-014, REQ-016): the explorer query, the item filter, the
// count links of the benchmark page, the explorer cells and the site texts. Pure: no UI code. Recorded values (rules,
// inputs, metric, model descriptions, the split rule) come from benchmark.json, never from this module.
import {
  SPLITS,
  type BenchmarkItems,
  type BenchmarkJson,
  type BenchmarkSummary,
  type BenchmarkTarget,
  type BenchmarkTask,
  type ReferenceResult,
  type Split,
} from "../data/types";
import { platformHash, taxonomyHash } from "./route";

// ---- Explorer query (REQ-006) ----

export interface ExplorerState {
  task: string;
  /** null: all splits. */
  split: Split | null;
  /** null: all labels. */
  label: string | null;
  /** null: no platform. */
  platform: string | null;
}

function decode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

const isSplit = (s: string): s is Split => (SPLITS as readonly string[]).includes(s);

/** Explorer state of a query; unknown keys, invalid or undecodable values fall back to the defaults; last occurrence wins. */
export function decodeExplorerQuery(query: string, b: BenchmarkJson): ExplorerState {
  const raw = new Map<string, string>();
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq > 0) raw.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const value = (key: string) => {
    const v = raw.get(key);
    return v === undefined ? null : decode(v);
  };
  const taskValue = value("task");
  const task = b.tasks.some((t) => t.task_id === taskValue) ? taskValue! : b.tasks[0]!.task_id;
  const splitValue = value("split");
  const labelValue = value("label");
  const platformValue = value("platform");
  const labels = b.summaries.find((s) => s.task_id === task)?.labels ?? [];
  return {
    task,
    split: splitValue !== null && isSplit(splitValue) ? splitValue : null,
    label: labels.some((l) => l.label === labelValue) ? labelValue : null,
    platform: b.platforms.some((p) => p.platform_id === platformValue) ? platformValue : null,
  };
}

/** Canonical query: task, then split, label and platform when set, each value percent-encoded. */
export function encodeExplorerQuery(state: ExplorerState): string {
  const parts = [`task=${encodeURIComponent(state.task)}`];
  if (state.split !== null) parts.push(`split=${encodeURIComponent(state.split)}`);
  if (state.label !== null) parts.push(`label=${encodeURIComponent(state.label)}`);
  if (state.platform !== null) parts.push(`platform=${encodeURIComponent(state.platform)}`);
  return parts.join("&");
}

/** Hash URL of the explorer for a state. */
export const benchmarkItemsHash = (state: ExplorerState): string => `#/benchmark/items?${encodeExplorerQuery(state)}`;

const explorerLink = (task: string, patch: Partial<Omit<ExplorerState, "task">> = {}) =>
  benchmarkItemsHash({ task, split: null, label: null, platform: null, ...patch });

// ---- Filter and count lines (REQ-013) ----

/** Platform of an item: the first two segments of its item_id. */
export const platformOfItem = (itemId: string): string => itemId.split("/").slice(0, 2).join("/");

// @MX:NOTE: [AUTO] REQ-013 — the one filter behind the explorer and every count link of the page; AC-7 checks all links
/** The task's items matching the split, label and platform, in file order. */
export function filterItems(items: BenchmarkItems, state: ExplorerState): (string | number)[][] {
  const splitAt = items.columns.indexOf("split");
  const labelAt = items.columns.indexOf("label");
  return items.rows.filter(
    (r) =>
      (state.split === null || r[splitAt] === state.split) &&
      (state.label === null || r[labelAt] === state.label) &&
      (state.platform === null || platformOfItem(String(r[0])) === state.platform),
  );
}

export const countLine = (n: number, total: number): string => `${n} of ${total} items`;

export const platformsCountLine = (n: number, total: number, split: Split | null): string =>
  split === null ? `${total} platforms` : `${n} of ${total} platforms`;

// ---- Count cells of the benchmark page (REQ-008, REQ-009, REQ-012) ----

/** A count and the explorer link it opens; href null for a count shown as plain text. */
export interface CountCell {
  n: number;
  href: string | null;
}

const linkIfNonZero = (n: number, href: string): CountCell => ({ n, href: n === 0 ? null : href });

/** Split table: papers and per-task items of each split, every count linked; the total row links each task. */
export function splitTable(b: BenchmarkJson): {
  rows: { split: Split; papers: number; cells: CountCell[] }[];
  total: { papers: number; cells: CountCell[] };
} {
  return {
    rows: SPLITS.map((split) => ({
      split,
      papers: b.split_counts[split],
      cells: b.summaries.map((s) => ({ n: s.items[split], href: explorerLink(s.task_id, { split }) })),
    })),
    total: {
      papers: SPLITS.reduce((n, split) => n + b.split_counts[split], 0),
      cells: b.summaries.map((s) => ({ n: SPLITS.reduce((n, split) => n + s.items[split], 0), href: explorerLink(s.task_id) })),
    },
  };
}

/** Label table of a task: the label's class page and its train, test and excluded counts, zeros unlinked. */
export function labelRows(b: BenchmarkJson, taskIndex: number): { label: string; href: string; cells: CountCell[] }[] {
  const task = b.tasks[taskIndex]!;
  const summary = b.summaries[taskIndex]!;
  return summary.labels.map((l) => ({
    label: l.label,
    href: taxonomyHash(task.target, l.label),
    cells: SPLITS.map((split) => linkIfNonZero(l[split], explorerLink(task.task_id, { split, label: l.label }))),
  }));
}

/** Platform table rows of a split (null: all), each task's non-zero count linked to the explorer with that platform. */
export function platformRows(
  b: BenchmarkJson,
  split: Split | null,
): { platform_id: string; href: string; split: Split; cells: CountCell[] }[] {
  return b.platforms
    .filter((p) => split === null || p.split === split)
    .map((p) => ({
      platform_id: p.platform_id,
      href: platformHash(p.platform_id),
      split: p.split,
      cells: b.tasks.map((t, i) => linkIfNonZero(p.n[i] ?? 0, explorerLink(t.task_id, { platform: p.platform_id }))),
    }));
}

/** Every linked count of the benchmark page (split table, label tables, platform table with all splits). */
export function linkedCells(b: BenchmarkJson): CountCell[] {
  const split = splitTable(b);
  return [
    ...split.rows.flatMap((r) => r.cells),
    ...split.total.cells,
    ...b.tasks.flatMap((_, i) => labelRows(b, i).flatMap((r) => r.cells)),
    ...platformRows(b, null).flatMap((r) => r.cells),
  ].filter((c) => c.href !== null);
}

// ---- Explorer columns and cells (REQ-014) ----

type ColumnLink = "platform" | "label" | "field_tag" | "unit_operation" | null;

export interface ExplorerColumn {
  head: string;
  /** Column of benchmark-items.json the cell reads; the platform is derived from item_id. */
  source: string;
  link: ColumnLink;
}

const COMMON_COLUMNS: ExplorerColumn[] = [
  { head: "Item", source: "item_id", link: null },
  { head: "Platform", source: "item_id", link: "platform" },
  { head: "Split", source: "split", link: null },
  { head: "Label", source: "label", link: "label" },
  { head: "Field tag", source: "field_tag", link: "field_tag" },
];

const TARGET_COLUMNS: Record<BenchmarkTarget, ExplorerColumn[]> = {
  module_type: [
    { head: "Unit operation", source: "unit_operation", link: "unit_operation" },
    { head: "Previous", source: "prev_unit_operation", link: "unit_operation" },
    { head: "Next", source: "next_unit_operation", link: "unit_operation" },
  ],
  transfer_mode: [
    { head: "From", source: "from_unit_operation", link: "unit_operation" },
    { head: "To", source: "to_unit_operation", link: "unit_operation" },
    { head: "From family", source: "from_family", link: null },
    { head: "To family", source: "to_family", link: null },
  ],
};

export const explorerColumns = (target: BenchmarkTarget): ExplorerColumn[] => [
  ...COMMON_COLUMNS,
  ...TARGET_COLUMNS[target],
  { head: "Uncertain", source: "uncertain", link: null },
];

const DASH = "—";
const ENDS = new Set(["START", "END"]);

/** Text and link of each explorer cell of an item row: "yes" for uncertain 1, empty for 0, "—" for an empty field tag. */
export function explorerCells(
  target: BenchmarkTarget,
  columns: readonly string[],
  row: readonly (string | number)[],
): { text: string; href: string | null }[] {
  return explorerColumns(target).map((c) => {
    const value = row[columns.indexOf(c.source)];
    if (c.source === "uncertain") return { text: value === 1 ? "yes" : "", href: null };
    const text = String(value ?? "");
    if (c.link === "platform") {
      const platform = platformOfItem(text);
      return { text: platform, href: platformHash(platform) };
    }
    if (c.link === "field_tag" && text === "") return { text: DASH, href: null };
    if (c.link === "unit_operation" && ENDS.has(text)) return { text, href: null };
    if (c.link === "label") return { text, href: taxonomyHash(target, text) };
    if (c.link === null) return { text, href: null };
    return { text, href: taxonomyHash(c.link, text) };
  });
}

export const PAGE_SIZE = 100;
export const EXPLORER_HEADING = "Benchmark items";
export const BACK_LINK_TEXT = "Back to the benchmark";
export const SHOW_MORE_TEXT = `Show ${PAGE_SIZE} more`;
export const NO_ITEMS_TEXT = "No items match.";

// ---- Texts of the benchmark page (REQ-008 to REQ-011, REQ-016) ----

export const SECTION_HEADINGS = {
  reference: "Reference results",
  evaluation: "Run the evaluation yourself",
  platforms: "Items by platform",
} as const;

export const SPLIT_LABELS: Readonly<Record<Split, string>> = { train: "Train", test: "Test", excluded: "Excluded" };

const TASK_WORDS: Record<BenchmarkTarget, { title: string; unit: string }> = {
  module_type: { title: "Primary module type of a step", unit: "step" },
  transfer_mode: { title: "Transfer mode of a material connection", unit: "material connection" },
};

export const taskTitle = (target: BenchmarkTarget): string => TASK_WORDS[target].title;
export const itemUnit = (target: BenchmarkTarget): string => TASK_WORDS[target].unit;

/** Caption under the page heading (REQ-016). */
export function benchmarkCaption(b: BenchmarkJson): string {
  const papers = SPLITS.reduce((n, split) => n + b.split_counts[split], 0);
  return (
    `Benchmark ${b.benchmark_id} has ${b.tasks.length} tasks over ${papers} papers. ` +
    `The data dictionary describes the split as: “${b.split_rule}” ` +
    "The labels are the release's model codings, so top-1 accuracy measures agreement with those codings."
  );
}

export const exclusionLine = (e: { reason: string; n: number }): string => `Excluded: ${e.n} papers, ${e.reason}.`;

export const uncertainSentence = (s: BenchmarkSummary): string =>
  `${s.labels.length} labels occur among the items of this task. Items marked uncertain in the release: ` +
  `${s.uncertain.train} train, ${s.uncertain.test} test, ${s.uncertain.excluded} excluded.`;

export const METRIC_DEFINITION =
  "Top-1 accuracy is the fraction of a task's test items whose single predicted label equals the label recorded in the " +
  "release. The 95% interval is for the difference reference model top-1 minus baseline top-1, from a paper-level " +
  "paired cluster bootstrap over the test papers; Replicates is the number of bootstrap replicates used (replicates " +
  "with no test item are dropped).";

export const metricLine = (t: BenchmarkTask): string => `Metric as recorded for ${t.task_id}: ${t.metric}`;
export const baselineLine = (t: BenchmarkTask): string => `Baseline: ${t.baseline_rule}`;
export const referenceModelLine = (t: BenchmarkTask): string => `Reference model: ${t.reference_model}`;

export const REFERENCE_HEADS = [
  "Task",
  "Test items (papers)",
  "Baseline top-1",
  "Reference model top-1",
  "Difference (computed)",
  "95% interval of the difference",
  "Replicates",
] as const;

export const DIFFERENCE_NOTE =
  "Difference (computed) is reference model top-1 minus baseline top-1, computed by this site from the two recorded " +
  "values; reference_results.json does not record it.";
export const TEST_PAPERS_NOTE = "Test papers are the test papers with at least one item of the task.";
export const PUBLISHED_JSON_SUMMARY = "reference_results.json as published";

const fixed = (x: number) => x.toFixed(4);
/** Four decimals with a sign; a negative value keeps its "-" even when it rounds to zero. */
const signed = (x: number) => (x < 0 || Object.is(x, -0) ? fixed(x) : `+${fixed(x)}`);

/** One row of the reference-results table (REQ-010). */
export function referenceRow(r: ReferenceResult): {
  task: string;
  testItems: string;
  baseline: string;
  reference: string;
  difference: string;
  interval: string;
  replicates: string;
} {
  return {
    task: r.task_id,
    testItems: `${r.n_test_items} (${r.n_test_papers})`,
    baseline: fixed(r.baseline_top1),
    reference: fixed(r.reference_model_top1),
    difference: signed(r.reference_model_top1 - r.baseline_top1),
    interval: `[${signed(r.diff_ci95_low)}, ${signed(r.diff_ci95_high)}]`,
    replicates: String(r.replicates),
  };
}

// ---- Run the evaluation yourself (REQ-011) ----

const EVALUATE = "python modes/benchmark/evaluate.py modes/benchmark";

export interface EvaluationNote {
  release: string;
  /** Text before the link to the release DOI. */
  doiLead: string;
  where: string;
  checkLead: string;
  checkCommand: string;
  predictionsLead: string;
  predictionCommands: string[];
  format: string;
}

export function evaluationNote(b: BenchmarkJson): EvaluationNote {
  const rows = b.summaries.map((s) => `${s.items.test} rows for ${s.task_id}`);
  const joined = rows.length <= 1 ? rows.join("") : `${rows.slice(0, -1).join(", ")} and ${rows[rows.length - 1]}`;
  return {
    release: "The script modes/benchmark/evaluate.py is part of the release and needs only the Python 3 standard library; it is not reproduced here.",
    doiLead: "Release:",
    where: "Run the commands from the unpacked release folder (the folder that holds modes/).",
    checkLead: "To fit the baseline and the reference model and check them against the recorded values:",
    checkCommand: EVALUATE,
    predictionsLead: "To score your own predictions for one task against the baseline with the same bootstrap:",
    predictionCommands: b.tasks.map((t) => `${EVALUATE} --task ${t.task_id} --predictions my_predictions.csv`),
    format:
      `my_predictions.csv is a CSV file with the header row item_id,prediction and one row per test item of the task: ${joined}.`,
  };
}

export const loadErrorText = (reason: string): string => `Could not load the benchmark data: ${reason}`;
