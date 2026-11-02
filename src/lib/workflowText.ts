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
