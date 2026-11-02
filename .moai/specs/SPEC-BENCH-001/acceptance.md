# Acceptance: SPEC-BENCH-001

Unit tests (AC-1 to AC-9) run in Vitest without a browser. Tests on the real derived data read `public/data/` after
`npm run build-data` and skip with a message when it is absent; tests that run `deriveAll` on the real release use the
verified cache (or `SDL_RELEASE_ZIP`) and skip with a message when neither is available, as `tests/release.test.ts`
does. AC-10 to AC-16 are Playwright tests (`npm run e2e`) against the `dist-e2e/` build. "Page error" means an
uncaught exception (`pageerror`).

Every release 1.0.0 number below was printed by `expected-counts.mjs` in this folder
(`node .moai/specs/SPEC-BENCH-001/expected-counts.mjs` from the repository root, exit 0; output in `progress.md` §E.1).
The script re-implements spec §2 without importing project code. The screenshot check at 1280 px and 375 px is done
in the run phase and recorded in `progress.md`; it is not an acceptance criterion.

## Scenarios

### AC-1 benchmark.json (REQ-001)
- Given the real release, when `deriveAll` runs, then `benchmark` has exactly the keys `benchmark_id`, `split_rule`,
  `split_counts`, `exclusion_reasons`, `tasks`, `summaries`, `platforms`, `reference_results`,
  `reference_results_text`; `benchmark_id` is `chrono2023`; `split_rule` is "Benchmark: chrono2023 trains on papers
  first public in 2023 or earlier and tests on papers first public in 2024 or later."; `split_counts` is
  `{train: 135, test: 99, excluded: 4}`; `exclusion_reasons` is
  `[{reason: "used to develop the extraction instructions", n: 4}]`.
- `tasks` are `chrono2023-module_type`, `chrono2023-transfer_mode`, each with exactly the 15 fields of REQ-001, equal
  to the parsed task files.
- `summaries`: module_type items `{train: 1384, test: 1199, excluded: 38}`, uncertain `{train: 171, test: 163,
  excluded: 6}`, 22 labels, first `software` (362, 281, 9), last `assembly_unit` (0, 4, 0); transfer_mode items
  `{train: 542, test: 426, excluded: 15}`, uncertain `{train: 47, test: 51, excluded: 1}`, 5 labels in the order
  `fixed_tubing` (298, 120, 3), `robot_arm_gantry` (175, 189, 11), `human_transfer` (58, 83, 0), `mobile_robot`
  (10, 29, 1), `unmapped` (1, 5, 0).
- `platforms` has 280 entries in ascending id order (160 train, 116 test, 4 excluded); `Aand2024/P1` is
  `{split: "test", n: [6, 3]}`, `Zhu2024/P1` is `{split: "test", n: [14, 7]}`; 10 entries have 0 transfer_mode items;
  the `n` columns sum to 2621 and 983.
- `reference_results` is an object whose keys are `chrono2023-module_type`, `chrono2023-transfer_mode` (file order),
  each value with exactly the 8 fields of REQ-001; it deep-equals the parsed `reference_results.json`.
  `reference_results_text` equals the file content (619 bytes).
- Given the fixture release (extended in the run phase), the same keys are present; the run phase writes the
  fixture-derived values into `progress.md` §E.2 and the tests assert them.

### AC-2 benchmark-items.json (REQ-002)
- Given the real release, then `benchmark-items.json` has the two task ids; `chrono2023-module_type` has the 8 columns
  of REQ-002 and 2621 rows, the first `["Aand2024/P1/S1", "test", "fluidics", "chemistry_synthesis",
  "dispense_liquid", "START", "react_photo_electro", 0]`; `chrono2023-transfer_mode` has the 9 columns and 983 rows,
  the first `["Aand2024/P1/E1", "test", "fixed_tubing", "chemistry_synthesis", "dispense_liquid",
  "react_photo_electro", "prepare", "react", 0]`. `uncertain` values are numbers and sum to 340 and 99.
- `writeDerived` writes `benchmark-items.json` beside the other files (the fixture output directory lists
  `benchmark-items.json`, `benchmark.json`, `index.json`, `platforms`, `taxonomy.json`).

### AC-3 Build checks (REQ-003)
- Given copies of the fixture release, each edited to break one rule, `deriveAll` throws an error whose message names
  the file and the row, task or field, for at least one case of each of (a) to (i): (a) a task file renamed, a task
  `benchmark_id` changed, and a `reference_results.json` entry whose `task_id` differs from its key; (b) a
  task file without `metric`, and `baseline_top1` given as a string; (c) `n_test_items` changed in
  `reference_results.json` only; (d) a paper listed twice in `split.csv`, and a paper missing; (e) an item whose split
  differs from its paper's; (f) a `module_type` item whose label differs from the module type of the step's first
  module, and a `transfer_mode` item on a non-material connection; (g) a label that is not a class, and a
  `from_family` that differs from the unit operation's family; (h) `n_test_items` changed by the same amount in the
  task file and in `reference_results.json`, so (c) holds and only the item count disagrees; (i) the data-dictionary
  row removed.
