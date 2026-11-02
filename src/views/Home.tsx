// Home: what the dataset records, the views, the release counts, DOI, download link and citation, then the
// filterable platform list (REQ-003, REQ-015, REQ-016; SPEC-SITE-001 REQ-003, REQ-004).
import { useMemo, useRef, useState } from "react";
import { useReleaseDocs } from "../components/useReleaseDocs";
import { COUNT_NAMES, type CountName, type IndexJson } from "../data/types";
import { formatCitation, licenseLabel } from "../lib/citation";
import { show } from "../lib/evidence";
import { filterPlatforms } from "../lib/platformFilter";
import { platformHash } from "../lib/route";
import { PLATFORM_LIST_BUTTON, VIEWS, homeIntro } from "../lib/siteText";

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
  const filterRef = useRef<HTMLInputElement>(null);
  const { docs, error } = useReleaseDocs();
  const doiUrl = `https://doi.org/${index.release.doi}`;

  const goToList = () => {
    filterRef.current?.scrollIntoView({ block: "center" });
    filterRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="home">
      <h1>SDL Workflows Explorer</h1>
      <p className="home-intro">{homeIntro(index.release.version, index.counts.platforms, index.counts.papers)}</p>

      <section aria-labelledby="views-heading">
        <h2 id="views-heading">Views</h2>
        <div className="table-scroll">
          <table className="data views">
            <thead>
              <tr>
                <th scope="col">View</th>
                <th scope="col">What it shows</th>
              </tr>
            </thead>
            <tbody>
              {VIEWS.map((v) => (
                <tr key={v.name}>
                  <th scope="row">{v.href ? <a href={v.href}>{v.name}</a> : v.name}</th>
                  <td>
                    {v.description}
                    {!v.href && (
                      <>
                        {" "}
                        <button type="button" className="link-button" onClick={goToList}>
                          {PLATFORM_LIST_BUTTON}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">The data</h2>
        <table className="counts">
          <caption>Counts in release {index.release.version}</caption>
          <tbody>
            {COUNT_NAMES.map((name) => (
              <tr key={name}>
                <th scope="row">{LABELS[name]}</th>
                <td className="num">{index.counts[name].toLocaleString("en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          DOI: <a href={doiUrl}>{doiUrl}</a>
          <br />
          <a href={doiUrl}>Download the data</a> from the Zenodo record (release files, CSV tables and SQLite).
        </p>
        <h3>How to cite</h3>
        {error && <p role="alert">Could not load the citation: {error}</p>}
        {docs && (
          <>
            <p className="citation">{formatCitation(docs.citation)}</p>
            <p>Licence: {licenseLabel(docs.citation.license)}.</p>
            <details className="citation-cff">
              <summary>CITATION.cff as released</summary>
              <pre>{docs.citation_cff}</pre>
            </details>
          </>
        )}
      </section>

      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading">Platforms</h2>
        <label className="filter">
          Filter by platform id, name or paper id
          <input
            ref={filterRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
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
                  <td className="num">{r.first_public_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
