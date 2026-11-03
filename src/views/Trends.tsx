// Trends dashboard: counts by first public year, split by one category, with the browser's filters and URL
// (SPEC-TRENDS-001 REQ-001 to REQ-016). Loaded lazily with Observable Plot (REQ-015). The filter bar sits above the
// chart and "Split by" is a segmented control over the same radio buttons (SPEC-UI-001 REQ-025, REQ-026).
import { useEffect, useMemo, useState } from "react";
import { CountTable } from "../components/CountTable";
import { FilterPanel } from "../components/FilterPanel";
import { ChartLegend, TrendsChart } from "../components/TrendsChart";
import type { IndexJson } from "../data/types";
import {
  clearFilters,
  offeredValues,
  yearsFromInputs,
  type FilterState,
  type Offered,
  type YearRange,
} from "../lib/filterState";
import { browseHash } from "../lib/filterUrl";
import { parseRoute } from "../lib/route";
import {
  PARTIAL_YEAR,
  PLATFORMS_LINE,
  RELEASE_LINK_TEXT,
  SPLITS,
  SPLIT_LABELS,
  caption,
  countTable,
  decodeTrends,
  emptyMessage,
  isExclusive,
  partialNote,
  sampleNote,
  trendsHash,
  type Split,
} from "../lib/trends";

const yearText = (years: YearRange) => ({ from: years.from?.toString() ?? "", to: years.to?.toString() ?? "" });

interface TrendsState {
  state: FilterState;
  split: Split;
}

/** State of the current hash; replaces the hash with its canonical form so URL and controls agree (REQ-003). */
function stateFromLocation(offered: Offered): TrendsState | null {
  const route = parseRoute(window.location.hash);
  if (route.kind !== "trends") return null;
  const decoded = decodeTrends(route.query, offered);
  const canonical = trendsHash(decoded.state, decoded.split);
  if (canonical !== window.location.hash) history.replaceState(history.state, "", canonical);
  return decoded;
}

export function Trends({ index }: { index: IndexJson }) {
  const offered = useMemo(() => offeredValues(index), [index]);
  const [{ state, split }, setTrends] = useState<TrendsState>(() => stateFromLocation(offered) ?? decodeTrends("", offered));
  const [years, setYears] = useState(() => yearText(state.years));

  // replaceState fires no hashchange, so read the real hash on every navigation while the dashboard is shown.
  useEffect(() => {
    const onHashChange = () => {
      const next = stateFromLocation(offered);
      if (!next) return;
      setTrends(next);
      setYears(yearText(next.state.years));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [offered]);

  const apply = (next: FilterState, nextSplit: Split = split) => {
    setTrends({ state: next, split: nextSplit });
    history.replaceState(history.state, "", trendsHash(next, nextSplit));
  };
  const onYearText = (from: string, to: string) => {
    setYears({ from, to });
    apply({ ...state, years: yearsFromInputs(from, to).years });
  };
  const onClear = () => {
    setYears({ from: "", to: "" });
    apply(clearFilters(state));
  };

  const table = useMemo(() => countTable(state, split, index), [state, split, index]);
  const unit = state.view;
  const all = unit === "papers" ? index.papers.length : index.platforms.length;
  const empty = table.total === 0;
  const hasPartial = table.bins.some((b) => b.years.from === PARTIAL_YEAR && b.years.to === PARTIAL_YEAR);
  const [noteBefore, noteAfter] = sampleNote(index.papers.length, index.platforms.length).split(RELEASE_LINK_TEXT);

  return (
    <div className="trends">
      <h1>Trends</h1>
      <FilterPanel
        idPrefix="trends-filter"
        state={state}
        offered={offered}
        yearText={years}
        inverted={yearsFromInputs(years.from, years.to).inverted}
        onState={apply}
        onYearText={onYearText}
        onClear={onClear}
      />
      <div className="browse-layout">
        <div className="browse-results">
          <fieldset className="split-control segmented">
            <legend>Split by</legend>
            {SPLITS.map((s) => (
              <label key={s} className={split === s ? "checked" : undefined}>
                <input type="radio" name="split" value={s} checked={split === s} onChange={() => apply(state, s)} />
                {SPLIT_LABELS[s]}
              </label>
            ))}
          </fieldset>
          <div className="table-switch unit-switch" role="group" aria-label="Unit counted">
            {(["papers", "platforms"] as const).map((view) => (
              <button key={view} type="button" aria-pressed={unit === view} onClick={() => apply({ ...state, view })}>
                {view === "papers" ? "Papers" : "Platforms"}
              </button>
            ))}
          </div>
          <p className="result-count" aria-live="polite">
            {table.total} of {all} {unit}
          </p>
          {unit === "platforms" && <p className="platforms-line">{PLATFORMS_LINE}</p>}
          <p>
            <a href={browseHash(state)}>Show these in Browse</a>
          </p>
          <p className="trends-caption">{caption(split, unit)}</p>
          {empty ? (
            <p className="trends-empty">{emptyMessage(unit)}</p>
          ) : isExclusive(split) ? (
            <>
              <TrendsChart state={state} split={split} table={table} unit={unit} offeredIm={offered.im} />
              <ChartLegend split={split} values={table.values} offeredIm={offered.im} />
              <details className="trends-table-details">
                <summary>Counts as a table</summary>
                <CountTable state={state} split={split} table={table} unit={unit} shaded={false} />
              </details>
            </>
          ) : (
            <CountTable state={state} split={split} table={table} unit={unit} shaded />
          )}
          {!empty && hasPartial && <p className="trends-note">{partialNote()}</p>}
        </div>
      </div>
      <p className="trends-note">
        {noteBefore}
        <a href={`https://doi.org/${index.release.doi}`}>{RELEASE_LINK_TEXT}</a>
        {noteAfter}
      </p>
    </div>
  );
}
