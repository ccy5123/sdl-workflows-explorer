# Acceptance: SPEC-SIM-001

All runs are on branch `feat/workflow-simulation` after the start gate (plan §B.0), with
`SDL_RELEASE_ZIP=/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip`. Real-data cases read
`public/data/` after `npm run build-data`. Numbers below are from research.md (bundle 98ea319b…); if the start gate
finds a different pin, they are re-measured first.

## Scenarios

### AC-1 Simulation data from the release (REQ-001, REQ-002, REQ-003)
- Given the 1.1.0 bundle, when `npm run build-data` runs, then `public/data/simulation.json` exists and holds 31 unit
  operations, 22 module types, 6 transfer modes, 454 durations (57 with `joint`, 397 without), 135 throughputs (91
  measured, 44 nominal), 126 throughputs with a per-day value and 9 without, 4 transfer times and 279 platform layouts.
- Given the fixture release, when `deriveAll` runs, then each fixture duration row has the seconds, markers, range ends
  in seconds, samples per run, evidence and joint fields of design.md §1 with the values the fixture states, and each
  fixture throughput row has the per-day value and basis (or null and reason) of design.md §2.

### AC-2 Existing derived files unchanged (REQ-001)
- Given the hashes recorded in progress.md at the start gate, when `npm run build-data` runs on this branch, then
  `index.json`, `taxonomy.json`, `benchmark.json`, `benchmark-items.json`, `release-docs.json` and each platform file
  hash to those values (checked by a test).

### AC-3 Joint durations kept apart (REQ-002)
- Given the real data, when single-step values are grouped by unit operation, then no row with `joint` is counted,
  the groups hold 397 rows over 28 unit operations with the n of research.md §2, and dispense_solid,
  generate_instructions and purify have none.
- Given each joint row, then `joint.step_ids[0]` equals its `step_id` and `joint.unit_operations` are the unit
  operations of those steps in order.

### AC-4 Bad release rows stop the build (REQ-004)
- Given a fixture copy with, one at a time, an unknown step id, a duration unit "week", a `covers_steps` starting with
  another step, a `covers_steps` naming an unknown step, and a process value with `target_kind` "paper", when
  `deriveAll` or `build-data` runs, then it throws a message naming the row and writes no file.

### AC-5 Route, title and nav (REQ-005)
- Given `#/workflow` and `#/workflow?b=4`, when parsed, then the route kind is the workflow view with the query kept.
- Given the site, when `#/workflow` opens, then the document title is "Workflow builder · SDL Workflows Explorer", the
  nav shows "Workflow" between "Benchmark" and "About" with `aria-current="page"`, and the main heading is "Workflow
  builder".
- Given every route of `e2e/routes.ts` that existed before this SPEC, when opened, then its title and current nav link
  are as before (the existing route tests pass unchanged).

### AC-6 Builder editing (REQ-006)
- Given an empty builder, then the page says a step is needed and shows none of the three outputs.
- Given the builder, when a visitor adds three steps, assigns modules, moves step 3 up, removes step 1, sets a transfer
  mode and time, batch size 8 and parallel units 2, then the steps table, transfers and inputs show those values, and
  the outputs appear.
- Given inputs outside the ranges of REQ-006 and design.md §3 (41st step, 0 or 51 devices, batch size 0 or 10,001,
  samples per experiment 0 or 1,001, parallel units 0 or 51, transfer time −1 or 86,401 s, samples per run 0 or one
  more than batch size × samples per experiment, an entered duration −1 s or 10,000,001 s, 4 decimal places), then the input is refused with a message and
  the state is unchanged (Vitest on the state functions; e2e for batch size and devices).
- Given samples per run 8 on a step with batch size 10, when batch size becomes 4, then that step's samples per run
  resets to its default and a message names it; given a step on module 2, when the visitor removes module 2, then the
  removal is refused with a message naming the step; given a chosen joint duration over steps 2-3, when step 3 is
  removed, then the choice is cleared and named in a message (Vitest).

### AC-7 Shareable URL (REQ-007)
- Given a state built in AC-6, when the page is reloaded with its URL, then every input shows the same value.
- Given 200 valid states generated within the ranges of design.md §3, when each is encoded and decoded, then the result equals the state, and encoding
  the default state gives an empty query.
- Given a URL with an unknown unit operation, a module index out of range, `b=abc`, a joint id that does not match
  the steps, a joint choice overlapping an earlier one and a transfer on a boundary between steps of the same module,
  then those items are dropped, one message
  names each of them, the rest of the state is restored, and no error is thrown.

### AC-8 Start from a coded platform (REQ-008)
- Given the release, when the visitor starts from `Aand2024/P1`, then the steps are its 6 steps in `step_order` with
  their unit operations, each step's module is its primary module with that module's type, each boundary between
  different modules shows the mode of the boundary rule of design.md §4, and the page says which inputs were filled
  from the platform.
