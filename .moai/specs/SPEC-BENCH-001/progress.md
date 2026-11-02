# Progress: SPEC-BENCH-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- plan-auditor: iteration 1 FAIL 0.75 (all must-pass criteria PASS; 9 blocking defects D1 to D9, 9 optional D10 to D18);
  all eighteen applied in version 0.2.0. Report: `.moai/reports/plan-audit/SPEC-BENCH-001-review-1.md`. The script
  gained the two REQ-003 (a) checks of D5 (task benchmark_id, reference entry task_id); still 0 problems.
- plan-auditor: iteration 2 FAIL 0.89 (above the threshold; one blocking minor finding N1, optional N2 to N6); all
  six applied in version 0.3.0. Report: `.moai/reports/plan-audit/SPEC-BENCH-001-review-2.md`. Release 1.0.0 has no
  item with an empty field tag and its first uncertain module_type item is `Aand2024/P1/S4` (checked with awk on the
  cache); `Aand2024/P1` is named "auto-optimization platform (AOP)" in `index.json`.
- plan-auditor: iteration 3 PASS 0.95 (no blocking and no optional finding; N1 to N6 verified against the files and
  the data). Report: `.moai/reports/plan-audit/SPEC-BENCH-001-review-3.md`.
- Implementation Kickoff Approval: the researcher approved version 0.3.0 through AskUserQuestion on 2026-11-02 and
  chose autonomous progression (run, browser check, sync and push without intermediate stops).
- Tier M; artifacts: spec.md, plan.md, acceptance.md (plus `expected-counts.mjs` and this file).
- Size: 16 REQs, 16 ACs (Tier M ceiling 16 each).
- Dependencies: SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001 and SPEC-TAXO-001 have status completed
  (frontmatter checked 2026-11-02).
- Researcher decisions of 2026-11-02 (asked by this session through AskUserQuestion before the SPEC was written):
  1. Links from items to the platform viewer: both a per-platform table on `#/benchmark` and an item explorer
     (`#/benchmark/items`) with the item rows in a separate, lazily fetched `benchmark-items.json` (REQ-002, REQ-012
     to REQ-015).
  2. Reference results: a table with four decimals (as DATA_CARD.md and `evaluate.py`'s four-decimal comparison) plus
     `reference_results.json` verbatim in a collapsed block (REQ-001, REQ-010).
  3. The difference reference model − baseline is shown and marked as computed from the two recorded accuracies
     (REQ-010).
  4. Label tables with train/test/excluded counts and links to the taxonomy class pages; input unit operations and
     field tags also link to class pages (REQ-009, REQ-014).
- Decisions taken in the plan phase (for the auditor and the researcher to check):
  - Labels are listed as they occur among the items (22 module types, all of them; 5 transfer modes, `data_transfer`
    absent because it is non-material), ordered by total count, not in `classes.csv` order.
  - Families are not class pages in the site (they are a field of unit-operation classes), so they are plain text.
  - The explorer's split and label controls are in the URL; the platform-table split control is not (it only narrows
    a reference table).
  - The build checks item labels and the uncertain flag against the platform graphs (REQ-003 f); on 1.0.0 all 3,604
    items agree. It does not re-fit the models.
  - The platform viewer has no URL for a selected step or connection, so item links open the platform.
  - Site text keeps the two commands of the release README for `evaluate.py`; it does not copy the script.
  - Size ceilings: `benchmark.json` 40,000 bytes (estimate 22,561), `benchmark-items.json` 500,000 bytes (estimate
    418,205).
- Baseline (2026-11-02, HEAD 182c11f), derived before this SPEC: `public/data/index.json` sha256
  6b644e3cba4bdbd007e85d5fdfc10494329e0aaa4337d2c37c4cb6c15ca5db4d (247,729 bytes); `public/data/taxonomy.json` sha256
  e33f52e3398e1d411f1522c1e3953c41165828a7693e9582c90c6fd9880acdc9 (94,799 bytes); the 238 files
  `public/data/platforms/*.json` concatenated in `LC_ALL=C` sorted order, sha256
  9001ca64126b7bb996076a0b8b172d5c3d5b293171529dcf9aca08d8599889a8. In the verified cache
  `.cache/release/extract/sdl-workflows-1.0.0/`, `modes/benchmark/items_module_type.csv` is byte-identical (`cmp`) to
  the local release.
