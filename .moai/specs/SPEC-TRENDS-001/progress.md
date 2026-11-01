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
- Screenshot check at 1280 px and 375 px: _<pending run phase>_
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

_<pending run phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync phase>_
