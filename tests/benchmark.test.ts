// SPEC-BENCH-001 AC-6 to AC-8: the explorer query, the count links and filter, and the texts of src/lib/benchmark.ts
// (REQ-006, REQ-008 to REQ-014, REQ-016). Real-data cases read public/data/ after `npm run build-data` and skip with a
// message when it is absent.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PINNED_DOI, pinnedExclusionReason } from "./pinned-release";
import type { BenchmarkItemsJson, BenchmarkJson, BenchmarkSummary, BenchmarkTask, IndexJson } from "../src/data/types";
import {
  BACK_LINK_TEXT,
  DIFFERENCE_NOTE,
  EXPLORER_HEADING,
  METRIC_DEFINITION,
  MODEL_HEADS,
  NO_ITEMS_TEXT,
  PUBLISHED_JSON_SUMMARY,
  REFERENCE_HEADS,
  SECTION_HEADINGS,
  SHOW_MORE_TEXT,
  SPLIT_LABELS,
  TEST_PAPERS_NOTE,
  benchmarkItemsHash,
  benchmarkCaption,
  countLine,
  decodeExplorerQuery,
  displayReferenceModel,
  encodeExplorerQuery,
  evaluationNote,
  exclusionLine,
  explorerCells,
  explorerColumns,
  filterItems,
  itemUnit,
  labelRows,
  linkedCells,
  loadErrorText,
  metricLines,
  modelRows,
  platformRows,
  platformsCountLine,
  referenceRow,
  splitTable,
  taskTitle,
  uncertainSentence,
  type ExplorerState,
} from "../src/lib/benchmark";
import { BANNED_SUBSTRINGS } from "../src/lib/trends";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const available = existsSync(join(DATA_DIR, "benchmark.json")) && existsSync(join(DATA_DIR, "benchmark-items.json"));
if (!available) console.warn("benchmark.test.ts: real-data tests skipped: public/data/ is absent (run `npm run build-data`)");
const readJson = <T>(name: string): T => JSON.parse(readFileSync(join(DATA_DIR, name), "utf8")) as T;

const MT = "chrono2023-module_type";
const TM = "chrono2023-transfer_mode";
const PREFIX = "#/benchmark/items?";
const queryOf = (href: string) => {
  expect(href.startsWith(PREFIX)).toBe(true);
  return href.slice(PREFIX.length);
};

/** REQ-016 word list on top of BANNED_SUBSTRINGS. */
const RANKING_WORDS = [
  "best", "better", "worse", "outperform", "beat", "superior", "inferior", "rank", "winner", "state-of-the-art",
  "significant", "improve", "leaderboard",
];
const bannedIn = (text: string) =>
  [...BANNED_SUBSTRINGS, ...RANKING_WORDS].filter((w) => text.toLowerCase().includes(w)).map((w) => `${w}: ${text}`);

// ---- Synthetic data: shapes only, no release values ----

const task = (task_id: string, target: "module_type" | "transfer_mode"): BenchmarkTask => ({
  task_id,
  benchmark_id: "b",
  target,
  item_rule: "rule",
  inputs: "inputs",
  metric: "metric text",
  baseline_rule: "baseline text",
  baseline_top1: 0.5,
  reference_model: "model text",
  reference_model_top1: 0.6,
  diff_ci95_low: -0.01,
  diff_ci95_high: 0.2,
  n_test_items: 2,
  n_test_papers: 1,
  recorded_in: "x",
});

const summary = (task_id: string, labels: string[]): BenchmarkSummary => ({
  task_id,
  items: { train: 2, test: 2, excluded: 0 },
  uncertain: { train: 1, test: 0, excluded: 0 },
  labels: labels.map((label) => ({ label, train: 1, test: 1, excluded: 0 })),
});

const MINI: BenchmarkJson = {
  benchmark_id: "b",
  split_rule: "Rule.",
  split_counts: { train: 1, test: 1, excluded: 0 },
  exclusion_reasons: [],
  tasks: [task("b-mt", "module_type"), task("b-tm", "transfer_mode")],
  summaries: [summary("b-mt", ["fluidics", "software"]), summary("b-tm", ["fixed_tubing"])],
  platforms: [
    { platform_id: "A2024/P1", split: "train", n: [2, 1] },
    { platform_id: "B2025/P1", split: "test", n: [2, 0] },
  ],
  reference_results: {},
  reference_results_text: "{}",
};

