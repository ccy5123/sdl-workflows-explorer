// The phone view of the module graph: start module, neighbourhood, centring on a selection, ring places.
import { describe, expect, it } from "vitest";
import { degrees, focusFor, hubModule, modeLabel, neighbourhood, ringPositions } from "../src/lib/focusGraph";
import { fixturePlatform } from "./fixtures/platform";

const platform = fixturePlatform();
const M1 = "Test2020/P1/M1";
const M2 = "Test2020/P1/M2";
const M3 = "Test2020/P1/M3";

describe("focus graph", () => {
  it("counts each module's connections", () => {
    expect(degrees(platform)).toEqual(new Map([[M1, 1], [M2, 3], [M3, 2]]));
  });

  it("starts on the module with the most connections", () => {
    expect(hubModule(platform)).toBe(M2);
    expect(hubModule({ modules: platform.modules, connections: [] })).toBe(M1);
    expect(hubModule({ modules: [], connections: [] })).toBeNull();
  });

  it("lists the neighbours of a module with the connections to each, both directions", () => {
    const n = neighbourhood(platform, M2)!;
    expect(n.focus.module_id).toBe(M2);
    expect(n.neighbours.map((x) => x.module.module_id)).toEqual([M1, M3]);
    expect(n.neighbours[0]!.connections.map((c) => c.edge_id)).toEqual(["Test2020/P1/E1"]);
    expect(n.neighbours[1]!.connections.map((c) => c.edge_id)).toEqual(["Test2020/P1/E2", "Test2020/P1/E3"]);
    expect(neighbourhood(platform, M1)!.neighbours.map((x) => x.module.module_id)).toEqual([M2]);
    expect(neighbourhood(platform, "nope")).toBeNull();
  });

  it("centres on a selected module, and on a connection or step only when the focus is not part of it", () => {
    expect(focusFor(platform, { kind: "module", id: M3 }, M2)).toBe(M3);
    expect(focusFor(platform, { kind: "connection", id: "Test2020/P1/E2" }, M1)).toBe(M2);
    expect(focusFor(platform, { kind: "connection", id: "Test2020/P1/E2" }, M3)).toBeNull();
    expect(focusFor(platform, { kind: "step", id: "Test2020/P1/S2" }, M1)).toBe(M3);
    expect(focusFor(platform, { kind: "step", id: "Test2020/P1/S1" }, M2)).toBeNull();
    expect(focusFor(platform, { kind: "platform", id: "Test2020/P1" }, M2)).toBeNull();
    expect(focusFor(platform, null, M2)).toBeNull();
  });

  it("puts neighbours on a ring, the first at the top", () => {
    const [top, right, bottom, left] = ringPositions(4, 300, 300, 50);
    expect(top!.x).toBeCloseTo(150);
    expect(top!.y).toBeCloseTo(50);
    expect(right!.x).toBeCloseTo(250);
    expect(bottom!.y).toBeCloseTo(250);
    expect(left!.x).toBeCloseTo(50);
    expect(ringPositions(0, 300, 300, 50)).toEqual([]);
    const [high, , low] = ringPositions(4, 300, 500, 50);
    expect(high!.y).toBeCloseTo(50);
    expect(low!.y).toBeCloseTo(450);
  });

  it("names each transfer mode of a neighbour once, with a count", () => {
    expect(modeLabel(["arm/gantry", "arm/gantry", "human"])).toBe("arm/gantry ×2 · human");
    expect(modeLabel(["tubing"])).toBe("tubing");
  });
});
