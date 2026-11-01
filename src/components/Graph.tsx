// Module graph: Cytoscape with the dagre layout, left to right (REQ-006 to REQ-010, REQ-013).
import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import { useEffect, useRef } from "react";
import type { PlatformGraph } from "../data/types";
import { buildElements, buildStylesheet } from "../lib/graphElements";
import { highlightSet, type Selection } from "../lib/steps";
import { readableViewport } from "../lib/viewport";

cytoscape.use(dagre);

const PADDING = 24;

function readableFit(cy: Core) {
  const bb = cy.elements().boundingBox();
  cy.viewport(readableViewport({ x1: bb.x1, y1: bb.y1, w: bb.w, h: bb.h }, cy.width(), cy.height(), PADDING));
}

declare global {
  interface Window {
    __cy?: Core;
  }
}

interface Props {
  platform: PlatformGraph;
  selection: Selection;
  onSelect: (selection: NonNullable<Selection>) => void;
}

export function Graph({ platform, selection, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!container.current) return;
    const cy = cytoscape({
      container: container.current,
      elements: buildElements(platform),
      style: buildStylesheet(),
      layout: { name: "dagre", rankDir: "LR", fit: false, nodeSep: 30, rankSep: 90 } as cytoscape.LayoutOptions,
      minZoom: 0.2,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    cy.on("tap", "node.module", (e) => onSelectRef.current({ kind: "module", id: e.target.id() }));
    cy.on("tap", "node.boundary", () => onSelectRef.current({ kind: "platform", id: platform.platform_id }));
    cy.on("tap", "edge", (e) => onSelectRef.current({ kind: "connection", id: e.target.id() }));
    readableFit(cy);
    cyRef.current = cy;
    // Test hook: only the `vite build --mode e2e` bundle exposes the instance (AC-14 checks dist/ has none).
    if (import.meta.env.MODE === "e2e") window.__cy = cy;
    return () => {
      if (import.meta.env.MODE === "e2e") delete window.__cy;
      cyRef.current = null;
      cy.destroy();
    };
  }, [platform]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass("highlighted dimmed picked");
      if (selection?.kind === "step") {
        const step = platform.steps.find((s) => s.step_id === selection.id);
        if (!step) return;
        const keep = highlightSet(step);
        cy.nodes(".module").forEach((n) => {
          n.addClass(keep.has(n.id()) ? "highlighted" : "dimmed");
        });
        cy.edges().forEach((e) => {
          if (!(keep.has(e.source().id()) && keep.has(e.target().id()))) e.addClass("dimmed");
        });
      } else if (selection?.kind === "module" || selection?.kind === "connection") {
        cy.getElementById(selection.id).addClass("picked");
      }
    });
  }, [platform, selection]);

  return (
    <div className="graph-wrap">
      <div
        ref={container}
        className="graph"
        role="img"
        aria-label={`Module graph of ${platform.platform_id}: ${platform.modules.length} modules, ${platform.connections.length} connections. The tables below give the same information as text.`}
      />
      <button type="button" className="graph-fit" onClick={() => cyRef.current && readableFit(cyRef.current)}>
        Fit to view
      </button>
    </div>
  );
}
