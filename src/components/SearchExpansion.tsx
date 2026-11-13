// What the search did with the query (SPEC-TECH-001 REQ-007, REQ-009): one line per technique term ("FTIR: searched as
// IR spectroscopy (…)") with a button that searches the typed spelling only, the note on how the tags were made, and,
// when few platforms match, the closest stated module names as searches.
import type { Expansion } from "../lib/techniqueMatch";
import { expansionText, quoteTerm } from "../lib/techniqueMatch";
import { TECHNIQUE_NOTE } from "./FilterPanel";

export function SearchExpansion({
  query,
  expansions,
  suggestions,
  onQuery,
}: {
  query: string;
  expansions: readonly Expansion[];
  suggestions: readonly string[];
  onQuery: (next: string) => void;
}) {
  if (expansions.length === 0 && suggestions.length === 0) return null;
  return (
    <div className="search-expansion">
      {expansions.map((e) => (
        <p key={e.typed} className="search-expansion-line">
          <span>{expansionText(e)}</span>{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onQuery(quoteTerm(query, e.typed))}>
            Search “{e.typed}” only
          </button>
        </p>
      ))}
      {expansions.length > 0 && <p className="table-note">{TECHNIQUE_NOTE}</p>}
      {suggestions.length > 0 && (
        <p className="search-suggest">
          Module names close to the query:{" "}
          {suggestions.map((s, k) => (
            <span key={s}>
              {k > 0 && " · "}
              <button type="button" className="link-button" onClick={() => onQuery(`"${s}"`)}>
                {s}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
