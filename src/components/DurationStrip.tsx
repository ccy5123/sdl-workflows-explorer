// One-row strip plot on a log axis, drawn with Observable Plot: one mark per recorded value, a drawn range where a value
// is a range midpoint, an optional shaded band (SPEC-SIM-001 REQ-011, REQ-015). Marks spread over 5 lanes in value order
// so close values stay visible; the lane carries no meaning. Values are placed by log10 on a linear scale, because
// Plot's log scale hides tick labels that are not powers of ten.
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";

export interface StripPoint {
  x: number;
  /** Filled when the value enters the summary; hollow when left out (a recorded bound). */
  filled: boolean;
  bound: boolean;
  /** Drawn range of a range midpoint. */
  x1: number | null;
  x2: number | null;
  ring: boolean;
  title: string;
}

const LANES = 5;

/** Round durations for a log axis in seconds: 0.1 s to 100 d. */
export const DURATION_TICKS = [0.1, 1, 10, 60, 600, 3_600, 36_000, 86_400, 864_000, 8_640_000];

export function StripPlot({
  points,
  domain,
  label,
  ariaLabel,
  format,
  band,
  ticks,
}: {
  points: StripPoint[];
  domain: [number, number];
  label: string;
  ariaLabel: string;
  format: (x: number) => string;
  band?: { x1: number; x2: number } | null;
  /** Tick values; by default the powers of ten in the domain. */
  ticks?: number[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
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
    const lg = Math.log10;
    const lanes = [...points]
      .sort((a, b) => a.x - b.x)
      .map((p, k) => ({ ...p, lane: k % LANES, lx: lg(p.x), lx1: p.x1 && p.x1 > 0 ? lg(p.x1) : null, lx2: p.x2 && p.x2 > 0 ? lg(p.x2) : null }));
    const ranges = lanes.filter((p) => p.lx1 !== null && p.lx2 !== null);
    const [d0, d1] = domain.map(lg) as [number, number];
    const tickValues = (ticks ?? Array.from({ length: Math.floor(d1) - Math.ceil(d0) + 1 }, (_, k) => 10 ** (Math.ceil(d0) + k)))
      .filter((t) => lg(t) >= d0 && lg(t) <= d1)
      .map(lg);
    const logBand = band ? { x1: lg(band.x1), x2: lg(band.x2) } : null;
    const svg = Plot.plot({
      width,
      height: 96,
      marginLeft: 12,
      marginRight: 16,
      marginBottom: 34,
      style: { background: "transparent", color: "var(--chart-ink-secondary)", fontSize: "12px" },
      x: { domain: [d0, d1], label, labelAnchor: "center", ticks: tickValues, tickFormat: (v: number) => format(10 ** v) },
      y: { domain: [...Array(LANES).keys()], axis: null, padding: 0.5, type: "point" },
      marks: [
        logBand ? Plot.rectX([logBand], { x1: "x1", x2: "x2", fill: "var(--chart-im-3)", fillOpacity: 0.25 }) : null,
        Plot.ruleY(ranges, { x1: "lx1", x2: "lx2", y: "lane", stroke: "var(--chart-ink-secondary)", strokeWidth: 1 }),
        Plot.dot(lanes.filter((p) => p.ring), { x: "lx", y: "lane", r: 7, stroke: "var(--chart-ink)", strokeWidth: 1.5 }),
        Plot.dot(lanes, {
          x: "lx",
          y: "lane",
          r: 3.5,
          symbol: (p: StripPoint) => (p.bound ? "triangle" : "circle"),
          fill: (p: StripPoint) => (p.filled ? "var(--chart-im-1)" : "none"),
          stroke: "var(--chart-im-1)",
          title: "title",
        }),
      ],
    });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", ariaLabel);
    el.replaceChildren(svg);
    return () => svg.remove();
  }, [width, points, domain, label, ariaLabel, format, band, ticks]);

  return <div className="wf-strip" ref={ref} />;
}
