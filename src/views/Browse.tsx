// Browser: filtered paper and platform tables with a shareable URL, and the comparison selection (REQ-003 to REQ-013).
import { useEffect, useMemo, useState } from "react";
import type { IndexJson, PaperRow, PlatformRow } from "../data/types";
import { DataTable, type Col } from "../components/DataTable";
import { FilterPanel } from "../components/FilterPanel";
import { show } from "../lib/evidence";
import { matchingPapers, matchingPlatforms } from "../lib/filterApply";
import {
  activeFilterCount,
  clearFilters,
  offeredValues,
  yearsFromInputs,
  type FilterState,
  type Offered,
  type YearRange,
} from "../lib/filterState";
import { browseHash, decodeFilters } from "../lib/filterUrl";
import { compareHash, parseRoute, platformHash } from "../lib/route";

const paperId = (p: PaperRow) => p.paper_id;
const platformId = (l: PlatformRow) => l.platform_id;
const joined = (xs: readonly string[]) => xs.join(", ");
const listCell = (xs: readonly string[]) => (xs.length ? joined(xs) : show(null));
const yearText = (years: YearRange) => ({ from: years.from?.toString() ?? "", to: years.to?.toString() ?? "" });
const suffixNumber = (platformId: string) => Number(platformId.slice(platformId.lastIndexOf("/") + 1).replace(/^\D+/, ""));
/** Width from which the filters sit in a sidebar beside the results (matches styles.css). */
const SIDEBAR_QUERY = "(min-width: 1000px)";

/** Filter state of the current hash; replaces the hash with its canonical form so URL and controls agree. */
function stateFromLocation(offered: Offered): FilterState | null {
  const route = parseRoute(window.location.hash);
  if (route.kind !== "browse") return null;
  const state = decodeFilters(route.query, offered);
  const canonical = browseHash(state);
  if (canonical !== window.location.hash) history.replaceState(history.state, "", canonical);
  return state;
}

function paperColumns(links: Map<string, PlatformRow[]>): Col<PaperRow>[] {
  return [
    { id: "paper", header: "Paper", fixed: true, sort: { kind: "text", value: (p) => p.paper_id }, cell: (p) => p.paper_id },
    { id: "year", header: "Year", sort: { kind: "number", value: (p) => p.first_public_year }, cell: (p) => p.first_public_year },
    { id: "title", header: "Title", sort: { kind: "text", value: (p) => p.title }, cell: (p) => p.title },
    { id: "venue", header: "Venue", sort: { kind: "text", value: (p) => p.venue }, cell: (p) => show(p.venue) },
    { id: "field", header: "Field tags", sort: { kind: "text", value: (p) => joined(p.field_tags) }, cell: (p) => listCell(p.field_tags) },
    { id: "im", header: "Integration mode", sort: { kind: "text", value: (p) => p.integration_mode }, cell: (p) => p.integration_mode },
    { id: "sw", header: "SW autonomy", sort: { kind: "number", value: (p) => p.sw_autonomy }, cell: (p) => p.sw_autonomy },
    { id: "hw", header: "HW autonomy", sort: { kind: "number", value: (p) => p.hw_autonomy }, cell: (p) => p.hw_autonomy },
    {
      id: "platforms",
      header: "Platforms",
      sort: { kind: "number", value: (p) => p.n_platforms },
      cell: (p) => (
        <span className="platform-links">
          {p.n_platforms}
          {(links.get(p.paper_id) ?? []).map((l) => (
            <a key={l.platform_id} href={platformHash(l.platform_id)}>
              {l.platform_id.slice(l.platform_id.lastIndexOf("/") + 1)}
            </a>
          ))}
        </span>
      ),
    },
  ];
}

function platformColumns(selected: string[], toggle: (id: string) => void): Col<PlatformRow>[] {
  return [
    {
      id: "select",
      header: "Select",
      fixed: true,
      cell: (l) => {
        const checked = selected.includes(l.platform_id);
        return (
          <input
            type="checkbox"
            aria-label={`Select ${l.platform_id} for comparison`}
            checked={checked}
            disabled={!checked && selected.length >= 3}
            onChange={() => toggle(l.platform_id)}
          />
        );
      },
    },
    {
      id: "platform",
      header: "Platform",
      fixed: true,
      sort: { kind: "text", value: (l) => l.platform_id },
      cell: (l) => <a href={platformHash(l.platform_id)}>{l.platform_id}</a>,
    },
    { id: "name", header: "Name", sort: { kind: "text", value: (l) => l.platform_name ?? undefined }, cell: (l) => show(l.platform_name) },
    { id: "paper", header: "Paper", sort: { kind: "text", value: (l) => l.paper_id }, cell: (l) => l.paper_id },
    { id: "year", header: "Year", sort: { kind: "number", value: (l) => l.first_public_year }, cell: (l) => l.first_public_year },
    { id: "field", header: "Field tags", sort: { kind: "text", value: (l) => joined(l.field_tags) }, cell: (l) => listCell(l.field_tags) },
    { id: "modules", header: "Modules", sort: { kind: "number", value: (l) => l.n_modules }, cell: (l) => l.n_modules },
    { id: "steps", header: "Steps", sort: { kind: "number", value: (l) => l.n_steps }, cell: (l) => l.n_steps },
    { id: "mt", header: "Module types", sort: { kind: "text", value: (l) => joined(l.module_types) }, cell: (l) => listCell(l.module_types) },
    {
      id: "tm",
      header: "Transfer modes",
      sort: { kind: "text", value: (l) => joined(l.material_transfer_modes) },
      cell: (l) => listCell(l.material_transfer_modes),
    },
  ];
}

