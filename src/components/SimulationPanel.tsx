// Simulation: every assumption outside the data as an input with its default, the workflow inputs it uses, the rules it
// follows, and the results of "Run simulation" headed by the sentence that they depend on those inputs
// (SPEC-SIM-001 REQ-017 to REQ-020).
import { useId, useState } from "react";
import type { StepSource } from "../lib/cycleRange";
import { formatDuration, formatNumber } from "../lib/cycleRange";
import { MAX_STEP_RUNS, simulate, simUnits, stepRunCount, type SimSummary } from "../lib/des";
import {
  AGENT_MODES,
  DEFAULT_STATE,
  encodeWorkflow,
  isTransferBoundary,
  NOT_SPECIFIED,
  setAgents,
  setCount,
  setOption,
  transferAt,
  type Catalog,
  type EditResult,
  type WorkflowState,
} from "../lib/workflowState";
import {
  AGENT_LABELS,
  BOTTLENECK_TEXT,
  DRAW_RULES,
  GANTT_TEXT,
  QUEUE_RULES,
  SIM_DEPENDS,
  SIM_INTRO,
  SIM_RULES,
  UTILIZATION_TEXT,
} from "../lib/workflowText";
import { rowName, Timeline, TIMELINE_LIMIT } from "./Timeline";
import { CommitField } from "./WorkflowEditor";

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <span className="wf-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </span>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const tripleText = (t: { low: number; mid: number; high: number }) =>
  `${formatDuration(t.low)}, ${formatDuration(t.mid)}, ${formatDuration(t.high)}`;
const dayText = (v: number | null) => (v === null ? "not defined: the time is 0 s" : formatNumber(v));