- Expected numbers: `node .moai/specs/SPEC-BENCH-001/expected-counts.mjs` run from the repository root on 2026-11-02,
  exit 0. Verbatim output (re-run for version 0.2.0):

```

== 1. Paper split (split.csv) ==
split.csv rows / index papers                              238 / 238
papers missing from split.csv / not in index               0 / 0
paper split counts                                         {"train":135,"test":99,"excluded":4}
exclusion reasons                                          {"used to develop the extraction instructions":4}
excluded papers                                            DelgadoLicona2025, Tamura2025, Wang2026, Yoo2026
non-excluded rows with a reason                            0
benchmark_id values                                        ["chrono2023"]
data_dictionary benchmark_split/benchmark_id               Benchmark: chrono2023 trains on papers first public in 2023 or earlier and tests on papers first public in 2024 or later.

== 2. Tasks and reference results ==
task files                                                 ["chrono2023-module_type.json","chrono2023-transfer_mode.json"]
reference_results keys                                     ["chrono2023-module_type","chrono2023-transfer_mode"]
chrono2023-module_type target / keys                       module_type / task_id,benchmark_id,target,item_rule,inputs,metric,baseline_rule,baseline_top1,reference_model,reference_model_top1,diff_ci95_low,diff_ci95_high,n_test_items,n_test_papers,recorded_in
chrono2023-module_type reference row keys                  task_id,n_test_items,n_test_papers,baseline_top1,reference_model_top1,diff_ci95_low,diff_ci95_high,replicates
chrono2023-module_type benchmark_id / reference task_id    chrono2023 / chrono2023-module_type
chrono2023-module_type 4-decimal row                       1199 (99) | 0.6681 | 0.6881 | +0.0200 | [-0.0097, +0.0529] | 2000
chrono2023-transfer_mode target / keys                     transfer_mode / task_id,benchmark_id,target,item_rule,inputs,metric,baseline_rule,baseline_top1,reference_model,reference_model_top1,diff_ci95_low,diff_ci95_high,n_test_items,n_test_papers,recorded_in
chrono2023-transfer_mode reference row keys                task_id,n_test_items,n_test_papers,baseline_top1,reference_model_top1,diff_ci95_low,diff_ci95_high,replicates
chrono2023-transfer_mode benchmark_id / reference task_id  chrono2023 / chrono2023-transfer_mode
chrono2023-transfer_mode 4-decimal row                     426 (93) | 0.4413 | 0.5117 | +0.0704 | [+0.0172, +0.1255] | 2000
reference_results.json bytes / ends with newline           619 / true

== 3. Items ==
chrono2023-module_type rows                                2621
chrono2023-module_type items by split                      {"train":1384,"test":1199,"excluded":38}
chrono2023-module_type uncertain by split                  {"train":171,"test":163,"excluded":6}
chrono2023-module_type distinct test papers                99
chrono2023-module_type platforms with items                280
chrono2023-module_type items disagreeing with the platform graph 0
chrono2023-module_type labels (22)                         
   software                     train  362  test  281  excluded   9
   liquid_handler               train  123  test  194  excluded   6
   fluidics                     train  200  test   95  excluded   5
   instrument_separation_ms     train  151  test   61  excluded   1
   flow_reactor                 train  128  test   71  excluded   3
   instrument_optical           train   80  test   65  excluded   2
   batch_reactor                train   72  test   71  excluded   3
   human                        train   29  test   48  excluded   0
   separation_unit              train   24  test   40  excluded   0
   coating_printing_unit        train   19  test   41  excluded   2
   mixer                        train   26  test   32  excluded   3
   thermal_unit                 train   18  test   36  excluded   0
   instrument_imaging           train   21  test   26  excluded   1
   instrument_electrochemical   train   20  test   23  excluded   0
   unmapped                     train   22  test   19  excluded   0
   instrument_physical          train   24  test   15  excluded   1
   sample_handling_station      train   12  test   22  excluded   1
   instrument_structural        train   16  test   15  excluded   0
   commercial_integrated        train   18  test    9  excluded   0
   storage                      train   14  test   12  excluded   0
   solid_dispenser              train    5  test   19  excluded   1
   assembly_unit                train    0  test    4  excluded   0
chrono2023-module_type first item                          ["Aand2024/P1/S1","test","fluidics","chemistry_synthesis","dispense_liquid","START","react_photo_electro",0]
chrono2023-transfer_mode rows                              983
chrono2023-transfer_mode items by split                    {"train":542,"test":426,"excluded":15}
chrono2023-transfer_mode uncertain by split                {"train":47,"test":51,"excluded":1}
chrono2023-transfer_mode distinct test papers              93
chrono2023-transfer_mode platforms with items              270
chrono2023-transfer_mode items disagreeing with the platform graph 0
chrono2023-transfer_mode labels (5)                        
   fixed_tubing                 train  298  test  120  excluded   3
   robot_arm_gantry             train  175  test  189  excluded  11
   human_transfer               train   58  test   83  excluded   0
   mobile_robot                 train   10  test   29  excluded   1
   unmapped                     train    1  test    5  excluded   0
chrono2023-transfer_mode first item                        ["Aand2024/P1/E1","test","fixed_tubing","chemistry_synthesis","dispense_liquid","react_photo_electro","prepare","react",0]

== 4. Items by platform ==
index platforms / platforms with any item                  280 / 280
platforms without items                                    []
platforms by paper split                                   {"test":116,"train":160,"excluded":4}
platform Aand2024/P1                                       {"platform_id":"Aand2024/P1","split":"test","n":[6,3]}
platform Aand2024/P1                                       {"platform_id":"Aand2024/P1","split":"test","n":[6,3]}
platform Zhu2024/P1                                        {"platform_id":"Zhu2024/P1","split":"test","n":[14,7]}
platforms with 0 transfer_mode items                       10
test platforms with 0 transfer_mode items                  7

== 5. Size estimates (JSON.stringify, no whitespace) ==
benchmark.json estimate (bytes)                            22561
benchmark-items.json estimate (bytes)                      418205

== Result ==
problems                                                   0
(exit 0)
```

