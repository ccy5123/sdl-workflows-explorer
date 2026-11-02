// Recorded platform throughputs per day, measured and nominal, beside the visitor's per-day range; the platforms of the
// similar-platform top 10 ringed (SPEC-SIM-001 REQ-015). No sentence here compares the two.
import { useMemo } from "react";
import type { SimulationJson, ThroughputRow } from "../data/types";
import { formatNumber, throughputGroups } from "../lib/cycleRange";
import { platformHash } from "../lib/route";
import { THROUGHPUT_INTRO } from "../lib/workflowText";
import { StripPlot } from "./DurationStrip";

const markers = (t: ThroughputRow) =>
  [t.bound === "upper" ? "≤" : t.bound === "lower" ? "≥" : "", t.approximate ? "≈" : ""].join("");

const stated = (t: ThroughputRow) =>
  `${markers(t)}${t.value} ${t.unit}${t.range_midpoint && t.range_low !== null ? ` (range ${t.range_low} to ${t.range_high})` : ""}${t.per_working_day ? ", per working day" : ""}`;

function ThroughputTable({ rows, name }: { rows: ThroughputRow[]; name: string }) {
  return (
    <div className="table-scroll">
      <table className="data" data-table={name}>
        <thead>
          <tr>
            <th scope="col">Platform</th>
            <th scope="col">Kind</th>
            <th scope="col">As stated</th>
            <th scope="col" className="num">Experiments per day</th>
            <th scope="col">Converted with</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, k) => (
            <tr key={`${t.platform_id}-${k}`}>
              <td>
                <a href={platformHash(t.platform_id)}>{t.platform_id}</a>
              </td>
              <td>{t.kind}</td>
              <td>{stated(t)}</td>
              <td className="num">{t.per_day === null ? "—" : formatNumber(t.per_day)}</td>
              <td>{t.basis ?? t.not_converted}</td>
              <td>
                <a href={`https://doi.org/${t.doi}`}>doi:{t.doi}</a>, {t.evidence.doc}
                {t.evidence.page !== null ? ` p. ${t.evidence.page}` : ""}
                {t.evidence.locator ? `, ${t.evidence.locator}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThroughputPanel({
  sim,
  perDay,
  topTen,
}: {
  sim: SimulationJson;
  perDay: { low: number | null; mid: number | null; high: number | null } | null;
  topTen: Set<string>;
}) {
  const groups = useMemo(() => throughputGroups(sim.throughputs), [sim]);
  const converted = [...groups.measured, ...groups.nominal];
  const values = converted.map((t) => t.per_day!);
  const band = perDay && perDay.low !== null && perDay.high !== null && perDay.low > 0 ? { x1: perDay.low, x2: perDay.high } : null;
  const lo = Math.min(...values, ...(band ? [band.x1] : []));
  const hi = Math.max(...values, ...(band ? [band.x2] : []));
  const domain: [number, number] = [lo / 1.5, hi * 1.5];
  const ringed = converted.filter((t) => topTen.has(t.platform_id));
  const strip = (rows: ThroughputRow[], kind: string) => (
    <div className="wf-tp" data-kind={kind}>
      <h4>
        {kind[0]!.toUpperCase() + kind.slice(1)} throughputs, n = {rows.length}
      </h4>
      <StripPlot
        points={rows.map((t) => ({
          x: t.per_day!,
          filled: true,
          bound: t.bound !== null,
          x1: null,
          x2: null,
          ring: topTen.has(t.platform_id),
          title: `${formatNumber(t.per_day!)} per day · ${t.platform_id} · ${stated(t)}`,
        }))}
        domain={domain}
        band={band}
        label="Experiments per day (log scale)"
        ariaLabel={`${rows.length} ${kind} throughputs from ${formatNumber(Math.min(...rows.map((t) => t.per_day!)))} to ${formatNumber(Math.max(...rows.map((t) => t.per_day!)))} experiments per day`}
        format={formatNumber}
      />
    </div>
  );
  return (
    <section aria-labelledby="wf-throughput" className="wf-throughput">
      <h3 id="wf-throughput">Recorded throughputs</h3>
      <p>{THROUGHPUT_INTRO}</p>
      {strip(groups.measured, "measured")}
      {strip(groups.nominal, "nominal")}
      <p data-value="ringed">
        Ringed: {ringed.length === 0 ? "none of the 10 most similar platforms has a recorded throughput." : [...new Set(ringed.map((t) => t.platform_id))].join(", ")}
      </p>
      <details>
        <summary>All {converted.length} throughputs with a per-day value</summary>
        <ThroughputTable rows={converted} name="wf-throughputs" />
      </details>
      <details>
        <summary>{groups.notConverted.length} throughputs have no per-day value</summary>
        <ThroughputTable rows={groups.notConverted} name="wf-not-converted" />
      </details>
    </section>
  );
}
