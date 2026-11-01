# Progress: SPEC-TRENDS-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- plan-auditor: iteration 1 FAIL 0.78 (3 blocking defects D1 to D3, 8 minor D4 to D11); all applied in version
  0.2.0, D1 by the orchestrator's decision (adjacent-pair separation plus secondary encoding, dark tokens unchanged)
  instead of the auditor's proposed token replacement. Report: `.moai/reports/plan-audit/SPEC-TRENDS-001-review-1.md`.
  Iteration 2 FAIL 0.86 (1 blocking defect N1, 3 minor N2 to N4); all applied in version 0.3.0. Report:
  `.moai/reports/plan-audit/SPEC-TRENDS-001-review-2.md`. Iteration 3 PASS 0.95 (no blocking defects;
  optional notes O1 validator pinned to the Claude Code 2.1.309 skill bundle, O2 two dark slots at the upper edge of
  the dark lightness band). Report: `.moai/reports/plan-audit/SPEC-TRENDS-001-review-3.md`.
- Size: 16 REQs, 16 ACs (Tier M ceiling 16 each).
- Dependencies: SPEC-DATA-001 and SPEC-BROWSE-001 status completed.
- The numbers in `acceptance.md` (bins and labels in AC-3, offered values in AC-4, link URLs and counts in AC-5,
  count tables in AC-6, contrasts and ramp steps in AC-7, caption texts in AC-8, the counts in AC-11 to AC-14 and
  AC-16, and the 0.2.0 additions in section 10 of the script: bin-total links, autonomy value labels in accessible
  names, rendered shading of two cells, the "Filters (n active)" count and the inverted year inputs) were computed on 2026-11-02 from release 1.0.0 `public/data/index.json` with `expected-counts.mjs` in this
  folder, which re-implements the filter rules of SPEC-BROWSE-001 and the rules of spec §2 (run from the repository
  root: `node .moai/specs/SPEC-TRENDS-001/expected-counts.mjs`). Spot check without the script:
  `node -e 'const i=require("./public/data/index.json");console.log(i.papers.filter(p=>p.first_public_year===2021&&p.integration_mode==="fixed_tubing").length)'`
  → 9 (the segment "2021, fixed_tubing: 9 of 17 papers").
- `@observablehq/plot` 0.6.17: `npm view @observablehq/plot@0.6.17` on 2026-11-02 lists dependencies `d3` ^7.9.0,
  `isoformat` ^0.2.0, `interval-tree-1d` ^1.0.0 (release date 2025-02-14 as given in the plan request).
- Palette validator (spec REQ-012 (a)), run by the orchestrator on 2026-11-02: `scripts/validate_palette.js` of the
  data-visualization skill bundled with Claude Code 2.1.309 (not in this repository), run from the skill directory.
  Commands:
  - `node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300,#6250d6" --mode light --surface "#ffffff"`
  - `node scripts/validate_palette.js "#3987e5,#d95926,#199e70,#c98500,#d55181,#008300,#9085e9" --mode dark --surface "#1a1a19"`
  - `node scripts/validate_palette.js "#86b6ef,#3987e5,#1c5cab" --ordinal --mode light --surface "#ffffff"`
  - `node scripts/validate_palette.js "#86b6ef,#3987e5,#1c5cab" --ordinal --mode dark --surface "#1a1a19"`

  Verbatim output, in that order:

  ```
  Palette (light, surface #ffffff, categorical): 7 slots
    [PASS] Lightness band         all 7 inside L 0.43–0.77
    [PASS] Chroma floor           all 7 >= 0.1
    [PASS] CVD separation         worst adjacent #eda100↔#1baf7a ΔE 9.1 (protan) · tritan 5.8
    [PASS] Normal-vision floor    worst adjacent #e87ba4↔#eda100 ΔE 19.6 (normal)
    [WARN] Contrast vs surface    below 3:1 — relief required (visible labels or table view): [["#1baf7a",2.82],["#eda100",2.17],["#e87ba4",2.69]]
    → ALL CHECKS PASS
  Palette (dark, surface #1a1a19, categorical): 7 slots
    [PASS] Lightness band         all 7 inside L 0.48–0.67
    [PASS] Chroma floor           all 7 >= 0.1
    [PASS] CVD separation         worst adjacent #c98500↔#199e70 ΔE 8.4 (protan) · tritan 8.7
    [PASS] Normal-vision floor    worst adjacent #d55181↔#c98500 ΔE 19.3 (normal)
    [PASS] Contrast vs surface    all 7 >= 3:1
    → ALL CHECKS PASS
  Palette (light, surface #ffffff, ordinal ramp): 3 slots
    [PASS] Lightness monotone     steps read light→dark
    [PASS] Adjacent ΔL            all gaps >= 0.06
    [PASS] Light-end contrast     #86b6ef at 2.11:1 vs surface
    [PASS] Single hue             hue spread 3°
    → ALL CHECKS PASS
  Palette (dark, surface #1a1a19, ordinal ramp): 3 slots
    [PASS] Lightness monotone     steps read light→dark
    [PASS] Adjacent ΔL            all gaps >= 0.06
    [PASS] Light-end contrast     #1c5cab at 2.63:1 vs surface
    [PASS] Single hue             hue spread 3°
    → ALL CHECKS PASS
  ```

  The light-mode contrast WARN is met by REQ-012 (b): native `<title>` per segment, legend with labels, count table.
