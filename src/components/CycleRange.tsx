// Cycle time and throughput: per-step recorded durations with n and sources, joint durations offered where the steps
// match, the visitor's own values marked, and the cycle and per-day range (SPEC-SIM-001 REQ-011 to REQ-015).
import { useId } from "react";
import type { DurationRow, SimulationJson } from "../data/types";
import { formatDuration, formatNumber, type CycleResult, type StepRange } from "../lib/cycleRange";
import { displayLabel } from "../lib/labels";
import { platformHash } from "../lib/route";
import { chooseJoint, setEntered, setOption, type Catalog, type EditResult, type WorkflowState } from "../lib/workflowState";
import { BOUNDS_LABEL, MARKER_KEY, NO_WAITING, RANGE_INTRO, SOURCE_LABELS } from "../lib/workflowText";
import { DURATION_TICKS, StripPlot, type StripPoint } from "./DurationStrip";
import { Label } from "./Label";
import { CommitField } from "./WorkflowEditor";
import { ThroughputPanel } from "./ThroughputPanel";

const markers = (d: DurationRow) =>
  [d.bound === "upper" ? "≤" : d.bound === "lower" ? "≥" : "", d.approximate ? "≈" : ""].join("");

function valueText(d: DurationRow): string {
  const range =
    d.range_midpoint && d.range_low_s !== null && d.range_high_s !== null
      ? ` (range ${formatDuration(d.range_low_s)} to ${formatDuration(d.range_high_s)})`
      : d.range_midpoint
        ? " (midpoint of a stated range)"
        : "";
  return `${markers(d)}${formatDuration(d.seconds)}${range}`;
}

