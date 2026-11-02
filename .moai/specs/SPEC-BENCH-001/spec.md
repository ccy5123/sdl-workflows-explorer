---
id: SPEC-BENCH-001
title: "Benchmark view: chrono2023 tasks, split, item counts and labels, reference results as published, how to run the evaluation, items by platform and an item explorer"
version: "0.3.0"
status: draft
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.6.0 target"
module: "scripts/, src/"
lifecycle: spec-anchored
tags: "benchmark, data-pipeline, routing, views"
tier: M
depends_on: [SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001, SPEC-TAXO-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Step 6 of `docs/plan.md` ("Benchmark view (the chrono2023 tasks, their split and the
  reference results as published)"). Extends the derive step of SPEC-DATA-001 (`benchmark.json` gains typed tasks,
  per-task item and label counts by split and per-platform item counts; a new `benchmark-items.json` holds the items),
  extends the hash router with two route kinds and adds one lazily loaded view. Researcher decisions of 2026-11-02
  (both a per-platform table and an item explorer; four-decimal table plus the published JSON; the computed difference
  shown and marked as computed; label counts by split with class links) are recorded in `progress.md` §E.1. The
  expected numbers in `acceptance.md` come from `expected-counts.mjs` in this folder.
- 2026-11-02 0.2.0 revised after plan audit iteration 1 (FAIL 0.75): AC-16 lists the permitted edits of existing
  tests (D1); REQ-010 pins the definition and note texts and AC-8 tests them (D2); `reference_results` is a keyed
  object (D3); cross-references fixed (D4); REQ-003 (a) checks each task's `benchmark_id` and each reference entry's
  `task_id` (D5); REQ-011 writes the command out per task (D6); the item facts, uncertain sentence, caption,
  exclusion line and DOI link have exact texts and acceptance checks (D7); AC-9 and AC-16 cite requirements (D8);
  out-of-scope heading form (D9). Optional findings applied: "model codings" (D10), the checked columns of
  REQ-003 (g) (D11), last occurrence of a repeated query key as elsewhere in the site (D12), "Show 100 more" resets on
  a filter change (D13), platform order defined (D14), the evaluation note says where to run, the header row and what
  `--predictions` scores against (D15), a note on test papers (D16), §E.2 fixture values written by the run phase
  (D17), a load-failure case for `benchmark-items.json` (D18).
- 2026-11-02 0.3.0 revised after plan audit iteration 2 (FAIL 0.89, one blocking finding): AC-16 permits the
  `FILES` entry in `tests/libBoundary.test.ts` and states that new test cases in existing files are not edits (N1).
  Optional findings applied: the Replicates definition names dropped replicates (N2); REQ-006 says the values are
  percent-decoded (N3); AC-8 tests the task titles, AC-10 the platform name and the split control's URL, AC-12 the
  explorer's field-tag and unit-operation links, "yes" and "—" (N4); AC-12 starts the platform-removal case from a
  URL with a platform (N5); AC-6 keeps its query in one code span (N6). Plan audit iteration 3 PASS (0.95, no
  finding). Approved by the researcher through AskUserQuestion on 2026-11-02.

## 1. Why

The release ships a benchmark (`modes/benchmark/`): two tasks, a paper-level split, one item file per task, the
recorded reference values and `evaluate.py`. A reader of the site should be able to see what each task asks (input,
label set, unit of an item), how many items it has in each part of the split, and the reference results exactly as the
release records them, and should learn how to score their own predictions with the release's script. Items are steps
and connections of coded platforms, so each item can lead to the platform viewer, and each label and unit operation
to its taxonomy class page.

Every count on the benchmark page that links to the item explorer is defined to equal the count line the explorer
shows for that link (REQ-013), the principle SPEC-TRENDS-001 and SPEC-TAXO-001 apply to their counts. The build checks
that the item files, the split, the task files, `reference_results.json`, the platform graphs and the taxonomy agree
(REQ-003), so the page shows one reading of the benchmark that all release files support. The site does not rank,
compare or judge the models: it shows the recorded numbers and the definitions the release gives for them.

