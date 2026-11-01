// Filter controls of the browser (REQ-004): year range, checkbox groups, match controls, search and "Clear filters".
import { HW_LABELS, SW_LABELS, type FilterState, type Match, type Offered } from "../lib/filterState";

type ListKey = "field" | "im" | "sw" | "hw" | "mt" | "tm";

function CheckboxGroup<V extends string | number>({
  legend,
  options,
  selected,
  label = String,
  onChange,
}: {
  legend: string;
  options: readonly V[];
  selected: readonly V[];
  label?: (value: V) => string;
  onChange: (next: V[]) => void;
}) {
  return (
    <fieldset className="filter-group">
      <legend>{legend}</legend>
      {options.map((value) => {
        const checked = selected.includes(value);
        return (
          <label key={value}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((v) => v !== value) : [...selected, value])}
            />
            {label(value)}
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

export function FilterPanel({
  state,
  offered,
  yearText,
  inverted,
  onState,
  onYearText,
  onClear,
}: {
  state: FilterState;
  offered: Offered;
  yearText: { from: string; to: string };
  inverted: boolean;
  onState: (next: FilterState) => void;
  onYearText: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const setList = (key: ListKey) => (next: (string | number)[]) => onState({ ...state, [key]: next });

  return (
    <section className="filter-panel" aria-label="Filters">
      <fieldset className="filter-group years">
        <legend>Year</legend>
        <label>
          From
          <input type="number" inputMode="numeric" value={yearText.from} onChange={(e) => onYearText(e.target.value, yearText.to)} />
        </label>
        <label>
          To
          <input type="number" inputMode="numeric" value={yearText.to} onChange={(e) => onYearText(yearText.from, e.target.value)} />
        </label>
        {inverted && (
          <p className="year-error" role="status">
            From year is after To year
          </p>
        )}
      </fieldset>
      <label className="filter search">
        Search ids, titles and platform names
        <input type="search" value={state.q} autoComplete="off" onChange={(e) => onState({ ...state, q: e.target.value })} />
      </label>
      <CheckboxGroup legend="Field tag" options={offered.field} selected={state.field} onChange={setList("field")} />
      <CheckboxGroup legend="Integration mode" options={offered.im} selected={state.im} onChange={setList("im")} />
      <CheckboxGroup
        legend="Software autonomy"
        options={offered.sw}
        selected={state.sw}
        label={(v) => `${v} — ${SW_LABELS[v] ?? ""}`}
        onChange={setList("sw")}
      />
      <CheckboxGroup
        legend="Hardware autonomy"
        options={offered.hw}
        selected={state.hw}
        label={(v) => `${v} — ${HW_LABELS[v] ?? ""}`}
        onChange={setList("hw")}
      />
      <CheckboxGroup legend="Module types" options={offered.mt} selected={state.mt} onChange={setList("mt")} />
      <MatchControl legend="Module types match" name="mtMatch" value={state.mtMatch} onChange={(mtMatch) => onState({ ...state, mtMatch })} />
      <CheckboxGroup legend="Transfer modes" options={offered.tm} selected={state.tm} onChange={setList("tm")} />
      <MatchControl legend="Transfer modes match" name="tmMatch" value={state.tmMatch} onChange={(tmMatch) => onState({ ...state, tmMatch })} />
      <button type="button" className="clear-filters" onClick={onClear}>
        Clear filters
      </button>
    </section>
  );
}
