// Force layout of the module graph: crossing count, the squeezed layered start, the solid frame and its caption, and
// the centred fit that may zoom out to the cluster's readable zoom.
import { describe, expect, it } from "vitest";
import { countCrossings, squeezed } from "../src/lib/forceLayout";
import { boundaryId, buildElements, frameCaption, frameId } from "../src/lib/graphElements";
import { CLUSTER_READABLE_ZOOM, READABLE_ZOOM, readableViewport } from "../src/lib/viewport";
import { fixturePlatform } from "./fixtures/platform";

const p = (x: number, y: number) => ({ x, y });

describe("countCrossings", () => {
  it("counts two edges that cross between four different modules", () => {
    const [a, b, c, d] = [p(0, 0), p(10, 10), p(0, 10), p(10, 0)];
    expect(countCrossings([{ source: a, target: b }, { source: c, target: d }])).toBe(1);
  });

  it("does not count edges that only meet at a shared module", () => {
    const [a, b, c] = [p(0, 0), p(10, 10), p(10, 0)];
    expect(countCrossings([{ source: a, target: b }, { source: a, target: c }])).toBe(0);
  });

  it("does not count parallel or apart edges", () => {
    const [a, b, c, d] = [p(0, 0), p(10, 0), p(0, 5), p(10, 5)];
    expect(countCrossings([{ source: a, target: b }, { source: c, target: d }])).toBe(0);
  });
});

describe("squeezed", () => {
  it("centres the points on 0 and squeezes the long axis towards the box's proportions", () => {
    // 400 x 100 layout (aspect 4) into a box of aspect 2: x is halved, y kept.
    const out = squeezed([p(0, 0), p(400, 100)], 2);
    expect(out).toEqual([p(-100, -50), p(100, 50)]);
  });

  it("never squeezes an axis below half", () => {
    // aspect 10 into a box of aspect 1: the squeeze stops at 0.5.
    const out = squeezed([p(0, 0), p(1000, 100)], 1);
    expect(out[1]!.x - out[0]!.x).toBe(500);
  });

  it("keeps the crossings of the layout it squeezes", () => {
    const at = [p(0, 0), p(300, 40), p(0, 40), p(300, 0)];
    const [a, b, c, d] = squeezed(at, 1);
    expect(countCrossings([{ source: a!, target: b! }, { source: c!, target: d! }])).toBe(1);
  });
});

describe("solid frame", () => {
  const classesOf = (e: { classes?: string | string[] }) =>
    (Array.isArray(e.classes) ? e.classes.join(" ") : (e.classes ?? "")).split(" ").filter(Boolean);

  it("holds the platform boundary and every module off the platform", () => {
    const platform = fixturePlatform();
    const elements = buildElements(platform, { frame: true });
    const frame = elements.find((e) => classesOf(e).includes("frame"))!;
    expect(frame.data.id).toBe(frameId(platform));
    expect(frame.data.label).toBe(frameCaption(platform));
    expect(elements.find((e) => classesOf(e).includes("boundary"))!.data.parent).toBe(frameId(platform));
    for (const m of platform.modules) {
      const node = elements.find((e) => e.data.id === m.module_id)!;
      expect(node.data.parent).toBe(m.on_platform ? boundaryId(platform) : frameId(platform));
    }
  });

  it("is left out without the option", () => {
    expect(buildElements(fixturePlatform()).some((e) => classesOf(e).includes("frame"))).toBe(false);
  });

  it("says what the dashed box and the space outside it mean", () => {
    const platform = fixturePlatform();
    const mixed = { modules: [{ ...platform.modules[0]!, on_platform: true }, { ...platform.modules[0]!, on_platform: false }] };
    expect(frameCaption(mixed)).toMatch(/^Dashed box: the platform\. Modules outside it/);
    expect(frameCaption({ modules: mixed.modules.slice(0, 1) })).toMatch(/Every module here is part of it/);
    expect(frameCaption({ modules: mixed.modules.slice(1) })).toMatch(/None of these modules is part of the platform/);
  });
});

describe("readableViewport for a cluster", () => {
  const box = (x1: number, y1: number, w: number, h: number) => ({ x1, y1, w, h });

  it("may zoom out to the cluster's readable zoom, and centres what does not fit", () => {
    // 2000 x 800 graph in a 1000 x 600 box: the fit (about 0.48) is raised to the cluster floor.
    const v = readableViewport(box(0, 0, 2000, 800), 1000, 600, 20, 0, true);
    expect(v.zoom).toBe(CLUSTER_READABLE_ZOOM);
    expect(v.pan.x).toBeCloseTo((1000 - 2000 * v.zoom) / 2);
  });

  it("keeps the readable zoom for a layered graph", () => {
    expect(readableViewport(box(0, 0, 2000, 800), 1000, 600, 20).zoom).toBe(READABLE_ZOOM);
  });
});
