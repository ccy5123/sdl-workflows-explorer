// AC-4: step order, highlight set and the selection reducer (REQ-012, REQ-013).
import { describe, expect, it } from "vitest";
import { highlightSet, selectionReducer, sortSteps, type Selection } from "../src/lib/steps";
import { fixturePlatform } from "./fixtures/platform";

const platform = fixturePlatform();

describe("sortSteps", () => {
  it("returns steps sorted by step_order without changing the input", () => {
    const before = platform.steps.map((s) => s.step_order);
    expect(sortSteps(platform.steps).map((s) => s.step_order)).toEqual([1, 2]);
    expect(platform.steps.map((s) => s.step_order)).toEqual(before);
  });
});

describe("highlightSet", () => {
  it("equals the step's modules", () => {
    const s1 = platform.steps.find((s) => s.step_order === 1)!;
    expect([...highlightSet(s1)].sort()).toEqual(["Test2020/P1/M1", "Test2020/P1/M2"]);
  });
});

describe("selectionReducer", () => {
  const step1: Selection = { kind: "step", id: "Test2020/P1/S1" };
  const step2: Selection = { kind: "step", id: "Test2020/P1/S2" };

  it("selects an item", () => {
    expect(selectionReducer(null, { type: "select", selection: step1 })).toEqual(step1);
  });

  it("toggles off when the same step is selected twice", () => {
    const once = selectionReducer(null, { type: "select", selection: step1 });
    expect(selectionReducer(once, { type: "select", selection: { ...step1 } })).toBeNull();
  });

  it("switches to another item", () => {
    expect(selectionReducer(step1, { type: "select", selection: step2 })).toEqual(step2);
    expect(selectionReducer(step1, { type: "select", selection: { kind: "module", id: "Test2020/P1/S1" } })).toEqual({
      kind: "module",
      id: "Test2020/P1/S1",
    });
  });

  it("clears on Escape", () => {
    expect(selectionReducer(step1, { type: "clear" })).toBeNull();
    expect(selectionReducer(null, { type: "clear" })).toBeNull();
  });
});