export function SimulationPanel({
  state,
  catalog,
  sources,
  apply,
}: {
  state: WorkflowState;
  catalog: Catalog;
  sources: StepSource[];
  apply: (r: EditResult) => boolean;
}) {
  const boundsId = useId();
  const [result, setResult] = useState<{ query: string; summary: SimSummary } | null>(null);
  const [running, setRunning] = useState(false);
  const { units, missing } = simUnits(state, sources);
  const count = stepRunCount(state, units);
  const query = encodeWorkflow(state);
  const current = result && result.query === query ? result.summary : null;
  const transfers = state.steps.slice(1).flatMap((_, k) => {
    const i = k + 1;
    if (!isTransferBoundary(state, i)) return [];
    const t = transferAt(state, i);
    return [`steps ${i} and ${i + 1}: ${t.mode === NOT_SPECIFIED ? "not specified" : t.mode}, ${t.seconds} s`];
  });
  const run = () => {
    setRunning(true);
    // let the browser paint "Running…" before the simulation takes the main thread
    setTimeout(() => {
      setResult({ query, summary: simulate(state, units) });
      setRunning(false);
    }, 0);
  };
  const blocked =
    missing.length > 0
      ? `Enter a duration for step${missing.length > 1 ? "s" : ""} ${missing.join(", ")} under "Cycle time and throughput" first; the simulation needs a duration for every step.`
      : count > MAX_STEP_RUNS
        ? `These inputs need ${count.toLocaleString("en")} step runs (batches × simulation runs × runs per batch over all steps); the page runs at most ${MAX_STEP_RUNS.toLocaleString("en")}. Use fewer batches, fewer simulation runs or more samples per run.`
        : null;

  return (
    <section aria-labelledby="wf-sim" className="wf-sim">
      <h2 id="wf-sim">Simulation</h2>
      <p>{SIM_INTRO}</p>

      <h3>Inputs not in the data</h3>
      <ul className="wf-assumptions" data-list="assumptions">
        <li>
          Transfer modes and times (default: not specified, 0 s), set under "Your workflow":{" "}
          {transfers.length === 0 ? "no transfer between steps on different modules." : transfers.join("; ")}
        </li>
        <li>
          Transfer agents per kind, 1 to 50 (default 1 each):
          <span className="wf-inputs">
            {AGENT_MODES.map((m) => (
              <CommitField key={m} label={`Transfer agents: ${AGENT_LABELS[m]}`} value={String(state.agents[m] ?? 1)}
                onCommit={(t) => apply(setAgents(state, catalog, m, t))} />
            ))}
          </span>
        </li>
        <li>
          <Choice label="Queue rule (default: first come, first served)" value={state.rule} options={QUEUE_RULES}
            onChange={(v) => apply(setOption(state, catalog, { rule: v as WorkflowState["rule"] }))} />
        </li>
        <li>
          <Choice label="Step durations (default: one recorded value drawn at random for each run of a step)" value={state.draw}
            options={DRAW_RULES} onChange={(v) => apply(setOption(state, catalog, { draw: v as WorkflowState["draw"] }))} />
        </li>
        <li className="wf-check">
          <input id={boundsId} type="checkbox" checked={state.bounds}
            onChange={(e) => apply(setOption(state, catalog, { bounds: e.target.checked }))} />
          <label htmlFor={boundsId}>Draw recorded bounds (≤ or ≥ values) too (default: no)</label>
        </li>
        <li>
          <span className="wf-inputs">
            <CommitField label={`Batches, 1 to 500 (default ${DEFAULT_STATE.n})`} value={String(state.n)}
              onCommit={(t) => apply(setCount(state, catalog, "n", t))} />
            <CommitField label={`Simulation runs, 1 to 100 (default ${DEFAULT_STATE.runs})`} value={String(state.runs)}
              onCommit={(t) => apply(setCount(state, catalog, "runs", t))} />
            <CommitField label={`Seed, 0 to 4,294,967,295 (default ${DEFAULT_STATE.seed})`} value={String(state.seed)} width="9rem"
              onCommit={(t) => apply(setCount(state, catalog, "seed", t))} />
          </span>
        </li>
      </ul>

      <h3>Workflow inputs it uses</h3>
      <ul className="wf-assumptions" data-list="workflow-inputs">
        <li>
          Devices per module (default 1): {state.modules.map((m, k) => `module ${k + 1} (${m.type}) ${m.devices}`).join("; ")}
        </li>
        <li>Batch size (default 1): {state.batch}</li>
        <li>Samples per experiment (default 1): {state.samples}</li>
        <li>
          Samples per run (default all samples of the batch):{" "}
          {state.steps.map((_, k) => `step ${k + 1} ${state.perRun[k + 1] ?? `all (${state.batch * state.samples})`}`).join("; ")}
        </li>
        <li>Parallel units (default 1): {state.parallel}</li>
      </ul>

      <h3>Rules</h3>
      <ul className="wf-assumptions" data-list="rules">
        {SIM_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      {blocked && <p className="wf-missing">{blocked}</p>}
      <p>
        <button type="button" disabled={blocked !== null || running} onClick={run}>
          Run simulation
        </button>{" "}
        {running && <span role="status">Running…</span>}
        {result && !current && !running && <span>The inputs changed since the last run; run it again for new results.</span>}
      </p>

      {current && (
        <div className="wf-sim-results" data-result="simulation">
          <p className="wf-depends">{SIM_DEPENDS}</p>
          <div className="table-scroll">
            <table className="data" data-table="wf-sim-summary">
              <caption className="visually-hidden">Results over {state.runs} simulation runs</caption>
              <thead>
                <tr>
                  <th scope="col">Over {state.runs} run{state.runs > 1 ? "s" : ""}</th>
                  <th scope="col">Lowest, median, highest</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Time to finish all {state.n} batches</th>
                  <td data-value="makespan">{tripleText(current.makespan)}</td>
                </tr>
                <tr>
                  <th scope="row">Experiments per day (batches × batch size × 86,400 s / that time)</th>
                  <td data-value="sim-per-day">
                    {dayText(current.perDay.low)}, {dayText(current.perDay.mid)}, {dayText(current.perDay.high)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-note">{UTILIZATION_TEXT}</p>
          <div className="table-scroll">
            <table className="data" data-table="wf-utilization">
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col" className="num">Devices</th>
                  <th scope="col" className="num">Median utilization</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(current.utilization).map(([m, u]) => (
                  <tr key={m}>
                    <td>
                      {m} ({state.modules[Number(m) - 1]!.type})
                    </td>
                    <td className="num">{state.modules[Number(m) - 1]!.devices}</td>
                    <td className="num">{pct(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-scroll">
            <table className="data" data-table="wf-waiting">
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col" className="num">Median waiting before it (mean over batches)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(current.waiting).map(([step, w]) => (
                  <tr key={step}>
                    <td>
                      {step} ({state.steps[Number(step) - 1]!.uo})
                    </td>
                    <td className="num">{formatDuration(w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p data-value="bottleneck">
            {BOTTLENECK_TEXT}{" "}
            {current.bottleneck &&
              `Step ${current.bottleneck.step} (${state.steps[current.bottleneck.step - 1]!.uo}) on module ${current.bottleneck.module} (${state.modules[current.bottleneck.module - 1]!.type}), ${pct(current.bottleneck.utilization)}.`}
          </p>
          <h3>Timeline of run 1</h3>
          <p className="table-note">{GANTT_TEXT}</p>
          <Timeline state={state} events={current.run1.events} makespan={current.run1.makespan} />
          <EventTable state={state} summary={current} />
        </div>
      )}
    </section>
  );
}

function EventTable({ state, summary }: { state: WorkflowState; summary: SimSummary }) {
  const [open, setOpen] = useState(false);
  const events = summary.run1.events;
  const shown = events.slice(0, TIMELINE_LIMIT);
  return (
    <details className="wf-events" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Events of run 1 ({events.length.toLocaleString("en")})</summary>
      {open && (
        <>
          <div className="table-scroll">
            <table className="data" data-table="wf-events">
              <thead>
                <tr>
                  <th scope="col" className="num">Batch</th>
                  <th scope="col">Step or transfer</th>
                  <th scope="col">Device or agent</th>
                  <th scope="col" className="num">Start (s)</th>
                  <th scope="col" className="num">End (s)</th>
                  <th scope="col" className="num">Waited (s)</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e, k) => (
                  <tr key={k}>
                    <td className="num">{e.batch}</td>
                    <td>{e.kind === "step" ? `step ${e.step}` : `transfer after step ${e.step}`}</td>
                    <td>{rowName(state, e) ?? "none"}</td>
                    <td className="num">{formatNumber(e.start)}</td>
                    <td className="num">{formatNumber(e.end)}</td>
                    <td className="num">{formatNumber(e.waited)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length > shown.length && (
            <p className="table-note">
              Listing the first {TIMELINE_LIMIT.toLocaleString("en")} of {events.length.toLocaleString("en")} events.
            </p>
          )}
        </>
      )}
    </details>
  );
}
