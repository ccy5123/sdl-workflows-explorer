// Browser: filtered paper and platform tables with a shareable URL, and the comparison selection (REQ-003 to REQ-013).
// The filter bar sits above the results (SPEC-UI-001 REQ-025); coded columns show readable names unless "Show codes"
// is pressed, and long titles and names are cut to one line with the full text in a tooltip (REQ-027).
import { Fragment, useEffect, useMemo, useState } from "react";
import type { IndexJson, PaperRow, PlatformRow } from "../data/types";
import { DataTable, Truncated, type Col } from "../components/DataTable";
import { FilterPanel } from "../components/FilterPanel";
import { Label } from "../components/Label";
import { PHONE_QUERY, useMedia } from "../components/useMedia";
import { useSearchIndex } from "../components/useSearchIndex";
import { show } from "../lib/evidence";
import { matchingPapers, matchingPlatforms } from "../lib/filterApply";
import {
  PAPER_TABLE_NOTE,
  autonomyText,
  clearFilters,
  offeredValues,
  yearsFromInputs,
  type FilterState,
  type Offered,
  type YearRange,
} from "../lib/filterState";
import { browseHash, decodeFilters } from "../lib/filterUrl";
import { compareHash, parseRoute, platformHash } from "../lib/route";
import { trendsHash } from "../lib/trends";

const paperId = (p: PaperRow) => p.paper_id;
const platformId = (l: PlatformRow) => l.platform_id;
const joined = (xs: readonly string[]) => xs.join(", ");

/** An autonomy level with its scale; hovering it, or the note under the table, says what the level means. */
function autonomyCell(kind: "sw" | "hw", level: number) {
  const { short, long } = autonomyText(kind, level);
  return (
    <span className="autonomy" title={long}>
      {short}
    </span>
  );
}

/** Vocabulary codes of a cell: readable names (code in each title), or the codes themselves when asked for. */
function codeCell(kind: string, xs: readonly string[], codes: boolean) {
  if (!xs.length) return show(null);
  if (codes) return joined(xs);
  return xs.map((x, i) => (
    <Fragment key={x}>
      {i > 0 && ", "}
      <Label kind={kind} code={x} />
    </Fragment>
  ));
}
const yearText = (years: YearRange) => ({ from: years.from?.toString() ?? "", to: years.to?.toString() ?? "" });
const suffixNumber = (platformId: string) => Number(platformId.slice(platformId.lastIndexOf("/") + 1).replace(/^\D+/, ""));

/** Filter state of the current hash; replaces the hash with its canonical form so URL and controls agree. */
function stateFromLocation(offered: Offered): FilterState | null {
  const route = parseRoute(window.location.hash);
  if (route.kind !== "browse") return null;
  const state = decodeFilters(route.query, offered);
  const canonical = browseHash(state);
  if (canonical !== window.location.hash) history.replaceState(history.state, "", canonical);
  return state;
}

