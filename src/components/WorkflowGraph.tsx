// Read-only graph of the visitor's workflow on the Workflow builder page (SPEC-UI-001 UI AC-39 to UI AC-41): a node
// per module and an edge per transfer boundary, drawn like the platform viewer's graph (bold type labels with a
// caption, Okabe–Ito group and transfer-mode colours) and laid out the same way, top to bottom below 800 px. It
// follows every edit of the builder; the view refits unless the reader has zoomed or panned. The builder's tables
// above stay the text alternative.
import type { Core } from "cytoscape";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildWorkflowGraph, type WorkflowGraph as Graph } from "../lib/workflowGraph";
import type { WorkflowState } from "../lib/workflowState";
import {
  createGraph,
  followView,
  GraphCaptions,
  GraphMinimapFor,
  GraphToolbar,
  NO_OVERLAY,
  readableFit,
  useGraphLook,
  useRefitOnResize,
  type Overlay,
} from "./graphCanvas";

declare global {
  interface Window {
    __wfCy?: Core;
  }
}

/** Edge labels stay horizontal top to bottom: the workflow's step-pair labels are longer than its short edges. */
const LOOK = { levelEdgeLabels: true };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function WorkflowGraph({ state }: { state: WorkflowState }) {
  const graph = useMemo(() => buildWorkflowGraph(state), [state]);
  return (
    <section aria-labelledby="wf-graph-heading" className="card panel wf-graph">
      <h2 id="wf-graph-heading">Workflow graph</h2>
      <p>
        Your modules and the transfers between consecutive steps on different modules, in step order. The graph only
        shows the workflow; edit it above.
      </p>
      {state.steps.length === 0 ? (
        <p className="wf-graph-empty">Add a step to see your workflow as a graph.</p>
      ) : (
        <WorkflowCanvas graph={graph} />
      )}
    </section>
  );
}

function WorkflowCanvas({ graph }: { graph: Graph }) {
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const [overlay, setOverlay] = useState<Overlay>(NO_OVERLAY);
  // True once the reader zooms or pans; a fit (on load or from "Fit to view") clears it.
  const movedRef = useRef(false);
  const { rankDir, start, relayout } = useGraphLook(cyRef, movedRef, LOOK);

  useEffect(() => {
    if (!container.current) return;
    const look = start();
    const cy = createGraph(container.current, graphRef.current.elements, look.style, look.rankDir);
    cy.autounselectify(true);
    readableFit(cy);
    movedRef.current = false;
    const stopFollowing = followView(cy, movedRef, setOverlay);
    cyRef.current = cy;
    // Test hook: only the `vite build --mode e2e` bundle exposes the instance.
    if (import.meta.env.MODE === "e2e") window.__wfCy = cy;
    return () => {
      stopFollowing();
      if (import.meta.env.MODE === "e2e") delete window.__wfCy;
      cyRef.current = null;
      cy.destroy();
    };
  }, [start]);

  // An edit of the builder: the elements are replaced and laid out again, and the view refits unless the reader moved it.
  const elementsKey = useMemo(() => JSON.stringify(graph.elements), [graph]);
  const shownKey = useRef(elementsKey);
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || shownKey.current === elementsKey) return;
    shownKey.current = elementsKey;
    cy.batch(() => {
      cy.elements().remove();
      cy.add(graphRef.current.elements);
    });
    relayout(cy);
    if (!movedRef.current) readableFit(cy);
  }, [elementsKey, relayout]);

  useRefitOnResize(container, cyRef, movedRef);

  return (
    <div className="graph-wrap wf-graph-box">
      <div
        ref={container}
        className="graph"
        role="img"
        aria-label={`Workflow graph: ${plural(graph.modules, "module")}, ${plural(graph.transfers, "transfer")}. The builder's tables above give the same information as text.`}
      />
      <GraphCaptions items={graph.captions} overlay={overlay} beside={rankDir === "TB"} />
      <GraphMinimapFor overlay={overlay} cyRef={cyRef} movedRef={movedRef} />
      <GraphToolbar cyRef={cyRef} movedRef={movedRef} />
    </div>
  );
}