## 2. Requirements (EARS)

Terms used below. The **tasks** are the files `modes/benchmark/tasks/*.json` in file-name order; a task's **target**
is `module_type` or `transfer_mode` and its **item file** is `modes/benchmark/items_module_type.csv` or
`items_transfer_mode.csv` respectively. The **splits** are `train`, `test` and `excluded`, in that order. A **class**
is a (`class_kind`, `class`) pair of `modes/taxonomy/classes.csv` (SPEC-TAXO-001). The **explorer** is the view of
`#/benchmark/items`; its **count line** is "N of T items" (REQ-013). Numbers below are those of release 1.0.0 as
printed by `expected-counts.mjs`. "Plain string comparison" means UTF-16 code-unit order, as JavaScript `<` (so
`P10` sorts before `P2`), the order SPEC-TAXO-001 uses.

### Derived data

- **REQ-001** (event) When `npm run build-data` runs, `benchmark.json` shall hold, and nothing else:
  - `benchmark_id`: the `benchmark_id` of `split.csv` (one value);
  - `split_rule`: the `description` of the `data_dictionary.csv` row with object `benchmark_split` and column
    `benchmark_id`, as written;
  - `split_counts`: `{train, test, excluded}`, the number of `split.csv` rows (papers) with each split;
  - `exclusion_reasons`: one entry `{reason, n}` per distinct non-empty `exclusion_reason` of `split.csv`, in order of
    first appearance;
  - `tasks`: one object per task, built field by field from the task file: `task_id`, `benchmark_id`, `target`,
    `item_rule`, `inputs`, `metric`, `baseline_rule`, `baseline_top1`, `reference_model`, `reference_model_top1`,
    `diff_ci95_low`, `diff_ci95_high`, `n_test_items`, `n_test_papers`, `recorded_in`, as recorded;
  - `summaries`: one per task, same order, `{task_id, items, uncertain, labels}`: `items` and `uncertain` are
    `{train, test, excluded}` counts of the task's items and of those with `uncertain` = 1; `labels` holds one
    `{label, train, test, excluded}` per label that occurs among the task's items, ordered by total count descending,
    then label ascending (plain string comparison);
  - `platforms`: one entry per platform row of `index.json`, in ascending `platform_id` order (plain string
    comparison), `{platform_id, split, n}`: `split` the split of the platform's paper and `n` the number of the
    platform's items per task, in task order (0 when it has none);
  - `reference_results`: an object with the keys of `reference_results.json` in file order, each value built field
    by field: `task_id`, `n_test_items`, `n_test_papers`, `baseline_top1`, `reference_model_top1`, `diff_ci95_low`,
    `diff_ci95_high`, `replicates`, as recorded (for release 1.0.0 it equals the parsed file);
  - `reference_results_text`: the content of `reference_results.json` as a string, byte for byte.
- **REQ-002** (event) When `npm run build-data` runs, it shall write `benchmark-items.json`: an object with one entry
  per task id, `{columns, rows}`. `columns` is `item_id, split, label, field_tag, unit_operation,
  prev_unit_operation, next_unit_operation, uncertain` for target `module_type` and `item_id, split, label,
  field_tag, from_unit_operation, to_unit_operation, from_family, to_family, uncertain` for `transfer_mode`; `rows`
  holds one array per row of the item file, in file order, with the values of those columns as recorded, `uncertain`
  as the number 0 or 1. The platform and paper of an item are the first two and the first segment of `item_id`.
