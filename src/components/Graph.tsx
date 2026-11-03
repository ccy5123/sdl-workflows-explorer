// Module graph: Cytoscape with the dagre layout, left to right (REQ-006 to REQ-010, REQ-013), full width with a
// floating toolbar (fit, zoom in and out, legend) and spacing that keeps labels apart (SPEC-UI-001 REQ-018).
// Below 800 px it runs top to bottom (UI AC-36). An HTML layer over the canvas draws each module's name in the paper
// as a caption under its bold type label (UI AC-35), and a minimap shows a graph that does not fit (UI AC-37).
import type { Core } from "cytoscape";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlatformGraph } from "../data/types";
import { buildElements } from "../lib/graphElements";
import { highlightSet, type Selection } from "../lib/steps";
import {
  createGraph,
  followView,
  GraphCaptions,
  GraphMinimapFor,
  GraphToolbar,
  NO_OVERLAY,
  PADDING,
  readableFit,
  useGraphLook,
  useRefitOnResize,
  type Overlay,
} from "./graphCanvas";
import { Legend } from "./Legend";

/** Graph elements of the selection: the module or connection, or the modules of a step. */
function selectedElements(cy: Core, platform: PlatformGraph, selection: Selection) {
  if (selection?.kind === "module" || selection?.kind === "connection") return cy.getElementById(selection.id);
  if (selection?.kind === "step") {
    const step = platform.steps.find((s) => s.step_id === selection.id);
    if (step) return cy.nodes(".module").filter((n) => highlightSet(step).has(n.id()));
  }
  return cy.collection();
}

declare global {
  interface Window {
    __cy?: Core;
  }
}

interface Props {
  platform: PlatformGraph;
  selection: Selection;
  /** A step under the pointer or keyboard focus in the timeline: highlighted like a selected step (UI AC-38). */
  preview?: string | null;
  onSelect: (selection: NonNullable<Selection>) => void;
}

export function Graph({ platform, selection, preview = null, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [legendOpen, setLegendOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(NO_OVERLAY);
  // True once the reader zooms or pans; a fit (on load or from "Fit to view") clears it (SPEC-UI-001 REQ-024).
  const movedRef = useRef(false);
  const { rankDir, start } = useGraphLook(cyRef, movedRef);

  // Escape closes the open legend; focus inside it goes back to its toolbar button (SPEC-UI-001 UI AC-50).
  useEffect(() => {
    if (!legendOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const inside = document.getElementById("graph-legend")?.contains(document.activeElement);
      setLegendOpen(false);
      if (inside) document.querySelector<HTMLElement>('[aria-controls="graph-legend"]')?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [legendOpen]);

  useEffect(() => {
    if (!container.current) return;
    const look = start();
    const cy = createGraph(container.current, buildElements(platform), look.style, look.rankDir);
    cy.on("tap", "node.module", (e) => onSelectRef.current({ kind: "module", id: e.target.id() }));
    cy.on("tap", "node.boundary", () => onSelectRef.current({ kind: "platform", id: platform.platform_id }));
    cy.on("tap", "edge", (e) => onSelectRef.current({ kind: "connection", id: e.target.id() }));
    readableFit(cy);
    movedRef.current = false;
    const stopFollowing = followView(cy, movedRef, setOverlay);
    cyRef.current = cy;
    // Test hook: only the `vite build --mode e2e` bundle exposes the instance (AC-14 checks dist/ has none).
    if (import.meta.env.MODE === "e2e") window.__cy = cy;
    return () => {
      stopFollowing();
      if (import.meta.env.MODE === "e2e") delete window.__cy;
      cyRef.current = null;
      cy.destroy();
    };
  }, [platform, start]);

  // The box changes width when the evidence sheet docks beside the content or closes (SPEC-UI-001 REQ-022, REQ-024),
  // and with the window: the graph refits (graphCanvas useRefitOnResize), then a selected item cut off by the box is
  // panned into view.
  const afterResize = useRef<(cy: Core, width: number) => void>(() => undefined);
  afterResize.current = (cy: Core, width: number) => {
    const picked = selectedElements(cy, platform, selection);
    if (picked.nonempty()) {
      const bb = picked.renderedBoundingBox();
      if (bb.x1 < PADDING || bb.x2 > width - PADDING) cy.panBy({ x: width / 2 - (bb.x1 + bb.x2) / 2, y: 0 });
    }
  };
  useRefitOnResize(container, cyRef, movedRef, afterResize);

  // A previewed step shows as a selected step does, without selecting it; leaving it shows the selection again.
  const shown: Selection = preview ? { kind: "step", id: preview } : selection;
  const shownStep = shown?.kind === "step" ? platform.steps.find((s) => s.step_id === shown.id) : undefined;
  const keep = useMemo(() => (shownStep ? highlightSet(shownStep) : null), [shownStep]);
  const captions = useMemo(
    () => platform.modules.flatMap((m) => (m.name_in_paper ? [{ id: m.module_id, text: m.name_in_paper }] : [])),
    [platform],
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass("highlighted dimmed picked");
      if (keep) {
        cy.nodes(".module").forEach((n) => {
          n.addClass(keep.has(n.id()) ? "highlighted" : "dimmed");
        });
        cy.edges().forEach((e) => {
          if (!(keep.has(e.source().id()) && keep.has(e.target().id()))) e.addClass("dimmed");
        });
      } else if (shown?.kind === "module" || shown?.kind === "connection") {
        cy.getElementById(shown.id).addClass("picked");
      }
    });
  }, [platform, keep, shown?.kind, shown?.id]);

  return (
    <div className="card graph-wrap">
      <div
        ref={container}
        className="graph"
        role="img"
        aria-label={`Module graph of ${platform.platform_id}: ${platform.modules.length} modules, ${platform.connections.length} connections. The tables below give the same information as text.`}
      />
      <GraphCaptions
        items={captions}
        overlay={overlay}
        beside={rankDir === "TB"}
        dimmed={(id) => keep !== null && !keep.has(id)}
      />
      <GraphMinimapFor overlay={overlay} cyRef={cyRef} movedRef={movedRef} />
      <GraphToolbar
        cyRef={cyRef}
        movedRef={movedRef}
        legend={{ open: legendOpen, onToggle: () => setLegendOpen((o) => !o), controls: "graph-legend" }}
      />
      <Legend id="graph-legend" hidden={!legendOpen} />
    </div>
  );
}