## §E.2 Run-phase Evidence

- Fixture extension (`tests/fixtures/release-mini/`, AC-1 to AC-3): new `modes/benchmark/items_module_type.csv` (the
  five steps with a first module: PaperA2024/P1/S1 fluidics, P1/S2 software uncertain, P2/S1 fluidics, P2/S2 robot_arm,
  PaperB2025/P1/S1 software) and `items_transfer_mode.csv` (the two material connections PaperA2024/P2/E1 and E2, E2
  uncertain, both fixed_tubing); the task files carry all 15 fields and `reference_results.json` all 8 fields per entry
  (`n_test_items`, `n_test_papers` and `baseline_top1` unchanged: 1 / 1 / 1.0 and 0 / 0 / 0.0); `data_dictionary.csv`
  gains the `benchmark_split` rows `benchmark_id` and `split`. Graphs, papers, platforms and taxonomy are unchanged.
- Fixture-derived values asserted in `tests/derive.test.ts` ("benchmark on the fixture release"):
  - `benchmark_id` "mini"; `split_rule` "Benchmark: mini trains on papers first public in 2024 and tests on papers
    first public in 2025."; `split_counts` {train: 1, test: 1, excluded: 0}; `exclusion_reasons` [].
  - `summaries`: mini-module_type items {4, 1, 0}, uncertain {1, 0, 0}, labels fluidics (2, 0, 0), software (1, 1, 0),
    robot_arm (1, 0, 0); mini-transfer_mode items {2, 0, 0}, uncertain {1, 0, 0}, labels fixed_tubing (2, 0, 0).
  - `platforms`: PaperA2024/P1 train [2, 0]; PaperA2024/P2 train [2, 2]; PaperB2025/P1 test [1, 0].
  - `reference_results` deep-equals the parsed fixture file, keys in file order; `reference_results_text` equals it.
  - `benchmark-items.json`: mini-module_type 5 rows, first ["PaperA2024/P1/S1", "train", "fluidics", "chem",
    "dispense_liquid", "START", "analyze_data", 0], uncertain column [0, 1, 0, 0, 0]; mini-transfer_mode 2 rows
    ["PaperA2024/P2/E1", "train", "fixed_tubing", "chem", "dispense_liquid", "measure_optical", "prepare", "measure", 0]
    and ["PaperA2024/P2/E2", ..., "measure_optical", "dispense_liquid", "measure", "prepare", 1].