describe("explorer query (AC-6, REQ-006)", () => {
  const state = (patch: Partial<ExplorerState>): ExplorerState => ({ task: "b-mt", split: null, label: null, platform: null, ...patch });

  it("defaults to the first task, all splits, all labels and no platform", () => {
    expect(decodeExplorerQuery("", MINI)).toEqual(state({}));
    expect(benchmarkItemsHash(state({}))).toBe("#/benchmark/items?task=b-mt");
  });

  it("drops unknown keys and invalid or undecodable values, the last occurrence counting", () => {
    expect(decodeExplorerQuery("task=nope&split=dev&label=pump&platform=X%2FP9&colour=red", MINI)).toEqual(state({}));
    expect(decodeExplorerQuery("label=%E0", MINI)).toEqual(state({}));
    expect(decodeExplorerQuery("label=fixed_tubing", MINI)).toEqual(state({}));
    expect(decodeExplorerQuery("task=b-tm&label=fixed_tubing", MINI)).toEqual(state({ task: "b-tm", label: "fixed_tubing" }));
    expect(decodeExplorerQuery("split=train&split=test", MINI)).toEqual(state({ split: "test" }));
    expect(decodeExplorerQuery("split=test&split=dev", MINI)).toEqual(state({}));
    expect(decodeExplorerQuery("platform=A2024%2FP1", MINI)).toEqual(state({ platform: "A2024/P1" }));
    expect(decodeExplorerQuery("platform=A2024/P1", MINI)).toEqual(state({ platform: "A2024/P1" }));
  });

  it("encodes task always, then split, label and platform when set, percent-encoded", () => {
    expect(encodeExplorerQuery(state({ platform: "A2024/P1", label: "software", split: "test" }))).toBe(
      "task=b-mt&split=test&label=software&platform=A2024%2FP1",
    );
  });
});

describe("filter, links and count lines (AC-7, REQ-008, REQ-009, REQ-012, REQ-013)", () => {
  const items: BenchmarkItemsJson = {
    "b-mt": {
      columns: ["item_id", "split", "label", "field_tag", "unit_operation", "prev_unit_operation", "next_unit_operation", "uncertain"],
      rows: [
        ["A2024/P1/S1", "train", "fluidics", "chem", "mix", "START", "END", 0],
        ["A2024/P1/S2", "train", "software", "chem", "mix", "START", "END", 1],
        ["B2025/P1/S1", "test", "fluidics", "", "mix", "START", "END", 0],
        ["B2025/P1/S2", "test", "software", "", "mix", "START", "END", 0],
      ],
    },
  };

  it("filters on split, label and platform in file order", () => {
    const s = (patch: Partial<ExplorerState>) => filterItems(items["b-mt"]!, { task: "b-mt", split: null, label: null, platform: null, ...patch });
    expect(s({}).map((r) => r[0])).toEqual(["A2024/P1/S1", "A2024/P1/S2", "B2025/P1/S1", "B2025/P1/S2"]);
    expect(s({ split: "test" }).map((r) => r[0])).toEqual(["B2025/P1/S1", "B2025/P1/S2"]);
    expect(s({ label: "fluidics", platform: "B2025/P1" }).map((r) => r[0])).toEqual(["B2025/P1/S1"]);
  });

  it("links non-zero label and platform counts, every split-table count, and leaves zeros plain", () => {
    const table = splitTable(MINI);
    expect(table.rows.map((r) => [r.split, r.papers, r.cells.map((c) => c.n)])).toEqual([
      ["train", 1, [2, 2]],
      ["test", 1, [2, 2]],
      ["excluded", 0, [0, 0]],
    ]);
    expect(table.rows[2]!.cells[0]!.href).toBe("#/benchmark/items?task=b-mt&split=excluded");
    expect(table.total).toEqual({
      papers: 2,
      cells: [
        { n: 4, href: "#/benchmark/items?task=b-mt" },
        { n: 4, href: "#/benchmark/items?task=b-tm" },
      ],
    });
    const labels = labelRows(MINI, 0);
    expect(labels[0]!.href).toBe("#/taxonomy/module_type/fluidics");
    expect(labels[0]!.cells).toEqual([
      { n: 1, href: "#/benchmark/items?task=b-mt&split=train&label=fluidics" },
      { n: 1, href: "#/benchmark/items?task=b-mt&split=test&label=fluidics" },
      { n: 0, href: null },
    ]);
    const platforms = platformRows(MINI, null);
    expect(platforms.map((p) => p.href)).toEqual(["#/platform/A2024/P1", "#/platform/B2025/P1"]);
    expect(platforms[1]!.cells).toEqual([{ n: 2, href: "#/benchmark/items?task=b-mt&platform=B2025%2FP1" }, { n: 0, href: null }]);
    expect(platformRows(MINI, "test").map((p) => p.platform_id)).toEqual(["B2025/P1"]);
    expect(linkedCells(MINI).every((c) => c.href !== null)).toBe(true);
  });

  it("counts lines as N of T items and platforms", () => {
    expect(countLine(29, 983)).toBe("29 of 983 items");
    expect(platformsCountLine(280, 280, null)).toBe("280 platforms");
    expect(platformsCountLine(116, 280, "test")).toBe("116 of 280 platforms");
  });
});

