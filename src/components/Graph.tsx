// Module graph: Cytoscape with the dagre layout, left to right (REQ-006 to REQ-010, REQ-013), full width with a
// floating toolbar (fit, zoom in and out, legend) and spacing that keeps labels apart (SPEC-UI-001 REQ-018).
import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Maximize, Shapes, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlatformGraph } from "../data/types";
import { buildElements, buildStylesheet } from "../lib/graphElements";
import { highlightSet, type Selection } from "../lib/steps";
import { readableViewport } from "../lib/viewport";
import { Legend } from "./Legend";
import { useTheme } from "./useTheme";

cytoscape.use(dagre);

const PADDING = 24;
const ZOOM_STEP = 1.25;

/**
 * Dagre spacing in model pixels. nodeDimensionsIncludeLabels makes dagre space the node-and-label boxes rather than
 * the 26 px dots, so wrapped labels (buildStylesheet's text-max-width) do not run into the next module.
 */
const LAYOUT = {
  name: "dagre",
  rankDir: "LR",
  fit: false,
  nodeSep: 36,
  rankSep: 70,
  edgeSep: 16,
  nodeDimensionsIncludeLabels: true,
} as cytoscape.LayoutOptions;

/** Delay before a container resize is acted on, so a run of resize notifications refits once. */
const RESIZE_DEBOUNCE_MS = 60;

function readableFit(cy: Core) {
  const bb = cy.elements().boundingBox();
  cy.viewport(readableViewport({ x1: bb.x1, y1: bb.y1, w: bb.w, h: bb.h }, cy.width(), cy.height(), PADDING));
}

/** Graph elements of the selection: the module or connection, or the modules of a step. */
function selectedElements(cy: Core, platform: PlatformGraph, selection: Selection) {
  if (selection?.kind === "module" || selection?.kind === "connection") return cy.getElementById(selection.id);
  if (selection?.kind === "step") {
    const step = platform.steps.find((s) => s.step_id === selection.id);
    if (step) return cy.nodes(".module").filter((n) => highlightSet(step).has(n.id()));
  }
  return cy.collection();
}

function zoomBy(cy: Core, factor: number) {
  const level = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
  cy.zoom({ level, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
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
  const theme = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [legendOpen, setLegendOpen] = useState(false);
  // True once the reader zooms or pans; a fit (on load or from "Fit to view") clears it (SPEC-UI-001 REQ-024).
  const movedRef = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    const cy = cytoscape({
      container: container.current,
      elements: buildElements(platform),
      style: buildStylesheet(themeRef.current),
      layout: LAYOUT,
      minZoom: 0.2,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autoungrabify: true,
    });
    cy.on("tap", "node.module", (e) => onSelectRef.current({ kind: "module", id: e.target.id() }));
    cy.on("tap", "node.boundary", () => onSelectRef.current({ kind: "platform", id: platform.platform_id }));
    cy.on("tap", "edge", (e) => onSelectRef.current({ kind: "connection", id: e.target.id() }));
    // Cytoscape's own gesture events; programmatic fits and pans do not emit them.
    cy.on("dragpan scrollzoom pinchzoom", () => {
      movedRef.current = true;
    });
    readableFit(cy);
    movedRef.current = false;
    cyRef.current = cy;
    // Test hook: only the `vite build --mode e2e` bundle exposes the instance (AC-14 checks dist/ has none).
    if (import.meta.env.MODE === "e2e") window.__cy = cy;
    return () => {
      if (import.meta.env.MODE === "e2e") delete window.__cy;
      cyRef.current = null;
      cy.destroy();
    };
  }, [platform]);

  // The site theme changed while the graph is open (SPEC-SITE-001 REQ-008).
  useEffect(() => {
    cyRef.current?.style(buildStylesheet(theme));
  }, [theme]);

  // The box changes width when the evidence sheet docks beside the content or closes (SPEC-UI-001 REQ-022, REQ-024),
  // and with the window. Cytoscape resizes itself after its own debounce but keeps the old viewport; here, after a
  // short debounce, it resizes and, unless the reader has zoomed or panned since the last fit, fits again by the
  // readable rule (a graph too long for zoom 1 shows its left end and is panned). A reader's view keeps its centre.
  // Then a selected item cut off by the box is panned into view. Nothing is animated, so reduced motion is respected.
  const platformRef = useRef(platform);
  platformRef.current = platform;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    const el = container.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const cy = cyRef.current;
      const next = el.clientWidth;
      if (!cy || next === width) return;
      cy.resize();
      if (movedRef.current) cy.panBy({ x: (next - width) / 2, y: 0 });
      else readableFit(cy);
      width = next;
      const picked = selectedElements(cy, platformRef.current, selectionRef.current);
      if (picked.nonempty()) {
        const bb = picked.renderedBoundingBox();
        if (bb.x1 < PADDING || bb.x2 > next - PADDING) cy.panBy({ x: next / 2 - (bb.x1 + bb.x2) / 2, y: 0 });
      }
    };
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(settle, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

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

  // `moved` records whether the toolbar action leaves a view the reader chose (zoom) or the fit.
  const withCy = (action: (cy: Core) => void, moved: boolean) => () => {
    if (!cyRef.current) return;
    action(cyRef.current);
    movedRef.current = moved;
  };

  return (
    <div className="card graph-wrap">
      <div
        ref={container}
        className="graph"
        role="img"
        aria-label={`Module graph of ${platform.platform_id}: ${platform.modules.length} modules, ${platform.connections.length} connections. The tables below give the same information as text.`}
      />
      <div className="graph-toolbar" role="toolbar" aria-label="Graph">
        <button type="button" className="btn btn-icon graph-fit" aria-label="Fit to view" title="Fit to view" onClick={withCy(readableFit, false)}>
          <Maximize size={16} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-icon" aria-label="Zoom in" title="Zoom in" onClick={withCy((cy) => zoomBy(cy, ZOOM_STEP), true)}>
          <ZoomIn size={16} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-icon" aria-label="Zoom out" title="Zoom out" onClick={withCy((cy) => zoomBy(cy, 1 / ZOOM_STEP), true)}>
          <ZoomOut size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Legend"
          title="Legend"
          aria-expanded={legendOpen}
          aria-controls="graph-legend"
          onClick={() => setLegendOpen((o) => !o)}
        >
          <Shapes size={16} aria-hidden="true" />
        </button>
      </div>
      <Legend id="graph-legend" hidden={!legendOpen} />
    </div>
  );
}
