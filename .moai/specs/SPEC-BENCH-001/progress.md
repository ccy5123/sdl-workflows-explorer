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
