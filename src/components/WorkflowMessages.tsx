// Messages of the Workflow builder (notes and refusals of an edit), shown in the flow of the page right after the part
// of the builder the edit came from, so they cover nothing (SPEC-UI-001 UI AC-54; they used to stick to the bottom of
// the window over the content). Each part ends in a MessageSlot; the builder puts the messages in the first slot after
// the control that made the edit. A visually hidden live region, always present, announces them once.
import { createContext, useContext } from "react";

export interface WorkflowMessages {
  /** The slot that shows the messages. */
  at: string;
  notes: string[];
  error: string | null;
}

export const MessagesContext = createContext<WorkflowMessages>({ at: "end", notes: [], error: null });

/** The first slot after `el` in document order; "end" (after the builder) when there is none. */
export function slotAfter(el: Element | null): string {
  if (!el || el === document.body) return "end";
  for (const slot of document.querySelectorAll<HTMLElement>("[data-msg-slot]")) {
    if (el.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING) return slot.dataset.msgSlot!;
  }
  return "end";
}

/** Where the messages show when the last edit came from this part of the builder. */
export function MessageSlot({ at }: { at: string }) {
  const m = useContext(MessagesContext);
  const shown = m.at === at;
  return (
    <div className="wf-messages" data-msg-slot={at}>
      {shown && m.error && <p className="wf-message wf-error">{m.error}</p>}
      {shown &&
        m.notes.map((n) => (
          <p key={n} className="wf-message">
            {n}
          </p>
        ))}
    </div>
  );
}

/** The live region that announces each new message once, wherever it shows. */
export function MessageAnnouncer() {
  const m = useContext(MessagesContext);
  return (
    <>
      <div className="visually-hidden" role="alert">
        {m.error ?? ""}
      </div>
      <div className="visually-hidden" aria-live="polite">
        {m.notes.join(" ")}
      </div>
    </>
  );
}
