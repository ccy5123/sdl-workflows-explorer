// "Your workflow": steps, modules, transfers and batch inputs of the workflow builder, and the fill from a coded platform
// (SPEC-SIM-001 REQ-006, REQ-008). Every edit goes through the pure functions of workflowState.ts.
import { useEffect, useId, useState } from "react";
import type { SimulationJson } from "../data/types";
import {
  addModule,
  addStep,
  isTransferBoundary,
  LIMITS,
  moveStep,
  NOT_SPECIFIED,
  removeModule,
  removeStep,
  setCount,
  setModule,
  setPerRun,
  setStep,
  setTransfer,
  transferAt,
  type Catalog,
  type EditResult,
  type WorkflowState,
} from "../lib/workflowState";

/** A text input that applies its value on Enter or when it loses focus; a refused value snaps back. */
export function CommitField({
  label,
  value,
  placeholder,
  onCommit,
  width = "6rem",
  inputMode = "numeric",
  hideLabel = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (text: string) => boolean;
  width?: string;
  inputMode?: "numeric" | "decimal";
  hideLabel?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft.trim() === value) return;
    if (!onCommit(draft.trim())) setDraft(value);
  };
  return (
    <span className="wf-field">
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : undefined}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={draft}
        placeholder={placeholder}
        style={{ width }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </span>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  hideLabel = true,
}: {
  label: string;
  value: string;
  options: { value: string; text: string; title?: string }[];
  onChange: (value: string) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <span className="wf-field">
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : undefined}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} title={o.title}>
            {o.text}
          </option>
        ))}
      </select>
    </span>
  );
}

