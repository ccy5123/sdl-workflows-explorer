// A button that opens a panel below it: the filter popovers and the column chooser (SPEC-UI-001 REQ-025, REQ-028).
// The site menu's pattern (components/SiteMenu.tsx): focus moves to the first field on open; the panel closes on
// Escape (focus back on the button), on a click outside and when focus leaves it, and is moved left if it would
// cross the window's edge. Which popover is open is the caller's state, so a bar can keep one open at a time.
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/** Space kept between a popover and the window's edges. */
const EDGE = 8;

export function Popover({
  id,
  label,
  active = false,
  open,
  onOpen,
  onClose,
  children,
}: {
  id: string;
  /** Button text, e.g. "Field tag · 2". */
  label: string;
  /** Marks the button, e.g. when the group has chosen values. */
  active?: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the panel inside the window: shift it left by any overflow, but not past the left edge.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    panel.style.left = "0px";
    const r = panel.getBoundingClientRect();
    const over = r.right - (document.documentElement.clientWidth - EDGE);
    if (over > 0) panel.style.left = `${-Math.min(over, r.left - EDGE)}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose]);

  return (
    <div className="filter-popover">
      <button
        ref={buttonRef}
        type="button"
        className={active ? "filter-button active" : "filter-button"}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          className="filter-popover-panel"
          role="dialog"
          aria-label={label}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) onClose();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