describe("explorer columns and cells (AC-8, REQ-014)", () => {
  it("gives the module_type and transfer_mode heads", () => {
    expect(explorerColumns("module_type").map((c) => c.head)).toEqual([
      "Item", "Platform", "Split", "Label", "Field tag", "Unit operation", "Previous", "Next", "Uncertain",
    ]);
    expect(explorerColumns("transfer_mode").map((c) => c.head)).toEqual([
      "Item", "Platform", "Split", "Label", "Field tag", "From", "To", "From family", "To family", "Uncertain",
    ]);
  });

  it("links platform, label, field tag and unit operations; START, END and families plain; yes, empty and —", () => {
    const mtCols = ["item_id", "split", "label", "field_tag", "unit_operation", "prev_unit_operation", "next_unit_operation", "uncertain"];
    expect(explorerCells("module_type", mtCols, ["A2024/P1/S1", "test", "fluidics", "chem", "mix", "START", "react", 1])).toEqual([
      { text: "A2024/P1/S1", href: null },
      { text: "A2024/P1", href: "#/platform/A2024/P1" },
      { text: "test", href: null },
      { text: "fluidics", href: "#/taxonomy/module_type/fluidics" },
      { text: "chem", href: "#/taxonomy/field_tag/chem" },
      { text: "mix", href: "#/taxonomy/unit_operation/mix" },
      { text: "START", href: null },
      { text: "react", href: "#/taxonomy/unit_operation/react" },
      { text: "yes", href: null },
    ]);
    const end = explorerCells("module_type", mtCols, ["A2024/P1/S1", "test", "fluidics", "", "mix", "mix", "END", 0]);
    expect([end[4], end[7], end[8]]).toEqual([{ text: "—", href: null }, { text: "END", href: null }, { text: "", href: null }]);
    const tmCols = ["item_id", "split", "label", "field_tag", "from_unit_operation", "to_unit_operation", "from_family", "to_family", "uncertain"];
    const tm = explorerCells("transfer_mode", tmCols, ["A2024/P1/E1", "train", "fixed_tubing", "chem", "mix", "react", "mix", "react", 0]);
    expect(tm.slice(3).map((c) => c.href)).toEqual([
      "#/taxonomy/transfer_mode/fixed_tubing", "#/taxonomy/field_tag/chem", "#/taxonomy/unit_operation/mix",
      "#/taxonomy/unit_operation/react", null, null, null,
    ]);
  });
});

