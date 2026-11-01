// Display groups and transfer-mode styles (REQ-007, REQ-009, REQ-011, spec §3).
// The release taxonomy has no module-type family, so these groups are a display choice of the site.
// Colours are from the Okabe-Ito palette.

export interface DisplayGroup {
  name: string;
  colour: string;
  types: string[];
}

export const DISPLAY_GROUPS: DisplayGroup[] = [
  {
    name: "Reactors and conditioning",
    colour: "#D55E00",
    types: ["batch_reactor", "flow_reactor", "thermal_unit", "mixer"],
  },
  {
    name: "Material handling",
    colour: "#0072B2",
    types: ["fluidics", "liquid_handler", "solid_dispenser", "sample_handling_station", "storage"],
  },
  {
    name: "Instruments",
    colour: "#009E73",
    types: [
      "instrument_electrochemical",
      "instrument_imaging",
      "instrument_optical",
      "instrument_physical",
      "instrument_separation_ms",
      "instrument_structural",
    ],
  },
  {
    name: "Processing",
    colour: "#E69F00",
    types: ["separation_unit", "coating_printing_unit", "assembly_unit"],
  },
  {
    name: "Control and other",
    colour: "#CC79A7",
    types: ["software", "human", "commercial_integrated", "unmapped"],
  },
];

const FALLBACK_GROUP = DISPLAY_GROUPS[DISPLAY_GROUPS.length - 1]!;

/** Display group of a module type; unknown types go to "Control and other". */
export function groupOf(moduleType: string): DisplayGroup {
  return DISPLAY_GROUPS.find((g) => g.types.includes(moduleType)) ?? FALLBACK_GROUP;
}

export interface TransferModeStyle {
  mode: string;
  label: string;
  colour: string;
}

export const TRANSFER_MODES: TransferModeStyle[] = [
  { mode: "fixed_tubing", label: "tubing", colour: "#0072B2" },
  { mode: "robot_arm_gantry", label: "arm/gantry", colour: "#E69F00" },
  { mode: "mobile_robot", label: "mobile robot", colour: "#009E73" },
  { mode: "human_transfer", label: "human", colour: "#CC79A7" },
  { mode: "data_transfer", label: "data", colour: "#999999" },
  { mode: "unmapped", label: "unmapped", colour: "#000000" },
];

const UNMAPPED_MODE = TRANSFER_MODES[TRANSFER_MODES.length - 1]!;

/** Label and colour of a transfer mode; unknown modes are styled as unmapped. */
export function transferModeStyle(mode: string): TransferModeStyle {
  return TRANSFER_MODES.find((m) => m.mode === mode) ?? UNMAPPED_MODE;
}
