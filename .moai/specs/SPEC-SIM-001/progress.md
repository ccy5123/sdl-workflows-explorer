# Progress: SPEC-SIM-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- Branch `feat/workflow-simulation` from `origin/release-1.1.0` (b6bee31), worktree
  `~/research/sdl-workflows-explorer-sim`. Planned before the 1.1.0 deploy, on the orchestrating session's
  instruction (researcher's choice "start only the plan now"); the run phase waits for its deploy-done message.
- Tier L; artifacts: spec.md, design.md, research.md, plan.md, acceptance.md (plus this file). Size: 24 REQs, 19 ACs.
- plan-auditor: iteration 1 FAIL 0.71 (MP-2 on REQ-006; react_flow values wrong, no recorded 0 s; batch size in
  samples vs experiments; unbounded verdict-word check; D5-D16). All applied in 0.2.0 except D14 (implementation
  detail in REQs, the repo's convention). Report: `.moai/reports/plan-audit/SPEC-SIM-001-review-1.md`.
- plan-auditor: iteration 2 FAIL 0.86 (MP-2 on REQ-008's last sentence; N2-N6 optional). Applied in 0.3.0. Report:
  `SPEC-SIM-001-review-2.md`.
- plan-auditor: iteration 3 PASS 0.88 (all must-pass items pass; O1-O3 optional). O1-O3 applied in 0.3.0 without a
  further audit. Report: `SPEC-SIM-001-review-3.md`.
- Implementation Kickoff Approval: the researcher approved version 0.3.0 through AskUserQuestion on 2026-11-02
  ("승인 (권장)") and chose autonomous progression ("자율 진행 (권장)": M1 to M3, About, screen check, sync and
  branch push without intermediate stops, a report to the orchestrating session at each milestone; no merge, no
  deployment). The run phase still waits for the deploy-done message (plan §B.0).

## §E.2 Run-phase Evidence

### Start gate (plan §B.0), 2026-11-02

- Deploy-done message from the orchestrating session, received 2026-11-02 (before the first run-phase commit):
  "The 1.1.0 explorer deploy is done, so you can start implementing SPEC-SIM-001 now." It reported `origin/main` at
  817c6ab (a fast-forward of `release-1.1.0`, adding cef56f7, 76ad63d and 817c6ab after the plan commits), the final
  bundle SHA-256 673b2dbb…, 237 papers, 279 platforms, 2610 steps, the repository public and Pages live, and asked
  for a rebase onto `origin/main` and a recheck of the plan's counts.
- Rebased (not merged, as the orchestrating session asked) onto `origin/main` 817c6ab; plan commits now 85c0bd2 and
  cbb652f. `origin/release-1.1.0` is also at 817c6ab.
- Pin changed (98ea319b… to 673b2dbb…): research.md §§1-3, design.md and acceptance.md counts re-measured on the
  published file (454 durations, 397 single-step, 135 throughputs with 126 per-day, 1660 boundaries, 279 platforms);
  spec 0.3.1. The react_flow and react_thermal figures of AC-11 and AC-12 did not change.
- `fetch-release` downloaded and verified the published file (SHA-256 673b2dbb4c79ef4eb8f7af8c298d640c1cf4e393ab78359bbce0b4cff7c897f6,
  equal to the local `sdl-db/release/out/sdl-workflows-1.1.0.zip`).
- AC-2 baseline, existing derived files at 817c6ab (sha256):
  - `benchmark-items.json` 0f12de153f14285d8ac5b7abe8ab2de2f3dd6dce8a8159317f0e5f336994950d
  - `benchmark.json` 585ca40067f3d1d42091c70c8f69d6b0c4e936edbe5ae1e05aad9cc4d6395474
  - `index.json` a452131e2fc31e3b8c39dd4aa42c00dbd910712ac2034f0f89b1d19adbca8174
  - `release-docs.json` a734f38aea2fe831ab016d04cd3832761a81698510cc30d5638f628e8de70378
  - `taxonomy.json` 677615d0272c7a7dd8c297ccf482c0d4ba743dbb9748bdc1bd6766ba98e7ab47
  - `platforms/*.json` (237 files, concatenated in name order) b4212f2b4b91640dbdfeb66b0d69d8c944e0f2836a9e8f321d1f3829e50d841e
- Suites at 817c6ab: typecheck passes; Vitest 34 files, 555 tests pass.
- Remote at the start gate: visibility PUBLIC; Pages live (workflow build) at
  https://ccy5123.github.io/sdl-workflows-explorer/; latest run 41458037610 (Deploy to GitHub Pages, main,
  2026-11-02T14:01:20Z); `origin/main` and `origin/release-1.1.0` at 817c6ab.

### Run phase (plan §B.1-6), 2026-11-02

Commits on `feat/workflow-simulation` after the start gate (b1b1b61): a54dd34 data, 62675c8 builder and URL,
4c0d798 similar platforms, 90dd7c0 cycle-time range, f558753 simulation, then the About section, screen-check fixes
and this record. Each milestone was reported to the orchestrating session when it was committed.

Final checks, one shell, `SDL_RELEASE_ZIP=/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip`
(`sha256sum` 673b2dbb4c79ef4eb8f7af8c298d640c1cf4e393ab78359bbce0b4cff7c897f6, equal to the pin): typecheck exit 0;
Vitest 644 passed (555 at the start gate); `npm run build` exit 0; `npm run e2e` exit 0, 186 passed. The AC-2 hash
check (tests/simulation-data.test.ts) passes: the existing derived files keep their start-gate hashes.
`simulation.json` is 923 KB (113 KB gzipped) and loads only on `#/workflow`.

Acceptance coverage (Vitest unless marked e2e):
- AC-1, AC-2, AC-3: tests/simulation-derive.test.ts (fixture), tests/simulation-data.test.ts (real data).
- AC-4: tests/simulation-derive.test.ts, five bad-row cases.
- AC-5: tests/route.test.ts; e2e/workflow.spec.ts; e2e/routes.ts gained two `#/workflow` routes for the theme,
  keyboard and layout specs.
- AC-6, AC-7, AC-8: tests/workflowState.test.ts (edits, ranges, resets, 200 generated round trips, dropped link
  parts, template fill, every platform round-trips); e2e (build, refuse batch size and devices, reload, link message,
  Aand2024/P1).
- AC-8 self-similarity, AC-9: tests/similarity.test.ts (all 279 platforms score 1, 1, 1 against themselves); e2e
  (Aand2024/P1 row 1.00 ×3 in the top 10, show 10 more, sort, link).
- AC-10: e2e (1, 2, 4 and 3 selected; the link opens Compare).
- AC-11, AC-12, AC-13: tests/cycleRange.test.ts (design §5 table, runs per batch, joint, missing, 0 s, react_flow
  87/86 and 0.1755/351/3900 s, 360 s with bounds, react_thermal 70/68, 4 joint offers, 126 + 9 throughputs, verdict
  words in every new source file and the About text); e2e (missing then entered, sources, joint choice, per day 864,
  0 s case, throughput n and the 9 unconverted rows).
- AC-14: tests/des.test.ts, every hand-computed case with its event list; per-run seeds of seeds 1 and 2 share none
  over runs 1-100.
- AC-15: tests/des.test.ts (seed 1 twice deep-equal, seed 2 differs, median draws seed-independent); e2e (inputs with
  defaults, rules listed, dependence sentence, same results after reload with seed 7, no request while running, the
  5,000,000 limit refuses).
- AC-16: e2e (timeline rows, 12 events for 4 batches × 2 steps + 1 transfer, utilization, waiting, bottleneck).
- AC-17: tests/siteText.test.ts (at most four paragraphs, figures 10 and 4 against simulation.json); e2e/site.spec.ts
  heading list.
- AC-18: plain-language review below; layout and theme specs at 375 px in light and dark pass on both `#/workflow`
  routes; screen check below.
- AC-19: the checks above; the remote state is in the closing report.

Plain-language review of every new string (src/lib/workflowText.ts, the About section in src/lib/siteText.ts and the
labels in the new components): unit operation, module type and transfer mode are explained in the page's intro
sentence; discrete-event simulation in the first sentence of the simulation section; Gantt chart in the note above the
timeline; utilization in the note above its table. Changed after review: "joint duration" and "runs per batch" were
used before being explained, so the range intro now defines both. No requirement labels, milestone names or file
names appear in visible text. Release class ids (dispense_liquid, robot_arm_gantry) appear as the release's own names.

Screen check (Playwright screenshots at 1280 px and 375 px, light and dark, of a four-step workflow with transfers
after a simulation run, and of the About section; not committed): no horizontal page scroll at either width. Fixed
after the check: the duration axis showed ticks such as "16.67 min" and then hid non-power-of-ten labels (Plot's log
scale), so the strip plots now place values by log10 on a linear scale with round ticks (1 s, 60 s, 10 min, 60 min,
10 h, 24 h); timeline labels were cut off at the left (wider margin); transfer bars of seconds vanished on a two-day
axis (bars at least 3 px wide, exact times in their title); at 375 px the row labels sit above the bars.

Decisions and departures from the plan, for review:
- simulation.json reads steps and connections from `modes/builder/platform_graphs.jsonl`, which derive.ts already
  parses, not from `steps.csv` and `connections.csv` as REQ-001 lists. Same content: each step's first module equals
  `steps.csv` `primary_module_id` for all 2610 steps (checked on the release). REQ-004's unknown-step check runs
  against the same step set.
- `ThroughputRow` also carries `range_low` and `range_high` (REQ-003 asks for the range fields; design §1 omitted
  them).
- A step inside a chosen joint duration takes the joint value even if the visitor typed a value for it; the page
  hides the entry field for those steps (design §5 lists the visitor value first, REQ-012 says the run counts as one
  duration).
- Moving a step so that two steps swap order drops the transfer between them, with a note: its direction has changed.
- The About section follows all existing sections, after "Full text", so the data-card number check on the existing
  sections is unchanged.
- The timeline and the event table of run 1 show at most 3,000 bars or rows and say so when a run has more.
- Durations show 4 significant figures, so a recorded 0.1755 s is shown as stated.
- New file not in plan §D: `src/lib/workflowText.ts` (the builder's own text, read by the verdict-word check).
- Existing tests edited: tests/derive.test.ts (the written file list gains simulation.json), e2e/trends.spec.ts and
  e2e/taxonomy.spec.ts (nav list gains "Workflow"), e2e/site.spec.ts (About heading list gains "Workflow builder"),
  e2e/trends.spec.ts AC-15 (Plot now sits in a chunk shared by the two lazy views; the test checks the Trends chunk
  and its imports, and still that the home page loads none of it), tests/libBoundary.test.ts (six new lib modules
  added to the UI-free list).
- Simulation speed: the largest allowed size measured (40 steps, 500 batches, 100 runs, 4,000,000 step runs) ran in
  2.4 s in Node.

Not done here: pushing. The rebase onto 817c6ab rewrote the two plan commits already on origin, so updating
`origin/feat/workflow-simulation` needs a force push, which this session's permission check refused; the decision is
with the orchestrating session and the researcher. No merge, no deploy, no workflow run.
