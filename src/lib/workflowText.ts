// Text the workflow builder writes itself (SPEC-SIM-001 REQ-016, REQ-022). Kept in one place so the plain-language
// review and the check for verdict words read every string.

export const WORKFLOW_INTRO =
  "Lay out an experiment as an ordered list of steps. Each step has a unit operation, the kind of work it does as " +
  "the release classes it (for example dispense_liquid or react_thermal), and is performed by a module, a device or " +
  "program classed by its module type. Between steps on different modules, a transfer mode says how material moves, " +
  "for example through fixed tubing or by a robot arm. The layout feeds three outputs: the coded platforms most like " +
  "it, a cycle-time range from step durations stated in papers, and a simulation of batches moving through it.";

export const NEED_A_STEP = "Add at least one step to see the three outputs.";