- Given a platform with a recorded module `units`, transfer time, batch size, parallel units or transfer agent count,
  when it is used as the start, then those values fill the builder (Vitest on the template function, one platform
  per quantity); Holmes2016/P1 fills batch size 5 (recorded 4.5), and Erps2021/P1 fills the transfer time of its
  edge E2 as 45.7 s (not rounded).
- Given each of the 279 platforms used as the start, then its similarity to itself is 1, 1, 1 (Vitest).

### AC-9 Similarity measures and order (REQ-009)
- Given W = [a, b, c] and P = [a, c], then step order = 1 − 1/3; given module types {x, y} and {y, z}, module types =
  1/3; given no material transfer modes on either side, transfer modes = 1.
- Given ties in step order, then rows are ordered by module types, then transfer modes, then platform id.
- Given the workflow started from `Aand2024/P1`, when the list is shown, then the row of `Aand2024/P1` shows 1.00,
  1.00 and 1.00 and appears in the first 10 rows, each row links to `#/platform/<paper>/<P…>`, "Show 10 more" adds 10
  rows, and clicking a column header sorts by it.
- Given the page, then the three plain-language definitions of design.md §4 are visible above the list.

### AC-10 Compare link (REQ-010)
- Given 1 selected platform, then no compare link is offered and the page says 2 or 3 are needed; given 2 or 3, then
  a link to `#/compare/<ids in selection order>` is offered and opens the Compare view; given a 4th selection, then
  the link is withdrawn with the reason.

### AC-11 Range computation (REQ-013, REQ-014)
- Given a unit operation with values 60, 120 and 300 s and an upper bound of 600 s, then low, mid, high = 60, 120,
  300 s; with bounds included, 60, 210, 600 s.
- Given batch size 10 and samples per run 4, then the step's runs per batch is 3 and its low, mid, high triple; with
  samples per experiment 2, runs per batch is 5.
- Given a chosen joint duration of 900 s over steps 2-3 with a transfer of 30 s between them, then steps 2-3 add 900 s
  and the 30 s transfer is not added.
- Given batch size 2, parallel units 3 and cycle mid 600 s, then the mid per-day value is 864.
- Given a workflow with a dispense_solid step and no entered value, then no cycle or per-day value is shown and the
  step is named with a request for a duration; when the visitor enters 120 s, then results appear, step 1 shows
  "entered by you" and the result says it includes the value entered for that step.
- Given the real-data workflow [react_flow], then the step shows "n = 87 recorded" and "86 used", and low, mid, high =
  0.1755, 351, 3900 s; with bounds included, 0.1755, 360, 3900 s.
- Given a one-step workflow with an entered duration of 0 s, then each per-day value reads "not defined: the cycle
  time is 0 s".

### AC-12 Distributions and joint offer (REQ-011, REQ-012)
- Given a step of unit operation react_thermal, when the view shows it, then the distribution has 70 marks, the step
  shows "n = 70 recorded" and "68 used", and the source list has 70 entries each linking to its platform view and to `https://doi.org/<doi>` with
  document, page and locator; bound, approximate and range-midpoint entries carry ≤/≥, ≈ and a drawn range.
- Given the visitor's steps [dispense_liquid, react_thermal], then the view offers the joint durations recorded for
  that sequence (4 rows on 1.1.0) with their sources; choosing one makes M2 count the two steps as that value; a
  second choice overlapping it is refused with a message.

### AC-13 Recorded throughputs, no verdicts (REQ-015, REQ-016)
- Given a complete workflow, then the throughput panel shows measured and nominal distributions with n equal to the
  counts of measured and nominal rows with a per-day value in `simulation.json`, states that 9 throughputs have no
  per-day value and lists them with their unit and reason on request, and rings the platforms of the M1 top 10 that
  have a per-day value.
- Given the string literals and JSX text of the new files of plan.md §D under `src/` and the About section text, then
  none contains the words fast, slow, realistic, unrealistic, feasible, infeasible, good, poor, adequate, sufficient,
  insufficient (case-insensitive, whole words; Vitest). Release values such as platform names are not checked.

### AC-14 Simulation model, hand-computed cases (REQ-018)
Durations entered by the visitor, transfers "not specified" with 0 s unless stated, one device per module.
- One step, 60 s, N = 3, p = 1: makespan 180 s. Same with p = 3: makespan 180 s and mean waiting 60 s; with p = 3 and
  3 devices: makespan 60 s.
- Steps on modules A (10 s) and B (20 s), robot arm or gantry transfer of 5 s with 1 agent, N = 2, p = 2: batch 1 at
  A 0-10, transfer 10-15, B 15-35; batch 2 at A 10-20, transfer 20-25, B 35-55; makespan 55 s; utilization A 20/55,
  B 40/55; bottleneck step 2.
