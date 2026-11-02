# Plan: SPEC-BENCH-001

## A. Context

Step 6 of `docs/plan.md`. Depends on SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001 and SPEC-TAXO-001
(all completed). Development mode: TDD. Extends `buildBenchmark` in `scripts/lib/derive.ts` and `writeDerived`, the
hash router, and adds one lazily loaded view with a pure helper module. The release under `~/research/sdl-db/` is
read-only; the build reads the verified cache in `.cache/release/`.

## B. Tasks (TDD per unit), most likely to change first

1. Shapes (AC-1, AC-2): new types in `src/data/types.ts` (`BenchmarkTask`, `SplitCounts`, `BenchmarkSummary`,
   `BenchmarkPlatform`, `ReferenceResult`, `BenchmarkJson` replacing the untyped one, `BenchmarkItemsJson`). Field
   names and nesting first, since the view and every test depend on them.
2. Fixture (AC-1 to AC-3): extend `tests/fixtures/release-mini/` with `items_module_type.csv` and
   `items_transfer_mode.csv` consistent with the fixture graphs and taxonomy, full task files, matching
   `reference_results.json`, and the `benchmark_split` data-dictionary row; update fixture-derived expected values
   (the `split_counts` test gains `excluded: 0`; the output directory listing gains `benchmark-items.json`) in the same
   commit and list each changed value in `progress.md` §E.2.
3. `buildBenchmark` (AC-1, AC-2) and the checks (a) to (i) of REQ-003 (AC-3), each throwing from `deriveAll`; the
   graphs and classes it needs are already read by `deriveAll`. `writeDerived` writes `benchmark-items.json`.
   Real-release tests in a new `tests/benchmark-derive.test.ts` with the skip message; `tests/release.test.ts` AC-10
   adapted to the typed shape. Sizes and unchanged-file hashes (AC-4).
4. `src/lib/benchmark.ts` (AC-6 to AC-9): query decode/encode and `benchmarkItemsHash`; `filterItems`; link targets
   of the split, label and platform tables; reference-row formatting; site texts (task titles, item units, caption,
   metric definition, evaluation note, banned words). `tests/benchmark.test.ts`; `tests/libBoundary.test.ts` covers it.
5. Route (AC-5): kinds `benchmark` and `benchmarkItems` in `src/lib/route.ts`; new cases only in `tests/route.test.ts`.
6. View `src/views/Benchmark.tsx`: page and explorer, module-level cached fetches of the two files, loading and error
   states; CSS reusing the taxonomy stacked-table pattern (`data-label`), `pre` wrapping. No colour tokens needed.
7. `src/App.tsx`: `React.lazy` import, both route kinds, nav link "Benchmark" after "Taxonomy".
8. Playwright `e2e/benchmark.spec.ts` (AC-10 to AC-15); existing e2e tests pass (AC-16).

## C. Risks

| Risk | Mitigation |
|---|---|
| `benchmark-items.json` (about 418 kB) is large | Loaded only on `#/benchmark/items` (REQ-015, AC-13); ceiling 500,000 bytes (REQ-004); GitHub Pages serves it compressed |
| 2621 rows would make the explorer slow on phones | 100 rows at a time with "Show 100 more" (REQ-014) |
| Count links and the explorer could disagree (stale filter rules) | One `filterItems` function in `src/lib/benchmark.ts` used for both the link counts' test and the explorer; AC-7 checks every link target on the real data |
| The checks of REQ-003 (f) re-read the graphs and could slow the build | One map from step and connection id per platform; 3,604 lookups |
| A later release changes the task file fields | REQ-003 (b) fails the build instead of showing missing values |
| Ranking language slips into site text | REQ-016 word list and AC-8 scan |
| Fixture extension changes fixture counts used by other tests | Items are new files; graphs, papers and taxonomy of the fixture are not changed unless a check needs it, and any changed value is listed in §E.2 |

## D. Constraints

- Derived JSON in `public/data/` is not committed. Hash routes. English site text. 375 px without horizontal scroll.
- No change to `index.json`, `taxonomy.json`, platform files, or existing views beyond the navigation link.
- Commit with explicit paths; Conventional Commits; trailer `🗿 MoAI`; no `--no-verify`, no force-push; the GitHub
  repository stays private.
