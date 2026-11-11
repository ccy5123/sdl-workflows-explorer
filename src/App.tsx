// Hash router of the site (REQ-001 to REQ-004; SPEC-BROWSE-001 REQ-001; SPEC-TRENDS-001 REQ-001, REQ-015; SPEC-TAXO-001
// REQ-009, REQ-010; SPEC-BENCH-001 REQ-005, REQ-015): home, platform viewer, browser, trends dashboard, taxonomy,
// benchmark, workflow builder (SPEC-SIM-001 REQ-005), comparison, about (SPEC-SITE-001 REQ-005), or not found. The
// footer links to the author's site and to the missing-paper issue form (SPEC-CONTRIB-001 REQ-006). The sticky top bar,
// its version chip and theme toggle, and the compact footer are SPEC-UI-001 REQ-004 and REQ-005; the footer's visitor
// count is SPEC-VISIT-001.
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { IssueLink } from "./components/IssueLink";
import { Loading } from "./components/Loading";
import { NavGroup } from "./components/NavGroup";
import { SiteMenu, isGroup, type NavEntry } from "./components/SiteMenu";
import { ThemeToggle } from "./components/ThemeToggle";
import { VisitorCount } from "./components/VisitorCount";
import type { IndexJson } from "./data/types";
import { PAPER_LINK_TEXT, paperUrl } from "./lib/contribute";
import { navCurrent, parseRoute, routeTitle } from "./lib/route";
import { AUTHOR, PREPRINT } from "./lib/siteText";
import { About } from "./views/About";
import { Browse } from "./views/Browse";
import { Compare } from "./views/Compare";
import { Guide } from "./views/Guide";
import { Home } from "./views/Home";
import { NotFound } from "./views/NotFound";
import { PlatformView } from "./views/PlatformView";

// The dashboard and Observable Plot load in their own chunk, only when #/trends is opened.
const Trends = lazy(() => import("./views/Trends").then((m) => ({ default: m.Trends })));
// The taxonomy views load in their own chunk; they fetch data/taxonomy.json themselves (SPEC-TAXO-001 REQ-010).
const Taxonomy = lazy(() => import("./views/Taxonomy").then((m) => ({ default: m.Taxonomy })));
// The benchmark page and item explorer load in their own chunk and fetch their data themselves (SPEC-BENCH-001 REQ-015).
const Benchmark = lazy(() => import("./views/Benchmark").then((m) => ({ default: m.Benchmark })));
// The workflow builder and its outputs load in their own chunk and fetch data/simulation.json themselves.
const Workflow = lazy(() => import("./views/Workflow").then((m) => ({ default: m.Workflow })));

/**
 * The view links: tabs from 800 px up, the menu panel below (SPEC-UI-001 REQ-004, REQ-016). The four views a reader
 * starts from are tabs; the pages about the data sit under one "Data" tab. Browse opens on its platform table.
 */
const NAV_ITEMS: readonly NavEntry[] = [
  { href: "#/", text: "Home" },
  { href: "#/browse?view=platforms", text: "Browse" },
  { href: "#/trends", text: "Trends" },
  { href: "#/workflow", text: "Workflow" },
  {
    text: "Data",
    items: [
      { href: "#/about", text: "About the data", current: "About" },
      { href: "#/guide", text: "Getting started" },
      { href: "#/taxonomy", text: "Taxonomy" },
      { href: "#/benchmark", text: "Benchmark" },
    ],
  },
];

/** Current hash, and a navigate function that shows the new view in the same render as the click. */
function useHash(): [string, (next: string) => void] {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  // hashchange arrives as a later task; until then the old view would stay on screen under the new URL.
  const navigate = (next: string) => {
    window.location.hash = next;
    setHash(window.location.hash);
    window.scrollTo(0, 0);
  };
  return [hash, navigate];
}

