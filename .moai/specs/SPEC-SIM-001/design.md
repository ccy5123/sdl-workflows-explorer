# Design: SPEC-SIM-001

## 1. Derived data: `public/data/simulation.json`

Written by `deriveAll` (new builder in `scripts/lib/simulation.ts`, called from `scripts/lib/derive.ts`) and fetched
only when `#/workflow` opens. Ids and class names are the release's own.

```ts
interface SimulationJson {
  unit_operations: { id: string; family: string; definition: string }[];       // core/unit_operation.csv, 31
  module_types: { id: string; definition: string }[];                           // core/module_type.csv, 22
  transfer_modes: { id: string; is_material: boolean; definition: string }[];   // core/transfer_mode.csv, 6
  durations: DurationRow[];        // every duration row of step_timing, 455
  throughputs: ThroughputRow[];    // every throughput row of process_value, 136
  transfer_times: { edge_id: string; platform_id: string; seconds: number; value: number; unit: string;
                    evidence: Evidence }[];                                     // 4
  platforms: PlatformLayout[];     // 280, for M1 and "Start from a coded platform"
}

interface DurationRow {
  step_id: string; platform_id: string; paper_id: string; doi: string;
  unit_operation: string;                 // of step_id (builder steps.csv)
  seconds: number;                        // value converted to s
  value: number; unit: "s" | "min" | "h" | "d";
  bound: "lower" | "upper" | null; approximate: boolean; range_midpoint: boolean;
  range_low_s: number | null; range_high_s: number | null;
  samples_per_run: number | null;         // duration_batch_size of the same step_id, if any
  joint: { step_ids: string[]; unit_operations: string[] } | null;   // from covers_steps, in order
  evidence: Evidence;                     // ev_doc, ev_page, ev_locator
}

interface ThroughputRow {
  platform_id: string; paper_id: string; doi: string;
  kind: "measured" | "nominal"; value: number; unit: string; per_working_day: boolean;
  bound: "lower" | "upper" | null; approximate: boolean; range_midpoint: boolean;
  n_experiments: number | null; elapsed_time: number | null; elapsed_time_unit: string | null;
  per_day: number | null;                 // §2
  basis: "experiments" | "samples × experiments per sample" | "batches × batch size" | null;
  not_converted: string | null;           // reason when per_day is null
  evidence: Evidence;
}

interface PlatformLayout {
  platform_id: string; name: string | null; paper_id: string; year: number;
  steps: { unit_operation: string; module_id: string }[];           // step_order, primary module
  modules: { module_id: string; module_type: string; name: string | null; units: number | null }[];
  connections: { from: string; to: string; transfer_mode: string; is_material: boolean;
                 transfer_time_s: number | null }[];
  batch_size: number | null; parallel_units: number | null;    // recorded value (a midpoint or bound as its value)
  transfer_agents: { agent: "robot_arm_gantry" | "mobile_robot" | "human"; count: number }[];
}
```

`modules` holds only the modules some step uses as its primary module (the builder and M1 need no others).
`transfer_agents` comes from `transfer_agent_count`; its agent `human` fills the builder's human_transfer agents.

## 2. Per-day throughput (REQ-003)

Unit grammar of `process_value.unit` for throughput rows (data dictionary): a rate `<count>/<k><time>` or a cycle
time `<time>/<count>`, with count ∈ {experiments, samples, batches} (singular in cycle times) and time ∈ {s, min, h,
d, week}; `<k>` is an optional whole number of time units.

Days per time unit: s = 1/86400, min = 1/1440, h = 1/24, d = 1, week = 7.

1. Rate: count per day = value / (k × days(time)). Cycle time: count per day = 1 / (value × days(time)).
2. experiments: per_day = count per day; basis "experiments".
3. samples: per_day = count per day × the platform's `experiments_per_count` when recorded (basis
   "samples × experiments per sample"); else null, reason "counts samples; no experiments per sample is recorded".
4. batches: per_day = count per day × the platform's `batch_size` when recorded (basis "batches × batch size"); else
   null, reason "counts batches; no batch size is recorded".
5. Any other unit: null, reason "unit not converted".

`per_working_day` = 1 rows are converted the same way and shown with "per working day". Bound, approximate and range
markers are carried and drawn. On 1.1.0 this converts 127 of 136 rows (research.md §3).

## 3. URL grammar (REQ-007)

`#/workflow?<param>=<value>&…` in this order, each present only when it differs from its default. Items inside a
list are joined by `,`; fields inside an item by `~`; every field is `encodeURIComponent`-encoded (so step ids keep
their `/` as `%2F`). Indices are 1-based.

Seconds are non-negative decimals with at most 3 decimal places; counts are whole numbers.

