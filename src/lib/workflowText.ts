// Text the workflow builder writes itself (SPEC-SIM-001 REQ-016, REQ-022). Kept in one place so the plain-language
// review and the check for verdict words read every string.

export const WORKFLOW_INTRO =
  "Lay out an experiment as an ordered list of steps. Each step has a unit operation, the kind of work it does as " +
  "the release classes it (for example dispense_liquid or react_thermal), and is performed by a module, a device or " +
  "program classed by its module type. Between steps on different modules, a transfer mode says how material moves, " +
  "for example through fixed tubing or by a robot arm. The layout feeds three outputs: the coded platforms most like " +
  "it, a cycle-time range from step durations stated in papers, and a simulation of batches moving through it.";

export const NEED_A_STEP = "Add at least one step to see the three outputs.";

export const SIMILAR_INTRO =
  "The coded platforms whose structure is closest to your workflow, compared on three measures. They describe the " +
  "coded steps, modules and transfers only, not how a platform performed.";

export const SIMILAR_MEASURES: { term: string; text: string }[] = [
  {
    term: "Step order",
    text:
      "1 minus the number of steps that must be inserted, deleted or replaced to turn one step list into the other, " +
      "divided by the length of the longer list (1 means the same unit operations in the same order).",
  },
  {
    term: "Module types",
    text:
      "the module types of the modules that perform the steps, counted once each; the types both use, as a share of " +
      "the types either uses.",
  },
  {
    term: "Transfer modes",
    text:
      "the same for the material transfer modes between consecutive steps; two layouts with none count as the same.",
  },
];

export const SIMILAR_ORDER =
  "Rows are ordered by step order, then module types, then transfer modes, then platform id; a column header sorts by " +
  "that column instead.";

/** Why no compare link is offered for this many selected platforms, or null when one is. */
export function compareReason(selected: number): string | null {
  if (selected === 2 || selected === 3) return null;
  if (selected > 3) return `The comparison takes 2 or 3 platforms; ${selected} are selected.`;
  return `Select 2 or 3 platforms to compare them side by side (${selected} selected).`;
}

export const RANGE_INTRO =
  "For each step: the lowest, median and highest single-step duration that papers state for its unit operation, " +
  "with the number of values and their sources, times the runs the step needs per batch (batch size × samples per " +
  "experiment / samples per run, rounded up). The cycle time per batch adds these and the transfer times you set. " +
  "Most unit operations have fewer than 10 recorded durations, measured on different chemistries, scales and " +
  "devices. A joint duration is a time a paper states for several consecutive steps together; joint durations are " +
  "kept apart from the single-step values and offered where a run of your steps matches one.";

export const BOUNDS_LABEL = "Include recorded bounds (≤ or ≥ values) in the lowest, median and highest values";

export const NO_WAITING =
  "Experiments per day = batch size × parallel units × 86,400 s / cycle time. This assumes the parallel units never " +
  "wait for a shared module; the simulation below drops that assumption.";

export const MARKER_KEY =
  "Markers: ≤ an upper bound, ≥ a lower bound (hollow triangles, left out unless included), ≈ an approximate value, " +
  "and a line through a value stated as a range (the value is the range's midpoint).";

export const THROUGHPUT_INTRO =
  "Throughputs that papers state for whole platforms, converted to experiments per day where the unit allows: " +
  "experiments per time as stated, samples with the platform's recorded experiments per sample, and batches with its " +
  "recorded batch size. The shaded band is your per-day range; platforms among the 10 most similar to your workflow " +
  "are ringed.";

export const SOURCE_LABELS: Record<string, string> = {
  entered: "entered value",
  joint: "joint duration",
  covered: "inside a joint duration",
  recorded: "recorded durations",
  missing: "no recorded duration",
};

export const SIM_INTRO =
  "A discrete-event simulation moves time from one event to the next (a batch starting or finishing a step or a " +
  "transfer) and lets each device of a module, and each transfer agent, serve one batch at a time. Run here, it shows " +
  "where batches wait when several share the same modules. Everything the data does not record is an input below, " +
  "with its default.";

export const SIM_RULES: string[] = [
  "At the start, as many batches as there are parallel units are released; when a batch finishes its last step, the " +
    "next one is released.",
  "A step holds one device of its module for all its runs; a step waits, holding nothing, until a device is free, and " +
    "takes the lowest-numbered free device.",
  "A batch keeps its device for the next step when that step uses the same module and no transfer is set between " +
    "them; otherwise it releases the device and the transfer follows.",
  "A transfer by robot arm or gantry, mobile robot or person also holds one transfer agent of that kind; any other " +
    "transfer only takes its time.",
  "A chosen joint duration counts as one step on the module of its first step, with no transfer between its steps; " +
    "the rule above then applies after its last step.",
  "Durations are drawn when a step starts. Each run of the simulation has its own random sequence from the seed, so " +
    "the same inputs and seed give the same results.",
];

export const SIM_DEPENDS =
  "These results follow from the inputs listed above, including those that are not in the data. They show what " +
  "those inputs imply for this layout, not how a real platform performs.";

export const UTILIZATION_TEXT =
  "Utilization: the share of the time to finish all batches that a module's devices were busy (busy device time " +
  "divided by devices × that time), median over the runs.";

export const BOTTLENECK_TEXT = "Bottleneck step: the step whose module has the highest median utilization.";

export const GANTT_TEXT =
  "Timeline of run 1, drawn as a Gantt chart: one row per device and per transfer agent, one bar per step or " +
  "transfer, placed by its start and end time.";

export const QUEUE_RULES: Record<string, string> = {
  fifo: "first come, first served",
  released: "earliest-released batch first",
};

export const DRAW_RULES: Record<string, string> = {
  sample: "one recorded value drawn at random for each run of a step",
  median: "the median recorded value",
};

export const AGENT_LABELS: Record<string, string> = {
  robot_arm_gantry: "robot arm or gantry",
  mobile_robot: "mobile robot",
  human_transfer: "person",
};