- Edits of existing tests (AC-16):
  - `tests/derive.test.ts` "derives the benchmark tasks, split counts and reference results as published":
    `split_counts` expectation `{ train: 1, test: 1 }` → `{ train: 1, test: 1, excluded: 0 }`; the task-id map no longer
    casts (`t.task_id`, typed shape); the `reference_results` expectation is unchanged in form (deep-equals the extended
    fixture file).
  - `tests/derive.test.ts` "writes index.json, taxonomy.json, benchmark.json and one platform file per paper": the
    output-directory listing gains `benchmark-items.json`.
  - `tests/release.test.ts` AC-10 benchmark test: no edit was needed; it passes unchanged on the typed shape.
  - `tests/libBoundary.test.ts`: `FILES` gains `benchmark.ts`.
  - Navigation-link enumerations gain "Benchmark" after "Taxonomy": `e2e/taxonomy.spec.ts` (AC-11 test, line 92) and
    `e2e/trends.spec.ts` (AC-9 test, line 37).
  - `tests/route.test.ts`: new cases only (a new `describe` block for AC-5); no existing case changed.
- New test files: `tests/benchmark-derive.test.ts` (AC-1 to AC-4 on the real release), `tests/benchmark.test.ts`
  (AC-6 to AC-8), `e2e/benchmark.spec.ts` (AC-10 to AC-15). The e2e tests were written after `src/views/Benchmark.tsx`
  (the RED step of the view unit was the library tests and the REQ-016 scan of the view file); they passed on their
  first run.
- Vitest 389 → 445 tests, all passing; Playwright 52 → 61 tests, all passing. The lazy chunk is
  `dist-e2e/assets/Benchmark-<hash>.js` (14.92 kB).
- Build after the change (`npm run build-data`, exit 0): `benchmark.json` 22,561 bytes, `benchmark-items.json` 418,205
  bytes (both equal to the plan estimates); `index.json` sha256 6b644e3c…ca5db4d, `taxonomy.json` e33f52e3…80acdc9 and
  the 238 platform files concatenated 9001ca64…99889a8, equal to the §E.1 baseline.

- Orchestrator verification of the run commits (HEAD cbebd15): `npm run typecheck` exit 0; `npm run build-data` exit
  0 with the sizes and the three baseline hashes above; `node .moai/specs/SPEC-BENCH-001/expected-counts.mjs` exit 0;
  `npx vitest run` 27 files / 445 tests passed; `npm run e2e` 61 passed; `git ls-files public/data` 0 files.