describe("site texts (AC-8, REQ-009 to REQ-011, REQ-016)", () => {
  it("titles and item units of the two targets", () => {
    expect(taskTitle("module_type")).toBe("Primary module type of a step");
    expect(taskTitle("transfer_mode")).toBe("Transfer mode of a material connection");
    expect(itemUnit("module_type")).toBe("step");
    expect(itemUnit("transfer_mode")).toBe("material connection");
  });

  it("the definition and the two notes as pinned by REQ-010", () => {
    expect(METRIC_DEFINITION).toBe(
      "Top-1 accuracy is the fraction of a task's test items whose single predicted label equals the label recorded in " +
        "the release. The 95% interval is for the difference reference model top-1 minus baseline top-1, from a " +
        "paper-level paired cluster bootstrap over the test papers; Replicates is the number of bootstrap replicates " +
        "used (replicates with no test item are dropped).",
    );
    expect(DIFFERENCE_NOTE).toBe(
      "Difference (computed) is reference model top-1 minus baseline top-1, computed by this site from the two recorded " +
        "values; reference_results.json does not record it.",
    );
    expect(TEST_PAPERS_NOTE).toBe("Test papers are the test papers with at least one item of the task.");
    expect(REFERENCE_HEADS).toEqual([
      "Task", "Test items (papers)", "Baseline top-1", "Reference model top-1", "Difference (computed)",
      "95% interval of the difference", "Replicates",
    ]);
    expect(PUBLISHED_JSON_SUMMARY).toBe("reference_results.json as published");
  });

  it("formats signed four-decimal values", () => {
    const row = referenceRow({
      task_id: "t", n_test_items: 10, n_test_papers: 3, baseline_top1: 0.5, reference_model_top1: 0.5,
      diff_ci95_low: -0.00004, diff_ci95_high: 0, replicates: 7,
    });
    expect(row).toEqual({ task: "t", testItems: "10 (3)", baseline: "0.5000", reference: "0.5000", difference: "+0.0000", interval: "[-0.0000, +0.0000]", replicates: "7" });
  });

  it("the explorer and loading texts", () => {
    expect(EXPLORER_HEADING).toBe("Benchmark items");
    expect(SHOW_MORE_TEXT).toBe("Show 100 more");
    expect(NO_ITEMS_TEXT).toBe("No items match.");
    expect(loadErrorText("HTTP 500")).toBe("Could not load the benchmark data: HTTP 500");
    expect(SECTION_HEADINGS).toEqual({
      reference: "Reference results",
      evaluation: "Run the evaluation yourself",
      platforms: "Items by platform",
    });
    expect(SPLIT_LABELS).toEqual({ train: "Train", test: "Test", excluded: "Excluded" });
  });
});

