// Gantt chart of run 1, drawn with Observable Plot: one row per device and per transfer agent, one bar per step or
// transfer (SPEC-SIM-001 REQ-020). The time axis uses the largest unit the run fills at least twice.
import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimEvent } from "../lib/des";
import { displayLabel } from "../lib/labels";
import type { WorkflowState } from "../lib/workflowState";
import { AGENT_LABELS } from "../lib/workflowText";
import { unnameMarks } from "./plotMarks";

/** Bars drawn at most; a larger run 1 shows its first bars in time and says so. */
export const TIMELINE_LIMIT = 3000;

const UNITS: [number, string][] = [
  [86_400, "d"],
  [3_600, "h"],
  [60, "min"],
  [1, "s"],
];

export const rowName = (s: WorkflowState, e: SimEvent): string | null => {
  if (e.module !== null) return `Module ${e.module} (${s.modules[e.module - 1]!.type}), device ${e.device}`;
  if (e.agent) return `${AGENT_LABELS[e.agent.mode]} ${e.agent.index}`;
  return null;
};

/** Row label drawn in the chart and the event table: the device's module type by its readable name (SPEC-UI-001 phase 5). */
export const rowLabel = (s: WorkflowState, e: SimEvent): string | null => {
  if (e.module !== null) return `Module ${e.module} (${displayLabel("module_type", s.modules[e.module - 1]!.type)}), device ${e.device}`;
  return rowName(s, e);
};

export function Timeline({ state, events, makespan }: { state: WorkflowState; events: SimEvent[]; makespan: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current!;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const drawn = useMemo(
    () => events.filter((e) => rowName(state, e) !== null).sort((a, b) => a.start - b.start).slice(0, TIMELINE_LIMIT),
    [events, state],
  );
  // Readable label of each row (rowName, with the module-type code, stays the row key and the label's title).
  const labels = useMemo(() => new Map(drawn.map((e) => [rowName(state, e)!, rowLabel(state, e)!])), [drawn, state]);
  const rows = useMemo(
    () =>
      [...new Set(drawn.map((e) => rowName(state, e)!))].sort((a, b) => {
        const agentA = a.startsWith("Module") ? 0 : 1;
        const agentB = b.startsWith("Module") ? 0 : 1;
        return agentA - agentB || a.localeCompare(b, "en", { numeric: true });
      }),
    [drawn, state],
  );

  useEffect(() => {
    const el = ref.current!;
    if (width === 0) return;
    const [size, unit] = UNITS.find(([u]) => makespan >= 2 * u) ?? [1, "s"];
    const narrow = width < 640;
    // Wide enough for the longest readable row label at 12 px (about 6.6 px a character), at most 45% of the chart.
    const longest = Math.max(0, ...rows.map((r) => (labels.get(r) ?? r).length));
    const marginLeft = narrow ? 8 : Math.min(Math.max(280, Math.ceil(longest * 6.6) + 16), Math.floor(width * 0.45));
    // a bar is drawn at least 3 px wide so short steps and transfers stay visible; its title gives the exact times
    const minWidth = ((makespan / size) * 3) / Math.max(1, width - marginLeft - 12);
    const bars = drawn.map((e) => ({
      row: rowName(state, e)!,
      x1: e.start / size,
      x2: Math.max(e.end / size, e.start / size + minWidth),
      fill: e.kind === "transfer" ? "var(--chart-ink-secondary)" : `var(--chart-im-${((e.step - 1) % 7) + 1})`,
      title: `Batch ${e.batch}, ${e.kind === "transfer" ? `transfer after step ${e.step}` : `step ${e.step}`}: ${e.start} s to ${e.end} s`,
    }));
    // Axis text, tick marks and gridlines take the chart tokens of the current theme; bars keep their data colours.
    const svg = Plot.plot({
      width,
      height: rows.length * (narrow ? 38 : 24) + 50,
      marginLeft,
      marginRight: 12,
      style: { background: "transparent", color: "var(--chart-ink-secondary)", fontSize: "12px" },
      x: { domain: [0, makespan / size] },
      y: { domain: rows, label: null, axis: null },
      marks: [
        Plot.gridX({ stroke: "var(--chart-grid)", strokeOpacity: 1 }),
        Plot.axisX({ label: `Time (${unit})`, labelAnchor: "center", stroke: "var(--chart-axis)", fill: "var(--chart-ink-secondary)" }),
        Plot.barX(bars, { x1: "x1", x2: "x2", y: "row", fill: "fill", title: "title", insetTop: narrow ? 17 : 2, insetBottom: 2 }),
        // Row labels as text marks so each can carry its code in a title: above the bars when narrow, else left of them.
        Plot.text(rows, {
          x: 0,
          y: (d: string) => d,
          text: (d: string) => labels.get(d) ?? d,
          title: (d: string) => d,
          dy: narrow ? -13 : 0,
          dx: narrow ? 0 : -8,
          textAnchor: narrow ? "start" : "end",
          fill: "var(--chart-ink-secondary)",
        }),
      ],
    });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Timeline of run 1: ${drawn.length} bars on ${rows.length} rows of devices and transfer agents`);
    unnameMarks(svg);
    el.replaceChildren(svg);
    return () => svg.remove();
  }, [width, drawn, rows, labels, state, makespan]);

  return (
    <>
      <div className="wf-timeline" ref={ref} />
      {events.length > TIMELINE_LIMIT && (
        <p className="table-note">
          Showing the first {TIMELINE_LIMIT.toLocaleString("en")} of {events.length.toLocaleString("en")} bars in time.
        </p>
      )}
    </>
  );
}
