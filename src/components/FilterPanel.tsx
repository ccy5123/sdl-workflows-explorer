// Filter bar of the browser and the Trends dashboard (REQ-004; SPEC-TAXO-001 REQ-007; SPEC-UI-001 REQ-025): search and
// year range in the bar, one popover button per checkbox group ("Field tag · 2"), and below it a pill per active filter
// with "Clear all". Options show readable names with the code beside them.
// The popover is the site menu's pattern (components/SiteMenu.tsx): one open at a time; it closes on Escape (focus back
// on its button), on a click outside and when focus leaves it, and is moved left if it would cross the window's edge.
import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FILTER_GROUPS, filterPills, optionLabel, type FilterGroup } from "../lib/filterLabels";
import type { FilterState, Match, Offered } from "../lib/filterState";

/** Space kept between a popover and the window's edges. */
const EDGE = 8;

function CheckboxGroup({ group, options, state, onState }: { group: FilterGroup; options: readonly (string | number)[]; state: FilterState; onState: (next: FilterState) => void }) {
  const selected = state[group.key] as (string | number)[];
  return (
    <fieldset className="filter-group">
      <legend>{group.legend}</legend>
      {options.map((value) => {
        const checked = selected.includes(value);
        const { name, code } = optionLabel(group.key, value);
        return (
          <label key={value} className="filter-option">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onState({ ...state, [group.key]: checked ? selected.filter((v) => v !== value) : [...selected, value] })}
            />
            <span>{name}</span>
            {code && (
              <>
                <code aria-hidden="true">{code}</code>
                <span className="visually-hidden"> ({code})</span>
              </>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

function MatchControl({ legend, name, value, onChange }: { legend: string; name: string; value: Match; onChange: (m: Match) => void }) {
  return (
    <fieldset className="filter-group match">
      <legend>{legend}</legend>
      {(["all", "any"] as const).map((m) => (
        <label key={m}>
          <input type="radio" name={name} value={m} checked={value === m} onChange={() => onChange(m)} />
          {m}
        </label>
      ))}
    </fieldset>
  );
}

function FilterPopover({
  id,
  label,
  count,
  open,
  onOpen,
  onClose,
  children,
}: {
  id: string;
  label: string;
  count: number;
  open: boolean;
  onOpen: () => void;
  onClose: (refocus: boolean) => void;
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
        onClose(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) onClose(false);
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
        className={count ? "filter-button active" : "filter-button"}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? onClose(false) : onOpen())}
      >
        {count ? `${label} · ${count}` : label}
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
            if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) onClose(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterPanel({
  idPrefix,
  state,
  offered,
  yearText,
  inverted,
  onState,
  onYearText,
  onClear,
}: {
  /** Prefix of the popover ids, so two bars never share one. */
  idPrefix: string;
  state: FilterState;
  offered: Offered;
  yearText: { from: string; to: string };
  inverted: boolean;
  onState: (next: FilterState) => void;
  onYearText: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const close = useRef(() => setOpenKey(null)).current;
  const pills = filterPills(state);

  return (
    <section className="filter-panel" aria-label="Filters">
      <div className="filter-bar">
        <label className="filter search">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <span className="visually-hidden">Search ids, titles and platform names</span>
          <input
            type="search"
            value={state.q}
            placeholder="Search ids, titles, names"
            autoComplete="off"
            onChange={(e) => onState({ ...state, q: e.target.value })}
          />
        </label>
        <fieldset className="filter-group years">
          <legend>Year</legend>
          <input type="number" inputMode="numeric" placeholder="from" aria-label="From" value={yearText.from} onChange={(e) => onYearText(e.target.value, yearText.to)} />
          <span aria-hidden="true">–</span>
          <input type="number" inputMode="numeric" placeholder="to" aria-label="To" value={yearText.to} onChange={(e) => onYearText(yearText.from, e.target.value)} />
        </fieldset>
        {FILTER_GROUPS.map((group) => (
          <FilterPopover
            key={group.key}
            id={`${idPrefix}-${group.key}`}
            label={group.legend}
            count={(state[group.key] as unknown[]).length}
            open={openKey === group.key}
            onOpen={() => setOpenKey(group.key)}
            onClose={close}
          >
            <CheckboxGroup group={group} options={offered[group.key]} state={state} onState={onState} />
            {group.match && (
              <MatchControl
                legend={`${group.legend} match`}
                name={group.match}
                value={state[group.match]}
                onChange={(m) => onState({ ...state, [group.match!]: m })}
              />
            )}
          </FilterPopover>
        ))}
      </div>
      {inverted && (
        <p className="year-error" role="status">
          From year is after To year
        </p>
      )}
      {pills.length > 0 && (
        <ul className="filter-pills" aria-label="Active filters">
          {pills.map((pill) => (
            <li key={pill.id} className="pill">
              {pill.text}
              <button
                type="button"
                className="pill-remove"
                aria-label={pill.removeLabel}
                title={pill.removeLabel}
                onClick={() => (pill.id === "years" ? onYearText("", "") : onState(pill.remove(state)))}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="btn btn-ghost btn-sm clear-filters" onClick={onClear}>
              Clear all
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