| Param | Value | Allowed | Default |
|---|---|---|---|
| `s` | steps: `<unit_operation>~<module index>` | up to 40; class of the release; index of an existing module | none |
| `m` | modules: `<module_type>` or `<module_type>~<devices>` | up to 40; devices 1-50 | none |
| `t` | transfers: `<boundary>~<mode>` or `<boundary>~<mode>~<seconds>`; boundary i lies between steps i and i+1; mode is a release transfer mode or `na` (not specified) | boundary between different modules; 0-86,400 s | every boundary `na`, 0 s |
| `b` | batch size (experiments) | 1-10,000 | 1 |
| `e` | samples per experiment | 1-1,000 | 1 |
| `p` | parallel units | 1-50 | 1 |
| `k` | samples per run: `<step>~<samples>` | 1 to batch size × samples per experiment | all samples of the batch |
| `d` | durations entered by the visitor: `<step>~<seconds>` | 0-10,000,000 s | none |
| `j` | chosen joint durations: `<first step>~<step_id of the joint row>` | joint row whose unit operations match the steps from there; no overlap | none |
| `bounds` | `1` to include recorded bounds | 0 or 1 | `0` |
| `ag` | transfer agents: `<mode>~<count>`, mode ∈ robot_arm_gantry, mobile_robot, human_transfer | 1-50 | 1 each |
| `rule` | `fifo` (first come, first served) or `released` (earliest-released batch first) | | `fifo` |
| `draw` | `sample` (a recorded value at random per run) or `median` | | `sample` |
| `n` | batches | 1-500 | 10 |
| `runs` | simulation runs | 1-100 | 20 |
| `seed` | seed | 0-4,294,967,295 | 1 |

Decoding checks each item against its column and drops items that fail, listing them in one message ("Ignored from
the link: …"); a later joint choice that overlaps an earlier one is dropped the same way. The same ranges apply to
the inputs on the page. Encoding then decoding a valid state returns it unchanged
(property tested with generated states).

## 4. Similarity (REQ-009)

For the visitor's workflow W and a platform P (steps in `step_order`):

- **Step order** S = 1 − lev(W, P) / max(|W|, |P|), where lev is the edit distance over the two unit-operation
  sequences with unit cost for inserting, deleting or replacing one step.
- **Module types** M = |A ∩ B| / |A ∪ B|, A = module types of the visitor's modules used by a step, B = module types
  of the platform's step modules (`PlatformLayout.modules`).
- **Transfer modes** X = |C ∩ D| / |C ∪ D|, C = material transfer modes set on the visitor's boundaries (data_transfer
  and "not specified" excluded), D = material transfer modes on the platform's boundaries by the boundary rule below;
  two empty sets count as identical (X = 1).

Boundary rule (shared by M1 and "Start from a coded platform"): for consecutive steps on different modules, the mode
of a material connection from the first module to the second; else of one from the second to the first; else
data_transfer if a data connection joins them; else "not specified". Where several connections qualify, the one with
the lowest edge number (k of E<k>, compared as a number) is used. On 1.1.0, of 1667 such boundaries, 1043 have a
forward material connection, 76 only a reverse one, and 548 no material connection (236 of them a data connection);
no boundary has two qualifying material modes (one module pair off the boundaries,
Ha2023/P1 M3→M5, has two). Both sides
use the same sets, so a workflow started from a platform scores 1, 1, 1 against that platform.

Order: S, M, X descending on exact values, then platform id ascending. Page text: "Step order: 1 minus the number of
steps that must be inserted, deleted or replaced to turn one step list into the other, divided by the length of the
longer list (1 means the same unit operations in the same order). Module types: the module types of the modules
that perform the steps, counted once each; the types both use, as a share of the types either uses. Transfer modes:
the same for the material transfer modes between consecutive steps; two layouts with none count as the same."

## 5. Cycle-time and throughput range (REQ-011 to REQ-015)

Per unit operation u: V(u) = durations with `unit_operation` = u and `joint` = null; U(u) = V(u) without bound rows
unless `bounds=1`. Per step i with batch size b (experiments), samples per experiment e, samples per run k_i
(default b × e) and runs r_i = ⌈b × e / k_i⌉:

| Source for step i | low | mid | high |
|---|---|---|---|
| visitor value d_i | d_i | d_i | d_i |
| first step of a chosen joint run i..j (joint value J) | J | J | J |
| a later step of a chosen joint run | 0 | 0 | 0 |
| U(u_i) not empty | min U | median U | max U |
| otherwise | missing | missing | missing |

Each of low, mid and high is multiplied by r_i (the joint run uses r of its first step). Each step shows "n =
<|V(u)|> recorded" and, when bounds are left out and V(u) has any, "<|U(u)|> used". Median of an even count is
the mean of the two middle values. Cycle (low, mid, high) = Σ steps + Σ transfer times on boundaries outside chosen
joint runs. Per day (low, mid, high) = b × p × 86400 / (cycle high, mid, low). Any missing step: no cycle and no per
day, the missing steps named. A cycle bound of 0 s (possible only with entered values of 0 s; no recorded duration
is 0) gives no per-day value for that bound, shown as "not defined: the cycle time is 0 s".

