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
