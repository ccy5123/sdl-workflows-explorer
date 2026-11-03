// Elements of the read-only workflow graph built from the builder's state (SPEC-UI-001 UI AC-39 to UI AC-41).
import { describe, expect, it } from "vitest";
import { captionReserve, LABEL_END } from "../src/lib/graphElements";
import { groupOf, transferModeStyle } from "../src/lib/moduleGroups";
import { buildWorkflowGraph } from "../src/lib/workflowGraph";
import { DEFAULT_STATE, type WorkflowState } from "../src/lib/workflowState";

const state = (over: Partial<WorkflowState>): WorkflowState => ({ ...structuredClone(DEFAULT_STATE), ...over });

const S = state({
  modules: [
    { type: "liquid_handler", devices: 1 },
    { type: "thermal_unit", devices: 3 },
    { type: "instrument_optical", devices: 1 },
    { type: "storage", devices: 2 },
  ],
  steps: [
    { uo: "dispense_liquid", module: 1 },
    { uo: "react_thermal", module: 2 },
    { uo: "react_thermal", module: 2 },
    { uo: "measure_optical", module: 3 },
    { uo: "dispense_liquid", module: 1 },
  ],
  transfers: { 3: { mode: "robot_arm_gantry", seconds: 12 } },
});

const g = buildWorkflowGraph(S);
const nodes = g.elements.filter((e) => e.group === "nodes");
const edges = g.elements.filter((e) => e.group === "edges");

describe("buildWorkflowGraph", () => {
  it("draws one node per module, used or not, with the readable type, room for its caption and its group colour", () => {
    expect(nodes.map((n) => n.data.id)).toEqual(["wf-m1", "wf-m2", "wf-m3", "wf-m4"]);
    const m2 = nodes[1]!;
    expect(m2.classes).toBe("module");
    expect(m2.data.colour).toBe(groupOf("thermal_unit").colour);
    const caption = "Module 2 · 3 devices";
    expect(m2.data.label).toBe(`Thermal unit\n${captionReserve(caption)}\n${captionReserve(caption)}${LABEL_END}`);
    expect(g.captions).toContainEqual({ id: "wf-m1", text: "Module 1 · 1 device" });
    expect(g.captions).toContainEqual({ id: "wf-m4", text: "Module 4 · 2 devices" });
    // Module 4 is used by no step: drawn, with no connection.
    expect(edges.some((e) => e.data.source === "wf-m4" || e.data.target === "wf-m4")).toBe(false);
  });

  it("draws one edge per transfer boundary in step order, none between steps on the same module", () => {
    // Boundaries: 1 (m1→m2), 2 (same module, none), 3 (m2→m3), 4 (m3→m1).
    expect(edges.map((e) => [e.data.id, e.data.source, e.data.target])).toEqual([
      ["wf-t1", "wf-m1", "wf-m2"],
      ["wf-t3", "wf-m2", "wf-m3"],
      ["wf-t4", "wf-m3", "wf-m1"],
    ]);
    expect(g.modules).toBe(4);
    expect(g.transfers).toBe(3);
  });

  it("labels a set mode with its readable name and colour, and an unset one as not specified in the neutral class", () => {
    const set = edges.find((e) => e.data.id === "wf-t3")!;
    expect(set.data.label).toBe("Robot arm / gantry");
    expect(set.data.steps).toBe("3→4");
    expect(set.data.colour).toBe(transferModeStyle("robot_arm_gantry").colour);
    expect(set.classes).toBe("mode-robot_arm_gantry");
    const unset = edges.find((e) => e.data.id === "wf-t1")!;
    expect(unset.data.label).toBe("not specified");
    expect(unset.data.steps).toBe("1→2");
    expect(unset.classes).toBe("mode-na");
    // Nothing in the builder is inferred or uncertain, so no edge carries those classes.
    for (const e of edges) expect(String(e.classes)).not.toMatch(/inferred|uncertain/);
  });

  it("is empty for a state with no modules", () => {
    expect(buildWorkflowGraph(state({})).elements).toEqual([]);
  });

  it("keeps parallel edges between the same two modules", () => {
    const back = buildWorkflowGraph(
      state({
        modules: [
          { type: "fluidics", devices: 1 },
          { type: "flow_reactor", devices: 1 },
        ],
        steps: [
          { uo: "dispense_liquid", module: 1 },
          { uo: "react_flow", module: 2 },
          { uo: "dispense_liquid", module: 1 },
          { uo: "react_flow", module: 2 },
        ],
      }),
    );
    expect(back.elements.filter((e) => e.group === "edges").map((e) => e.data.id)).toEqual(["wf-t1", "wf-t2", "wf-t3"]);
  });
});
