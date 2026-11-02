// A vocabulary code shown by its readable name (SPEC-UI-001 REQ-008). The code stays in `title` (hover) and in the
// accessible name, so a reader matching against the CSV can still find it.
import { displayLabel } from "../lib/labels";

export function Label({ kind, code }: { kind: string; code: string }) {
  const label = displayLabel(kind, code);
  return (
    <span className="label" title={code} data-code={code}>
      {label}
      <span className="visually-hidden"> ({code})</span>
    </span>
  );
}
