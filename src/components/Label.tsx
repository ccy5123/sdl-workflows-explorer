// A vocabulary code shown by its readable name (SPEC-UI-001 REQ-008). The code stays in `title` (hover) and in the
// accessible name, so a reader matching against the CSV can still find it. Inside brackets in running text
// (`inText`) the code stays in `title` only, so the sentence does not read "(name (code))".
import { displayLabel } from "../lib/labels";

export function Label({ kind, code, inText = false }: { kind: string; code: string; inText?: boolean }) {
  const label = displayLabel(kind, code);
  return (
    <span className="label" title={code} data-code={code}>
      {label}
      {!inText && <span className="visually-hidden"> ({code})</span>}
    </span>
  );
}
