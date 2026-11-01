// Hash router of the site (REQ-001 to REQ-004; SPEC-BROWSE-001 REQ-001): home, platform viewer, browser, comparison, or not found.
import { useEffect, useState } from "react";
import type { IndexJson } from "./data/types";
import { parseRoute } from "./lib/route";
import { Browse } from "./views/Browse";
import { Compare } from "./views/Compare";
import { Home } from "./views/Home";
import { NotFound } from "./views/NotFound";
import { PlatformView } from "./views/PlatformView";

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
      </nav>
      <main>
        {error && <p role="alert">Could not load the data: {error}</p>}
        {!index && !error && <p>Loading…</p>}
        {index && route.kind === "home" && <Home index={index} />}
        {index && route.kind === "platform" && (
          <PlatformView key={route.platformId} index={index} paperId={route.paperId} platformId={route.platformId} hash={hash} />
        )}
        {index && route.kind === "browse" && <Browse index={index} onNavigate={navigate} />}
        {index && route.kind === "compare" && <Compare key={route.ids.join(",")} index={index} ids={route.ids} />}
        {index && route.kind === "notFound" && <NotFound hash={route.hash} />}
      </main>
      {index && (
        <footer className="site-footer">
          Data version {index.release.version} ·{" "}
          <a href={`https://doi.org/${index.release.doi}`}>doi:{index.release.doi}</a>
        </footer>
      )}
    </div>
  );
}