- Steps 1 and 2 both on A (10 s each), N = 2, p = 2: batch 1 holds A 0-20, batch 2 runs 20-40; makespan 40 s.
- Steps A (10 s), B (1 s), A (10 s), N = 3, p = 3: makespan 60 s with `fifo` and 61 s with `released`.
- A chosen joint duration over steps on modules A and B occupies only A for its length.
- A chosen joint duration of 30 s over steps 1-2 (modules A, B) with a robot arm or gantry transfer of 5 s set on
  the boundary between them, then step 3 on A (10 s), N = 2, p = 2: batch 1 holds A 0-40 (no transfer inside the
  run, A kept for step 3), batch 2 holds A 40-80; makespan 80 s. With a 5 s "not specified" transfer set on the
  boundary between steps 2 and 3, A is released after the run: batch 1 holds A 0-30 and 60-70, batch 2 holds A 30-60
  and 70-80 (each waits for A after its 5 s transfer); makespan 80 s, with that event list.
- Per-run seeds: for seed s and run r the PRNG seed is mix32(s XOR (r × 0x9E3779B9 mod 2^32)); seeds 1 and 2 share no
  per-run seed over runs 1-100.

### AC-15 Assumption inputs and determinism (REQ-017, REQ-019)
- Given the simulation section, then each input of REQ-017 (transfer modes and times, agents per mode, queue rule,
  draw, bounds, batches, runs, seed) shows its current value and its stated default, the workflow inputs (devices per
  module, batch size, samples per experiment, samples per run, parallel units) are listed with their current values
  and defaults, the joint and device-holding rules are listed among the assumptions, and the results are headed by
  the dependence sentence.
- Given a real-data workflow [react_flow, measure_separation_ms] with `draw=sample`, when it runs twice with seed 1,
  then the event lists and results are deep-equal; with seed 2, the event list differs; with `draw=median`, seeds 1
  and 2 give deep-equal event lists.
- Given that workflow's URL with seed 7, when the page is reloaded and the simulation run, then the shown makespan,
  experiments-per-day range and bottleneck equal those of the first run (e2e), and no network request is made while
  it runs.
- Given N × R × Σ runs per batch above 5,000,000, then the page asks for smaller inputs and does not run.

### AC-16 Simulation outputs (REQ-020)
- Given a run, then the timeline has one row per device and per transfer agent, the events table has one row per step
  run and transfer of run 1, and the page shows min, median and max of makespan and experiments per day over the
  runs, median utilization per module, median waiting per step, and the bottleneck step with its definition.

### AC-17 About section (REQ-021)
- Given `#/about`, then an `h2` "Workflow builder" follows the existing sections, with at most four paragraphs whose
  text is design.md §7 (final wording as committed), and a test checks its figures ("10", "4") against
  `simulation.json` (unit operations with fewer than 10 single-step values form the majority; 4 transfer times).

### AC-18 Text and layout (REQ-022)
- Given every new string in `src/`, then progress.md lists the plain-language review (changed strings, or "none
  found"), and the first use of unit operation, module type, transfer mode, discrete-event simulation, Gantt chart
  and utilization on the view is explained in its sentence.
- Given `#/workflow` and `#/about` at 1280 px and 375 px in light and dark, then there is no horizontal page scroll
  and no page error (e2e layout and theme specs over `e2e/routes.ts`).

### AC-19 Suites and branch (REQ-023, REQ-024)
- Given the final head, when typecheck, Vitest, `npm run e2e` and `npm run build` run in the same shell as
  `sha256sum "$SDL_RELEASE_ZIP"`, then all exit 0 and the hash equals the pin.
- Given the remote after the push, then `origin/feat/workflow-simulation` holds the work, `origin/main` and
  `origin/release-1.1.0` are at the commits they had at the start gate, `git diff <start-gate head> -- release.config.json`
  is empty, the repository visibility and Pages state are as at the start gate, and `gh run list` shows no run created
  after the start gate.
- Given progress.md, then it records the orchestrating session's message that the deploy is done, dated before the
  first run-phase commit (`git log` of the branch).

## Requirement coverage

| REQ | AC |
|---|---|
| 001 | 1, 2 |
| 002 | 1, 3 |
| 003 | 1 |
| 004 | 4 |
| 005 | 5 |
| 006 | 6 |
| 007 | 7 |
| 008 | 8 |
| 009 | 9 |
| 010 | 10 |
| 011 | 12 |
| 012 | 12 |
| 013 | 11 |
| 014 | 11 |
| 015 | 13 |
| 016 | 13 |
| 017 | 15 |
| 018 | 14 |
| 019 | 15 |
| 020 | 16 |
| 021 | 17 |
| 022 | 18 |
| 023 | 19 |
| 024 | 19 |
