// Geometry of the HTML layer over the module graph: equipment-name captions and the minimap (SPEC-UI-001 UI AC-35,
// UI AC-37).
import { describe, expect, it } from "vitest";
import { captionBox, centreOn, fromMinimap, graphFits, minimapFrame, toMinimap } from "../src/lib/graphOverlay";

describe("captionBox", () => {
  // A label box from Cytoscape (model px) whose last two 13 px lines are the reserved caption room; Cytoscape widens
  // label bounds by 2 px on each side.
  const label = { x1: 98, y1: 20, x2: 202, y2: 66 };

  it("places the caption over the label's last two lines at zoom 1", () => {
    expect(captionBox(label, 1, { x: 0, y: 0 })).toEqual({ left: 100, top: 38, width: 100, fontSize: 11, lineHeight: 13 });
  });

  it("scales position, width and type with the zoom and adds the pan", () => {
    expect(captionBox(label, 2, { x: 10, y: -5 })).toEqual({ left: 210, top: 71, width: 200, fontSize: 22, lineHeight: 26 });
  });
});

describe("graphFits", () => {
  it("is true only when the graph's rendered size fits the box in both directions", () => {
    expect(graphFits({ w: 800, h: 300 }, 1, 900, 560)).toBe(true);
    expect(graphFits({ w: 800, h: 300 }, 1.2, 900, 560)).toBe(false);
    expect(graphFits({ w: 2400, h: 300 }, 1, 900, 560)).toBe(false);
    expect(graphFits({ w: 300, h: 700 }, 1, 900, 560)).toBe(false);
  });
});

describe("minimap mapping", () => {
  const bb = { x1: -100, y1: 0, w: 1000, h: 200 };

  it("fits the graph into the map with an inset, keeping its aspect ratio and centring it", () => {
    const f = minimapFrame(bb, 160, 100, 8);
    expect(f.scale).toBeCloseTo(144 / 1000);
    expect(toMinimap({ x: -100, y: 0 }, f)).toEqual({ x: 8, y: expect.closeTo(50 - (200 * f.scale) / 2) });
    expect(toMinimap({ x: 900, y: 200 }, f).x).toBeCloseTo(152);
  });

  it("maps a point on the map back to the graph", () => {
    const f = minimapFrame(bb, 160, 100, 8);
    const p = fromMinimap(toMinimap({ x: 420, y: 77 }, f), f);
    expect(p.x).toBeCloseTo(420);
    expect(p.y).toBeCloseTo(77);
  });

  it("handles a graph of zero size", () => {
    const f = minimapFrame({ x1: 5, y1: 5, w: 0, h: 0 }, 160, 100, 8);
    expect(Number.isFinite(f.scale)).toBe(true);
  });
});

describe("centreOn", () => {
  it("returns the pan that puts a graph point at the centre of the box", () => {
    expect(centreOn({ x: 500, y: 100 }, 1, 900, 560)).toEqual({ x: -50, y: 180 });
    expect(centreOn({ x: 500, y: 100 }, 2, 900, 560)).toEqual({ x: -550, y: 80 });
  });
});