- Residual risk recorded from plan audit iteration 2: in the dark set, two pairs of slots that are not adjacent are
  nearly identical under CVD simulation — `#199e70`/`#d55181` (mixed/none) and `#3987e5`/`#9085e9`
  (fixed_tubing/unmapped). They touch only when every value between them counts 0 in a bar; REQ-012 (c) covers that
  case with the 2 px surface gap, the labels and the table. The dark set is not reachable until the site-wide dark
  theme of step 7.
- Screenshot check at 1280 px and 375 px (orchestrator, 2026-11-02, dev server on port 5173, working tree after the
  run phase): split im at 1280 px shows sidebar filters, stacked bars with n above each bar, "2026*" tick, legend in
  stack order, the partial-year note and the sample note; split mt at 1280 px: table 856 px wide inside an 892 px
  container, no page scroll. At 375 px after a reload: filters collapsed ("Filters (0 active)"), chart 343 px wide,
  tick labels rotated without overlap, document scrollWidth 375 for split im and split mt; the mt table (856 px)
  scrolls inside its 343 px container (`overflow-x: auto`). No "%" in the main text. Observation, not a defect: the
  filter panel's open state is set on mount, so resizing without a reload keeps it (same as the browser).
  `npm audit --omit=dev`: only the existing csv-parse advisory; the Plot/d3 tree adds none.
- Implementation Kickoff Approval: approved by the researcher on 2026-11-02 (progression: autonomous to commit, push
  and sync; stop on failing tests or a needed SPEC change). Chart library (Observable Plot), one chart with a split
  control, count grid for multi-valued splits, and chart colours now with the site-wide dark theme in step 7 were
  settled with the researcher before the SPEC was written.

## §F Phase 4 Mode Selection

- Input parameters: tier M; ~14 files; domains: pure TypeScript library, React view and components, Observable Plot,
  CSS, Playwright (TypeScript only); coding-heavy; concurrency benefit low.
- direct: not selected (new feature). fanout: not selected (coding-heavy, shared types between lib, view and tests).
  sweep: not selected (not a mechanical transform).
- Decision: serial (one manager-develop, cycle_type=tdd).
- Justification: interdependent new UI code on one shared filter module; sequential TDD as in SPEC-BROWSE-001.

## §E.2 Run-phase Evidence

Captured 2026-11-02 against base HEAD 618b6ee plus uncommitted run-phase changes (no commit made by manager-develop).

