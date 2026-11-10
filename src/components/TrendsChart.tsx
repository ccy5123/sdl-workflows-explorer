// Stacked bar chart of an exclusive split (SPEC-TRENDS-001 REQ-010, REQ-012), drawn with Observable Plot, and its
// HTML legend. The only file that imports Plot, so Plot stays in the lazily loaded Trends chunk (REQ-015).
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";
import type { View } from "../lib/filterState";
import { browseHash } from "../lib/filterUrl";
import { tokenVar } from "../lib/chartTokens";
import {
  integerTicks,
  linkState,
  segmentName,
  totalName,
  valueLabel,
  type CountTable,
  type Split,
  type SplitValue,
} from "../lib/trends";
import type { FilterState } from "../lib/filterState";
import { ValueName } from "./CountTable";
import { unnameMarks } from "./plotMarks";

const HEIGHT = 320;
/**
 * Below this width the x tick labels are shortened ("2016" to "'16", "before 2015" to "<'15") and, with more than 8
 * bins, every second one is shown, level, so they read without turning the head. Each bar keeps its full name.
 */
const SHORT_BELOW = 640;
const MANY_BINS = 8;

/** A bin label in its short form: two-digit years with an apostrophe. */
export function shortBinLabel(label: string): string {
  return label.replace(/^before /, "<").replace(/\b(19|20)(\d\d)\b/g, "'$2").replace(/–'/g, "–");
}
const XLINK = "http://www.w3.org/1999/xlink";

/**
 * Colour of a split value: integration modes take slots 1 to 7 by their place in the unfiltered offered order, so a
 * value keeps its colour when a filter hides others; autonomy levels take the ordinal ramp.
 */
export function seriesColor(split: Split, value: SplitValue, offeredIm: readonly string[]): string {
  if (split === "im") return tokenVar(`--chart-im-${offeredIm.indexOf(String(value)) + 1}`);
  return tokenVar(`--chart-autonomy-${Number(value)}`);
}

interface Segment {
  label: string;
  y1: number;
  y2: number;
  fill: string;
  name: string;
  href: string;
}

interface Total {
  label: string;
  n: number;
  name: string;
  href: string;
}

/** Segments stacked from the baseline in offered order (count 0 draws none), and one total per bin. */
function chartData(state: FilterState, split: Split, table: CountTable, unit: View, offeredIm: readonly string[]) {
  const segments: Segment[] = [];
  const totals: Total[] = table.bins.map((bin, i) => {
    let base = 0;
    table.values.forEach((value, v) => {
      const count = table.counts[v]![i]!;
      if (count === 0) return;
      segments.push({
        label: bin.label,
        y1: base,
        y2: base + count,
        fill: seriesColor(split, value, offeredIm),
        name: segmentName(bin.label, valueLabel(split, value), count, table.n[i]!, unit),
        href: browseHash(linkState(state, bin, split, value)),
      });
      base += count;
    });
    return { label: bin.label, n: table.n[i]!, name: totalName(bin.label, table.n[i]!, unit), href: browseHash(linkState(state, bin, split)) };
  });
  return { segments, totals };
}

/**
 * Plot puts `aria-label` on the mark inside each `<a>`; move it to the link so the link carries the accessible name
 * (REQ-010), and mirror the xlink href into a plain `href`.
 */
function nameLinks(svg: Element) {
  for (const a of svg.querySelectorAll("a")) {
    const mark = a.firstElementChild;
    const label = mark?.getAttribute("aria-label");
    if (label) {
      a.setAttribute("aria-label", label);
      mark!.removeAttribute("aria-label");
    }
    const href = a.getAttributeNS(XLINK, "href");
    if (href) a.setAttribute("href", href);
  }
}

export function TrendsChart({
  state,
  split,
  table,
  unit,
  offeredIm,
}: {
  state: FilterState;
  split: Split;
  table: CountTable;
  unit: View;
  offeredIm: readonly string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // The chart takes its width from its container (REQ-016).
  useEffect(() => {
    const el = ref.current!;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current!;
    if (width === 0) return;
    const { segments, totals } = chartData(state, split, table, unit, offeredIm);
    const ticks = integerTicks(Math.max(0, ...table.n));
    const short = width < SHORT_BELOW;
    const every = short && table.bins.length > MANY_BINS ? 2 : 1;
    const svg = Plot.plot({
      width,
      height: HEIGHT,
      marginTop: 28,
      marginLeft: short ? 36 : 44,
      marginRight: short ? 4 : undefined,
      marginBottom: 40,
      style: { background: "transparent", color: "var(--chart-ink-secondary)", fontSize: short ? "13px" : "12px" },
      x: {
        domain: table.bins.map((b) => b.label),
        label: short && every > 1 ? "First public year (every second labelled)" : "First public year",
        labelAnchor: "center",
        padding: 0.25,
        tickFormat: short ? (d: string, i: number) => (i % every === 0 ? shortBinLabel(d) : "") : undefined,
        tickSize: 0,
      },
      y: { domain: [0, ticks.at(-1)!], ticks, tickFormat: "d", label: unit === "papers" ? "Papers" : "Platforms", labelArrow: "none", tickSize: 0 },
      color: { type: "identity" },
      marks: [
        Plot.gridY(ticks, { stroke: "var(--chart-grid)", strokeOpacity: 1 }),
        // insetTop leaves the 2 px surface-coloured gap between stacked segments; the baseline segment stays anchored.
        Plot.barY(segments, { x: "label", y1: "y1", y2: "y2", fill: "fill", insetTop: 2, href: "href", ariaLabel: "name", title: "name" }),
        Plot.ruleY([0], { stroke: "var(--chart-axis)" }),
        Plot.text(totals, {
          x: "label",
          y: "n",
          text: (d: Total) => String(d.n),
          dy: -8,
          fill: "var(--chart-ink)",
          href: "href",
          ariaLabel: "name",
        }),
      ],
    });
    nameLinks(svg);
    unnameMarks(svg);
    el.replaceChildren(svg);
    return () => svg.remove();
  }, [width, state, split, table, unit, offeredIm]);

  return <div className="trends-chart" ref={ref} />;
}

/** HTML legend in stack order, the value at the baseline first (REQ-010). */
export function ChartLegend({ split, values, offeredIm }: { split: Split; values: readonly SplitValue[]; offeredIm: readonly string[] }) {
  return (
    <ul className="trends-legend" aria-label="Legend">
      {values.map((value) => (
        <li key={value}>
          <span className="legend-swatch" style={{ background: seriesColor(split, value, offeredIm) }} aria-hidden="true" />
          <ValueName split={split} value={value} />
        </li>
      ))}
    </ul>
  );
}
