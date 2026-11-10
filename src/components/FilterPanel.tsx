// Filter bar of the browser and the Trends dashboard (REQ-004; SPEC-TAXO-001 REQ-007; SPEC-UI-001 REQ-025): search and
// year range in the bar, one popover button per checkbox group ("Field tag · 2"), and below it a pill per active filter
// with "Clear all". Options show readable names with the code beside them.
// One popover is open at a time (components/Popover.tsx). An option shows its name and its code once; the checkbox is
// named "Name (code)" (SPEC-UI-001 REQ-028).
// On a phone the bar keeps only the search box and one "Filters" button, which opens a tray from the bottom of the
// screen with the year range and one folding row per checkbox group (the same checkboxes as the popovers).
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";
import { FILTER_GROUPS, filterPills, optionLabel, type FilterGroup } from "../lib/filterLabels";
import type { FilterState, Match, Offered } from "../lib/filterState";
import { Popover } from "./Popover";
import { Sheet } from "./Sheet";
import { PHONE_QUERY, useMedia } from "./useMedia";

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
              aria-label={code ? `${name} (${code})` : undefined}
              checked={checked}
              onChange={() => onState({ ...state, [group.key]: checked ? selected.filter((v) => v !== value) : [...selected, value] })}
            />
            <span className="filter-option-name">{name}</span>
            {code && (
              <>
                {" "}
                <code>{code}</code>
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

const countLabel = (legend: string, count: number) => (count ? `${legend} · ${count}` : legend);

/** The chosen options of a group by name, or "Any". */
function chosenText(group: FilterGroup, state: FilterState): string {
  const values = state[group.key] as (string | number)[];
  return values.length ? values.map((v) => optionLabel(group.key, v).name).join(", ") : "Any";
}

interface Props {
  /** Prefix of the popover ids, so two bars never share one. */
  idPrefix: string;
  state: FilterState;
  offered: Offered;
  yearText: { from: string; to: string };
  inverted: boolean;
  onState: (next: FilterState) => void;
  onYearText: (from: string, to: string) => void;
  onClear: () => void;
  /** Text of the tray's closing button on a phone, e.g. "Show 85 papers". */
  resultText?: string;
}

function SearchBox({ state, onState }: Pick<Props, "state" | "onState">) {
  return (
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
  );
}

function YearRange({ yearText, onYearText }: Pick<Props, "yearText" | "onYearText">) {
  return (
    <fieldset className="filter-group years">
      <legend>Year</legend>
      <input type="number" inputMode="numeric" placeholder="from" aria-label="From" value={yearText.from} onChange={(e) => onYearText(e.target.value, yearText.to)} />
      <span aria-hidden="true">–</span>
      <input type="number" inputMode="numeric" placeholder="to" aria-label="To" value={yearText.to} onChange={(e) => onYearText(yearText.from, e.target.value)} />
    </fieldset>
  );
}

function GroupFields({ group, offered, state, onState }: { group: FilterGroup } & Pick<Props, "offered" | "state" | "onState">) {
  return (
    <>
      <CheckboxGroup group={group} options={offered[group.key]} state={state} onState={onState} />
      {group.match && (
        <MatchControl
          legend={`${group.legend} match`}
          name={group.match}
          value={state[group.match]}
          onChange={(m) => onState({ ...state, [group.match!]: m })}
        />
      )}
    </>
  );
}

function Pills({ state, onState, onYearText, onClear }: Pick<Props, "state" | "onState" | "onYearText" | "onClear">) {
  const pills = filterPills(state);
  if (!pills.length) return null;
  return (
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
  );
}

/** The phone bar: search, one "Filters" button and the tray it opens. */
function PhoneFilters(props: Props) {
  const { idPrefix, state, inverted, onClear, resultText } = props;
  const [trayOpen, setTrayOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = filterPills(state).filter((p) => p.id !== "q").length;
  const trayId = `${idPrefix}-tray`;
  return (
    <section className="filter-panel filter-panel-phone" aria-label="Filters">
      <div className="filter-bar">
        <SearchBox {...props} />
        <button
          type="button"
          className={active ? "btn btn-secondary filter-tray-button active" : "btn btn-secondary filter-tray-button"}
          aria-haspopup="dialog"
          aria-expanded={trayOpen}
          aria-controls={trayOpen ? trayId : undefined}
          onClick={() => setTrayOpen(true)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {active > 0 && <span className="count-badge">{active}</span>}
        </button>
      </div>
      {inverted && (
        <p className="year-error" role="status">
          From year is after To year
        </p>
      )}
      <Pills {...props} />
      {trayOpen && (
        <Sheet
          id={trayId}
          title="Filters"
          onClose={() => setTrayOpen(false)}
          head={
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
              Clear all
            </button>
          }
          foot={
            <button type="button" className="btn btn-primary tray-done" onClick={() => setTrayOpen(false)}>
              {resultText ?? "Show results"}
            </button>
          }
        >
          <div className="tray-row tray-years">
            <YearRange {...props} />
          </div>
          {FILTER_GROUPS.map((group) => {
            const open = openKey === group.key;
            const panelId = `${trayId}-${group.key}`;
            return (
              <div key={group.key} className="tray-group">
                <button
                  type="button"
                  className="tray-row"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : group.key)}
                >
                  <span className="tray-name">{countLabel(group.legend, (state[group.key] as unknown[]).length)}</span>
                  <span className="tray-value">{chosenText(group, state)}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {open && (
                  <div id={panelId} className="tray-options">
                    <GroupFields group={group} {...props} />
                  </div>
                )}
              </div>
            );
          })}
        </Sheet>
      )}
    </section>
  );
}

export function FilterPanel(props: Props) {
  const phone = useMedia(PHONE_QUERY);
  return phone ? <PhoneFilters {...props} /> : <DesktopFilters {...props} />;
}

function DesktopFilters(props: Props) {
  const { idPrefix, state, offered, inverted, onState } = props;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const close = useRef(() => setOpenKey(null)).current;

  return (
    <section className="filter-panel" aria-label="Filters">
      <div className="filter-bar">
        <SearchBox {...props} />
        <YearRange {...props} />
        {FILTER_GROUPS.map((group) => (
          <Popover
            key={group.key}
            id={`${idPrefix}-${group.key}`}
            label={countLabel(group.legend, (state[group.key] as unknown[]).length)}
            active={(state[group.key] as unknown[]).length > 0}
            open={openKey === group.key}
            onOpen={() => setOpenKey(group.key)}
            onClose={close}
          >
            <GroupFields group={group} offered={offered} state={state} onState={onState} />
          </Popover>
        ))}
      </div>
      {inverted && (
        <p className="year-error" role="status">
          From year is after To year
        </p>
      )}
      <Pills {...props} />
    </section>
  );
}
