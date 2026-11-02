---
id: SPEC-SIM-001
title: "Workflow builder: similar platforms, cycle-time range and a discrete-event simulation from the 1.1.0 timing data"
version: "0.3.1"
status: approved
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v1.1.x target"
module: "scripts/lib/, src/lib/, src/views/, src/components/, tests/, e2e/"
lifecycle: spec-anchored
tags: "workflow builder, simulation, step timing, throughput, similarity, discrete-event, 1.1.0"
tier: L
depends_on: [SPEC-RELEASE-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Planned on branch `feat/workflow-simulation`, cut from `origin/release-1.1.0` (b6bee31)
  before the 1.1.0 site is deployed. The run phase starts only after the orchestrating session reports that the 1.1.0
  explorer deploy is done (`main` contains `release-1.1.0`, Pages live).
- 2026-11-02 0.2.0 after plan audit 1 (FAIL 0.71): REQ-006 wording and input ranges (D1, D7); react_flow values
  re-measured, no recorded 0 s (D2); batch size counted in experiments with a samples-per-experiment input (D3); the
  verdict-word rule bound to site-written text (D4); REQ-017 lists every input (D5); joint-run rules (D6); hash
  baseline at the start-gate head (D8); per-run seeds mixed (D9); queue rule renamed (D10); template fill of agents,
  markers and secondary modules (D11); similarity compares the same sets on both sides (D12); both counts shown (D13).
- 2026-11-02 0.3.0 after plan audit 2 (FAIL 0.86): REQ-008 fill rule as a `shall` clause, rounding only counts (N1,
  N2); device kept only across a boundary with no transfer (N3); samples per run up to the batch's samples (N4); plan
  task text (N5); boundary-rule tie-break (N6). Audit 3 PASS 0.88; its optional O1 (inputs a later edit makes
  invalid), O2 (edge number) and O3 (boundary counts wording) applied without a further audit.
- 2026-11-02 0.3.1 start gate: branch rebased onto `origin/main` 817c6ab (1.1.0 deployed, bundle re-pinned to the
  published file, SHA-256 673b2dbb…). Counts in research.md, design.md and acceptance.md re-measured on that file
  (e.g. 454 durations, 135 throughputs, 1660 boundaries). The repository became public with the deploy, so
  REQ-024 now limits pushes to the feature branch instead of naming a private origin; no other requirement
  changed.

## 1. Why

Release 1.1.0 adds the process numbers the papers state: step durations (`step_timing`) and platform, module and
connection values such as batch size, parallel units, throughput and transfer time (`process_value`). No view uses
them. Visitors who plan a closed-loop platform want to know which coded platforms resemble their layout, how long a
cycle of it took where papers report times, and how a layout with shared modules behaves over time. One input, a
workflow the visitor composes, feeds three outputs: similar platforms (data only), a cycle-time and throughput range
built from recorded durations, and a discrete-event simulation whose every assumption outside the data is an input
the visitor sees and sets.

The recorded durations are sparse (454 rows over 28 unit operations, most with fewer than 10 values; research.md §2),
so every output shows n and its sources, and the site states no verdict or cut-off on any number.

## 2. Requirements (GEARS)

### Data

- **REQ-001** (ubiquitous) `npm run build-data` shall write `public/data/simulation.json` with the shape of design.md
  §1, from the release files `modes/simulation/step_timing.csv`, `modes/simulation/process_values.csv`,
  `modes/builder/steps.csv`, `modes/builder/connections.csv`, `modes/builder/platform_graphs.jsonl`,
  `core/unit_operation.csv`, `core/module_type.csv` and `core/transfer_mode.csv`; every derived file that exists
  before this SPEC (`index.json`, `taxonomy.json`, `benchmark.json`, `benchmark-items.json`, `release-docs.json`, the
  platform files) shall stay byte-identical to its hash at the start-gate head (plan §B.0), recorded in progress.md
  before any code changes.
- **REQ-002** (ubiquitous) Each `duration` row shall be carried with its value converted to seconds (s ×1, min ×60,
  h ×3600, d ×86400), its unit-of-record value and unit, `bound`, `approximate`, `range_midpoint`, `range_low` and
  `range_high` (each range end converted like the value), the step's unit operation, the `duration_batch_size` row of
  the same step when one exists, the platform, paper, DOI and evidence (document, page, locator). A row with
  `covers_steps` shall be carried as a joint duration holding the covered step ids and their unit operations in
  order, and shall not enter the single-step values of any unit operation.
- **REQ-003** (ubiquitous) Each `throughput` row shall be carried with its value, unit, `throughput_kind`,
  `per_working_day`, `bound`, `approximate`, range fields, platform, paper, DOI and evidence, plus a per-day value
  computed only by the rules of design.md §2 (experiments per time; time per experiment; samples or batches converted
  with the platform's own `experiments_per_count` or `batch_size`), or null with the reason when no rule applies.
- **REQ-004** (unwanted) `build-data` shall not write any file when a timing row names a step id absent from
  `modes/builder/steps.csv`, a `duration` unit outside s, min, h and d, a `covers_steps` list whose first id differs
  from the row's step id or that names an unknown step, or a process-value row with a `target_kind` outside platform,
  module and connection; it shall report the offending row.

### Route and workflow input

- **REQ-005** (ubiquitous) The site shall have a route `#/workflow` (query optional) with the document title
  "Workflow builder · SDL Workflows Explorer" and a nav link "Workflow" placed between "Benchmark" and "About", marked
  as current on that route. Every existing route, its title and its nav text shall stay as they are.
- **REQ-006** (event-driven) When a visitor edits the workflow, the builder shall hold: an ordered list of 0 to 40
  steps, each with one unit operation from the release's 31 classes and one module; a list of 0 to 40 modules, each
  with a module type from the release's 22 classes and a number of identical devices from 1 to 50; for each pair of
  consecutive steps on different modules, a transfer mode (one of the release's 6 transfer modes, or "not
  specified") and a transfer time from 0 to 86,400 s; a batch size from 1 to 10,000 experiments (the experiments
  proposed and run together, as the release defines batch size); samples per experiment from 1 to 1,000 (default 1);
  and a number of parallel units (batches that can be in progress at once) from 1 to 50. The builder shall let the
  visitor add and remove steps and move a step up or down, and shall refuse a value outside these ranges or those of
  design.md §3 with a message, leaving the state unchanged. When a valid edit makes another input invalid (samples per
  run above the batch's samples, a transfer on a boundary that now joins steps of the same module, a chosen joint
  duration whose steps no longer match), the builder shall reset that input to its default and name it in a message;
  removing a module that a step uses shall be refused with a message naming those steps. The three outputs shall be shown once at least one step
  exists; with none, the page shall say that a step is needed.
- **REQ-007** (ubiquitous) The workflow and every visitor-set input of M2 and M3 shall be encoded in the hash query
  by the grammar of design.md §3, holding only values that differ from their default; opening the URL shall restore
  the same inputs, and encoding a decoded state shall return the same query. A part that does not parse shall be
  ignored and named in one message on the page; decoding shall never throw.
- **REQ-008** (event-driven) When a visitor picks a coded platform under "Start from a coded platform", the builder
  shall be filled from the release: the platform's steps in `step_order` with their unit operation and primary module;
  each module used by those steps with its type and, where recorded, its `units` value; for each pair of consecutive
  steps on different modules, the transfer mode of design.md §4 (a material connection from the first module to the
  second, else one in the other direction, else data_transfer where only a data connection joins them, else "not
  specified") with its recorded transfer time where one exists; the platform's recorded batch size and parallel units,
  else the defaults; and its recorded `transfer_agent_count` per agent, else the default. The builder shall fill each
  value as recorded (a range midpoint or bound as its value), round a non-whole count (batch size, parallel units,
  devices, agents) up, and say which inputs were filled from the platform.

### M1: Similar platforms

- **REQ-009** (ubiquitous) The view shall list the coded platforms ranked by step-order similarity, then module-type
  overlap, then transfer-mode overlap, then platform id, each defined in design.md §4 and stated on the page in plain
  words; it shall show 10 rows with a control that adds 10 more, the three measures as numbers with two decimals, the
  platform's name, paper id and year, and a link to the platform's view. Every column shall be sortable.
- **REQ-010** (event-driven) When the visitor selects 2 or 3 listed platforms, the view shall offer a link to
  `#/compare/<ids>` in the order selected; with fewer or more selected, no link shall be offered and the reason
  shown.

### M2: Cycle-time and throughput range

- **REQ-011** (ubiquitous) For each step the view shall show the recorded single-step durations of its unit
  operation as a distribution (one mark per value, in a shared time axis), with the number of recorded values and,
  when bounds are left out, the number used; each value shall be listed with
  its platform (linked to the platform view), paper DOI (linked), document, page and locator, its samples per run
  where recorded, and markers for a bound (≤ or ≥), an approximate value (≈) and a range midpoint (with the range
  drawn).
- **REQ-012** (event-driven) When a contiguous run of the visitor's steps has exactly the unit-operation sequence of
  a joint duration, the view shall offer that joint duration for those steps, with its sources; when the visitor
  chooses it, the run of steps shall count as one duration of that value in M2 and M3. A choice that overlaps an
  already chosen run shall be refused with a message.
- **REQ-013** (state-driven) While a step has no recorded single-step duration for its unit operation, no chosen
  joint duration and no value entered by the visitor, the view shall name the step, ask for a duration, and show no
  cycle or per-day result. Every value entered by the visitor shall be marked "entered by you" where it is shown,
  and every result built from one shall say which steps it came from.
- **REQ-014** (ubiquitous) The cycle range shall be computed as design.md §5 states — per step, runs per batch times
  the minimum, median and maximum of the values used (a visitor value or chosen joint duration gives one number),
  plus the transfer times; runs per batch is batch size × samples per experiment divided by the step's samples per
  run, rounded up, where samples per run is a visitor input per step from 1 to batch size × samples per experiment
  whose default is all samples of the batch in one run — and experiments per day as batch size × parallel units × 86,400 s / cycle time, with the
  page stating that this assumes no waiting for shared modules. Recorded bounds shall be shown but left out of the
  minimum, median and maximum unless the visitor includes them.
- **REQ-015** (ubiquitous) Next to the per-day range, the view shall show the recorded platform throughputs that
  have a per-day value, as one distribution for measured and one for nominal throughputs with n each, the platforms
  of the M1 top 10 marked, and each value listed with its unit of record, conversion basis and source; throughputs
  without a per-day value shall be counted and listable with their unit.
- **REQ-016** (unwanted) The text the site itself writes on the view (headings, labels, notes, messages; not names
  and other values taken from the release) shall not include any verdict, rating, cut-off or comparison word about
  the visitor's numbers (such as fast, slow, realistic, feasible, good or poor).

### M3: Discrete-event simulation

- **REQ-017** (ubiquitous) Every assumption of the simulation that is not in the data shall be an input on the page
  with its default stated next to it: transfer modes (default not specified) and transfer times (default 0 s),
  transfer agents per transfer mode that needs one (robot arm or gantry, mobile robot, person; 1 to 50, default 1
  each), the queue rule (default first come, first served), how step durations are drawn (default: one recorded value
  drawn at random for each run), whether recorded bounds are drawn (default no), the number of batches (1 to 500,
  default 10), the number of simulation runs (1 to 100, default 20) and the seed (0 to 4,294,967,295, default 1). The
  workflow inputs it uses — devices per module (default 1), batch size (default 1), samples per experiment (default
  1), samples per run (default all samples of the batch) and parallel units (default 1) — shall be listed with them
  with their current values. The results shall be headed by a sentence saying they depend on these inputs.
- **REQ-018** (ubiquitous) The simulation shall follow the model of design.md §6: batches released while fewer than
  the parallel units are in progress; each step holding one device of its module for its runs; a batch keeping its
  device when the next step uses the same module and no transfer is set on the boundary between them; a chosen joint duration held as one step on the module of its
  first covered step, with no transfer on the boundaries inside it and the same device-keeping rule after it;
  transfers taking their time and, for modes that need one, one transfer agent; waiting batches
  holding no device; queues served by the chosen rule with ties broken by batch number. The page shall state the
  joint-duration and device-holding rules among the assumptions.
- **REQ-019** (ubiquitous) The simulation shall run in the browser without network requests after the data is
  loaded, and for the same inputs and seed shall produce the same timeline and results, including after the URL is
  reopened.
- **REQ-020** (ubiquitous) The view shall show, for run 1, a timeline (Gantt chart) with one row per device and per
  transfer agent and a table of the same events; and over all runs, the minimum, median and maximum of the time to
  finish all batches and of experiments per day, the median utilization of each module (busy device time over
  devices × run length), the median waiting time before each step, and the bottleneck step, defined on the page as
  the step whose module has the highest median utilization.

### About, text and suites

- **REQ-021** (ubiquitous) The About page shall get a section "Workflow builder" of at most four short paragraphs
  saying, for each of the three outputs, what it shows and what it does not show, in the terms of design.md §7.
- **REQ-022** (ubiquitous) Every new visible text shall use no word whose meaning exists only in the project's
  working sessions (no milestone or requirement labels, no file names used as concepts); unit operation, module
  type, transfer mode, discrete-event simulation, Gantt chart and utilization shall be explained in the sentence
  where each first appears on the view.
- **REQ-023** (ubiquitous) Typecheck, Vitest, Playwright and the Pages build shall pass with `SDL_RELEASE_ZIP` set
  to the local 1.1.0 bundle after its SHA-256 is checked against the pin in the same run; Vitest and Playwright shall
  cover the computations of design.md §§4-6, joint durations, steps with no recorded duration and seed determinism,
  as acceptance.md lists.
- **REQ-024** (unwanted) The work shall not change `main`, `release-1.1.0`, the repository's visibility, the Pages
  settings, `release.config.json` or any workflow run; the run phase shall not start before the orchestrating session
  reports the 1.1.0 deploy done; pushes shall go only to the feature branch on origin (public since the deploy).

## 3. Out of scope

### Out of Scope — data and model

- No duration is estimated, imputed or derived from flow rates, volumes or other papers; a step without a recorded
  value takes only the visitor's value.
- Durations are not rescaled per sample; `duration_batch_size` is shown, and the visitor sets samples per run.
- Operating hours, human working hours, cost, `throughput_less_automated` and `throughput_automated` are not used.
- A module's devices are not split across the runs of one step.
- "Start from a coded platform" uses each step's primary module only; the further modules of 49 steps are not
  loaded.

### Out of Scope — site

- No change to the Compare view, the platform view or any other existing view beyond the new nav link.
- No deployment, merge or visibility change; `docs/plan.md` is not rewritten.
- Nothing in `~/research/sdl-db` is edited.

## 4. Acceptance

See `acceptance.md`.
