// Home: release counts and the filterable platform list (REQ-003, REQ-015, REQ-016).
import { useMemo, useState } from "react";
import { COUNT_NAMES, type CountName, type IndexJson } from "../data/types";
import { show } from "../lib/evidence";
import { filterPlatforms } from "../lib/platformFilter";
import { platformHash } from "../lib/route";

const LABELS: Record<CountName, string> = {
  papers: "Papers",
  platforms: "Platforms",
  modules: "Modules",
  steps: "Steps",
  connections: "Connections",
  material_connections: "Material connections",
  candidates: "Screened candidates",
};

export function Home({ index }: { index: IndexJson }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => filterPlatforms(index.platforms, query), [index, query]);

  return (
    <>
      <table className="counts">
        <caption>Counts in release {index.release.version}</caption>
        <tbody>
          {COUNT_NAMES.map((name) => (
            <tr key={name}>
              <th scope="row">{LABELS[name]}</th>
              <td>{index.counts[name].toLocaleString("en")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading">Platforms</h2>
        <label className="filter">
          Filter by platform id, name or paper id
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </label>
        <p className="result-count" aria-live="polite">
          {rows.length} of {index.platforms.length} platforms
        </p>
        <div className="table-scroll">
          <table className="data" data-table="platforms">
            <thead>
              <tr>
                <th scope="col">Platform</th>
                <th scope="col">Name</th>
                <th scope="col">Paper</th>
                <th scope="col">Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.platform_id}>
                  <td>
                    <a
                      href={platformHash(r.platform_id)}
                      onKeyDown={(e) => {
                        if (e.key === " ") {
                          e.preventDefault();
                          window.location.hash = platformHash(r.platform_id);
                        }
                      }}
                    >
                      {r.platform_id}
                    </a>
                  </td>
                  <td>{show(r.platform_name)}</td>
                  <td>{r.paper_id}</td>
                  <td>{r.first_public_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