| AC | Status | Command | Actual output |
|----|--------|---------|---------------|
| AC-1 | PASS | `npx vitest run` (tests/route.test.ts; new `parseRoute: trends` block appended, existing cases unedited) | `✓ tests/route.test.ts (32 tests)` |
| AC-2 | PASS | same (tests/trends.test.ts, "trends URL") | `✓ tests/trends.test.ts (50 tests)` |
| AC-3 | PASS | same ("year bins and labels", inverted inputs) + `npm run e2e` | as above; `✓ AC-3: inverted year inputs apply no range` |
| AC-4 | PASS | same (fixture block and real-index block) | as above |
| AC-5 | PASS | same (12 link/count rows of the AC-5 table, 2010–2014 bin under `years=2010-&split=tm`) | as above |
| AC-6 | PASS | same (unfiltered n, full im table, exclusive column sums, filtered and mt/im selection tables, sum of n = count line) | as above |
| AC-7 | PASS | same (tests/chartTokens.test.ts: token map, styles.css `:root` / `:root[data-theme="dark"]`, 13 contrasts, ramp steps) | `✓ tests/chartTokens.test.ts (10 tests)` |
| AC-8 | PASS | same (17 texts exact, 17 banned substrings, no "%") + tests/libBoundary.test.ts (trends.ts, chartTokens.ts; Plot/d3 pattern; new self-test cases) | `✓ tests/libBoundary.test.ts (7 tests)` |
| AC-9 | PASS | `npm run e2e` | `✓ AC-9: route, navigation and split control` |
| AC-10 | PASS | `npm run e2e` | `✓ AC-10: unit switch, filters and the filter toggle` |
| AC-11 | PASS | `npm run e2e` | `✓ AC-11: cross links show equal count lines` |
| AC-12 | PASS | `npm run e2e` | `✓ AC-12: bar chart, segment and bin-total links, legend` |
| AC-13 | PASS | `npm run e2e` | `✓ AC-13: count table as chart, cell links and shading` |
| AC-14 | PASS | `npm run e2e` | `✓ AC-14: partial year, notes, data card link, no percentages` |
| AC-15 | PASS | `npm run e2e` | `✓ AC-15: the dashboard and Plot load in a lazy chunk` |
| AC-16 | PASS | `npm run e2e` + tails below | `✓ AC-16: narrow screen, keyboard and empty result`; `npm test` 281/281, typecheck exit 0, `npm run build` exit 0, e2e 34/34, src/lib 100% lines; `package.json` has `"@observablehq/plot": "0.6.17"` |

Run-phase checks left open by spec §4 and plan §C:

- `var()` colours in Plot 0.6.17: Plot's `isColor` (`src/options.js`) accepts `var(...)` strings as CSS colours. The
  segments use a `fill` channel holding `var(--chart-im-N)` / `var(--chart-autonomy-N)` with `color: {type: "identity"}`,
  so Plot writes `fill="var(...)"` on each `rect`, and Chromium resolves it: computed fill `rgb(42, 120, 214)` for
  slot 1 and `rgb(27, 175, 122)` for slot 3 (asserted in AC-12). No fallback (class names or computed values) needed.
- Accessible names: Plot's `href` channel wraps each mark in an SVG `<a>` (xlink:href), its `ariaLabel` channel sets
  `aria-label` on the `rect`/`text` inside it, and its `title` channel puts the native `<title>` inside the `rect`
  (so inside the link). `TrendsChart.tsx` (`nameLinks`) moves each `aria-label` from the mark to its `<a>` after
  rendering and mirrors xlink:href into `href`. AC-12 and AC-16 find the links by exact name and follow them with click
  and Enter.
- AC-15 string unique to Plot: `plot-d6a7b5`, Plot's default SVG class name (`maybeClassName` in `src/style.js`).
  Present in the built `Trends-*.js` chunk; absent from every JavaScript response on `#/` (asserted in the test).
