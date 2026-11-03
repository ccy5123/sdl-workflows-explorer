// Filter bar of the browser and the Trends dashboard (REQ-004; SPEC-TAXO-001 REQ-007; SPEC-UI-001 REQ-025): search and
// year range in the bar, one popover button per checkbox group ("Field tag · 2"), and below it a pill per active filter
// with "Clear all". Options show readable names with the code beside them.
// One popover is open at a time (components/Popover.tsx). An option shows its name and its code once; the checkbox is
// named "Name (code)" (SPEC-UI-001 REQ-028).
import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { FILTER_GROUPS, filterPills, optionLabel, type FilterGroup } from "../lib/filterLabels";
import type { FilterState, Match, Offered } from "../lib/filterState";
import { Popover } from "./Popover";

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
          <Popover
            key={group.key}
            id={`${idPrefix}-${group.key}`}
            label={countLabel(group.legend, (state[group.key] as unknown[]).length)}
            active={(state[group.key] as unknown[]).length > 0}
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
          </Popover>
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
