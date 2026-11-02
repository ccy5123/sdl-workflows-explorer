// Evidence of the selected item, or of the platform when nothing is selected (REQ-014, REQ-015); a report link for a
// selected module, step or connection (SPEC-CONTRIB-001 REQ-004).
import { CORRECTION_LINK_TEXT, correctionUrl } from "../lib/contribute";
import type { EvidenceView } from "../lib/evidence";
import { IssueLink } from "./IssueLink";

export function EvidencePanel({ view, release }: { view: EvidenceView; release: string }) {
  return (
    <section className="panel evidence" aria-labelledby="evidence-heading" aria-live="polite">
      <h2 id="evidence-heading">Evidence</h2>
      <dl>
        <dt>Item</dt>
        <dd data-field="kind">{view.kind}</dd>
        <dt>Id</dt>
        <dd data-field="id">
          <code>{view.id}</code>
        </dd>
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
    </section>
  );
}