function paperColumns(links: Map<string, PlatformRow[]>, codes: boolean): Col<PaperRow>[] {
  return [
    { id: "paper", header: "Paper", fixed: true, card: "head", sort: { kind: "text", value: (p) => p.paper_id }, cell: (p) => p.paper_id },
    { id: "year", header: "Year", num: true, card: "aside", sort: { kind: "number", value: (p) => p.first_public_year }, cell: (p) => p.first_public_year },
    { id: "title", header: "Title", card: "title", sort: { kind: "text", value: (p) => p.title }, cell: (p) => <Truncated text={p.title} /> },
    {
      id: "venue",
      header: "Venue",
      card: "sub",
      sort: { kind: "text", value: (p) => p.venue },
      cell: (p) => (p.venue ? <Truncated text={p.venue} /> : show(null)),
    },
    {
      id: "field",
      header: "Field tags",
      sort: { kind: "text", value: (p) => joined(p.field_tags) },
      cell: (p) => codeCell("field_tag", p.field_tags, codes),
    },
    {
      id: "im",
      header: "Integration mode",
      sort: { kind: "text", value: (p) => p.integration_mode },
      cell: (p) => codeCell("transfer_mode", [p.integration_mode], codes),
    },
    { id: "sw", header: "Software autonomy", num: true, sort: { kind: "number", value: (p) => p.sw_autonomy }, cell: (p) => autonomyCell("sw", p.sw_autonomy) },
    { id: "hw", header: "Hardware autonomy", num: true, sort: { kind: "number", value: (p) => p.hw_autonomy }, cell: (p) => autonomyCell("hw", p.hw_autonomy) },
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

function platformColumns(selected: string[], toggle: (id: string) => void, codes: boolean): Col<PlatformRow>[] {
  return [
    {
      id: "select",
      header: "Select",
      fixed: true,
      card: "head",
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
      card: "head",
      sort: { kind: "text", value: (l) => l.platform_id },
      cell: (l) => <a href={platformHash(l.platform_id)}>{l.platform_id}</a>,
    },
    {
      id: "name",
      header: "Name",
      card: "title",
      sort: { kind: "text", value: (l) => l.platform_name ?? undefined },
      cell: (l) => (l.platform_name ? <Truncated text={l.platform_name} /> : show(null)),
    },
    { id: "paper", header: "Paper", card: "sub", sort: { kind: "text", value: (l) => l.paper_id }, cell: (l) => l.paper_id },
    { id: "year", header: "Year", num: true, card: "aside", sort: { kind: "number", value: (l) => l.first_public_year }, cell: (l) => l.first_public_year },
    {
      id: "field",
      header: "Field tags",
      sort: { kind: "text", value: (l) => joined(l.field_tags) },
      cell: (l) => codeCell("field_tag", l.field_tags, codes),
    },
    { id: "modules", header: "Modules", num: true, sort: { kind: "number", value: (l) => l.n_modules }, cell: (l) => l.n_modules },
    { id: "steps", header: "Steps", num: true, sort: { kind: "number", value: (l) => l.n_steps }, cell: (l) => l.n_steps },
    {
      id: "mt",
      header: "Module types",
      sort: { kind: "text", value: (l) => joined(l.module_types) },
      cell: (l) => codeCell("module_type", l.module_types, codes),
    },
    {
      id: "tm",
      header: "Transfer modes",
      sort: { kind: "text", value: (l) => joined(l.material_transfer_modes) },
      cell: (l) => codeCell("transfer_mode", l.material_transfer_modes, codes),
    },
  ];
}

export function Browse({ index, onNavigate }: { index: IndexJson; onNavigate: (hash: string) => void }) {
  const offered = useMemo(() => offeredValues(index), [index]);
  const [state, setState] = useState<FilterState>(() => stateFromLocation(offered) ?? decodeFilters("", offered));
  const [years, setYears] = useState(() => yearText(state.years));
  const [selected, setSelected] = useState<string[]>([]);
  const [codes, setCodes] = useState(false);
  const phone = useMedia(PHONE_QUERY);

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
  // Module names from search.json, so the search box also finds instruments.
  // Only a search reads them; without one the plain index keeps the tables from redrawing when search.json arrives.
  const searchIndex = useSearchIndex(index);
  const rowsFrom = state.q.trim() ? searchIndex : index;
  const papers = useMemo(() => matchingPapers(state, rowsFrom.papers, rowsFrom.platforms), [state, rowsFrom]);
  const platforms = useMemo(() => matchingPlatforms(state, rowsFrom.papers, rowsFrom.platforms), [state, rowsFrom]);
  const paperCols = useMemo(() => paperColumns(links, codes), [links, codes]);
  const platformCols = useMemo(
    () => platformColumns(selected, (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), codes),
    [selected, codes],
  );
  const canCompare = selected.length === 2 || selected.length === 3;
  const codesToggle = (
    <button type="button" className="btn btn-secondary btn-sm codes-toggle" aria-pressed={codes} onClick={() => setCodes((c) => !c)}>
      Show codes
    </button>
  );

  return (
    <div className="browse">
      <h1>Browse</h1>
      <FilterPanel
        idPrefix="browse-filter"
        state={state}
        offered={offered}
        yearText={years}
        inverted={yearsFromInputs(years.from, years.to).inverted}
        onState={apply}
        onYearText={onYearText}
        onClear={onClear}
        resultText={state.view === "papers" ? `Show ${papers.length} papers` : `Show ${platforms.length} platforms`}
      />
      <div className="browse-layout">
        <div className="browse-results">
          <div className="table-switch" role="group" aria-label="Table shown">
            {(["platforms", "papers"] as const).map((view) => (
              <button key={view} type="button" aria-pressed={state.view === view} onClick={() => apply({ ...state, view })}>
                {view === "papers" ? "Papers" : "Platforms"}
              </button>
            ))}
          </div>
          <p>
            <a href={trendsHash(state, "im")}>Show these in Trends</a>
          </p>
          {state.view === "papers" ? (
            <section aria-label="Papers">
              <p className="result-count" aria-live="polite">
                {papers.length} of {index.papers.length} papers
              </p>
              <DataTable
                name="papers"
                chooserLabel="Paper table columns"
                columns={paperCols}
                rows={papers}
                rowId={paperId}
                toolbar={codesToggle}
              />
              {phone ? (
                <details className="note-fold">
                  <summary>What the columns mean</summary>
                  <p className="table-note">{PAPER_TABLE_NOTE}</p>
                </details>
              ) : (
                <p className="table-note">{PAPER_TABLE_NOTE}</p>
              )}
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
                toolbar={codesToggle}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