- Screen check by the orchestrator (built site, `vite preview` on port 4318, in-app browser):
  - 1280 px: `#/benchmark` in the order of REQ-007 with the texts of AC-8/AC-10; the published JSON opens and matches
    the file; `#/benchmark/items` was replaced by `#/benchmark/items?task=chrono2023-module_type`, "2621 of 2621 items",
    100 rows; scrollWidth 1265 = clientWidth on both pages; no console error.
  - Finding at 1280 px: the explorer and the page tables broke words mid-word ("Spli|t", "trai|n",
    "sample_handling_statio|n", platform ids, "Replicates"), because `.benchmark { overflow-wrap: anywhere }` let the
    table columns shrink below word width. Fix (the rule of the taxonomy tables, SPEC-TAXO-001 REQ-016): table cells
    use `overflow-wrap: normal`, and ids and class names in table cells get a `<wbr>` after each "_" or "/". Test first:
    a new Playwright test "table words wrap only at spaces, hyphens, _ or / at 1280 px" failed with 184 broken words
    (`Expected - 1 / Received + 184`, first entries "top-1", "Replicates", "chrono2023-module_type", "AbdelLatif2021/P1")
    and passed after the fix. Edited: `src/views/Benchmark.tsx` (a `Breakable` text component), `src/styles.css`, the
    new test in `e2e/benchmark.spec.ts`.
  - 375 px: `#/benchmark` (published JSON open) and `#/benchmark/items?task=chrono2023-transfer_mode` have scrollWidth
    375 = clientWidth; tables stack as labelled blocks.
  - After the fix: Vitest 445 passed, Playwright 62 passed (52 before this SPEC), typecheck exit 0.


## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready
- run_complete_at: 2026-11-02
- AC-1 to AC-16: PASS (unit tests in `tests/{derive,benchmark-derive,benchmark,route,libBoundary,release}.test.ts`,
  Playwright in `e2e/benchmark.spec.ts`; the nav-link lists of `e2e/{taxonomy,trends}.spec.ts`).
- Run commits: d4937a3, fde1c7f, cbebd15 (implementation), 5c9573c (screen-check fix).

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-02
- sync_commit_sha: 7a61e4a
- Orchestrator verification at sync (HEAD 5c9573c): `npm run typecheck` exit 0; `npx vitest run` 27 files / 445 tests
  passed (389 before this SPEC); `npm run e2e` 62 passed (52 before); `npm run build-data` exit 0, release count check
  passing; `expected-counts.mjs` exit 0; `public/data/benchmark.json` 22,561 bytes, `benchmark-items.json` 418,205
  bytes; `index.json`, `taxonomy.json` and the platform files equal to the §E.1 baseline hashes.
- Browser check at 1280 px and 375 px: see §E.2 (no horizontal scroll, no console error; the mid-word wrap finding was
  fixed in 5c9573c).
- Project docs (`.moai/project/`, `docs/plan.md`) unchanged; step 7 (home/about, accessibility pass, deployment) not
  started. The GitHub repository stays private.

## §F Phase 4 Mode Selection

- Inputs: Tier M; about 12 to 15 files (scripts, src, tests, e2e, fixture); domains: data pipeline, routing, view,
  tests; TypeScript and CSS; concurrency benefit low (coding-heavy, files depend on the shared types).
- Evaluation: direct — not selected (multi-file feature); serial — selected; fanout — not selected (coding-heavy work
  with shared types; Anthropic's coding-task parallelism caveat); sweep — not selected (not a uniform mechanical edit).
- Decision: serial
- Justification: one general-purpose implementation agent in the main checkout works through plan.md §B in order, test
  first per unit. manager-develop is not used because its worktree isolation fails on this WSL UNC path (hand-over
  notes of steps 4 and 5). The orchestrator re-runs the verification batch and checks the view in the browser.

## §G Amendment 0.4.0

- Requested by the researcher after a screen check of `#/benchmark` on origin/main a1435f0, relayed by the
  orchestrating session: (1) metric stated three times, (2) Baseline / Reference model paragraphs without task labels,
  (3) the working label "(sdl-db-02 H1)" in the displayed reference-model text.
- spec.md 0.4.0: status completed → in-progress, `amendment_of: SPEC-BENCH-001`, Amendments section
  (prior_completed_sha a1435f0); REQ-010, AC-8 and AC-10 changed.
- plan-auditor (amendment iteration 1): PASS 0.94, no blocking finding; optional D1 to D3 applied (AC-8 tests a second
  label form and two occurrences; the shared-metric line needs two or more tasks; AC-10 names `baseline_rule`), D4
  needs no change. Report: `.moai/reports/plan-audit/SPEC-BENCH-001-amend-0.4.0-review-1.md`.
- Approved by the researcher through AskUserQuestion on 2026-11-02 (table form Task | Baseline | Reference model).