Throughput panel: the per-day values of §2 as two strip plots (measured, nominal) with n, the visitor's per-day range
as a shaded band, and platforms in the M1 top 10 drawn with a ring and listed. No sentence compares the visitor's
range with the recorded values.

## 6. Simulation model (REQ-017 to REQ-020)

State: modules with their devices; transfer agents per agent mode (robot_arm_gantry, mobile_robot, human_transfer);
batches 1..N.

1. At t = 0 release batches 1..min(p, N). When a batch finishes its last step, release the next unreleased batch at
   that time.
2. A batch at step i requests one device of step i's module (a chosen joint run i..j is one step on step i's module,
   lasting J per run). If it holds a device of that module from the step before (rule 4), it keeps it. A
   granted request takes the lowest-numbered free device.
3. The step holds the device for the sum of r_i durations: the visitor value, the joint value, the median of U(u_i)
   (`draw=median`), or for each run one value drawn uniformly from U(u_i) sorted by (seconds, step_id)
   (`draw=sample`).
4. After step i < n (for a joint run, after its last covered step, comparing the run's module with the next step's)
   the device is kept when the next step uses the same module and the boundary carries no transfer (mode "not
   specified" and 0 s); otherwise it is released and the boundary's transfer follows. Boundaries inside a chosen joint
   run take no transfer. M2 adds the same transfers, so both outputs count the boundary after a joint run alike. On a boundary with mode
   robot_arm_gantry, mobile_robot or human_transfer the batch requests one agent of that mode and holds it for the
   transfer time; on any other boundary it waits the transfer time holding nothing. Then it requests step i+1.
5. Free devices and agents go to waiting requests by the rule: `fifo` = earliest request time; `released` = earliest
   batch release time; ties by batch number.
6. Events are processed in order of (time, insertion sequence), so a run is a pure function of its inputs.
7. Run r (1..R) uses the PRNG mulberry32 seeded with mix32(seed XOR (r × 0x9E3779B9 mod 2^32)), where mix32 is the
   32-bit MurmurHash3 finalizer, so neighbouring seeds share no runs; draws are taken when a step starts.
8. Per run: makespan T; experiments per day = N × b × 86400 / T; utilization of module m = busy device time / (devices
   of m × T); waiting before step i = mean over batches of (grant time − request time). Over runs: min, median and
   max of T and of experiments per day; median utilization per module; median waiting per step. Bottleneck step: the
   step whose module has the highest median utilization (the earliest such step).
9. Limits: N ≤ 500, R ≤ 100; when N × R × Σ r_i exceeds 5,000,000 step runs the page asks for smaller inputs instead
   of running. The simulation runs when the visitor presses "Run simulation".

The timeline shows run 1: one row per device ("<module type> <module number>, device <d>") and per agent, one bar per
step run coloured by step, transfer bars on agent rows, time axis in the largest fitting unit. A collapsed table lists
the same events (batch, step, device or agent, start, end, waited).

## 7. About section text (REQ-021), draft

Heading "Workflow builder".

1. "The workflow builder lets you lay out the steps of an experiment, the modules that perform them and how material
   moves between modules, and gives three outputs from that one layout."
2. "Similar platforms lists the coded platforms whose step order, module types and transfer modes are closest to
   yours. It compares the coded structure only and says nothing about how well any platform worked."
3. "Cycle time and throughput adds up the step durations that papers state for each type of step, as the lowest,
   median and highest recorded value, with the number of values and their sources. Most step types have fewer than
   10 recorded durations, measured on different chemistries, scales and devices; a step with no recorded duration
   uses the time you enter. The per-day figure assumes the parallel units never wait for a shared module."
4. "The simulation runs your layout on a timeline with shared devices, queues and transfers. Transfer times, transfer
   agents, the queue rule, how durations are drawn and the random seed are your inputs, not data; the release holds 4
   recorded transfer times. The results show what follows from those inputs, not how a real platform performs."

Figures in this text ("10", "4") are checked against `simulation.json` by a test.

## 8. Page layout

`#/workflow`, lazy-loaded chunk with Observable Plot. Top to bottom: `h1` "Workflow builder" and one intro paragraph
(explains unit operation, module type and transfer mode in place); "Your workflow" (start from a coded platform;
steps table: order, unit operation, module, samples per run, move/remove; modules table: type, devices; transfers
between consecutive steps; batch size; samples per experiment; parallel units); "Similar platforms"; "Cycle time and throughput"; "Simulation"
(assumption inputs with defaults, "Run simulation", results). At 375 px the tables stack or scroll inside their
container, as the existing tables do; no horizontal page scroll.
