// Menu of the top bar below 800 px (SPEC-UI-001 REQ-016): a button that opens a panel listing every view, the current
// one marked. The panel floats over the page (no layout shift) and closes on Escape, on choosing a view, on a route
// change, on a click outside it and when focus leaves it. Focus moves to the first link on open and back to the button
// when the panel closes by Escape or a choice; a click outside leaves focus where the click put it.
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  text: string;
}

interface Props {
  items: readonly NavItem[];
  /** Text of the current view's item, or null. */
  current: string | null;
  /** The location hash; the panel closes when it changes. */
  hash: string;
}

const PANEL_ID = "site-menu";

export function SiteMenu({ items, current, hash }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  // A route change closes the panel; a link choice already closed it and refocused the button.
  useEffect(() => setOpen(false), [hash]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-icon menu-button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      {open && (
        <nav
          ref={panelRef}
          id={PANEL_ID}
          className="site-menu"
          aria-label="Site menu"
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) close(false);
          }}
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={current === item.text ? "page" : undefined}
                  onClick={() => close(true)}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