- **REQ-003** (event) When the benchmark files disagree with each other or with the rest of the release, `deriveAll`
  shall throw an error naming the file and the row, task or field concerned, so that `build-data` exits non-zero
  before it writes any file. It shall throw when:
  - (a) a task file's `task_id` is not its file name without `.json`; a task's `benchmark_id` is not the
    `benchmark_id` of `split.csv`; the set of task ids differs from the keys of `reference_results.json`; a
    `reference_results.json` entry's `task_id` is not its key; a task's `target` is not `module_type` or
    `transfer_mode`; two tasks share a target;
  - (b) a task file or a `reference_results.json` entry lacks one of the fields of REQ-001, or a field has the wrong
    type (text fields strings, the others numbers);
  - (c) one of `n_test_items`, `n_test_papers`, `baseline_top1`, `reference_model_top1`, `diff_ci95_low`,
    `diff_ci95_high` differs between a task file and its `reference_results.json` entry;
  - (d) `split.csv` holds a paper twice, a split other than the three splits, more than one `benchmark_id`, an
    `exclusion_reason` on a row whose split is not `excluded`, or a paper set different from the papers of
    `index.json`;
  - (e) an item row's `task_id` is not the task of its item file; an `item_id` occurs twice in a file; the first
    segment of `item_id` is not `paper_id` or its first two segments are not `platform_id`; `platform_id` is not a
    platform of `index.json`; `split` is not the split of `paper_id` in `split.csv`; `uncertain` is not `0` or `1`;
  - (f) a `module_type` item's `item_id` is not a step of its platform's graph, its `unit_operation` is not that
    step's unit operation, its `label` is not the module type of the step's first module, or its `uncertain` differs
    from the step's; a `transfer_mode` item's `item_id` is not a connection of its platform's graph, the connection is
    not material, or its `label` or `uncertain` differs from the connection's;
  - (g) a `label` is not a class of the task's target kind; a non-empty `field_tag` is not a `field_tag` class; for
    target `module_type`, `unit_operation` is not a `unit_operation` class, or `prev_unit_operation` /
    `next_unit_operation` is neither a `unit_operation` class nor `START` / `END` respectively; for target
    `transfer_mode`, `from_unit_operation` or `to_unit_operation` is not a `unit_operation` class, or `from_family` /
    `to_family` is not the `family` of that unit operation in `classes.csv`. Only the columns of REQ-002 for the
    task's target are checked (the item files also carry the other target's columns, empty);
  - (h) the number of a task's `test` items, or of distinct papers among them, differs from its `n_test_items` or
    `n_test_papers`;
  - (i) the data-dictionary row of `split_rule` is missing or an item file named by a task's target is missing.
- **REQ-004** (event) When `npm run build-data` runs on release 1.0.0, `benchmark.json` shall be at most 40,000 bytes
  (estimate 22,561) and `benchmark-items.json` at most 500,000 bytes (estimate 418,205); `index.json`, `taxonomy.json`
  and the files under `platforms/` shall be byte-identical to those written before this SPEC.

### Routes

- **REQ-005** (event) When the hash is `#/benchmark`, the router shall return route kind `benchmark`; when it is
  `#/benchmark/items` or `#/benchmark/items?<query>`, route kind `benchmarkItems` with the query text; any other hash
  starting with `#/benchmark` (for example `#/benchmark/x` or `#/benchmark?x`) is not found. Existing route kinds
  parse as before.
- **REQ-006** (event) When the explorer reads its query, it shall read the keys `task`, `split`, `label` and
  `platform`, their values percent-decoded: `task` must be a task id (default: the first task), `split` one of the three splits
  (default: all), `label` a label of that task's `summaries` (default: all), `platform` a `platform_id` of
  `benchmark.json` `platforms` (default: none). For a repeated key only the last occurrence counts, as in the
  site's other hash queries (`src/lib/filterUrl.ts`). It shall drop an unknown key, an invalid or undecodable value
  (the key then takes its default), and shall replace the URL (without a history entry) by the canonical query:
  `task` always, then `split`, `label`, `platform` when not default, in that order, each value percent-encoded.
  `benchmarkItemsHash(state)` shall build that URL.

### Benchmark page (`#/benchmark`)

