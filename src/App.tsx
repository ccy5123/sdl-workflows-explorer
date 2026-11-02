// Hash router of the site (REQ-001 to REQ-004; SPEC-BROWSE-001 REQ-001; SPEC-TRENDS-001 REQ-001, REQ-015; SPEC-TAXO-001
// REQ-009, REQ-010; SPEC-BENCH-001 REQ-005, REQ-015): home, platform viewer, browser, trends dashboard, taxonomy,
// benchmark, comparison, or not found. The footer links to the missing-paper issue form (SPEC-CONTRIB-001 REQ-006).
import { Suspense, lazy, useEffect, useState } from "react";
import { IssueLink } from "./components/IssueLink";
import type { IndexJson } from "./data/types";
import { PAPER_LINK_TEXT, paperUrl } from "./lib/contribute";
import { parseRoute } from "./lib/route";
import { Browse } from "./views/Browse";
import { Compare } from "./views/Compare";
import { Home } from "./views/Home";
import { NotFound } from "./views/NotFound";
import { PlatformView } from "./views/PlatformView";

// The dashboard and Observable Plot load in their own chunk, only when #/trends is opened.
const Trends = lazy(() => import("./views/Trends").then((m) => ({ default: m.Trends })));
// The taxonomy views load in their own chunk; they fetch data/taxonomy.json themselves (SPEC-TAXO-001 REQ-010).
const Taxonomy = lazy(() => import("./views/Taxonomy").then((m) => ({ default: m.Taxonomy })));
// The benchmark page and item explorer load in their own chunk and fetch their data themselves (SPEC-BENCH-001 REQ-015).
const Benchmark = lazy(() => import("./views/Benchmark").then((m) => ({ default: m.Benchmark })));

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

  return (
    <div className="page">
      <nav className="site-nav">
        <a href="#/" className="site-title">
          SDL Workflows Explorer
        </a>
        <a href="#/">Home</a>
        <a href="#/browse">Browse</a>
        <a href="#/trends">Trends</a>
        <a href="#/taxonomy">Taxonomy</a>
        <a href="#/benchmark">Benchmark</a>
      </nav>
      <main>
        {error && <p role="alert">Could not load the data: {error}</p>}
        {!index && !error && <p>Loading…</p>}
        {index && route.kind === "home" && <Home index={index} />}
        {index && route.kind === "platform" && (
          <PlatformView key={route.platformId} index={index} paperId={route.paperId} platformId={route.platformId} hash={hash} />
        )}
        {index && route.kind === "browse" && <Browse index={index} onNavigate={navigate} />}
        {index && route.kind === "trends" && (
          <Suspense fallback={<p>Loading…</p>}>
            <Trends index={index} />
          </Suspense>
        )}
        {index && (route.kind === "taxonomy" || route.kind === "taxonomyClass") && (
          <Suspense fallback={<p>Loading…</p>}>
            <Taxonomy index={index} route={route} />
          </Suspense>
        )}
        {index && (route.kind === "benchmark" || route.kind === "benchmarkItems") && (
          <Suspense fallback={<p>Loading…</p>}>
            <Benchmark key={route.kind} index={index} route={route} />
          </Suspense>
        )}
        {index && route.kind === "compare" && <Compare key={route.ids.join(",")} index={index} ids={route.ids} />}
        {index && route.kind === "notFound" && <NotFound hash={route.hash} />}
      </main>
      {index && (
        <footer className="site-footer">
          Data version {index.release.version} ·{" "}
          <a href={`https://doi.org/${index.release.doi}`}>doi:{index.release.doi}</a> ·{" "}
          <IssueLink href={paperUrl()}>{PAPER_LINK_TEXT}</IssueLink>
        </footer>
      )}
    </div>
  );
}
