// AC-2: display groups, colours and transfer-mode styles (REQ-007, REQ-009, REQ-011, spec §3).
import { describe, expect, it } from "vitest";
import { DISPLAY_GROUPS, TRANSFER_MODES, groupOf, transferModeStyle } from "../src/lib/moduleGroups";
import { dataAvailable, readTaxonomy, warnIfMissing } from "./viewer-data";

warnIfMissing("moduleGroups.test.ts");

const SPEC_GROUPS: [string, string][] = [
  ["Reactors and conditioning", "#D55E00"],
  ["Material handling", "#0072B2"],
  ["Instruments", "#009E73"],
  ["Processing", "#E69F00"],
  ["Control and other", "#CC79A7"],
];

const SPEC_MODES: [string, string, string][] = [
  ["fixed_tubing", "tubing", "#0072B2"],
  ["robot_arm_gantry", "arm/gantry", "#E69F00"],
  ["mobile_robot", "mobile robot", "#009E73"],
  ["human_transfer", "human", "#CC79A7"],
  ["data_transfer", "data", "#999999"],
  ["unmapped", "unmapped", "#000000"],
];

describe("display groups", () => {
  it("has the 5 groups of spec §3 with their Okabe-Ito colours", () => {
    expect(DISPLAY_GROUPS.map((g) => [g.name, g.colour])).toEqual(SPEC_GROUPS);
  });

  it("puts each type in exactly one group", () => {
    const all = DISPLAY_GROUPS.flatMap((g) => g.types);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(22);
  });

  it("maps known types to their group and unknown types to Control and other", () => {
    expect(groupOf("flow_reactor").name).toBe("Reactors and conditioning");
    expect(groupOf("liquid_handler").colour).toBe("#0072B2");
    expect(groupOf("instrument_imaging").name).toBe("Instruments");
    expect(groupOf("assembly_unit").name).toBe("Processing");
    expect(groupOf("human").name).toBe("Control and other");
    expect(groupOf("not_a_type").name).toBe("Control and other");
  });
});

describe("transfer modes", () => {
  it("has the 6 modes of spec §3 with label and colour", () => {
    expect(TRANSFER_MODES.map((m) => [m.mode, m.label, m.colour])).toEqual(SPEC_MODES);
  });

  it("styles a known mode and falls back to unmapped for an unknown one", () => {
    expect(transferModeStyle("robot_arm_gantry").label).toBe("arm/gantry");
    expect(transferModeStyle("teleport")).toEqual(transferModeStyle("unmapped"));
  });
});

describe.skipIf(!dataAvailable)("real taxonomy.json", () => {
  const taxonomy = dataAvailable ? readTaxonomy() : { classes: [], correspondence: [] };
  const moduleTypes = taxonomy.classes.filter((c) => c.class_kind === "module_type").map((c) => c.class);
  const modes = taxonomy.classes.filter((c) => c.class_kind === "transfer_mode").map((c) => c.class);

  it("maps every one of the 22 module types to exactly one group", () => {
    expect(moduleTypes).toHaveLength(22);
    for (const type of moduleTypes) {
      expect(DISPLAY_GROUPS.filter((g) => g.types.includes(type)), type).toHaveLength(1);
    }
  });

  it("lists no type outside the taxonomy", () => {
    for (const type of DISPLAY_GROUPS.flatMap((g) => g.types)) expect(moduleTypes).toContain(type);
  });

  it("covers the 6 transfer modes of the taxonomy", () => {
    expect([...modes].sort()).toEqual(TRANSFER_MODES.map((m) => m.mode).sort());
  });
});
