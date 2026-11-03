// Readable names for vocabulary codes (SPEC-UI-001 REQ-007): sentence case derived from the code, unless the
// override map below gives a name (acronyms, instrument_* and measure_* types, reactions, joined fields, and an
// "unmapped" name per kind so no two classes share a label, REQ-009). The code itself stays visible as secondary
// text (components/Label.tsx). Pure.

/** "chemistry_synthesis" → "Chemistry synthesis". */
export function sentenceCase(code: string): string {
  const words = code.split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const OVERRIDES: Record<string, Record<string, string>> = {
  field_tag: {
    battery_electrochem: "Battery and electrochemistry",
    biology_biochem: "Biology and biochemistry",
    materials_inorganic: "Inorganic materials",
    materials_polymer_soft: "Polymer and soft materials",
    materials_thin_film: "Thin-film materials",
    unmapped: "Other field (unmapped)",
  },
  module_type: {
    coating_printing_unit: "Coating / printing unit",
    commercial_integrated: "Commercial integrated system",
    instrument_electrochemical: "Electrochemical instrument",
    instrument_imaging: "Imaging instrument",
    instrument_optical: "Optical instrument",
    instrument_physical: "Physical-property instrument",
    instrument_separation_ms: "Separation / MS instrument",
    instrument_structural: "Structural instrument",
    unmapped: "Other module (unmapped)",
  },
  unit_operation: {
    cool_quench: "Cool / quench",
    deposit_coat: "Deposit / coat",
    evaporate_dry: "Evaporate / dry",
    measure_electrochemical: "Electrochemical measurement",
    measure_imaging: "Imaging measurement",
    measure_optical: "Optical measurement",
    measure_physical: "Physical-property measurement",
    measure_separation_ms: "Separation / MS measurement",
    measure_structural: "Structural measurement",
    react_flow: "Flow reaction",
    react_photo_electro: "Photo/electro reaction",
    react_thermal: "Thermal reaction",
    wash_extract: "Wash / extract",
    unmapped: "Other operation (unmapped)",
  },
  transfer_mode: {
    robot_arm_gantry: "Robot arm / gantry",
    unmapped: "Other transfer (unmapped)",
  },
  // Unit-operation families (taxonomy.json `family`).
  family: {
    unmapped: "Other family (unmapped)",
  },
};

/** Readable name of `code` in the vocabulary `kind` (field_tag, module_type, unit_operation, transfer_mode, …). */
export function displayLabel(kind: string, code: string): string {
  return OVERRIDES[kind]?.[code] ?? sentenceCase(code);
}
