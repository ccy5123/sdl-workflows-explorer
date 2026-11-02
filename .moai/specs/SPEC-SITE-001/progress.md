# Progress: SPEC-SITE-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- Tier L (about 35 files touched, over 15); artifacts: spec.md, plan.md, acceptance.md, design.md, research.md (plus
  this file).
- Size: 18 REQs, 19 ACs (Tier L ceiling 25 each).
- plan-auditor: iteration 1 FAIL 0.75 (all must-pass PASS; blocking D1 to D9, optional D10 to D16), all applied in
  version 0.2.0. Report: `.moai/reports/plan-audit/SPEC-SITE-001-review-1.md`.
- plan-auditor: iteration 2 FAIL 0.92 (two minor blocking defects N1, N2; optional O1 to O6), applied in 0.3.0;
  iteration 3 PASS 0.96 (all must-pass PASS, no blocking defect; optional R1 applied — number cells defined by their
  text — and R2 left as cosmetic). Reports: `SPEC-SITE-001-review-2.md`, `SPEC-SITE-001-review-3.md`.
- Implementation Kickoff Approval: the researcher approved version 0.3.0 through AskUserQuestion on 2026-11-02 and
  chose autonomous progression (run, browser check, sync and push without intermediate stops). Citation: as in
  `CITATION.cff`, no publisher added (researcher's choice).
- Baseline re-measured 2026-11-02 at 69d2dc7: `npx tsc --noEmit` exit 0; `npx vitest run` 28 files, 459 passed;
  `npm run e2e` 68 passed.
- Derived-file hashes at 69d2dc7 (`sha256sum` of `public/data/` after build-data; AC-1):
  index.json 6b644e3cba4bdbd007e85d5fdfc10494329e0aaa4337d2c37c4cb6c15ca5db4d;
  taxonomy.json e33f52e3398e1d411f1522c1e3953c41165828a7693e9582c90c6fd9880acdc9;
  benchmark.json 4ca73f0e6d4674debc39dadfdcc6749a5c79709824d2bd7f7b38416ba95ad80d;
  benchmark-items.json 7a709c166912e849597d17302fb4fc09c3befc98b01f3265a8365deb19bb9aeb;
  238 platform files concatenated in name order 9001ca64126b7bb996076a0b8b172d5c3d5b293171529dcf9aca08d8599889a8.
- Dependencies: SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001, SPEC-TAXO-001, SPEC-BENCH-001 and
  SPEC-CONTRIB-001 have status completed.
- Baseline (2026-11-02, HEAD 69d2dc7): typecheck 0, Vitest 459/459, Playwright 68/68 (from the SPEC-CONTRIB-001
  hand-over; re-measured before run).
- Source of the brief: the orchestrating session of 2026-11-02 relayed step 7 of `docs/plan.md` with the scope (home,
  about, design and accessibility pass, Pages readiness without deploying), the hard limits (repository private, no
  Pages, release 1.0.0 pinned, view names and routes kept, contribution links kept, English site text) and the known
  "Relation" column break at 800 px.
