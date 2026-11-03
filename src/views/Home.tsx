// Home (SPEC-UI-001 REQ-010 to REQ-012, built to the approved mock, variant B): hero with search and the featured
// platform, stat tiles, the six view cards, the platform list, and the citation and sample cards. Every number comes
// from the built data (REQ-011). Replaces the SPEC-SITE-001 REQ-003 layout; the citation rules of REQ-004 hold.
import { ArrowRight, Download, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CopyButton } from "../components/CopyButton";
import { FeaturedPlatform } from "../components/FeaturedPlatform";
import { IssueLink } from "../components/IssueLink";
import { Label } from "../components/Label";
import { Skeleton } from "../components/Loading";
import { ViewCards } from "../components/ViewCards";
import { useJson } from "../components/useJson";
import { useReleaseDocs } from "../components/useReleaseDocs";
import type { BenchmarkJson, IndexJson, PlatformFile, TaxonomyJson } from "../data/types";
import { formatCitation, licenseLabel } from "../lib/citation";
import { PAPER_LINK_TEXT, paperUrl } from "../lib/contribute";
import { show } from "../lib/evidence";
import { FEATURED_PLATFORM, SEARCH_EXAMPLES, latestYear, licenceChips, newestFirst, statTiles } from "../lib/home";
import { filterPlatforms } from "../lib/platformFilter";
import { platformHash } from "../lib/route";
import { PREPRINT, STATS_CAPTION, heroLead, heroTitle, sampleText, searchPlaceholder } from "../lib/siteText";

/** Rows of the platform list before "Show all". */
const LIST_SIZE = 20;
/** Suggestions under the hero search. */
const SUGGESTIONS = 6;

const releaseDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** True when a key press goes to a text field, so "/" must type a slash there. */
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function Home({ index }: { index: IndexJson }) {
  const { docs, error: docsError } = useReleaseDocs();
  const featuredFile = useJson<PlatformFile>(`data/platforms/${FEATURED_PLATFORM.split("/")[0]}.json`);
  const taxonomy = useJson<TaxonomyJson>("data/taxonomy.json");
  const benchmark = useJson<BenchmarkJson>("data/benchmark.json");
  const featured = featuredFile.data?.platforms.find((p) => p.platform_id === FEATURED_PLATFORM) ?? null;
  const featuredPaper = index.papers.find((p) => p.paper_id === featured?.paper_id);

  const doiUrl = `https://doi.org/${index.release.doi}`;
  const total = index.counts.platforms;

  // Hero search (REQ-012).
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => (query.trim() ? filterPlatforms(index.platforms, query) : []), [index, query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || typingIn(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (matches[0]) window.location.hash = platformHash(matches[0].platform_id);
  };

  // Platform list.
  const [listQuery, setListQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLInputElement>(null);
  const sorted = useMemo(() => newestFirst(index.platforms), [index]);
  const listRows = useMemo(() => filterPlatforms(sorted, listQuery), [sorted, listQuery]);
  const visible = showAll || listQuery.trim() ? listRows : listRows.slice(0, LIST_SIZE);
  const latest = latestYear(index.platforms);
  const showMatchesInList = () => {
    setListQuery(query);
    listRef.current?.scrollIntoView({ block: "center" });
    listRef.current?.focus({ preventScroll: true });
  };

  const tiles = statTiles(index, taxonomy.data);

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <div className="hero-chips">
            <span className="chip chip-accent">Open dataset · Release {index.release.version}</span>
            {docs && <span className="chip chip-outline">{licenseLabel(docs.citation.license)}</span>}
          </div>
          <h1 id="hero-title">{heroTitle(total)}</h1>
          <p className="hero-lead">{heroLead(index.counts.papers)}</p>

          <form role="search" className="hero-search" onSubmit={submit}>
            <label className="search-field search-field-lg">
              <span className="visually-hidden">Search platforms by name, paper or id</span>
              <Search className="search-icon" size={19} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder(total)}
                autoComplete="off"
                aria-describedby="hero-search-count"
              />
              <kbd aria-hidden="true">/</kbd>
            </label>
            <div className="search-results">
              <p id="hero-search-count" className="search-count" aria-live="polite">
                {query.trim() ? `${matches.length} of ${total} platforms match` : ""}
              </p>
              {matches.length > 0 && (
                <ul className="search-suggestions">
                  {matches.slice(0, SUGGESTIONS).map((p) => (
                    <li key={p.platform_id}>
                      <a href={platformHash(p.platform_id)}>
                        <span className="suggestion-name">{show(p.platform_name)}</span>
                        <span className="mono suggestion-id">{p.platform_id}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {matches.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={showMatchesInList}>
                  {matches.length === 1 ? "Show the match in the list" : `Show all ${matches.length} matches in the list`}
                </button>
              )}
            </div>
            <div className="search-examples">
              <span>Try</span>
              {SEARCH_EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chip chip-button"
                  onClick={() => {
                    setQuery(q);
                    searchRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </form>

          <div className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#/browse?view=platforms">
              Explore platforms
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="btn btn-secondary btn-lg" href={doiUrl}>
              <Download size={17} aria-hidden="true" />
              Download data
            </a>
          </div>
        </div>
        <FeaturedPlatform platform={featured} paper={featuredPaper} error={featuredFile.error} />
      </section>

      <section className="home-stats" aria-labelledby="stats-title">
        <h2 id="stats-title" className="visually-hidden">
          Counts in release {index.release.version}
        </h2>
        <ul className="stat-tiles">
          {tiles.map((t) => (
            <li key={t.label} className="stat-tile">
              <span className="stat-value">
                {t.label === "Taxonomy classes" && !taxonomy.data ? <Skeleton width="3ch" height={30} /> : t.value.toLocaleString("en")}
              </span>
              <span className="stat-label">{t.label}</span>
              <span className="stat-note">{t.note ?? <Skeleton width="70%" height={12} />}</span>
            </li>
          ))}
        </ul>
        <p className="home-caption">
          Release {index.release.version}, {releaseDate(index.release.released_on)} ·{" "}
          <a href={doiUrl}>doi:{index.release.doi}</a> · {STATS_CAPTION.split("data card")[0]}
          <a href="#/about">data card</a>
          {STATS_CAPTION.split("data card")[1]}
        </p>
        {taxonomy.error && <p role="alert">Could not load the taxonomy: {taxonomy.error}</p>}
      </section>

      <section className="home-section" aria-labelledby="views-title">
        <div className="section-head">
          <h2 id="views-title">Explore the data</h2>
          <p>Six ways into the same release.</p>
        </div>
        <ViewCards index={index} platform={featured} taxonomy={taxonomy.data} benchmark={benchmark.data} />
      </section>

      <section className="home-section" aria-labelledby="platforms-title">
        <div className="section-head section-head-row">
          <div>
            <h2 id="platforms-title">Platforms</h2>
            <p>
              Newest first. {latest.n} platforms were first public in {latest.year}.
            </p>
          </div>
          <div className="list-controls">
            <label className="search-field">
              <span className="visually-hidden">Filter platforms by name, paper or id</span>
              <Search className="search-icon" size={16} aria-hidden="true" />
              <input
                ref={listRef}
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder={`Filter ${total} platforms`}
                autoComplete="off"
              />
            </label>
            <a className="btn btn-secondary" href="#/browse?view=platforms">
              View all in Browse
            </a>
          </div>
        </div>
        <p className="result-count" aria-live="polite">
          {listRows.length} of {total} platforms
        </p>
        <div className="card platform-list-card">
          <ul className="platform-list" data-list="platforms">
            {visible.map((r) => (
              <li key={r.platform_id}>
                <a
                  className="platform-row"
                  href={platformHash(r.platform_id)}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault();
                      window.location.hash = platformHash(r.platform_id);
                    }
                  }}
                >
                  <span className="platform-row-main">
                    <span className="platform-row-name">{show(r.platform_name)}</span>
                    <span className="mono platform-row-id">{r.platform_id}</span>
                  </span>
                  <span className="platform-row-chips">
                    {r.field_tags.map((t) => (
                      <span key={t} className="chip">
                        <Label kind="field_tag" code={t} />
                      </span>
                    ))}
                  </span>
                  <span className="platform-row-counts">
                    <span>
                      <strong>{r.n_modules}</strong> modules
                    </span>
                    <span>
                      <strong>{r.n_steps}</strong> steps
                    </span>
                    <strong className="platform-row-year">{r.first_public_year}</strong>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p className="platform-list-empty">No platform matches “{listQuery}”.</p>}
        </div>
        {!showAll && !listQuery.trim() && listRows.length > LIST_SIZE && (
          <button type="button" className="btn btn-secondary list-more" onClick={() => setShowAll(true)}>
            Show all {listRows.length} platforms
          </button>
        )}
      </section>

      <section className="home-cards" aria-label="Citation and sample">
        <div className="card home-card" aria-labelledby="cite-title" role="group">
          <div className="home-card-head">
            <h2 id="cite-title">How to cite</h2>
            {docs && <CopyButton text={formatCitation(docs.citation)} label="Copy citation" />}
          </div>
          {docsError && <p role="alert">Could not load the citation: {docsError}</p>}
          {docs ? (
            <>
              <p className="citation">{formatCitation(docs.citation)}</p>
              <div className="home-card-chips">
                {licenceChips(index.release.license).map((c) => (
                  <span key={c} className="chip chip-outline">
                    {c}
                  </span>
                ))}
              </div>
              <details className="citation-cff">
                <summary>CITATION.cff as released</summary>
                <pre>{docs.citation_cff}</pre>
              </details>
              <div className="home-card-head">
                <h3 id="cite-paper-title">The paper</h3>
                <CopyButton text={PREPRINT.citation} label="Copy paper citation" />
              </div>
              <p className="citation">{PREPRINT.citation}</p>
            </>
          ) : (
            !docsError && <Skeleton height={72} />
          )}
        </div>
        <div className="card home-card" aria-labelledby="sample-title" role="group">
          <h2 id="sample-title">About the sample</h2>
          {sampleText(index.counts.candidates, index.counts.papers).map((t) => (
            <p key={t} className="home-card-text">
              {t}
            </p>
          ))}
          <div className="home-card-actions">
            <a className="btn btn-secondary" href="#/about">
              <FileText size={15} aria-hidden="true" />
              Read the data card
            </a>
            <IssueLink className="btn btn-ghost" href={paperUrl()}>
              {PAPER_LINK_TEXT}
            </IssueLink>
          </div>
        </div>
      </section>
    </div>
  );
}
