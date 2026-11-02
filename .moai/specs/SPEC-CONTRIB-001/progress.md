# Progress: SPEC-CONTRIB-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- Tier M (about 10 files touched, well under 300 lines); artifacts: spec.md, plan.md, acceptance.md (plus this file).
- plan-auditor: iteration 1 PASS 0.91 (all must-pass criteria PASS; no blocking defect; optional findings 1, 3 and 5
  applied in version 0.2.0, 2 and 4 left as they are: plain-bullet ACs as in SPEC-VIEW-001, and AC-8 already checks
  each part of REQ-008). Report: `.moai/reports/plan-audit/SPEC-CONTRIB-001-review-1.md`.
- Implementation Kickoff Approval: the researcher approved version 0.2.0 through AskUserQuestion on 2026-11-02 and
  chose autonomous progression (run, browser check, sync and push without intermediate stops).
- Size: 8 REQs, 8 ACs.
- Dependencies: SPEC-VIEW-001 and SPEC-TAXO-001 have status completed.
- Baseline (2026-11-02, HEAD 8606ede): typecheck 0, Vitest 446/446, Playwright 63/63 (from the SPEC-BENCH-001
  hand-over; re-measured before run).
- Source of the brief: the orchestrating session of 2026-11-02 relayed the researcher's decision to take outside
  suggestions through three issue forms in `ccy5123/sdl-workflows` and the entry points wanted on the site (platform
  header, evidence panel for a selected item, taxonomy class page, footer).
- Field ids checked against the read-only form copies in
  `~/research/sdl-db/release/public-repo/.github/ISSUE_TEMPLATE/`: correction `item_id` (input), `release` (input,
  default "1.0.0"); paper `doi`, `paper_title`; taxonomy `kind` (dropdown of proposal types, so not prefilled),
  `class` (input, placeholder `module_type / flow_reactor`). Titles: `[correction] `, `[paper] `, `[taxonomy] `.
- Item ids in the platform files are full ids (`Aand2024/P1/M1`, `Aand2024/P1/S1`, `Aand2024/P1/E1`), so the
  evidence panel's id is passed through unchanged.
- Version source: `index.release.version` comes from `core/release.csv` of the zip that `release.config.json` pins by
  SHA-256; the footer already shows it. AC-3 checks the two values are equal.

## §E.2 Run-phase Evidence

- Unit 1 (M1, 5fd35d3): `tests/contribute.test.ts` written first. RED: `npx vitest run tests/contribute.test.ts` failed
  with "Failed to load url ../src/lib/contribute ... Does the file exist?" (no tests collected). GREEN after
  `src/lib/contribute.ts` and the libBoundary entry: 2 files, 22 tests passed; typecheck exit 0.
- Unit 2 (M2, df17884): `e2e/contribute.spec.ts` written first. RED against `vite build --mode e2e`: 5 failed (AC-4 to
  AC-8; each on a missing link, `toHaveCount`/`toBeVisible`). GREEN after `IssueLink`, the Header, EvidencePanel,
  PlatformView, Taxonomy and App changes: 5 passed.
- Full suites after M2: `npx vitest run` 28 files / 459 tests passed (446 before: 12 new in contribute.test.ts, 1 new
  libBoundary case); `npm run e2e` 68 passed (63 before, 5 new); `npx tsc --noEmit` exit 0.
- `git diff 8606ede..df17884 --stat -- scripts public` is empty (no data or pipeline change).
- Browser check (production `vite build` served by `vite preview`, built-in browser):
  - `#/platform/Aand2024/P1`, 1280 px: header link
    `...issues/new?template=correction.yml&title=%5Bcorrection%5D%20Aand2024%2FP1&item_id=Aand2024%2FP1&release=1.0.0`,
    `target=_blank`, `rel=noopener`, below the "Show platform evidence" button. No link in the evidence panel until an
    item is selected; after selecting step 3 the panel link decodes to title `[correction] Aand2024/P1/S3`, item_id
    `Aand2024/P1/S3`, release `1.0.0`. Clicking the header link made the page try to open a github.com tab (the
    browser pane blocks tabs opened by automated clicks; the GitHub page itself was not checked, as planned).
  - Footer: "Data version 1.0.0 · doi:10.5281/zenodo.23857126 · Suggest a missing paper", href
    `...issues/new?template=paper.yml&title=%5Bpaper%5D%20`.
  - `#/taxonomy/module_type/flow_reactor`, 1280 px: "Propose a mapping or change" under the definition; decodes to
    title `[taxonomy] module_type/flow_reactor`, class `module_type / flow_reactor`.
  - 375 px: class page scrollWidth 375 = clientWidth; platform page with connection E1 selected scrollWidth 375 =
    clientWidth, evidence link item_id `Aand2024/P1/E1`. No console error.

## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready
- run_complete_at: 2026-11-02
- AC-1 to AC-3: PASS (`tests/contribute.test.ts`, `tests/libBoundary.test.ts`). AC-4 to AC-8: PASS
  (`e2e/contribute.spec.ts`; AC-8 regressions by the full suites above). The only new interface strings are the
  three link texts, exported from `src/lib/contribute.ts`.
- Run commits: 5fd35d3, df17884. As in SPEC-BENCH-001, spec.md stayed at draft during run; sync sets completed.

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-02
- sync_commit_sha: pending-backfill
- Verification at sync (HEAD df17884): typecheck exit 0; Vitest 459 passed; Playwright 68 passed.
- Project docs (`.moai/project/`, `docs/plan.md`) unchanged; step 7 not started. The issue forms, CONTRIBUTING and
  CONTRIBUTORS files are not part of this repository and were not touched. The GitHub repository stays private.

## §F Phase 4 Mode Selection

- Inputs: Tier M; 10 files (one lib module, one component, four edited views/components, two tests, one e2e spec,
  libBoundary); TypeScript only; concurrency benefit low (small, coding-heavy, shared helper).
- Evaluation: direct — selected for the orchestrator itself (two short units, each test first); serial — not needed
  for this size; fanout — not selected (coding-heavy); sweep — not selected (not a uniform mechanical edit).
- Decision: direct
- Justification: the change is two units of under 100 lines each; delegating would cost more than it saves, and
  manager-develop worktree isolation fails on this WSL UNC path (hand-over notes of steps 4 and 5).