- Given the real release, `deriveAll` does not throw (script: 0 problems; 0 items disagree with the platform graphs).

### AC-4 Sizes and unchanged files (REQ-004)
- After `npm run build-data`, `public/data/benchmark.json` is at most 40,000 bytes and `benchmark-items.json` at most
  500,000 bytes; the test prints both sizes. The SHA-256 of `index.json` and `taxonomy.json` and of the concatenated
  sorted `platforms/*.json` equal the baseline values recorded in `progress.md` §E.1.

### AC-5 Routes (REQ-005)
- `parseRoute("#/benchmark")` is `{kind: "benchmark"}`; `"#/benchmark/items"` is `{kind: "benchmarkItems", query: ""}`;
  `"#/benchmark/items?task=x"` has query `task=x`; `"#/benchmark/x"`, `"#/benchmark?x"`, `"#/benchmarks"` and
  `"#/benchmark/items/x"` are not found. Existing cases in `tests/route.test.ts` pass unchanged.

### AC-6 Explorer query (REQ-006)
- With the real `benchmark.json`: an empty query decodes to task `chrono2023-module_type`, split all, label all, no
  platform, canonical `#/benchmark/items?task=chrono2023-module_type`; the query
  `task=chrono2023-transfer_mode&label=mobile_robot&split=test&platform=Aand2024%2FP1` decodes to all four and encodes in the order task, split, label, platform;
  `label=fixed_tubing` with the default task is dropped (not a module_type label); `split=dev`, `platform=Nope/P9`,
  `colour=red`, `label=%E0` are dropped; `split=train&split=test` gives test and `split=test&split=dev` gives all
  (last occurrence counts). Encoding then decoding any canonical state returns it unchanged.

### AC-7 Counts and filtering (REQ-008, REQ-009, REQ-012, REQ-013)
- With the real derived files: for every link target produced by the split table, the label tables and the platform
  table (2 × 3 split cells + 2 totals + 69 non-zero label cells (56 module_type, 13 transfer_mode; the 12 cells with a
  0 count unlinked) + the non-zero
  platform cells: 280 module_type and 270 transfer_mode), the explorer filter function returns exactly the linked
  count. Examples: module_type + test → 1199; transfer_mode + test + mobile_robot → 29; module_type + Aand2024/P1 → 6;
  transfer_mode + excluded → 15; T is 2621 and 983.

### AC-8 Formatting and texts (REQ-008 to REQ-011, REQ-016)
- The reference-results row formatter gives, for release 1.0.0, "1199 (99)", "0.6681", "0.6881", "+0.0200",
  "[-0.0097, +0.0529]", "2000" and "426 (93)", "0.4413", "0.5117", "+0.0704", "[+0.0172, +0.1255]", "2000".
- The task title function gives "Primary module type of a step" and "Transfer mode of a material connection" and the
  item unit function "step" and "material connection"; the explorer cell text gives "yes" for uncertain 1, "" for 0
  and "—" for an empty field tag.
