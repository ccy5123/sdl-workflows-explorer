# Research: SPEC-SIM-001

Facts the plan rests on, read on 2026-11-02 at b6bee31 (branch `release-1.1.0`) from the pinned bundle (SHA-256
98ea319b…, extracted at `~/research/sdl-workflows-explorer-rel110/.cache/release/extract/sdl-workflows-1.1.0/`).
Measured with throwaway Python scripts in `.cache/` (not committed).

## 1. Release files

- `modes/simulation/step_timing.csv` (641 rows): 455 `duration`, 186 `duration_batch_size`; columns `step_id,
  platform_id, quantity, value, unit, bound, approximate, range_midpoint, range_low, range_high, covers_steps, ev_doc,
  ev_page, ev_locator`. `modes/simulation/process_values.csv` (475 rows) adds `target_kind, target_id,
  throughput_kind, n_experiments, elapsed_time, elapsed_time_unit, per_working_day, agent, manual_items`.
- `modes/simulation/README.md` and `data_dictionary.csv` define the columns. Points the design follows: a value
  stated as a range is its midpoint (`range_midpoint` = 1); `bound` marks a stated bound; a time for several
  consecutive steps sits on the first of them and `covers_steps` lists all of them, the others having no duration row;
  a step without `duration_batch_size` has a duration that applies to the batch; `parallel_units` is "batches that
  can be in progress at once"; module `units` is "identical devices the module stands for, working in parallel";
  connection `transfer_time` is "time to move one batch along it"; no row means one or not stated.
- `modes/builder/steps.csv` (2621 rows) gives each step's unit operation and primary module (49 steps also list other
  modules); `connections.csv` (1687) and `platform_graphs.jsonl` give modules and connections.
- Taxonomy: 31 unit operations (incl. `unmapped`), 22 module types (incl. `unmapped`, `commercial_integrated`,
  `human`), 6 transfer modes (data_transfer, fixed_tubing, human_transfer, mobile_robot, robot_arm_gantry,
  unmapped).

## 2. Step durations

- 455 duration rows on 455 distinct steps of 222 platforms; units min 268, s 112, h 67, d 8.
- Markers: bound 26 (upper 19, lower 7); approximate 42; range midpoint 116 (2 of them with empty range ends, the
  range being stated in another unit).
- Joint durations: 57 rows, covering 2 to 31 steps (2 steps: 18 rows); the first covered id always equals the row's
  step id; the 264 other covered steps have no duration row. One row does not follow `step_order`:
  Caramelli2021/P1/S3 covers S3 to S7 and then S1. Matching (REQ-012) uses the covered unit operations in the listed
  order, so this row is offered only for a visitor sequence in that order. Most covered unit-operation sequences occur once (most
  frequent: dispense_liquid → react_thermal, 4 rows).
- Single-step rows: 398 over 28 unit operations. n per unit operation: react_flow 87, react_thermal 70,
  measure_separation_ms 35, mix 19, deposit_coat 18, react_photo_electro 16, centrifuge 14, measure_optical 13,
  anneal 13, wash_extract 12, clean_equipment 10, measure_structural 9, dispense_liquid 8, evaporate_dry 8, sonicate
  8, cool_quench 7, measure_electrochemical 7, plan_next_experiment 6, sample_aliquot 6, measure_imaging 6, preheat 5,
  unmapped 5, measure_physical 5, handle_sample 4, analyze_data 3, filter 2, prepare_substrate 1, assemble_device 1.
  17 of the 28 have fewer than 10 values.
- No single-step duration: dispense_solid, generate_instructions, purify.
- Spread is wide: react_thermal 60 s to 259,200 s (median 7,200 s). No duration is 0. react_flow: 87 rows, 1 a lower
  bound (900 s); without it 86 values, 0.1755 s (Sagmeister2026/P1/S2) to 3,900 s, median 351 s; with it median
  360 s. react_thermal: 70 rows, 68 without bounds.
- `duration_batch_size`: 186 rows, 144 on steps with a duration (19 of them joint first steps); values 1 (141), 96
  (13), 12 (5), others ≤ 48.
- Performer of timed steps: robot 423, human 21, software 11.

## 3. Process values

- Platform: batch_size 234 (unit samples; median 1, max 864), throughput 136 (measured 92, nominal 44),
  cost 13, parallel_units 12 (values 2 to 20), throughput_automated 12, throughput_less_automated 12,
  transfer_agent_count 11 (robot_arm_gantry 10, mobile_robot 1), experiments_per_count 8, operating_hours_per_day 6,
  operating_days_per_week 5. Module: units 22 (2 to 24). Connection: transfer_time 4 (45.7 s, 6 s, 7 s, 30 s).
- Values that "Start from a coded platform" fills: batch_size has one non-whole value (Holmes2016/P1, 4.5, a range
  midpoint) and 2 bounds; parallel_units 2 bounds and 1 approximate; module units and transfer_agent_count are whole
  numbers with no markers. The release defines `batch_size` as the experiments proposed and returned together and
  records `experiments_per_count` (0.1 to 1) on 8 platforms, so one sample is not always one experiment.
- Throughput units: 22 forms, all matching the design §2 grammar (e.g. experiments/h 56, experiments/d 24,
  min/experiment 10, experiments/week 8, samples/4h 1, batches/15h 1). By count: experiments 107; batches 12, all on
  platforms with a batch size; samples 17, 8 with experiments_per_count and 9 without. So 127 rows get a per-day
  value and 9 do not. per_working_day = 1 on 5 rows; bound on 28 (lower 18, upper 10); approximate 31.

## 4. Site

- Routes: `src/lib/route.ts` (`parseRoute`, `routeTitle`, `navCurrent`, pure); `App.tsx` renders by `route.kind`,
  with Trends, Taxonomy and Benchmark as lazy chunks; nav: Home, Browse, Trends, Taxonomy, Benchmark, About.
  `e2e/routes.ts` lists the routes that the theme, keyboard and layout specs walk.
- Compare (`#/compare/<id>,<id>[,<id>]`, `src/lib/compare.ts`) takes 2 or 3 platform ids and shows module types,
  transfer modes and step sequences side by side. M1 links into it and leaves it unchanged.
- URL state: Browse and Trends keep filters in the hash query (`src/lib/filterUrl.ts`, pure, never throws, only
  non-default values). The builder follows the same pattern.
- Data build: `scripts/lib/derive.ts` (`deriveAll`, `writeDerived`) reads the extracted release and writes
  `public/data/`; `build-data` refuses to write if a count differs from `release.config.json`. Charts use
  Observable Plot 0.6.17 (already a dependency); no new dependency is needed.
- `tests/fixtures/release-mini` has no `modes/simulation/` files and no `core/unit_operation.csv` or
  `core/module_type.csv`; the fixture needs them, with joint, bound, range and samples-per-run rows.
- SPEC-RELEASE-001 REQ-005 kept views for the new tables out of that SPEC; this SPEC adds them.