describe.skipIf(!available)("real benchmark.json and benchmark-items.json (AC-6 to AC-8)", () => {
  const b = available ? readJson<BenchmarkJson>("benchmark.json") : (null as unknown as BenchmarkJson);
  const items = available ? readJson<BenchmarkItemsJson>("benchmark-items.json") : (null as unknown as BenchmarkItemsJson);
  const index = available ? readJson<IndexJson>("index.json") : (null as unknown as IndexJson);
  const decode = (q: string) => decodeExplorerQuery(q, b);
  const count = (s: ExplorerState) => filterItems(items[s.task]!, s).length;

  it("AC-6: defaults, the four-key query, dropped values and the last occurrence", () => {
    expect(decode("")).toEqual({ task: MT, split: null, label: null, platform: null });
    expect(benchmarkItemsHash(decode(""))).toBe(`#/benchmark/items?task=${MT}`);
    const full = decode(`task=${TM}&label=mobile_robot&split=test&platform=Aand2024%2FP1`);
    expect(full).toEqual({ task: TM, split: "test", label: "mobile_robot", platform: "Aand2024/P1" });
    expect(encodeExplorerQuery(full)).toBe(`task=${TM}&split=test&label=mobile_robot&platform=Aand2024%2FP1`);
    expect(decode("label=fixed_tubing").label).toBeNull();
    for (const q of ["split=dev", "platform=Nope/P9", "colour=red", "label=%E0"]) expect(decode(q), q).toEqual(decode(""));
    expect(decode("split=train&split=test").split).toBe("test");
    expect(decode("split=test&split=dev").split).toBeNull();
    const states: ExplorerState[] = [
      decode(""),
      full,
      { task: MT, split: "excluded", label: "assembly_unit", platform: null },
      { task: MT, split: null, label: null, platform: "Zhu2024/P1" },
    ];
    for (const s of states) expect(decode(encodeExplorerQuery(s))).toEqual(s);
  });

  it("AC-7: every linked count on the page equals the explorer's N for its link", () => {
    const cells = linkedCells(b);
    const split = splitTable(b);
    const labelCells = b.tasks.flatMap((_, i) => labelRows(b, i).flatMap((r) => r.cells));
    const platformCells = platformRows(b, null).flatMap((r) => r.cells);
    expect(split.rows.flatMap((r) => r.cells)).toHaveLength(6);
    expect(split.total.cells).toHaveLength(2);
    expect(labelCells.filter((c) => c.href !== null)).toHaveLength(69);
    expect(labelRows(b, 0).flatMap((r) => r.cells).filter((c) => c.href !== null)).toHaveLength(56);
    expect(labelRows(b, 1).flatMap((r) => r.cells).filter((c) => c.href !== null)).toHaveLength(13);
    expect(labelCells.filter((c) => c.href === null)).toHaveLength(12);
    expect(platformCells.filter((c, i) => i % 2 === 0 && c.href !== null)).toHaveLength(280);
    expect(platformCells.filter((c, i) => i % 2 === 1 && c.href !== null)).toHaveLength(270);
    expect(cells).toHaveLength(6 + 2 + 69 + 280 + 270);
    const wrong = cells.filter((c) => count(decode(queryOf(c.href!))) !== c.n).map((c) => `${c.href}: ${c.n}`);
    expect(wrong).toEqual([]);
    expect(count({ task: MT, split: "test", label: null, platform: null })).toBe(1199);
    expect(count({ task: TM, split: "test", label: "mobile_robot", platform: null })).toBe(29);
    expect(count({ task: MT, split: null, label: null, platform: "Aand2024/P1" })).toBe(6);
    expect(count({ task: TM, split: "excluded", label: null, platform: null })).toBe(15);
    expect([items[MT]!.rows.length, items[TM]!.rows.length]).toEqual([2621, 983]);
    expect(platformRows(b, "test")).toHaveLength(116);
  });

  it("AC-8: the reference rows of the pinned release", () => {
    const rows = Object.values(b.reference_results).map(referenceRow);
    expect(rows.map((r) => [r.testItems, r.baseline, r.reference, r.difference, r.interval, r.replicates])).toEqual([
      ["1199 (99)", "0.6681", "0.6881", "+0.0200", "[-0.0097, +0.0529]", "2000"],
      ["426 (93)", "0.4413", "0.5117", "+0.0704", "[+0.0172, +0.1255]", "2000"],
    ]);
    expect(rows.map((r) => r.task)).toEqual([MT, TM]);
  });

  it("AC-8: exclusion line, uncertain sentences, caption and the recorded lines", () => {
    expect(b.exclusion_reasons.map(exclusionLine)).toEqual([`Excluded: 4 papers, ${pinnedExclusionReason()}.`]);
    expect(b.summaries.map(uncertainSentence)).toEqual([
      "22 labels occur among the items of this task. Items marked uncertain in the release: 171 train, 163 test, 6 excluded.",
      "5 labels occur among the items of this task. Items marked uncertain in the release: 47 train, 51 test, 1 excluded.",
    ]);
    expect(benchmarkCaption(b)).toBe(
      "Benchmark chrono2023 has 2 tasks over 238 papers. The data dictionary describes the split as: “Benchmark: " +
        "chrono2023 trains on papers first public in 2023 or earlier and tests on papers first public in 2024 or later.” " +
        "The labels are the release's model codings, so top-1 accuracy measures agreement with those codings.",
    );
    // Amendment 0.4.0: one metric line for the shared metric; models grouped by task with the working label removed.
    expect(metricLines(b.tasks)).toEqual([
      "Metric as recorded (both tasks): top-1 accuracy over the test items; 95% interval of a difference by " +
        "paper-level paired cluster bootstrap over the test papers (B = 2000, seed 1)",
    ]);
    expect(MODEL_HEADS).toEqual(["Task", "Baseline", "Reference model"]);
    const models = modelRows(b.tasks);
    expect(models.map((m) => m.task)).toEqual([MT, TM]);
    expect(models.map((m) => m.baseline)).toEqual(b.tasks.map((t) => t.baseline_rule));
    expect(models[0]!.referenceModel).toBe(
      "back-off conditional-frequency model: the finest context seen in training among (unit operation, previous, " +
        "next, field tag), (unit operation, previous, next), (unit operation, field tag), (unit operation), all items; " +
        "its most frequent label, ties by the next coarser context, then alphabetical",
    );
    expect(models[1]!.referenceModel).toBe(b.tasks[1]!.reference_model.replace(" (sdl-db-02 H1)", ""));
    expect(models.map((m) => m.referenceModel).join(" ")).not.toContain("sdl-db-");
  });

  it("AC-8: metric lines and the displayed reference model on synthetic tasks", () => {
    const task = (id: string, metric: string) => ({ task_id: id, metric }) as BenchmarkTask;
    expect(metricLines([task("a", "m1"), task("b", "m2")])).toEqual([
      "Metric as recorded for a: m1",
      "Metric as recorded for b: m2",
    ]);
    expect(metricLines([task("a", "m"), task("b", "m"), task("c", "m")])).toEqual(["Metric as recorded (all 3 tasks): m"]);
    expect(metricLines([task("a", "m")])).toEqual(["Metric as recorded for a: m"]);
    expect(displayReferenceModel("model A (sdl-db-07 H3) and model B (sdl-db-11)")).toBe("model A and model B");
    expect(displayReferenceModel("model (H1) (db-02)")).toBe("model (H1) (db-02)");
  });

  it("AC-8: the evaluation note gives the commands, the input format and no script text", () => {
    const note = evaluationNote(b);
    const all = [note.release, note.where, note.checkLead, note.checkCommand, note.predictionsLead, ...note.predictionCommands, note.format].join("\n");
    for (const s of [
      "python modes/benchmark/evaluate.py modes/benchmark",
      `python modes/benchmark/evaluate.py modes/benchmark --task ${MT} --predictions my_predictions.csv`,
      `python modes/benchmark/evaluate.py modes/benchmark --task ${TM} --predictions my_predictions.csv`,
      "item_id,prediction",
      "1199",
      "426",
      "header row",
      "unpacked release folder",
    ]) {
      expect(all, s).toContain(s);
    }
    expect(note.checkCommand).toBe("python modes/benchmark/evaluate.py modes/benchmark");
    expect(note.predictionCommands).toEqual([
      `python modes/benchmark/evaluate.py modes/benchmark --task ${MT} --predictions my_predictions.csv`,
      `python modes/benchmark/evaluate.py modes/benchmark --task ${TM} --predictions my_predictions.csv`,
    ]);
    for (const s of ["def ", "import csv", "argparse"]) expect(all).not.toContain(s);
    expect(index.release.doi).toBe(PINNED_DOI);
  });

  it("AC-8 / REQ-016: no site text of the view contains a banned substring or ranking word", () => {
    const note = evaluationNote(b);
    const libTexts = [
      benchmarkCaption(b),
      ...b.exclusion_reasons.map(exclusionLine),
      ...b.summaries.map(uncertainSentence),
      ...b.tasks.flatMap((t) => [taskTitle(t.target), itemUnit(t.target)]),
      METRIC_DEFINITION,
      ...metricLines(b.tasks).map((l) => l.slice(0, l.indexOf(":"))),
      ...MODEL_HEADS,
      DIFFERENCE_NOTE,
      TEST_PAPERS_NOTE,
      ...REFERENCE_HEADS,
      PUBLISHED_JSON_SUMMARY,
      note.release,
      note.doiLead,
      note.where,
      note.checkLead,
      note.predictionsLead,
      note.format,
      ...Object.values(SECTION_HEADINGS),
      ...Object.values(SPLIT_LABELS),
      ...explorerColumns("module_type").map((c) => c.head),
      ...explorerColumns("transfer_mode").map((c) => c.head),
      EXPLORER_HEADING,
      BACK_LINK_TEXT,
      SHOW_MORE_TEXT,
      NO_ITEMS_TEXT,
      loadErrorText(""),
      countLine(1, 2),
      platformsCountLine(1, 2, "test"),
      platformsCountLine(2, 2, null),
    ];
    // Literal text in the view: JSX text nodes and double-quoted strings.
    const view = readFileSync(join(import.meta.dirname, "..", "src", "views", "Benchmark.tsx"), "utf8").replace(/\/\/.*$/gm, "");
    const viewTexts = [
      ...[...view.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]!.trim()),
      ...[...view.matchAll(/"([^"\n]*)"/g)].map((m) => m[1]!),
    ].filter((t) => /[a-z]/i.test(t));
    console.log(`REQ-016 scan: ${libTexts.length} texts of src/lib/benchmark.ts, ${viewTexts.length} literal texts of src/views/Benchmark.tsx`);
    console.log(viewTexts.join(" | "));
    expect(viewTexts.length).toBeGreaterThan(0);
    expect([...libTexts, ...viewTexts].flatMap(bannedIn)).toEqual([]);
  });
});

describe("the REQ-016 scan itself", () => {
  it("flags ranking words and BANNED_SUBSTRINGS, case-insensitively", () => {
    expect(bannedIn("The Best model")).toEqual(["best: The Best model"]);
    expect(bannedIn("a trend")).toEqual(["trend: a trend"]);
    expect(bannedIn("Top-1 accuracy over the test items")).toEqual([]);
  });
});
