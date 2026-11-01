# Progress: SPEC-BROWSE-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- plan-auditor: iteration 1 FAIL 0.84 (6 blocking defects D1 to D6, 11 minor D7 to D17); all applied in version
  0.2.0 except D7 (REQ-001 kept whole to stay within 16 REQs); iteration 2 PASS 0.95 (Tier M threshold 0.80).
  Optional follow-ups N1 to N4 (list-item rule, REQ-003 year exception, failed-file naming, AC-8 match pattern)
  applied by the orchestrator as one-sentence edits. Reports: `.moai/reports/plan-audit/SPEC-BROWSE-001-review-{1,2}.md`.
- Size: 16 REQs, 16 ACs (Tier M ceiling 16 each).
- Dependencies: SPEC-DATA-001 and SPEC-VIEW-001 status completed.
- The offered values in `acceptance.md` AC-3, the counts in AC-5 and the comparison rows in AC-6 and AC-14 (module
  counts by type over all modules, material-connection counts by transfer mode, steps by `step_order`, for
  Aand2024/P1 + Li2020/P1 and + Angello2022/P1) were computed on 2026-11-02 from
  release 1.0.0 `public/data/` with `expected-counts.mjs` in this folder, which applies the rules of spec §2 (run from
  the repository root: `node .moai/specs/SPEC-BROWSE-001/expected-counts.mjs`). Spot check without the script:
  `node -e 'const i=require("./public/data/index.json");console.log(i.platforms.filter(l=>l.module_types.includes("flow_reactor")).length)'`
  → 127.
- `@tanstack/react-table` 9.3.1 is the npm `latest` tag on 2026-11-02 (peer `react >=18`; the project uses 18.3.1).
- Implementation Kickoff Approval: approved by the researcher on 2026-11-02 (progression: autonomous to commit and
  push; stop on failing tests or a needed SPEC change).

## §F Phase 4 Mode Selection

- Input parameters: tier M; ~18 files; domains: pure TypeScript filter library, React views, TanStack Table,
  Playwright (TypeScript only); coding-heavy.
- direct: not selected. fanout: not selected (shared types between lib, views and tests). sweep: not selected.
- Decision: serial (one manager-develop, cycle_type=tdd).
- Justification: interdependent new UI code on one shared filter module; sequential TDD as in SPEC-VIEW-001.

## §E.2 Run-phase Evidence

Captured 2026-11-02 against base HEAD 906f261 plus uncommitted run-phase changes (no commit made by manager-develop).
Raw logs: `.moai/state/verify/browse-*.txt` (local, git-ignored).

| AC | Status | Command | Actual output |
|----|--------|---------|---------------|
| AC-1 | PASS | `npx vitest run` (tests/route.test.ts; existing cases unedited, only the import line gained `compareHash`) | `✓ tests/route.test.ts (26 tests)` |
| AC-2 | PASS | same (tests/filterUrl.test.ts, encode and round trip) | `✓ tests/filterUrl.test.ts (17 tests)` |
| AC-3 | PASS | same (tests/filterUrl.test.ts, bad input and offered values of the real index) | as above |
| AC-4 | PASS | same (tests/filterApply.test.ts, fixture) | `✓ tests/filterApply.test.ts (28 tests)` |
| AC-5 | PASS | same (tests/filterApply.test.ts, 17 real-index counts, Zhang2025b, chemspeed ids) | as above |
| AC-6 | PASS | same (tests/compare.test.ts, fixture and real Aand2024/P1 + Li2020/P1 [+ Angello2022/P1]) | `✓ tests/compare.test.ts (16 tests)` |
| AC-7 | PASS | same (tests/compare.test.ts, id check order) | as above |
| AC-8 | PASS | same (tests/libBoundary.test.ts) + falsifiability probe | `✓ tests/libBoundary.test.ts (5 tests)`; probe: `1 failed` (see below) |
| AC-9 | PASS | `npm run e2e` | `✓ AC-9: a filtered URL opens the browser` |
| AC-10 | PASS | `npm run e2e` (4 tests) | `✓ AC-10: filters write the URL without adding history entries`, `… the Browse link resets a filtered browser`, `… year inputs that cannot apply stay out of the URL`, `… Clear filters keeps the table and the selection` |
| AC-11 | PASS | `npm run e2e` | `✓ AC-11: the match control switches between all and any` |
| AC-12 | PASS | `npm run e2e` | `✓ AC-12: sorting and the column chooser by keyboard` |
| AC-13 | PASS | `npm run e2e` | `✓ AC-13: selecting platforms for comparison` |
| AC-14 | PASS | `npm run e2e` | `✓ AC-14: the comparison page` |
| AC-15 | PASS | `npm run e2e` (5 tests: ids; HTTP 500, not JSON, file without the platform, aborted request) | `✓ AC-15: comparison errors by id` and 4 × `✓ AC-15: comparison errors when a paper file fails › …` |
| AC-16 | PASS-WITH-NOTE | see tails below | 375 px test passes; tests, typecheck, `npx vite build` and e2e exit 0; src/lib 100% lines; `package.json` has `"@tanstack/react-table": "9.3.1"`. `npm run build` (fetch-release + build-data + vite build) was not run in the run phase; `npx vite build` used the existing `public/data/` |

Also added: `REQ-003: Back from a platform opened in a filtered browser restores the filters` (e2e, passes).

