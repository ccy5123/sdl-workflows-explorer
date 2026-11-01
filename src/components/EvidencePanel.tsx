// Evidence of the selected item, or of the platform when nothing is selected (REQ-014, REQ-015).
import type { EvidenceView } from "../lib/evidence";

export function EvidencePanel({ view }: { view: EvidenceView }) {
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
    </section>
  );
}