export function Sources({ rows, caption }: { rows: DurationRow[]; caption: string }) {
  return (
    <details className="wf-sources">
      <summary>{caption}</summary>
      <div className="table-scroll">
        <table className="data" data-table="wf-sources">
          <thead>
            <tr>
              <th scope="col">Value</th>
              <th scope="col">As stated</th>
              <th scope="col">Samples per run</th>
              <th scope="col">Platform</th>
              <th scope="col">Paper</th>
              <th scope="col">Document</th>
              <th scope="col">Page</th>
              <th scope="col">Locator</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.step_id}>
                <td>{valueText(d)}</td>
                <td>
                  {markers(d)}
                  {d.value} {d.unit}
                </td>
                <td className="num">{d.samples_per_run ?? "—"}</td>
                <td>
                  <a href={platformHash(d.platform_id)}>{d.platform_id}</a>
                </td>
                <td>
                  <a href={`https://doi.org/${d.doi}`}>doi:{d.doi}</a>
                </td>
                <td>{d.evidence.doc}</td>
                <td className="num">{d.evidence.page ?? "—"}</td>
                <td>{d.evidence.locator ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const pointOf = (d: DurationRow, bounds: boolean): StripPoint => ({
  x: d.seconds,
  filled: bounds || d.bound === null,
  bound: d.bound !== null,
  x1: d.range_midpoint ? d.range_low_s : null,
  x2: d.range_midpoint ? d.range_high_s : null,
  ring: false,
  title: `${valueText(d)} · ${d.platform_id}`,
});

const tripleText = (t: { low: number; mid: number; high: number }) =>
  t.low === t.high ? formatDuration(t.mid) : `${formatDuration(t.low)}, ${formatDuration(t.mid)}, ${formatDuration(t.high)}`;

function StepDetail({
  s,
  catalog,
  step,
  offers,
  domain,
  jointRows,
  apply,
}: {
  s: WorkflowState;
  catalog: Catalog;
  step: StepRange;
  offers: DurationRow[];
  domain: [number, number];
  jointRows: Map<string, DurationRow>;
  apply: (r: EditResult) => boolean;
}) {
  const i = step.step;
  const n = step.recorded.length;
  const left = n - step.used.length;
  const chosen = step.kind === "joint" ? jointRows.get(step.joint!.id) : undefined;
  return (
    <section className="wf-step" aria-labelledby={`wf-step-${i}`} data-step={i}>
      <h3 id={`wf-step-${i}`}>
        Step {i}: <Label kind="unit_operation" code={step.uo} />
      </h3>
      <p className="wf-n">
        <span className="math">
          <i>n</i> = {n}
        </span>{" "}
        recorded{left > 0 ? `; ${step.used.length} used, ${left} bound${left > 1 ? "s" : ""} left out` : ""}
        {step.runs > 1 ? `; ${step.runs} runs per batch` : ""}
      </p>
      {n > 0 && (
        <StripPlot
          points={step.recorded.map((d) => pointOf(d, s.bounds))}
          domain={domain}
          label="Recorded duration (log scale)"
          ariaLabel={`Recorded single-step durations of ${displayLabel("unit_operation", step.uo)} (${step.uo}): ${n} values from ${formatDuration(step.recorded[0]!.seconds)} to ${formatDuration(step.recorded.at(-1)!.seconds)}`}
          format={formatDuration}
          ticks={DURATION_TICKS}
        />
      )}
      {n > 0 && <Sources rows={step.recorded} caption={`Sources of the ${n} recorded value${n > 1 ? "s" : ""}`} />}
      {step.kind === "covered" && (
        <p>Counted in the joint duration chosen from step {step.joint!.first}.</p>
      )}
      {step.kind !== "covered" && step.kind !== "joint" && (
        <div className="wf-entry">
          {step.kind === "missing" && (
            <p className="wf-missing">
              No single-step duration is recorded for {step.uo}. Enter a duration for step {i} to get a cycle time.
            </p>
          )}
          <CommitField
            label={`Your duration for step ${i}, seconds (empty: use the recorded values)`}
            inputMode="decimal"
            width="8rem"
            value={s.entered[i] === undefined ? "" : String(s.entered[i])}
            onCommit={(text) => apply(setEntered(s, catalog, i, text))}
          />
          {step.kind === "entered" && <span className="wf-entered"> {formatDuration(step.value!)}, entered by you</span>}
        </div>
      )}
      {chosen && (
        <div className="wf-joint">
          <p>
            Steps {i} to {step.joint!.last} count as one joint duration of {formatDuration(chosen.seconds)} per run (
            <a href={platformHash(chosen.platform_id)}>{chosen.platform_id}</a>,{" "}
            <a href={`https://doi.org/${chosen.doi}`}>doi:{chosen.doi}</a>, {chosen.evidence.doc}
            {chosen.evidence.page !== null ? ` p. ${chosen.evidence.page}` : ""}
            {chosen.evidence.locator ? `, ${chosen.evidence.locator}` : ""}).{" "}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply(chooseJoint(s, catalog, i, null))}>
              Stop using it
            </button>
          </p>
        </div>
      )}
      {offers.length > 0 && step.kind !== "joint" && (
        <details className="wf-offers">
          <summary>
            {offers.length} joint duration{offers.length > 1 ? "s" : ""} recorded for a run of steps starting at step {i}
          </summary>
          <ul>
            {offers.map((d) => (
              <li key={d.step_id}>
                Steps {i} to {i + d.joint!.step_ids.length - 1} ({d.joint!.unit_operations.join(" → ")}): {valueText(d)} per run,{" "}
                <a href={platformHash(d.platform_id)}>{d.platform_id}</a>,{" "}
                <a href={`https://doi.org/${d.doi}`}>doi:{d.doi}</a>, {d.evidence.doc}
                {d.evidence.page !== null ? ` p. ${d.evidence.page}` : ""}
                {d.evidence.locator ? `, ${d.evidence.locator}` : ""}{" "}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply(chooseJoint(s, catalog, i, d.step_id))}>
                  Use this for steps {i} to {i + d.joint!.step_ids.length - 1}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function CycleRange({
  state,
  catalog,
  sim,
  result,
  offers,
  jointRows,
  topTen,
  apply,
}: {
  state: WorkflowState;
  catalog: Catalog;
  sim: SimulationJson;
  result: CycleResult;
  offers: Map<number, DurationRow[]>;
  jointRows: Map<string, DurationRow>;
  topTen: Set<string>;
  apply: (r: EditResult) => boolean;
}) {
  const boundsId = useId();
  const all = result.steps.flatMap((x) => x.recorded.map((d) => d.seconds));
  const domain: [number, number] = all.length > 0 ? [Math.min(...all) / 1.5, Math.max(...all) * 1.5] : [1, 86_400];
  const { cycle, perDay } = result;
  // A per-day value in Latin Modern; the "not defined" sentence stays in the text face (SPEC-UI-001 REQ-003).
  const dayText = (v: number | null) => (v === null ? "not defined: the cycle time is 0 s" : <span className="math">{formatNumber(v)}</span>);
  return (
    <section aria-labelledby="wf-range" className="card panel wf-range">
      <h2 id="wf-range">Cycle time and throughput</h2>
      <p>{RANGE_INTRO}</p>
      <p className="wf-check">
        <input id={boundsId} type="checkbox" checked={state.bounds} onChange={(e) => apply(setOption(state, catalog, { bounds: e.target.checked }))} />
        <label htmlFor={boundsId}>{BOUNDS_LABEL}</label>
      </p>
      <div className="table-scroll">
        <table className="data" data-table="wf-range">
          <thead>
            <tr>
              <th scope="col" className="num">Step</th>
              <th scope="col">Unit operation</th>
              <th scope="col">Duration from</th>
              <th scope="col" className="num">n recorded</th>
              <th scope="col" className="num">n used</th>
              <th scope="col" className="num">Runs per batch</th>
              <th scope="col" className="num">Lowest</th>
              <th scope="col" className="num">Median</th>
              <th scope="col" className="num">Highest</th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((x) => (
              <tr key={x.step}>
                <td className="num">{x.step}</td>
                <td>{x.uo}</td>
                <td className={x.kind === "entered" ? "wf-entered" : undefined}>{SOURCE_LABELS[x.kind]}</td>
                <td className="num">{x.recorded.length}</td>
                <td className="num">{x.used.length}</td>
                <td className="num">{x.runs}</td>
                <td className="num">{x.range ? formatDuration(x.range.low) : "—"}</td>
                <td className="num">{x.range ? formatDuration(x.range.mid) : "—"}</td>
                <td className="num">{x.range ? formatDuration(x.range.high) : "—"}</td>
              </tr>
            ))}
            {result.transfers.map((t) => (
              <tr key={`t${t.boundary}`}>
                <td className="num">—</td>
                <td colSpan={5}>
                  Transfer between steps {t.boundary} and {t.boundary + 1}
                </td>
                <td className="num" colSpan={3}>
                  {formatDuration(t.seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="wf-result" data-result="range">
        {cycle === null ? (
          <p className="wf-missing">
            No cycle time yet: {result.missing.map((i) => `step ${i} (${state.steps[i - 1]!.uo})`).join(", ")}{" "}
            {result.missing.length > 1 ? "have" : "has"} no recorded duration and no value entered. Enter a duration for{" "}
            {result.missing.length > 1 ? "them" : "it"} below.
          </p>
        ) : (
          <>
            <p>
              <strong>Cycle time per batch</strong> (lowest, median, highest): <span data-value="cycle" className="math">{tripleText(cycle)}</span>
            </p>
            <p>
              <strong>Experiments per day</strong> (from the highest, median and lowest cycle time):{" "}
              <span data-value="per-day">
                {dayText(perDay!.low)}, {dayText(perDay!.mid)}, {dayText(perDay!.high)}
              </span>
            </p>
            <p className="table-note">{NO_WAITING}</p>
            {result.entered.length > 0 && (
              <p className="wf-entered">
                These include the duration{result.entered.length > 1 ? "s" : ""} entered by you for step
                {result.entered.length > 1 ? "s" : ""} {result.entered.join(", ")}.
              </p>
            )}
          </>
        )}
      </div>
      <p className="table-note">{MARKER_KEY}</p>
      {result.steps.map((x) => (
        <StepDetail
          key={x.step}
          s={state}
          catalog={catalog}
          step={x}
          offers={offers.get(x.step) ?? []}
          domain={domain}
          jointRows={jointRows}
          apply={apply}
        />
      ))}
      <ThroughputPanel sim={sim} perDay={perDay} topTen={topTen} />
    </section>
  );
}