- **REQ-007** (ubiquitous) The benchmark page shall show, in this order: the heading "Benchmark <benchmark_id>"; a
  caption (REQ-016); the split table; one section per task; "Reference results"; "Run the evaluation yourself";
  "Items by platform". None of these is collapsed except the published JSON of REQ-010.
- **REQ-008** (ubiquitous) The split table shall have one row per split with the split, its number of papers
  (`split_counts`) and, per task, its number of items, each item count linking to the explorer with that task and
  split; a total row shall give the paper total (238) and each task's item total, linking to the explorer with that
  task. Below it, each entry of `exclusion_reasons` shall be shown as "Excluded: <n> papers, <reason>." (release
  1.0.0: "Excluded: 4 papers, used to develop the extraction instructions.").
- **REQ-009** (ubiquitous) Each task section shall be headed by the task id and a site title of its target
  ("Primary module type of a step", "Transfer mode of a material connection"), and shall show, as labelled facts,
  "Unit of an item" with the site unit ("step", "material connection"), "Which items" with the release's `item_rule`
  and "Inputs" with its `inputs`, both as recorded; then the label table: one row per entry of `labels`, with the
  label linking to its taxonomy class page (`taxonomyHash(target, label)`) and its train, test and excluded counts,
  each non-zero count linking to the explorer with that task, split and label, a zero count shown as plain "0". Below
  the table: "<number of labels> labels occur among the items of this task. Items marked uncertain in the release:
  <train> train, <test> test, <excluded> excluded." (release 1.0.0 module_type: "22 labels occur among the items of
  this task. Items marked uncertain in the release: 171 train, 163 test, 6 excluded.").
- **REQ-010** (ubiquitous) "Reference results" shall show, in this order:
  - the definition "Top-1 accuracy is the fraction of a task's test items whose single predicted label equals the
    label recorded in the release. The 95% interval is for the difference reference model top-1 minus baseline
    top-1, from a paper-level paired cluster bootstrap over the test papers; Replicates is the number of bootstrap
    replicates used (replicates with no test item are dropped).", then per task "Metric as recorded for <task_id>: <metric>";
  - a table with one row per `reference_results` entry and the columns Task, Test items (papers), Baseline top-1,
    Reference model top-1, Difference (computed), 95% interval of the difference and Replicates: accuracies and
    interval bounds with four decimals, the difference = `reference_model_top1` − `baseline_top1` with four decimals
    and a sign, interval bounds with a sign (release 1.0.0: "1199 (99) | 0.6681 | 0.6881 | +0.0200 | [-0.0097,
    +0.0529] | 2000" and "426 (93) | 0.4413 | 0.5117 | +0.0704 | [+0.0172, +0.1255] | 2000");
  - below the table the notes "Difference (computed) is reference model top-1 minus baseline top-1, computed by this
    site from the two recorded values; reference_results.json does not record it." and "Test papers are the test
    papers with at least one item of the task.";
  - per task, "Baseline: <baseline_rule>" and "Reference model: <reference_model>", as recorded;
  - a collapsed block "reference_results.json as published" holding `reference_results_text` unchanged in a
    preformatted element.
- **REQ-011** (ubiquitous) "Run the evaluation yourself" shall state that `modes/benchmark/evaluate.py` is part of the
  release (Python 3 standard library only), link the release DOI (`https://doi.org/<release.doi>` of `index.json`),
  say to run the commands from the unpacked release folder (the folder that holds `modes/`), and give the command
  `python modes/benchmark/evaluate.py modes/benchmark` (fits the baseline and the reference model and checks them
  against the recorded values) and, for each task, `python modes/benchmark/evaluate.py modes/benchmark --task
  <task_id> --predictions my_predictions.csv` with the task id written out (scores the predictions against the
  baseline with the same bootstrap). It shall state the input format: a CSV with the header row `item_id,prediction`
  and one row per test item of the task, with each task's number of test items from `summaries` (1199 and 426). It
  shall not reproduce the script.
