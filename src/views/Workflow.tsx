// Workflow builder: one workflow the visitor composes, kept in the hash query, and the three outputs built from it
// (SPEC-SIM-001 REQ-005 to REQ-020). Loaded lazily; data/simulation.json is fetched by this module on first use.
import { useEffect, useMemo, useState } from "react";
import { SimilarPlatforms } from "../components/SimilarPlatforms";
import { WorkflowEditor } from "../components/WorkflowEditor";
import type { SimulationJson } from "../data/types";
import { parseRoute, workflowHash } from "../lib/route";
import { platformSets, rankPlatforms, workflowSets } from "../lib/similarity";
import {
  catalogOf,
  decodeWorkflow,
  encodeWorkflow,
  fromPlatform,
  ignoredMessage,
  type Catalog,
  type EditResult,
  type WorkflowState,
} from "../lib/workflowState";
import { WORKFLOW_INTRO, NEED_A_STEP } from "../lib/workflowText";

let simRequest: Promise<SimulationJson> | null = null;

/** data/simulation.json, requested at most once per page load. */
function loadSimulation(): Promise<SimulationJson> {
  return (simRequest ??= fetch("data/simulation.json").then((response) => {
    if (!response.ok) throw new Error(`data/simulation.json: HTTP ${response.status}`);
    return response.json() as Promise<SimulationJson>;
  }));
}

interface Messages {
  notes: string[];
  error: string | null;
}

/** State of the current hash; the hash is replaced by its canonical form so URL and inputs agree. */
function stateFromLocation(catalog: Catalog): { state: WorkflowState; ignored: string[] } | null {
  const route = parseRoute(window.location.hash);
  if (route.kind !== "workflow") return null;
  const decoded = decodeWorkflow(route.query, catalog);
  const canonical = workflowHash(encodeWorkflow(decoded.state));
  if (canonical !== window.location.hash) history.replaceState(history.state, "", canonical);
  return decoded;
}

export function Workflow() {
  const [sim, setSim] = useState<SimulationJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    loadSimulation()
      .then(setSim)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);
  return (
    <article className="workflow">
      <h1>Workflow builder</h1>
      <p>{WORKFLOW_INTRO}</p>
      {loadError && <p role="alert">Could not load the data: {loadError}</p>}
      {!sim && !loadError && <p>Loading…</p>}
      {sim && <Builder sim={sim} />}
    </article>
  );
}

function Outputs({
  state,
  catalog,
  platforms,
}: {
  state: WorkflowState;
  catalog: Catalog;
  platforms: ReturnType<typeof platformSets>[];
}) {
  const ranked = useMemo(() => rankPlatforms(workflowSets(state, catalog), platforms), [state, catalog, platforms]);
  return (
    <>
      <SimilarPlatforms key={encodeWorkflow(state)} rows={ranked} />
    </>
  );
}

function Builder({ sim }: { sim: SimulationJson }) {
  const catalog = useMemo(() => catalogOf(sim), [sim]);
  const platforms = useMemo(() => sim.platforms.map((p) => platformSets(p, catalog)), [sim, catalog]);
  const [initial] = useState(() => stateFromLocation(catalog) ?? decodeWorkflow("", catalog));
  const [state, setState] = useState<WorkflowState>(initial.state);
  const [messages, setMessages] = useState<Messages>({ notes: [], error: null });
  const [ignored, setIgnored] = useState<string | null>(ignoredMessage(initial.ignored));

  // replaceState fires no hashchange, so a hashchange means the visitor opened another link: decode it.
  useEffect(() => {
    const onHashChange = () => {
      const next = stateFromLocation(catalog);
      if (!next) return;
      setState(next.state);
      setIgnored(ignoredMessage(next.ignored));
      setMessages({ notes: [], error: null });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [catalog]);

  const commit = (next: WorkflowState, notes: string[]) => {
    setState(next);
    setMessages({ notes, error: null });
    history.replaceState(history.state, "", workflowHash(encodeWorkflow(next)));
  };
  const apply = (result: EditResult): boolean => {
    if (!result.ok) {
      setMessages({ notes: [], error: result.error });
      return false;
    }
    commit(result.state, result.notes);
    return true;
  };
  const onStart = (platformId: string) => {
    const layout = sim.platforms.find((p) => p.platform_id === platformId);
    if (!layout) return;
    const { state: next, filled } = fromPlatform(layout, catalog);
    commit(next, [`Filled from ${platformId}: ${filled.join(", ")}. Every other input keeps its default.`]);
  };

  return (
    <>
      {ignored && (
        <p className="wf-message" role="status">
          {ignored}
        </p>
      )}
      <WorkflowEditor state={state} catalog={catalog} sim={sim} apply={apply} onStart={onStart} />
      <div className="wf-messages" aria-live="polite">
        {messages.error && (
          <p className="wf-message wf-error" role="alert">
            {messages.error}
          </p>
        )}
        {messages.notes.map((n) => (
          <p key={n} className="wf-message">
            {n}
          </p>
        ))}
      </div>
      {state.steps.length === 0 ? <p className="wf-empty">{NEED_A_STEP}</p> : <Outputs state={state} catalog={catalog} platforms={platforms} />}
    </>
  );
}