export function WorkflowEditor({
  state,
  catalog,
  sim,
  apply,
  onStart,
}: {
  state: WorkflowState;
  catalog: Catalog;
  sim: SimulationJson;
  /** Applies an edit result: shows its notes or error; returns whether the edit was accepted. */
  apply: (result: EditResult) => boolean;
  onStart: (platformId: string) => void;
}) {
  const uoOptions = sim.unit_operations.map((u) => ({ value: u.id, text: u.id, title: u.definition }));
  const typeOptions = sim.module_types.map((m) => ({ value: m.id, text: m.id, title: m.definition }));
  const modeOptions = [
    { value: NOT_SPECIFIED, text: "not specified" },
    ...sim.transfer_modes.map((t) => ({ value: t.id, text: t.id, title: t.definition })),
  ];
  const moduleOptions = state.modules.map((m, k) => ({ value: String(k + 1), text: `${k + 1}: ${m.type}` }));
  const [platform, setPlatform] = useState(sim.platforms[0]?.platform_id ?? "");
  const [newUo, setNewUo] = useState(sim.unit_operations[0]?.id ?? "");
  const [newStepModule, setNewStepModule] = useState("new");
  const [newStepType, setNewStepType] = useState(sim.module_types[0]?.id ?? "");
  const [newModuleType, setNewModuleType] = useState(sim.module_types[0]?.id ?? "");
  const all = state.batch * state.samples;
  const stepModule = newStepModule !== "new" && Number(newStepModule) <= state.modules.length ? newStepModule : "new";

  return (
    <section aria-labelledby="wf-input" className="wf-input">
      <h2 id="wf-input">Your workflow</h2>

      <div className="wf-start">
        <Select
          label="Start from a coded platform"
          hideLabel={false}
          value={platform}
          options={sim.platforms.map((p) => ({ value: p.platform_id, text: p.name ? `${p.platform_id} · ${p.name}` : p.platform_id }))}
          onChange={setPlatform}
        />
        <button type="button" onClick={() => onStart(platform)}>
          Fill the builder from this platform
        </button>
      </div>

      <h3>Modules</h3>
      <p className="table-note">
        A module performs steps; devices are identical units of that module working in parallel (1 to {LIMITS.devices[1]}).
      </p>
      {state.modules.length > 0 && (
        <div className="table-scroll">
          <table className="data wf-table" data-table="wf-modules">
            <thead>
              <tr>
                <th scope="col" className="num">Module</th>
                <th scope="col">Module type</th>
                <th scope="col">Devices</th>
                <th scope="col">Remove</th>
              </tr>
            </thead>
            <tbody>
              {state.modules.map((m, k) => (
                <tr key={k}>
                  <td className="num">{k + 1}</td>
                  <td>
                    <Select label={`Module ${k + 1} type`} value={m.type} options={typeOptions}
                      onChange={(type) => apply(setModule(state, catalog, k + 1, { type }))} />
                  </td>
                  <td>
                    <CommitField label={`Module ${k + 1} devices`} hideLabel value={String(m.devices)}
                      onCommit={(devices) => apply(setModule(state, catalog, k + 1, { devices }))} />
                  </td>
                  <td>
                    <button type="button" onClick={() => apply(removeModule(state, catalog, k + 1))}>
                      Remove module {k + 1}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="wf-add">
        <Select label="Type of the new module" hideLabel={false} value={newModuleType} options={typeOptions} onChange={setNewModuleType} />
        <button type="button" onClick={() => apply(addModule(state, catalog, newModuleType))}>
          Add module
        </button>
      </div>

      <h3>Steps</h3>
      <p className="table-note">
        Steps run in this order for each batch. Samples per run: how many samples one run of the step handles; empty means
        all {all} samples of the batch in one run.
      </p>
      {state.steps.length > 0 && (
        <div className="table-scroll">
          <table className="data wf-table" data-table="wf-steps">
            <thead>
              <tr>
                <th scope="col" className="num">Step</th>
                <th scope="col">Unit operation</th>
                <th scope="col">Module</th>
                <th scope="col">Samples per run</th>
                <th scope="col">Order</th>
              </tr>
            </thead>
            <tbody>
              {state.steps.map((st, k) => {
                const i = k + 1;
                return (
                  <tr key={k}>
                    <td className="num">{i}</td>
                    <td>
                      <Select label={`Step ${i} unit operation`} value={st.uo} options={uoOptions}
                        onChange={(uo) => apply(setStep(state, catalog, i, { uo }))} />
                    </td>
                    <td>
                      <Select label={`Step ${i} module`} value={String(st.module)} options={moduleOptions}
                        onChange={(m) => apply(setStep(state, catalog, i, { module: Number(m) }))} />
                    </td>
                    <td>
                      <CommitField label={`Step ${i} samples per run`} hideLabel value={state.perRun[i] === undefined ? "" : String(state.perRun[i])}
                        placeholder={`all (${all})`} onCommit={(text) => apply(setPerRun(state, catalog, i, text))} />
                    </td>
                    <td className="wf-order">
                      <button type="button" disabled={i === 1} onClick={() => apply(moveStep(state, catalog, i, -1))}>
                        <span aria-hidden="true">↑</span>
                        <span className="visually-hidden">Move step {i} up</span>
                      </button>
                      <button type="button" disabled={i === state.steps.length} onClick={() => apply(moveStep(state, catalog, i, 1))}>
                        <span aria-hidden="true">↓</span>
                        <span className="visually-hidden">Move step {i} down</span>
                      </button>
                      <button type="button" onClick={() => apply(removeStep(state, catalog, i))}>
                        Remove<span className="visually-hidden"> step {i}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="wf-add">
        <Select label="Unit operation of the new step" hideLabel={false} value={newUo} options={uoOptions} onChange={setNewUo} />
        <Select
          label="Module of the new step"
          hideLabel={false}
          value={stepModule}
          options={[...moduleOptions, { value: "new", text: "a new module" }]}
          onChange={setNewStepModule}
        />
        {stepModule === "new" && (
          <Select label="Type of its new module" hideLabel={false} value={newStepType} options={typeOptions} onChange={setNewStepType} />
        )}
        <button
          type="button"
          onClick={() => apply(addStep(state, catalog, newUo, stepModule === "new" ? { type: newStepType } : Number(stepModule)))}
        >
          Add step
        </button>
      </div>

      <h3>Transfers</h3>
      <p className="table-note">
        Between consecutive steps on different modules: how material moves and how long one batch takes to move (0 to{" "}
        {LIMITS.transferSeconds.toLocaleString("en")} s). Default: not specified, 0 s.
      </p>
      {state.steps.length > 1 && (
        <div className="table-scroll">
          <table className="data wf-table" data-table="wf-transfers">
            <thead>
              <tr>
                <th scope="col">Between</th>
                <th scope="col">Transfer mode</th>
                <th scope="col">Transfer time (s)</th>
              </tr>
            </thead>
            <tbody>
              {state.steps.slice(1).map((_, k) => {
                const i = k + 1;
                if (!isTransferBoundary(state, i)) {
                  return (
                    <tr key={i}>
                      <td>Steps {i} and {i + 1}</td>
                      <td colSpan={2}>same module, no transfer</td>
                    </tr>
                  );
                }
                const t = transferAt(state, i);
                return (
                  <tr key={i}>
                    <td>Steps {i} and {i + 1}</td>
                    <td>
                      <Select label={`Transfer mode between steps ${i} and ${i + 1}`} value={t.mode} options={modeOptions}
                        onChange={(mode) => apply(setTransfer(state, catalog, i, { mode }))} />
                    </td>
                    <td>
                      <CommitField label={`Transfer time between steps ${i} and ${i + 1}, seconds`} hideLabel inputMode="decimal"
                        value={String(t.seconds)} onCommit={(seconds) => apply(setTransfer(state, catalog, i, { seconds }))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3>Batches</h3>
      <div className="wf-inputs">
        <CommitField label="Batch size (experiments proposed and run together, 1 to 10,000)" value={String(state.batch)}
          onCommit={(t) => apply(setCount(state, catalog, "batch", t))} />
        <CommitField label="Samples per experiment (1 to 1,000)" value={String(state.samples)}
          onCommit={(t) => apply(setCount(state, catalog, "samples", t))} />
        <CommitField label="Parallel units (batches that can be in progress at once, 1 to 50)" value={String(state.parallel)}
          onCommit={(t) => apply(setCount(state, catalog, "parallel", t))} />
      </div>
    </section>
  );
}
