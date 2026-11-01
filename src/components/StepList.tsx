// Cycle steps in step_order (REQ-012, REQ-013, REQ-015). Each step is a button: Tab to reach, Enter/Space to select.
import type { Module, Step } from "../data/types";
import { show } from "../lib/evidence";

interface Props {
  steps: Step[];
  modules: Module[];
  selectedStepId: string | null;
  onSelect: (stepId: string) => void;
}

export function StepList({ steps, modules, selectedStepId, onSelect }: Props) {
  const nameOf = (id: string) => {
    const m = modules.find((x) => x.module_id === id);
    return m ? (m.name_in_paper ?? m.module_type) : id;
  };
  return (
    <section className="panel" aria-labelledby="steps-heading">
      <h2 id="steps-heading">Cycle steps</h2>
      {steps.length === 0 && <p>No steps recorded.</p>}
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.step_id}>
            <button
              type="button"
              className="step"
              data-step-order={s.step_order}
              aria-pressed={selectedStepId === s.step_id}
              onClick={() => onSelect(s.step_id)}
            >
              <span className="step-order">{s.step_order}</span>
              <span className="step-body">
                <span className="step-op">
                  {s.unit_operation}
                  {s.uncertain && (
                    <span className="uncertain" title="uncertain" aria-label="uncertain">
                      {" ?"}
                    </span>
                  )}
                </span>
                <span className="step-meta">
                  family {show(s.family)} · performer {show(s.performed_by)}
                </span>
                <span className="step-modules">{s.modules.length ? s.modules.map(nameOf).join("; ") : show(null)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
