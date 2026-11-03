// Readable fit for the module graph: the fitted zoom never drops below the readable zoom (follow-up to SPEC-VIEW-001).
import { describe, expect, it } from "vitest";
import { MAX_FIT_ZOOM, READABLE_ZOOM, readableViewport } from "../src/lib/viewport";

const box = (x1: number, y1: number, w: number, h: number) => ({ x1, y1, w, h });

describe("readableViewport", () => {
  it("fits and centres a graph that is readable at the fitted zoom", () => {
    // 400x200 graph in an 800x600 box with padding 20: fit zoom = min(760/400, 560/200) = 1.9, capped at MAX_FIT_ZOOM.
    const v = readableViewport(box(0, 0, 400, 200), 800, 600, 20);
    expect(v.zoom).toBe(MAX_FIT_ZOOM);
    expect(v.pan.x).toBeCloseTo((800 - 400 * MAX_FIT_ZOOM) / 2);
    expect(v.pan.y).toBeCloseTo((600 - 200 * MAX_FIT_ZOOM) / 2);
  });

  it("uses the fitted zoom when it lies between the readable and the maximum zoom", () => {
    // fit zoom = min(760/600, 560/100) = 1.2666...
    const v = readableViewport(box(-100, 50, 600, 100), 800, 600, 20);
    expect(v.zoom).toBeCloseTo(760 / 600);
    // centred: rendered left edge = pan.x + x1*zoom = (800 - 600*zoom)/2
    expect(v.pan.x + -100 * v.zoom).toBeCloseTo((800 - 600 * v.zoom) / 2);
    expect(v.pan.y + 50 * v.zoom).toBeCloseTo((600 - 100 * v.zoom) / 2);
  });

  it("keeps the readable zoom for a wide graph and shows its left end", () => {
    // 2000x150 graph: fit zoom would be 0.38, below READABLE_ZOOM.
    const v = readableViewport(box(30, 10, 2000, 150), 800, 600, 20);
    expect(v.zoom).toBe(READABLE_ZOOM);
    expect(v.pan.x + 30 * v.zoom).toBeCloseTo(20); // left edge at the padding
    expect(v.pan.y + 10 * v.zoom).toBeCloseTo((600 - 150 * v.zoom) / 2); // still centred vertically
  });

  it("keeps the readable zoom for a tall graph and shows its top end", () => {
    const v = readableViewport(box(0, -40, 300, 3000), 800, 600, 20);
    expect(v.zoom).toBe(READABLE_ZOOM);
    expect(v.pan.y + -40 * v.zoom).toBeCloseTo(20);
    expect(v.pan.x).toBeCloseTo((800 - 300 * v.zoom) / 2);
  });

  it("keeps a bottom inset clear (the phone toolbar) when it fits and centres above it", () => {
    // 300x400 graph in a 375x568 box, padding 24, inset 56: fit zoom = min(327/300, 464/400) = 1.09.
    const v = readableViewport(box(0, 0, 300, 400), 375, 568, 24, 56);
    expect(v.zoom).toBeCloseTo(327 / 300);
    const bottom = v.pan.y + 400 * v.zoom;
    expect(bottom).toBeLessThanOrEqual(568 - 56 - 24 + 1e-9);
    expect(v.pan.y).toBeCloseTo((568 - 56 - 400 * v.zoom) / 2);
  });

  it("returns a finite viewport for an empty bounding box", () => {
    const v = readableViewport(box(0, 0, 0, 0), 800, 600, 20);
    expect(v.zoom).toBe(MAX_FIT_ZOOM);
    expect(Number.isFinite(v.pan.x) && Number.isFinite(v.pan.y)).toBe(true);
  });
});