export function App() {
  const [hash, navigate] = useHash();
  const route = parseRoute(hash);
  const [index, setIndex] = useState<IndexJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("data/index.json")
      .then((response) => {
        if (!response.ok) throw new Error(`data/index.json: HTTP ${response.status}`);
        return response.json() as Promise<IndexJson>;
      })
      .then(setIndex)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Title and current nav link per route (SPEC-SITE-001 REQ-010).
  const title = routeTitle(route);
  useEffect(() => {
    document.title = `${title} · SDL Workflows Explorer`;
  }, [title]);
  const current = navCurrent(route);
  const navLink = (href: string, text: string) => (
    <a href={href} aria-current={current === text ? "page" : undefined}>
      {text}
    </a>
  );
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="page">
      {/* Every hash is a route, so the skip link moves focus itself instead of linking to #main. */}
      <a
        href={hash || "#/"}
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <nav className="site-nav" aria-label="Main">
            <a href="#/" className="site-title">
              <span className="logo-mark" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="5" cy="12" r="2.5" />
                  <circle cx="19" cy="6" r="2.5" />
                  <circle cx="19" cy="18" r="2.5" />
                  <path d="M7.4 11 16.6 7M7.4 13l9.2 4" />
                </svg>
              </span>
              <span>
                SDL Workflows <span className="site-title-sub">Explorer</span>
              </span>
            </a>
            <ul className="nav-tabs">
              {NAV_ITEMS.map((entry) =>
                isGroup(entry) ? (
                  <li key={entry.text}>
                    <NavGroup text={entry.text} items={entry.items} current={current} hash={hash} />
                  </li>
                ) : (
                  <li key={entry.href}>{navLink(entry.href, entry.text)}</li>
                ),
              )}
            </ul>
          </nav>
          <div className="topbar-actions">
            {index && (
              <a
                className="version-chip"
                href={`https://doi.org/${index.release.doi}`}
                title={`Data release ${index.release.version} on Zenodo`}
              >
                v{index.release.version}
              </a>
            )}
            <ThemeToggle />
            <SiteMenu items={NAV_ITEMS} current={current} hash={hash} />
          </div>
        </div>
      </header>
      <main id="main" className="page-main" ref={mainRef} tabIndex={-1}>
        {error && <p role="alert">Could not load the data: {error}</p>}
        {!index && !error && <Loading />}
        {index && route.kind === "home" && <Home index={index} />}
        {index && route.kind === "about" && <About index={index} />}
        {index && route.kind === "guide" && <Guide />}
        {index && route.kind === "platform" && (
          <PlatformView key={route.platformId} index={index} paperId={route.paperId} platformId={route.platformId} hash={hash} />
        )}
        {index && route.kind === "browse" && <Browse index={index} onNavigate={navigate} />}
        {index && route.kind === "trends" && (
          <Suspense fallback={<Loading />}>
            <Trends index={index} />
          </Suspense>
        )}
        {index && (route.kind === "taxonomy" || route.kind === "taxonomyClass") && (
          <Suspense fallback={<Loading />}>
            <Taxonomy index={index} route={route} />
          </Suspense>
        )}
        {index && (route.kind === "benchmark" || route.kind === "benchmarkItems") && (
          <Suspense fallback={<Loading />}>
            <Benchmark key={route.kind} index={index} route={route} />
          </Suspense>
        )}
        {index && route.kind === "workflow" && (
          <Suspense fallback={<Loading />}>
            <Workflow />
          </Suspense>
        )}
        {index && route.kind === "compare" && <Compare key={route.ids.join(",")} index={index} ids={route.ids} />}
        {index && route.kind === "notFound" && <NotFound hash={route.hash} />}
      </main>
      {index && (
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-meta">
              <span>
                SDL Workflows Explorer · Data version {index.release.version} ·{" "}
                <a href={`https://doi.org/${index.release.doi}`}>doi:{index.release.doi}</a>
              </span>
              <VisitorCount />
            </div>
            <span className="footer-links">
              <a href={AUTHOR.url}>{AUTHOR.name}</a>
              <a href={`https://doi.org/${PREPRINT.doi}`}>{PREPRINT.linkText}</a>
              <IssueLink href={paperUrl()}>{PAPER_LINK_TEXT}</IssueLink>
              <a href="#/guide">Getting started</a>
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