export function Browse({ index, onNavigate }: { index: IndexJson; onNavigate: (hash: string) => void }) {
  const offered = useMemo(() => offeredValues(index), [index]);
  const [state, setState] = useState<FilterState>(() => stateFromLocation(offered) ?? decodeFilters("", offered));
  const [years, setYears] = useState(() => yearText(state.years));
  const [selected, setSelected] = useState<string[]>([]);
  // Open beside the results at wide widths; collapsed on narrow screens so the results come first.
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia(SIDEBAR_QUERY).matches);

  // replaceState fires no hashchange, so the router's hash can lag; read the real hash on every navigation (REQ-003).
  useEffect(() => {
    const onHashChange = () => {
      const next = stateFromLocation(offered);
      if (!next) return;
      setState(next);
      setYears(yearText(next.years));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [offered]);

  const apply = (next: FilterState) => {
    setState(next);
    history.replaceState(history.state, "", browseHash(next));
  };
  const onYearText = (from: string, to: string) => {
    setYears({ from, to });
    apply({ ...state, years: yearsFromInputs(from, to).years });
  };
  const onClear = () => {
    setYears({ from: "", to: "" });
    apply(clearFilters(state));
  };

  const links = useMemo(() => {
    const m = new Map<string, PlatformRow[]>();
    for (const l of index.platforms) m.set(l.paper_id, [...(m.get(l.paper_id) ?? []), l]);
    for (const list of m.values()) list.sort((a, b) => suffixNumber(a.platform_id) - suffixNumber(b.platform_id));
    return m;
  }, [index]);
  const papers = useMemo(() => matchingPapers(state, index.papers, index.platforms), [state, index]);
  const platforms = useMemo(() => matchingPlatforms(state, index.papers, index.platforms), [state, index]);
  const paperCols = useMemo(() => paperColumns(links), [links]);
  const platformCols = useMemo(
    () => platformColumns(selected, (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))),
    [selected],
  );
  const canCompare = selected.length === 2 || selected.length === 3;

  const active = activeFilterCount(state);

  return (
    <div className="browse">
      <h1>Browse</h1>
      <div className="browse-layout">
        <aside className="browse-filters">
          <button
            type="button"
            className="filter-toggle"
            aria-expanded={filtersOpen}
            aria-controls="browse-filter-panel"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filters ({active} active)
          </button>
          <div id="browse-filter-panel" hidden={!filtersOpen}>
            <FilterPanel
              state={state}
              offered={offered}
              yearText={years}
              inverted={yearsFromInputs(years.from, years.to).inverted}
              onState={apply}
              onYearText={onYearText}
              onClear={onClear}
            />
          </div>
        </aside>
        <div className="browse-results">
          <div className="table-switch" role="group" aria-label="Table shown">
            {(["papers", "platforms"] as const).map((view) => (
              <button key={view} type="button" aria-pressed={state.view === view} onClick={() => apply({ ...state, view })}>
                {view === "papers" ? "Papers" : "Platforms"}
              </button>
            ))}
          </div>
          {state.view === "papers" ? (
            <section aria-label="Papers">
              <p className="result-count" aria-live="polite">
                {papers.length} of {index.papers.length} papers
              </p>
              <DataTable name="papers" chooserLabel="Paper table columns" columns={paperCols} rows={papers} rowId={paperId} />
            </section>
          ) : (
            <section aria-label="Platforms">
              <p className="result-count" aria-live="polite">
                {platforms.length} of {index.platforms.length} platforms
              </p>
              <button
                type="button"
                className="compare-button"
                disabled={!canCompare}
                onClick={() => onNavigate(compareHash(selected))}
              >
                Compare ({selected.length})
              </button>
              <DataTable
                name="platforms"
                chooserLabel="Platform table columns"
                columns={platformCols}
                rows={platforms}
                rowId={platformId}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
