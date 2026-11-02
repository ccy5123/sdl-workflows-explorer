// One-row strip plot on a log axis, drawn with Observable Plot: one mark per recorded value, a drawn range where a value
// is a range midpoint, an optional shaded band (SPEC-SIM-001 REQ-011, REQ-015). Marks spread over 5 lanes in value order
// so close values stay visible; the lane carries no meaning.
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

export function StripPlot({
  points,
  domain,
  label,
  ariaLabel,
  format,
  band,
}: {
  points: StripPoint[];
  domain: [number, number];
  label: string;
  ariaLabel: string;
  format: (x: number) => string;
  band?: { x1: number; x2: number } | null;
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
    const lanes = [...points].sort((a, b) => a.x - b.x).map((p, k) => ({ ...p, lane: k % LANES }));
    const ranges = lanes.filter((p) => p.x1 !== null && p.x2 !== null && p.x1 > 0);
    const svg = Plot.plot({
      width,
      height: 96,
      marginLeft: 12,
      marginRight: 16,
      marginBottom: 34,
      style: { background: "transparent", color: "var(--chart-ink-secondary)", fontSize: "12px" },
      x: { type: "log", domain, label, labelAnchor: "center", tickFormat: format, ticks: Math.max(2, Math.floor(width / 110)) },
      y: { domain: [...Array(LANES).keys()], axis: null, padding: 0.5, type: "point" },
      marks: [
        band ? Plot.rectX([band], { x1: "x1", x2: "x2", fill: "var(--chart-im-3)", fillOpacity: 0.25 }) : null,
        Plot.ruleY(ranges, { x1: "x1", x2: "x2", y: "lane", stroke: "var(--chart-ink-secondary)", strokeWidth: 1 }),
        Plot.dot(lanes.filter((p) => p.ring), { x: "x", y: "lane", r: 7, stroke: "var(--chart-ink)", strokeWidth: 1.5 }),
        Plot.dot(lanes, {
          x: "x",
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
  }, [width, points, domain, label, ariaLabel, format, band]);

  return <div className="wf-strip" ref={ref} />;
}