- Chunks (`npx vite build`, normal mode): `dist/assets/Trends-Cqzcoyem.js 255.10 kB │ gzip: 89.84 kB`,
  `dist/assets/index-CEvsT5tm.js 717.00 kB │ gzip: 230.24 kB` (main chunk was about 711 kB before; it now holds
  `src/lib/trends.ts`, which the browser's "Show these in Trends" link uses).
- Screenshots at 1280 px and 375 px (`#/trends`, `#/trends?split=field`, `#/trends?split=hw&view=platforms`) were taken
  by the run phase for a visual pass (stacking order, 2 px gaps, rotated tick labels at 375 px, table scroll); the
  orchestrator's screenshot check remains open below.

Verbatim tails:

```
$ npx vitest run --coverage
 Test Files  23 passed (23)
      Tests  281 passed (281)
All files          |   96.84 |    97.33 |   97.91 |   96.84 |
 src/lib           |     100 |    98.28 |   98.75 |     100 |
  chartTokens.ts   |     100 |      100 |     100 |     100 |
  route.ts         |     100 |    97.14 |     100 |     100 | 35
  trends.ts        |     100 |     95.4 |   94.73 |     100 | 138-139,155-156
$ npm run typecheck      → exit 0 (tsc --noEmit, no output)
$ npm run e2e
  34 passed (14.9s)        (9 in e2e/trends.spec.ts, 19 in e2e/browse.spec.ts, 6 in e2e/viewer.spec.ts)
$ npm run build          → exit 0, ✓ built in 3.89s
```

RED before GREEN (unit level):

```
$ npx vitest run tests/route.test.ts tests/trends.test.ts
 FAIL  tests/trends.test.ts [ tests/trends.test.ts ]
Error: Failed to load url ../src/lib/trends (resolved id: ../src/lib/trends) in .../tests/trends.test.ts. Does the file exist?
 FAIL  tests/route.test.ts > parseRoute: trends > parses "#/trends" as trends with query ""
AssertionError: expected { kind: 'notFound', hash: '#/trends' } to deeply equal { kind: 'trends', query: '' }
 FAIL  tests/route.test.ts > parseRoute: trends > parses "#/trends?" as trends with query ""
 FAIL  tests/route.test.ts > parseRoute: trends > parses "#/trends?split=mt&view=platforms" as trends with query "split=mt&view=platforms"
 Test Files  2 failed (2)
      Tests  3 failed | 29 passed (32)
$ npx vitest run tests/chartTokens.test.ts
 FAIL  tests/chartTokens.test.ts [ tests/chartTokens.test.ts ]
Error: Failed to load url ../src/lib/chartTokens (resolved id: ../src/lib/chartTokens) in .../tests/chartTokens.test.ts. Does the file exist?
$ npx vitest run tests/libBoundary.test.ts
   × UI-free library modules (AC-8) > src/lib/chartTokens.ts imports no UI package and reads no window or document
     → ENOENT: no such file or directory, open '.../src/lib/chartTokens.ts'
      Tests  1 failed | 6 passed (7)
```

The Playwright spec was written after the view code; its first run had 2 failures, both in the test (a segment name
also matches the table link once "Counts as a table" is opened; x tick labels read before the chart drew), fixed by
scoping chart links to the SVG and polling for ticks.

## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready
- run_complete_at: 2026-11-02
- AC: 16/16 PASS (AC-1 to AC-8 Vitest, AC-9 to AC-16 Playwright).
- Not committed: all changes are in the working tree for the orchestrator to verify and commit.
- Open for the orchestrator: the screenshot check at 1280 px and 375 px (§E.1 item), and `npm audit` review of the
  new dependency tree (`@observablehq/plot` 0.6.17 with `d3` 7).

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-02
- Implementation commit: defec55 (pushed to the private remote github.com/ccy5123/sdl-workflows-explorer, main).
- Orchestrator verification at sync (HEAD defec55, in sync with origin/main): `npx vitest run` 23 files / 281 tests
  passed, `npm run typecheck` exit 0, `npm run e2e` 34 passed, browser check at 1280 px and 375 px (recorded in §E.1),
  `npm audit --omit=dev` only the pre-existing csv-parse advisory.
- Known follow-ups: (a) the filter panel's open/closed state is set on mount, so resizing without a reload keeps it
  (same as the browser); (b) the main chunk is 717 kB (Cytoscape and the table), the Trends chunk 255 kB; code
  splitting of the other views is a step 7 concern; (c) plan-audit optional notes O1 (validator pinned to the Claude
  Code 2.1.309 skill bundle) and O2 (two dark slots at the upper edge of the dark lightness band); (d) the dark token
  set is defined but unreachable until the site-wide dark theme of step 7; (e) two AC-14 Playwright numbers are sums
  of script output rather than numbers printed by `expected-counts.mjs` (AC-14 row in §E.2).
- Docs: `.moai/project/` and `docs/plan.md` are current; no README yet (planned for step 7). Next step per
  `docs/plan.md` is step 5 (taxonomy explorer).
- sync_commit_sha: pending-backfill (this sync commit)
