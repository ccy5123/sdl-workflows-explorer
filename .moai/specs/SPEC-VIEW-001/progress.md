# Progress: SPEC-VIEW-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-01
- plan-auditor: iteration 1 FAIL 0.76 (11 defects, all addressed); iteration 2 PASS 0.88 (Tier M threshold 0.80);
  follow-ups applied: plan AC numbers, separate `dist-e2e/` output, module-table row in AC-11, English-text clause
  marked as checked by review. Orchestrator found 18 REQs over the Tier M ceiling of 16 (missed by the auditor) and
  merged REQ-014/015 and REQ-017/018 into 16 REQs.
- Dependency: SPEC-DATA-001 status completed.
- Implementation Kickoff Approval: approved by the researcher on 2026-11-01, including the module-type display groups.

## §F Phase 4 Mode Selection

- Input parameters: tier M; ~20 files; domains: React views, Cytoscape, Playwright (TypeScript only); coding-heavy.
- direct: not selected. fanout: not selected (shared types and components). sweep: not selected.
- Decision: serial (one manager-develop, cycle_type=tdd).
- Justification: interdependent new UI code; sequential TDD.

## §E.2 Run-phase Evidence

Captured 2026-11-01 against base HEAD d36ea42 plus uncommitted run-phase changes (no commit made by manager-develop).
Raw logs: `.moai/state/verify/` (local, git-ignored).

| AC | Status | Command | Actual output |
|----|--------|---------|---------------|
| AC-1 | PASS | `npx vitest run` (tests/route.test.ts) | `✓ tests/route.test.ts (12 tests)` |
| AC-2 | PASS | same (tests/moduleGroups.test.ts, real taxonomy.json) | `✓ tests/moduleGroups.test.ts (8 tests)` |
| AC-3 | PASS | same (tests/graphElements.test.ts) | `✓ tests/graphElements.test.ts (12 tests)` |
| AC-4 | PASS | same (tests/steps.test.ts) | `✓ tests/steps.test.ts (6 tests)` |
| AC-5 | PASS | same (tests/evidence.test.ts) | `✓ tests/evidence.test.ts (8 tests)` |
| AC-6 | PASS | same (tests/identity.test.ts, real index: CortesBorda2018/P1 → Wimmer2019/P1, /P2) | `✓ tests/identity.test.ts (3 tests)` |
| AC-7, AC-8 | PASS | same (tests/platformFilter.test.ts, real index 280 rows) | `✓ tests/platformFilter.test.ts (6 tests)` |
| AC-9 | PASS | `npm run e2e` | `✓ AC-9: the viewer opens a platform by URL` |
| AC-10 | PASS | `npm run e2e` | `✓ AC-10: selecting a step by keyboard and by click` |
| AC-11 | PASS | `npm run e2e` | `✓ AC-11: selecting table rows with Enter shows their evidence` |
| AC-12 | PASS | `npm run e2e` | `✓ AC-12: not-found routes, home list and back navigation` |
| AC-13 | PASS | `npm run e2e` (platform picked at run time: Angello2022/P1) | `✓ AC-13: off-platform modules, dashed inferred edges, ? markers and the legend` |
| AC-14 | PASS-WITH-NOTE | see tails below | tests, typecheck, build, e2e exit 0; src/lib 100% lines; the hook is absent from `dist/`, but a literal `grep -r __cy dist/` matches Cytoscape's own `__________cytoscape_stylesheet` string (1 line) |

Verbatim tails:

```
$ npx vitest run --coverage
 Test Files  15 passed (15)
      Tests  125 passed (125)
All files          |   95.23 |    96.47 |    97.5 |   95.23 |
 src/lib           |     100 |    98.78 |     100 |     100 |
$ npm run typecheck      → exit 0
$ npm run e2e
  5 passed (2.6s)
$ SDL_RELEASE_ZIP=…/sdl-workflows-1.0.0.zip npm run build   → exit 0, ✓ built in 1.89s
$ grep -rcP "__cy(?!toscape)" dist/ | grep -v ":0$"   → (none)
$ grep -oh ".\{6\}__cy.\{10\}" dist/assets/*.js        → ________cytoscape_st / ________cytoscape_co
$ grep -rcP "__cy(?!toscape)" dist-e2e/               → 1 (window.__cy=o)
```

RED before GREEN (`.moai/state/verify/red-module-missing.txt`, `red-route-stub.txt`):

```
 FAIL  tests/route.test.ts > parseRoute > parses a complete platform route
AssertionError: expected { kind: 'home' } to deeply equal { kind: 'platform', …(2) }
 Test Files  7 failed (7)   (first run: "Failed to load url ../src/lib/<module>" for all 7 lib suites)
```

E2E falsifiability: with the Escape handler mutated, `npx playwright test -g "AC-10"` failed (`1 failed`); restored.
Visual check: Angello2022/P1 at 1280px and 375px; no horizontal scroll at 375px (`scrollWidth 375`).
SPEC-DATA-001 suites (config, csv, checksum, counts, derive, extract, fetch-release, release) all pass in the same run.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-11-01
run_commit_sha: d4c3f72
run_status: audit-ready
ac_pass_count: 14
ac_fail_count: 0
new_warnings_or_lints_introduced: "vite chunk-size warning (651 kB bundle, Cytoscape)"
total_run_phase_files: 36
```

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-01
- Implementation commit: d4c3f72 (pushed to the private remote github.com/ccy5123/sdl-workflows-explorer, main).
- Orchestrator re-verification before commit: `npx vitest run` 125/125 passed (15 files), `npm run typecheck`
  exit 0, `npm run e2e` 5/5 passed. Logs: `.moai/state/verify/sync-view-*.txt` (local, git-ignored).
- Known follow-ups seen in the browser at `#/platform/Aand2024/P1`: graph drawn small after "Fit to view" (labels
  hard to read), platform id under the title in an odd small font, page otherwise unstyled default HTML. The
  researcher chose (2026-11-02) to fix the first two now and leave the styling to the step-7 design pass.

## §E.5 Post-sync follow-up (2026-11-02)

- Graph fit: `src/lib/viewport.ts` clamps the fitted zoom to [1, 1.5]; a graph wider than the box at zoom 1 is shown
  from its left end and panned by the reader. Node labels 10 → 12 px, edge labels 9 → 11 px.
- Platform id: `code` uses an explicit monospace stack instead of the browser default.
- Evidence: `tests/viewport.test.ts` 5 tests (RED: module missing, then GREEN); `npx vitest run` 130/130;
  `npm run typecheck` exit 0; `npm run e2e` 6/6 including the new zoom and font check; checked in the browser at
  `#/platform/Aand2024/P1`.
- Docs: `.moai/project/` and `docs/plan.md` are current; no README yet (planned for step 7).
- sync_commit_sha: pending-backfill (this sync commit)