- The text functions return exactly the texts of REQ-008 (exclusion line), REQ-009 (uncertain sentence for both
  tasks; transfer_mode: "5 labels occur among the items of this task. Items marked uncertain in the release: 47 train,
  51 test, 1 excluded."), REQ-010 (definition, the two notes, "Metric as recorded for <task_id>: " followed by the
  task's `metric`, "Baseline: " + `baseline_rule`, "Reference model: " + `reference_model`) and REQ-016 (caption:
  "Benchmark chrono2023 has 2 tasks over 238 papers. The data dictionary describes the split as: “Benchmark:
  chrono2023 trains on papers first public in 2023 or earlier and tests on papers first public in 2024 or later.”
  The labels are the release's model codings, so top-1 accuracy measures agreement with those codings.").
- The evaluation note contains exactly the strings `python modes/benchmark/evaluate.py modes/benchmark`,
  `python modes/benchmark/evaluate.py modes/benchmark --task chrono2023-module_type --predictions my_predictions.csv`,
  `python modes/benchmark/evaluate.py modes/benchmark --task chrono2023-transfer_mode --predictions my_predictions.csv`,
  `item_id,prediction`, "1199" and "426", the words "header row" and "unpacked release folder"; no text of the view
  contains "def ", "import csv" or "argparse".
- Every site text kept in `src/lib/benchmark.ts` and `src/views/Benchmark.tsx` (captions, titles, notes, headings,
  column heads) contains none of the substrings of REQ-016 (case-insensitive); the test lists the scanned strings.

### AC-9 Library boundary (REQ-006, REQ-013, REQ-016)
- `tests/libBoundary.test.ts` covers `src/lib/benchmark.ts`, which holds the query, filter, link and text functions
  of those requirements (no React, no DOM, no fetch), as for the other `src/lib` modules.

### AC-10 Benchmark page (REQ-007 to REQ-012, REQ-015)
- Opening `#/benchmark` shows the heading "Benchmark chrono2023", then in order the split table, the sections
  "chrono2023-module_type" and "chrono2023-transfer_mode", "Reference results", "Run the evaluation yourself", "Items by
  platform"; the split table shows 135 / 99 / 4 / 238 papers and 1384 / 1199 / 38 / 2621 and 542 / 426 / 15 / 983
  items, and the line "Excluded: 4 papers, used to develop the extraction instructions."; the caption is the text of
  AC-8; each task section shows "Unit of an item" (step / material connection), "Which items" and "Inputs" with the
  task file's `item_rule` and `inputs`, and the uncertain sentence of AC-8; the module_type label table has 22 rows and
  transfer_mode 5; the reference table shows the two rows of AC-8 and the two notes; the evaluation section links
  `https://doi.org/10.5281/zenodo.23857126`;
  the details element "reference_results.json as published" is closed and its preformatted text equals the file;
  "Items by platform" shows "280 platforms" and 280 rows, the row `Aand2024/P1` with its name "auto-optimization
  platform (AOP)", and "116 of 280 platforms" after choosing Test, with the URL still `#/benchmark`. No page error.

### AC-11 Links (REQ-009, REQ-012, REQ-013)
- From `#/benchmark`, the label `mobile_robot` opens `#/taxonomy/transfer_mode/mobile_robot`; the platform
  `Aand2024/P1` opens `#/platform/Aand2024/P1`; the test count of `mobile_robot` (29) opens the explorer with the count
  line "29 of 983 items"; the module_type count of `Aand2024/P1` (6) opens it with "6 of 2621 items"; the split-table
  cell module_type/excluded (38) opens it with "38 of 2621 items".

### AC-12 Explorer (REQ-013, REQ-014)
- Opening `#/benchmark/items` replaces the URL by `#/benchmark/items?task=chrono2023-module_type` without a new history
  entry and shows "2621 of 2621 items" and 100 rows, the first `Aand2024/P1/S1` with platform link
  `#/platform/Aand2024/P1`, label link `#/taxonomy/module_type/fluidics`, Previous `START` as plain text; one press of
  "Show 100 more" shows 200 rows. In the first row the field tag links to `#/taxonomy/field_tag/chemistry_synthesis`,
  the unit operation to `#/taxonomy/unit_operation/dispense_liquid` and Next to
  `#/taxonomy/unit_operation/react_photo_electro`, and Uncertain is empty; the row `Aand2024/P1/S4` (the first with
  `uncertain` = 1) shows "yes". (Release 1.0.0 has no item with an empty field tag; the "—" case is tested in AC-8.)
  Choosing Test then shows
  "1199 of 2621 items" and 100 rows again; choosing the task transfer_mode resets the label and shows the 9-column head
  with From family and To family as plain text; the filters transfer_mode, excluded, unmapped show "0 of 983 items" and
  "No items match.". Opening `#/benchmark/items?task=chrono2023-module_type&platform=Aand2024%2FP1` shows the platform
  `Aand2024/P1` and "6 of 2621 items"; removing it shows "2621 of 2621 items" and the URL
  `#/benchmark/items?task=chrono2023-module_type`.

### AC-13 Loading and errors (REQ-015)
- `#/benchmark` requests `data/benchmark.json` and no `benchmark-items.json`, no `data/platforms/` file and no
  `data/taxonomy.json`; `#/benchmark/items` requests both benchmark files. With `benchmark.json` held back, the view
  shows "Loading…" after `index.json` has loaded; with it answered 500, it shows the alert "Could not load the benchmark
  data: …"; with `benchmark-items.json` answered 500, `#/benchmark/items` shows the same alert. `#/benchmark/x` shows
  the not-found view.

### AC-14 Navigation and lazy chunk (REQ-015)
- The navigation bar has "Benchmark" after "Taxonomy" and it opens `#/benchmark`; opening `#/browse` first loads no
  `Benchmark-*.js` chunk, which loads when `#/benchmark` opens.

### AC-15 375 px (REQ-015)
- At 375 × 812, `#/benchmark` (with the details element opened) and `#/benchmark/items?task=chrono2023-transfer_mode`
  have `document.documentElement.scrollWidth` ≤ `clientWidth`; table cells show their column label.

### AC-16 Existing views and tests (REQ-005, REQ-016)
- All earlier Vitest (389) and Playwright (52) tests pass. The only permitted edits to existing tests are:
  in `tests/derive.test.ts`, the benchmark test (fixture `split_counts` gains `excluded: 0`; the `reference_results`
  expectation follows the extended fixture file and the typed shape) and the output-directory listing (gains
  `benchmark-items.json`); in `tests/release.test.ts`, AC-10 adapted to the typed `benchmark.json`; in
  `tests/libBoundary.test.ts`, `FILES` gains `benchmark.ts`; and, in any test that enumerates the navigation links,
  the added "Benchmark" link. Adding new test cases to existing test files is not an edit of existing tests. Each edit
  is listed in `progress.md` §E.2.
