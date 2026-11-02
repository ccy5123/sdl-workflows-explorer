# Plan: SPEC-SIM-001

## A. Context

Branch `feat/workflow-simulation` from `origin/release-1.1.0` (b6bee31), in its own worktree
`~/research/sdl-workflows-explorer-sim`; the primary checkout (`main`) and `~/research/sdl-workflows-explorer-rel110`
(`release-1.1.0`) are not touched. Every run sets
`SDL_RELEASE_ZIP=/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip` and checks its SHA-256 against the
pin in the same run. Data facts: research.md. Shapes, grammar and algorithms: design.md.

Tier L: 4 milestones after the data step, about 20 files. One write-capable agent at a time.

## B. Tasks (TDD: each starts with failing tests)

0. **Start gate.** Wait for the orchestrating session's message that the 1.1.0 explorer deploy is done. Then merge
   `origin/main` into the feature branch (it then contains `release-1.1.0` plus any deploy-time commit). If the pin
   in `release.config.json` changed, re-run the research.md §§2-3 measurements and update the expected numbers in
   acceptance.md before writing code. Record in progress.md the hashes of every existing derived file at the merged
   head (AC-2 baseline), the suite counts, and the orchestrating session's deploy-done message with its date (AC-19).
1. **Data (REQ-001 to REQ-004).** Extend `tests/fixtures/release-mini` with `modes/simulation/step_timing.csv`,
   `process_values.csv`, `core/unit_operation.csv`, `core/module_type.csv` and the builder rows they join to,
   including a joint row, a bound, an approximate value, a range midpoint, a samples-per-run row, each throughput
   conversion case and each REQ-004 failure. RED: `tests/simulation-derive.test.ts`, `tests/simulation-data.test.ts`
   (real data). GREEN: `scripts/lib/simulation.ts`, wiring in `scripts/lib/derive.ts` (`Derived.simulation`,
   `writeDerived`), types in `src/data/types.ts`.
2. **Builder and URL (REQ-005 to REQ-008), reported to the orchestrating session as "workflow input done".** RED:
   `tests/route.test.ts` (new route, title, nav), `tests/workflowState.test.ts` (grammar, defaults, invalid parts,
   round trip over generated states, template fill), `e2e/workflow.spec.ts` (build a workflow, reload restores it,
   start from a coded platform). GREEN: `src/lib/route.ts`, `src/lib/workflowState.ts`, `src/views/Workflow.tsx`
   (lazy), `src/components/WorkflowEditor.tsx`, nav link in `src/App.tsx`, `e2e/routes.ts` gains `#/workflow`.
3. **M1 similar platforms (REQ-009, REQ-010).** RED: `tests/similarity.test.ts` (edit distance, overlaps, empty-set
   rule, order, real-data template case), e2e (links, compare selection). GREEN: `src/lib/similarity.ts`,
   `src/components/SimilarPlatforms.tsx`. Report "M1 done".
4. **M2 range (REQ-011 to REQ-016).** RED: `tests/cycleRange.test.ts` (sources table of design §5, runs per batch,
   bounds toggle, joint runs, missing steps, 0 s cycle, visitor marks, per day), throughput panel data tests, the
   verdict-word scan of new source strings (Vitest), e2e (missing-step prompt then result, joint offer, sources). GREEN: `src/lib/cycleRange.ts`,
   `src/components/DurationStrip.tsx`, `src/components/CycleRange.tsx`, `src/components/ThroughputPanel.tsx`.
   Report "M2 done".
5. **M3 simulation (REQ-017 to REQ-020).** RED: `tests/des.test.ts` (the hand-computed cases of AC-14, seed
   determinism, median mode, limits, bottleneck), e2e (run, timeline and table present, same results after reload
   with the same seed). GREEN: `src/lib/prng.ts`, `src/lib/des.ts`, `src/components/SimulationPanel.tsx`,
   `src/components/Timeline.tsx`. Report "M3 done".
6. **About, text, close (REQ-021 to REQ-024).** RED: About section checks (Vitest phrase and figure checks, e2e
   headings). GREEN: `src/lib/siteText.ts`, `src/views/About.tsx`, `src/styles.css`. Then the plain-language review of
   every new string (listed in progress.md), full suites with the hash check, `npm run build`, screen check of
   `#/workflow` and `#/about` at 1280 px and 375 px, light and dark; sync; push the feature branch to the private
   origin; report to the orchestrating session. No merge, no deploy.

## C. Risks

| Risk | Mitigation |
|---|---|
| Visitors read a sum of medians as a prediction | Low/median/high always shown together with n per step; the no-waiting assumption stated next to the per-day figure; M3 results headed by the dependence sentence |
| Sparse data hidden behind one number | n and every source shown per step; steps without data need the visitor's value, marked as theirs |
| Joint durations double-counted | Kept out of single-step sets (AC-3); a chosen joint run zeroes its later steps and their inner transfers (AC-11) |
| Simulation not reproducible | Event order by (time, insertion sequence), seeded PRNG per run, draws only at step start; tests compare whole event lists |
| Browser freezes on large inputs | Limits of design §6.9; the simulation runs only on "Run simulation" |
| Existing pages change by accident | Hashes of existing derived files fixed at the start gate (AC-2); existing routes and nav texts tested (AC-5) |
| The deploy re-pins the release | Start gate re-measures and updates acceptance numbers before code |
| Nav row too wide at 375 px with a seventh link | Screen check at 375 px; wrapping allowed, no horizontal page scroll (AC-18) |

## D. Files

New: `scripts/lib/simulation.ts`, `src/lib/workflowState.ts`, `src/lib/similarity.ts`, `src/lib/cycleRange.ts`,
`src/lib/prng.ts`, `src/lib/des.ts`, `src/views/Workflow.tsx`, `src/components/WorkflowEditor.tsx`,
`src/components/SimilarPlatforms.tsx`, `src/components/DurationStrip.tsx`, `src/components/CycleRange.tsx`,
`src/components/ThroughputPanel.tsx`, `src/components/SimulationPanel.tsx`, `src/components/Timeline.tsx`,
`tests/simulation-derive.test.ts`, `tests/simulation-data.test.ts`, `tests/workflowState.test.ts`,
`tests/similarity.test.ts`, `tests/cycleRange.test.ts`, `tests/des.test.ts`, `e2e/workflow.spec.ts`, fixture files under
`tests/fixtures/release-mini/`.

Edited: `scripts/lib/derive.ts`, `src/data/types.ts`, `src/lib/route.ts`, `src/App.tsx`, `src/lib/siteText.ts`,
`src/views/About.tsx`, `src/styles.css`, `tests/route.test.ts`, `tests/siteText.test.ts`, `e2e/routes.ts`,
`e2e/site.spec.ts` (About headings).

Not edited: `release.config.json`, `docs/plan.md`, `docs/deploy.md`, every other existing view and test.
