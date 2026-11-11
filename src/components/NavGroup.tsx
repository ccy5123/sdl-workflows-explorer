// A top-bar tab that opens a short list of links (the "Data" group: About, Getting started, Taxonomy, Benchmark). The
// site menu's pattern (SiteMenu.tsx): focus moves to the first link on open; the panel closes on Escape (focus back
// on the button), on a choice, on a route change, on a click outside and when focus leaves it. The tab bar scrolls
// sideways (overflow-x), which would clip a panel inside it, so the panel is fixed under the button.
import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { NavItem } from "./SiteMenu";

interface Props {
  text: string;
  items: readonly NavItem[];
  /** The current view's nav key (navCurrent), or null. */
  current: string | null;
  hash: string;
}

export const itemKey = (item: NavItem) => item.current ?? item.text;

export function NavGroup({ text, items, current, hash }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = `nav-group-${text.toLowerCase()}`;
  // The page shown, when it is one of this group's: the closed group then carries the current-page mark and names it.
  const inside = items.find((item) => itemKey(item) === current);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  useEffect(() => setOpen(false), [hash]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!open || !panel || !button) return;
    const r = button.getBoundingClientRect();
    panel.style.top = `${r.bottom + 6}px`;
    panel.style.left = `${Math.min(r.left, document.documentElement.clientWidth - panel.offsetWidth - 8)}px`;
  }, [open]);

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
    const onResize = () => close(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={inside ? "nav-group-button is-current" : "nav-group-button"}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-current={inside && !open ? "page" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {text}
        {inside && <span className="visually-hidden">, {inside.text}</span>}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          className="nav-group-panel"
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
                  aria-current={itemKey(item) === current ? "page" : undefined}
                  onClick={() => close(true)}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
