// Cycle steps in step_order (REQ-012, REQ-013, REQ-015) as a vertical timeline with an icon for who performs each step
// (SPEC-UI-001 REQ-020). Each step is a button: Tab to reach, Enter/Space to select. Hovering or focusing a step
// previews its modules in the graph; a click selects it and ends the preview (UI AC-38).
import { Bot, CircleQuestionMark, Cpu, User, type LucideIcon } from "lucide-react";
import type { Module, Step } from "../data/types";
import { show } from "../lib/evidence";
import { displayLabel } from "../lib/labels";
import { Label } from "./Label";

interface Props {
  steps: Step[];
  modules: Module[];
  selectedStepId: string | null;
  onSelect: (stepId: string) => void;
  /** The step under the pointer or keyboard focus, or null when it leaves. */
  onPreview?: (stepId: string | null, by: "pointer" | "focus") => void;
}

const PERFORMERS: Record<string, LucideIcon> = { robot: Bot, software: Cpu, human: User };

export function StepList({ steps, modules, selectedStepId, onSelect, onPreview }: Props) {
  const nameOf = (id: string) => {
    const m = modules.find((x) => x.module_id === id);
    return m ? (m.name_in_paper ?? displayLabel("module_type", m.module_type)) : id;
  };
  return (
    <section className="card steps-card" aria-labelledby="steps-heading">
      <h2 id="steps-heading">Cycle steps</h2>
      {steps.length === 0 && <p>No steps recorded.</p>}
      <ol className="steps">
        {steps.map((s) => {
          const Icon = (s.performed_by && PERFORMERS[s.performed_by]) || CircleQuestionMark;
          const performer = s.performed_by ?? "performer not stated";
          return (
            <li key={s.step_id}>
              <button
                type="button"
                className="step"
                data-step-order={s.step_order}
                aria-pressed={selectedStepId === s.step_id}
                onClick={() => {
                  onSelect(s.step_id);
                  onPreview?.(null, "pointer");
                }}
                onMouseEnter={() => onPreview?.(s.step_id, "pointer")}
                onMouseLeave={() => onPreview?.(null, "pointer")}
                onFocus={() => onPreview?.(s.step_id, "focus")}
                onBlur={() => onPreview?.(null, "focus")}
              >
                <span className="step-marker" aria-hidden="true">
                  <span className="step-order">{s.step_order}</span>
                </span>
                <span className="step-body">
                  <span className="step-op">
                    <Label kind="unit_operation" code={s.unit_operation} />
                    {s.uncertain && (
                      <span className="uncertain" title="uncertain" aria-label="uncertain">
                        {" ?"}
                      </span>
                    )}
                  </span>
                  <span className="step-meta">
                    <span className="step-performer" title={performer}>
                      <Icon size={14} aria-hidden="true" />
                      {show(s.performed_by)}
                    </span>
                    {s.family && <span>family {s.family}</span>}
                  </span>
                  <span className="step-modules">{s.modules.length ? s.modules.map(nameOf).join("; ") : show(null)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
