// SPEC-TRENDS-001 AC-7: chart colour tokens, their CSS custom properties, grid text contrast and ramp steps
// (REQ-011, REQ-012).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHART_TOKENS, RAMP, contrastRatio, rampStep, textColorFor, tokenVar } from "../src/lib/chartTokens";

// The values the palette validator passed on 2026-11-02 (progress.md §E.1). A changed token fails here until the
// validator is re-run and these expected values are updated with it.
const RAMP_HEX = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
const IM_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];
const IM_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"];
const AUTONOMY = ["#86b6ef", "#3987e5", "#1c5cab"];

const tokens = (im: string[], surface: string, ink: string, ink2: string, grid: string, axis: string) => ({
  ...Object.fromEntries(im.map((c, i) => [`--chart-im-${i + 1}`, c])),
  ...Object.fromEntries(AUTONOMY.map((c, i) => [`--chart-autonomy-${i + 1}`, c])),
  ...Object.fromEntries(RAMP_HEX.map((c, i) => [`--chart-ramp-${i}`, c])),
  "--chart-surface": surface,
  "--chart-ink": ink,
  "--chart-ink-secondary": ink2,
  "--chart-grid": grid,
  "--chart-axis": axis,
});

describe("chart colour tokens (AC-7)", () => {
  it("equals the validated hex values, light and dark", () => {
    expect(CHART_TOKENS).toEqual({
      light: tokens(IM_LIGHT, "#ffffff", "#0b0b0b", "#52514e", "#e1e0d9", "#c3c2b7"),
      dark: tokens(IM_DARK, "#1a1a19", "#f0efec", "#c3c2b7", "#2c2c2a", "#383835"),
    });
    expect(RAMP).toEqual(RAMP_HEX);
    expect(tokenVar("--chart-im-3")).toBe("var(--chart-im-3)");
  });

  it("declares each token in styles.css with its light value under :root and dark value under :root[data-theme=dark]", () => {
    const css = readFileSync(join(import.meta.dirname, "..", "src", "styles.css"), "utf8");
    // Declarations of every rule block whose selector is exactly `selector`, merged.
    const declared = (selector: string) => {
      const out: Record<string, string> = {};
      for (const m of css.matchAll(/(?:^|\n)([^\n{}]+)\{([^}]*)\}/g)) {
        if (m[1]!.trim() !== selector) continue;
        for (const d of m[2]!.matchAll(/(--chart-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/g)) out[d[1]!] = d[2]!;
      }
      return out;
    };
    expect(declared(":root")).toEqual(CHART_TOKENS.light);
    expect(declared(':root[data-theme="dark"]')).toEqual(CHART_TOKENS.dark);
  });

  it("gives each ramp step the higher-contrast text colour, each at least 4.5:1", () => {
    const expected = [15.87, 13.66, 11.75, 9.95, 8.39, 7.03, 5.77, 4.76, 5.39, 6.63, 8.1, 9.91, 11.95];
    RAMP.forEach((step, i) => {
      const text = textColorFor(step);
      expect(text).toBe(i <= 7 ? "#000000" : "#ffffff");
      expect(Math.round(contrastRatio(step, text) * 100) / 100).toBe(expected[i]);
      expect(contrastRatio(step, text)).toBeGreaterThanOrEqual(4.5);
    });
    expect(Math.round(contrastRatio("#2a78d6", "#0b0b0b") * 100) / 100).toBe(4.46);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it.each<[number, number, number | null]>([
    [1, 39, 0],
    [3, 39, 0],
    [20, 39, 6],
    [38, 39, 12],
    [39, 39, 12],
    [1, 1, 12],
    [0, 39, null],
  ])("puts count %i of largest %i on ramp step %j", (count, max, step) => {
    expect(rampStep(count, max)).toBe(step);
  });
});