Orchestrator re-verification before commit (logs `.moai/state/verify/orch-browse-*.txt`): `npx vitest run` 210/210;
`npm run typecheck` exit 0; `npm run e2e` 22/22; `SDL_RELEASE_ZIP=<local zip> npm run build` exit 0 (zip SHA-256 and
MANIFEST verified, counts match, `✓ built in 2.60s`), which settles the AC-16 note; `window.__cy=` absent from `dist/`.
Browser check: `#/browse?view=platforms&years=2018-2024&field=catalysis&mt=flow_reactor` shows "6 of 280 platforms";
`#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1` shows 8 module-type and 3 transfer-mode rows; at 375 px
`#/browse?view=platforms` has `scrollWidth` 375. `npm audit`: 3 moderate advisories in packages present before this
SPEC (vitest's mocker, csv-parse, esbuild via vite), none in the TanStack packages.

Verbatim tails:

```
$ npx vitest run --coverage
 Test Files  20 passed (20)
      Tests  210 passed (210)
All files          |   96.34 |     97.5 |   98.29 |   96.34 |
 src/lib           |     100 |    98.96 |     100 |     100 |
  compare.ts       |     100 |    97.82 |     100 |     100 | 43
  filterApply.ts   |     100 |      100 |     100 |     100 |
  filterState.ts   |     100 |      100 |     100 |     100 |
  filterUrl.ts     |     100 |    98.55 |     100 |     100 | 68
  route.ts         |     100 |    96.66 |     100 |     100 | 34
$ npm run typecheck      → exit 0
$ npm run e2e
  22 passed (10.5s)        (16 in e2e/browse.spec.ts, 6 in e2e/viewer.spec.ts)
$ npx vite build         → exit 0, ✓ built in 2.61s
$ grep -rc "window.__cy=" dist/ | grep -v ":0$"      → (none)
$ grep -rc "window.__cy=" dist-e2e/ | grep -v ":0$"  → dist-e2e/assets/index-DYl2drik.js:1
```

RED before GREEN (`.moai/state/verify/browse-red-{filterUrl,filterApply,compare,route,libBoundary}.txt`):

```
 FAIL  tests/filterUrl.test.ts   Error: Failed to load url ../src/lib/filterState … Does the file exist?
 FAIL  tests/filterApply.test.ts Error: Failed to load url ../src/lib/filterApply … Does the file exist?
 FAIL  tests/compare.test.ts     Error: Failed to load url ../src/lib/compare … Does the file exist?
 FAIL  tests/route.test.ts > parseRoute: browse and compare > parses "#/browse" as browse with query ""
   AssertionError: expected { kind: 'notFound', hash: '#/browse' } to deeply equal { kind: 'browse', query: '' }   (10 failed)
 FAIL  tests/libBoundary.test.ts > … src/lib/filterState.ts … Error: ENOENT: no such file or directory   (4 failed)
```

AC-8 falsifiability (once, `.moai/state/verify/browse-ac8-falsifiability.txt`): with `import { useMemo } from "react";`
appended to `src/lib/filterApply.ts`, `npx vitest run tests/libBoundary.test.ts` gave
`AssertionError: expected [ 'import from a UI package' ] to deeply equal []` and `Tests  1 failed | 4 passed (5)`;
the file was restored and the suite passes (`Tests  5 passed (5)`).

TanStack Table 9.3.1: `useTable` with `tableFeatures({ rowSortingFeature, columnVisibilityFeature, sortedRowModel:
createSortedRowModel() })`, options `sortDescFirst: false`, `enableMultiSort: false`, per-column `sortFn` and
`sortUndefined: "last"`; the library's own tie-break (`rowA.index - rowB.index`) keeps `index.json` order. All TanStack
code is in `src/components/DataTable.tsx`.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-11-02
run_commit_sha: 9ba5553
run_status: audit-ready
ac_pass_count: 16
ac_fail_count: 0
new_warnings_or_lints_introduced: "vite chunk-size warning grows from 651 kB to 711 kB (TanStack Table added)"
total_run_phase_files: 20
```

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-02
- Implementation commit: 9ba5553 (pushed to the private remote github.com/ccy5123/sdl-workflows-explorer, main).
- Orchestrator re-verification at sync (HEAD 9ba5553, in sync with origin/main): `npx vitest run` 210/210,
  `npm run typecheck` exit 0; the e2e (22/22) and full build results above were taken on the same tree.
- Known follow-ups: the duplicate-id compare message says "Listed twice" for any repeat count; 3 moderate
  `npm audit` advisories in pre-existing dev and build dependencies; sort order, hidden columns and the comparison
  selection are not kept (out of scope by design).
- Docs: `.moai/project/` and `docs/plan.md` are current; no README yet (planned for step 7). Step 4 (trends) imports
  `src/lib/filterState.ts`, `filterUrl.ts` and `filterApply.ts`.
- Also in this commit: `sync_commit_sha` backfilled for SPEC-DATA-001 (d36ea42) and SPEC-VIEW-001 (a8ee3c5).
- sync_commit_sha: ebbec07

## §E.5 Post-sync follow-up (2026-11-02, from the researcher review)

- Filter layout: from 1000 px the filters sit in a sticky sidebar beside the results; a "Filters (n active)" toggle
  (aria-expanded) collapses them, open by default at wide widths and collapsed below. URL filter state unchanged.
- Compare transition: setting location.hash only queues hashchange, so the browser stayed on screen under the new URL
  until that task ran. The Compare button now navigates through App (hash set and view rendered in the click), and
  the comparison shows its heading with a loading line while the paper files load.
- Evidence: tests/filterState.test.ts (activeFilterCount, 3 tests; RED: not a function); 3 e2e tests (RED: toggle
  missing; h1 still Browse before hashchange). `npx vitest run` 213/213, `npm run typecheck` exit 0, `npm run e2e`
  25/25, full `npm run build` exit 0; checked in the browser at 1280 px and 375 px.
