// Evidence of the selected item (REQ-014, REQ-015) as a sheet: docked beside the content from 1024 px, at the bottom
// of the screen below that (SPEC-UI-001 REQ-019, REQ-022). It exists only while something is selected; the page shows
// an empty state otherwise. The item's type shows its readable name with the vocabulary code (REQ-021).
// A report link follows for a selected module, step or connection (SPEC-CONTRIB-001 REQ-004).
// Focus as in the site menu: on open it moves to the close button; when the sheet closes and focus would be lost
// (Escape, the close button), it returns to the element that opened it.
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { CORRECTION_LINK_TEXT, correctionUrl } from "../lib/contribute";
import type { EvidenceView } from "../lib/evidence";
import { displayLabel } from "../lib/labels";
import { IssueLink } from "./IssueLink";

const TYPE_TERM: Record<NonNullable<EvidenceView["type"]>["kind"], string> = {
  module_type: "Type",
  transfer_mode: "Transfer mode",
  unit_operation: "Operation",
};

interface Props {
  view: EvidenceView;
  release: string;
  onClose: () => void;
}

export function EvidencePanel({ view, release, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so a second run of the effect (React's development check) does not take the close button as opener.
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const active = document.activeElement;
    if (!openerRef.current && active instanceof HTMLElement && active !== closeRef.current) openerRef.current = active;
    closeRef.current?.focus();
    return () => {
      // The sheet is gone by now; focus left with it lands on <body>. A click elsewhere keeps its own focus.
      const opener = openerRef.current;
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost && opener?.isConnected && opener !== document.body) opener.focus();
    };
  }, []);

  return (
    <aside className="evidence evidence-sheet" role="complementary" aria-labelledby="evidence-heading">
      <div className="evidence-head">
        <h2 id="evidence-heading">Evidence</h2>
        <button ref={closeRef} type="button" className="btn btn-icon" aria-label="Close evidence" title="Close (Esc)" onClick={onClose}>
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      <div aria-live="polite">
        <dl>
          <dt>Item</dt>
          <dd data-field="kind">{view.kind}</dd>
          <dt>Id</dt>
          <dd data-field="id">
            <code>{view.id}</code>
          </dd>
          {view.type && (
            <>
              <dt>{TYPE_TERM[view.type.kind]}</dt>
              <dd data-field="type">
                {displayLabel(view.type.kind, view.type.code)} <code>{view.type.code}</code>
              </dd>
            </>
          )}
          <dt>Document</dt>
          <dd data-field="doc">{view.doc}</dd>
          <dt>Page</dt>
          <dd data-field="page">{view.page}</dd>
          <dt>Locator</dt>
          <dd data-field="locator">{view.locator}</dd>
          {view.note && (
            <>
              <dt>Note</dt>
              <dd data-field="note">{view.note}</dd>
            </>
          )}
          <dt>Paper</dt>
          <dd>
            <a href={view.doiUrl}>{view.doiUrl}</a>
          </dd>
        </dl>
        {view.kind !== "Platform" && (
          <p className="report">
            <IssueLink href={correctionUrl(view.id, release)}>{CORRECTION_LINK_TEXT}</IssueLink>
          </p>
        )}
      </div>
    </aside>
  );
}
