// Chart colour tokens of the trends dashboard (SPEC-TRENDS-001 REQ-011, REQ-012): the light and dark sets that
// styles.css declares as custom properties, the count-table shading ramp and its text colours. Pure constants.

/** Count-table shading, steps 0 to 12, the same in both sets. */
export const RAMP = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
  "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
] as const;

/** Autonomy levels 1 to 3, the same in both sets. */
const AUTONOMY = ["#86b6ef", "#3987e5", "#1c5cab"] as const;

function tokenSet(im: readonly string[], surface: string, ink: string, inkSecondary: string, grid: string, axis: string) {
  return {
    ...Object.fromEntries(im.map((c, i) => [`--chart-im-${i + 1}`, c])),
    ...Object.fromEntries(AUTONOMY.map((c, i) => [`--chart-autonomy-${i + 1}`, c])),
    ...Object.fromEntries(RAMP.map((c, i) => [`--chart-ramp-${i}`, c])),
    "--chart-surface": surface,
    "--chart-ink": ink,
    "--chart-ink-secondary": inkSecondary,
    "--chart-grid": grid,
    "--chart-axis": axis,
  } as Record<string, string>;
}

// Integration-mode slots 1 to 7 follow the offered order of `im`; the palette validator results for these values
// are recorded in .moai/specs/SPEC-TRENDS-001/progress.md §E.1 (tests/chartTokens.test.ts guards them).
export const CHART_TOKENS = {
  light: tokenSet(
    ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"],
    "#ffffff", "#0b0b0b", "#52514e", "#e1e0d9", "#c3c2b7",
  ),
  dark: tokenSet(
    ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"],
    "#1a1a19", "#f0efec", "#c3c2b7", "#2c2c2a", "#383835",
  ),
};

export const tokenVar = (name: string): string => `var(${name})`;

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of two `#rrggbb` colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour of a shaded cell: black or white, whichever contrasts more with the background. */
export const textColorFor = (background: string): "#000000" | "#ffffff" =>
  contrastRatio(background, "#000000") >= contrastRatio(background, "#ffffff") ? "#000000" : "#ffffff";

/** Ramp step of a cell with count c when the largest value count is m: min(12, ⌈13c/m⌉ − 1); null for 0. */
export const rampStep = (count: number, max: number): number | null =>
  count <= 0 || max <= 0 ? null : Math.min(RAMP.length - 1, Math.ceil((RAMP.length * count) / max) - 1);
