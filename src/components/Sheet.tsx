// A modal sheet that rises from the bottom of a phone screen over a scrim: the filter tray of Browse and Trends and the
// full-screen module graph. Focus moves into it on open, stays inside it while it is open (Tab wraps), and goes back to
// the element that opened it when it closes (Escape, the scrim, or a button of the caller). The page under it does not
// scroll while it is open.
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  id,
  title,
  onClose,
  full = false,
  head,
  foot,
  children,
}: {
  id: string;
  title: string;
  onClose: () => void;
  /** Fills the screen instead of rising to at most 88 % of it. */
  full?: boolean;
  /** Controls beside the title, before the close button. */
  head?: ReactNode;
  /** A row fixed at the bottom of the sheet. */
  foot?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const box = ref.current!;
    box.querySelector<HTMLElement>("[data-sheet-close]")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <div className="sheet-layer">
      <div className="sheet-scrim" aria-hidden="true" onClick={() => onCloseRef.current()} />
      <div ref={ref} id={id} className={full ? "sheet sheet-full" : "sheet"} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <div className="sheet-head">
          <h2 id={`${id}-title`}>{title}</h2>
          {head}
          <button type="button" className="btn btn-icon" aria-label={`Close ${title.toLowerCase()}`} data-sheet-close onClick={() => onCloseRef.current()}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </div>,
    document.body,
  );
}