- **REQ-012** (ubiquitous) "Items by platform" shall have a split control (All, Train, Test, Excluded; default All,
  not kept in the URL), a count line ("280 platforms", or "N of 280 platforms" when a split is chosen) and a table with
  one row per matching entry of `platforms`: the platform id linking to the platform viewer (`platformHash`) with the
  platform name of `index.json` when it has one, the split, and the item count of each task, each non-zero count
  linking to the explorer with that task and platform.

### Item explorer (`#/benchmark/items`)

- **REQ-013** (ubiquitous) The explorer shall show the heading "Benchmark items", a link back to `#/benchmark`, a task
  select, a split select (All or a split), a label select (All or a label of the task, in `labels` order), and, when a
  platform is set, the platform id with a control that removes it. Changing a control shall update the URL as in
  REQ-006; changing the task shall reset the label. The count line shall read "N of T items", where N is the number of
  the task's items that match the split, label and platform and T the task's number of items. Every count on the
  benchmark page that links to the explorer (REQ-008, REQ-009, REQ-012) shall equal the N of the page it opens.
- **REQ-014** (ubiquitous) The explorer table shall show the matching items in file order, the first 100 and then 100
  more per press of a "Show 100 more" button while more remain (any change of task, split, label or platform shows
  the first 100 again), with columns Item, Platform, Split, Label, Field tag
  and, for `module_type`, Unit operation, Previous, Next, or, for `transfer_mode`, From, To, From family, To family,
  and Uncertain ("yes" for 1, empty for 0). The platform links to the platform viewer; the label, the field tag and
  each unit operation link to their taxonomy class pages; `START`, `END` and families are plain text; an empty field
  tag is shown as "—". When no item matches, the table is replaced by "No items match."

### Loading and presentation

- **REQ-015** (ubiquitous) The view shall load in its own lazily loaded chunk; `#/benchmark` shall fetch
  `data/benchmark.json` only, and `#/benchmark/items` `data/benchmark.json` and `data/benchmark-items.json`; neither
  shall request a file under `data/platforms/` or `data/taxonomy.json`. While a file loads the view shows "Loading…";
  when a fetch fails it shows "Could not load the benchmark data: <message>" with role `alert`. The site navigation
  shall gain a link "Benchmark" after "Taxonomy". At 375 px width neither page shall scroll horizontally: tables
  shall stack their rows below 800 px with each cell labelled by its column, as the taxonomy tables do, and the
  preformatted JSON shall wrap.
- **REQ-016** (ubiquitous) All site text of the benchmark view shall be English and describe without drawing
  conclusions. The caption shall read "Benchmark <benchmark_id> has <number of tasks> tasks over <paper total>
  papers. The data dictionary describes the split as: “<split_rule>” The labels are the release's model codings, so
  top-1 accuracy measures agreement with those codings." (the last sentence follows DATA_CARD.md, which states that
  the release contains no human coding). No site text of the view (captions,
  headings, notes, labels kept in `src/`) shall contain any of the `BANNED_SUBSTRINGS` of `src/lib/trends.ts` or any
  of "best", "better", "worse", "outperform", "beat", "superior", "inferior", "rank", "winner", "state-of-the-art",
  "significant", "improve", "leaderboard" (case-insensitive). The view uses no colour to encode data; existing views
  are unchanged except the navigation bar, and existing tests change only as listed in AC-16.

## 3. Out of scope

### Out of Scope — benchmark view

- Running models or scoring predictions in the browser; uploading predictions.
- Re-fitting the baseline or reference model in the build (the build checks consistency, not the recorded values;
  `evaluate.py` does that).
- Item-level selection in the platform viewer (the viewer has no URL for a selected step or connection); links go to
  the platform.
- Sorting or free-text search in the explorer; per-item evidence locations; charts.
- Other benchmarks or later releases (the benchmark id and its split stay as published in 1.0.0).
- Home and about pages, accessibility pass, deployment and site-wide dark theme (step 7).
