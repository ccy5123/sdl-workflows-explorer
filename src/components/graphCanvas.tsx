// Shared pieces of the two Cytoscape graphs, the platform viewer's module graph (Graph.tsx) and the workflow builder's
// graph (WorkflowGraph.tsx): the dagre layouts (left to right; top to bottom below 800 px, SPEC-UI-001 UI AC-36), the
// readable fit (REQ-018), the refit when the box changes size (REQ-024), the caption layer (UI AC-35), the minimap
// (UI AC-37) and the toolbar.
import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Maximize, Shapes, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { buildStylesheet } from "../lib/graphElements";
import { captionBox, centreOn, graphFits, minimapFrame, type CaptionBox, type Point } from "../lib/graphOverlay";
import type { Theme } from "../lib/siteTokens";
import { readableViewport } from "../lib/viewport";
import { GraphMinimap, MINIMAP_HEIGHT, MINIMAP_INSET, MINIMAP_WIDTH, type MinimapModel } from "./GraphMinimap";
import { useMedia } from "./useMedia";
import { useTheme } from "./useTheme";

cytoscape.use(dagre);

export const PADDING = 24;
const ZOOM_STEP = 1.25;

/** The phone breakpoint of the site's CSS (styles.css), below which the graphs run top to bottom. */
export const PHONE_QUERY = "(max-width: 799.98px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type RankDir = "LR" | "TB";

/**
 * Dagre lays out a node-and-label box as if it were centred on the node, but a label hangs below the dot (left to
 * right) or beside it (top to bottom). Moving each module by the offset between its box centre and its dot puts the
 * box where dagre spaced it, so labels and captions stay clear of the next module.
 */
function centreLabelBox(node: cytoscape.NodeSingular, pos: cytoscape.Position): cytoscape.Position {
  if (!node.hasClass("module")) return pos;
  const bb = node.boundingBox({ includeLabels: true, includeOverlays: false });
  const at = node.position();
  return { x: pos.x - ((bb.x1 + bb.x2) / 2 - at.x), y: pos.y - ((bb.y1 + bb.y2) / 2 - at.y) };
}

/**
 * Dagre spacing in model pixels. nodeDimensionsIncludeLabels makes dagre space the node-and-label boxes rather than
 * the 26 px dots, so wrapped labels (buildStylesheet's text-max-width) do not run into the next module. Top to bottom
 * the ranks stack and the labels sit beside the dots, so a phone's width only has to hold one rank's modules.
 */
export const LAYOUTS: Record<RankDir, cytoscape.LayoutOptions> = {
  LR: { name: "dagre", rankDir: "LR", fit: false, nodeSep: 36, rankSep: 70, edgeSep: 16, nodeDimensionsIncludeLabels: true, transform: centreLabelBox } as cytoscape.LayoutOptions,
  TB: { name: "dagre", rankDir: "TB", fit: false, nodeSep: 24, rankSep: 36, edgeSep: 12, nodeDimensionsIncludeLabels: true, transform: centreLabelBox } as cytoscape.LayoutOptions,
};

/** Options of a graph's look: `levelEdgeLabels` keeps edge labels horizontal in the top-to-bottom layout. */
export interface LookOptions {
  levelEdgeLabels?: boolean;
}

export const stylesheet = (theme: Theme, reducedMotion: boolean, rankDir: RankDir, options: LookOptions = {}): StylesheetJson =>
  buildStylesheet(theme, { reducedMotion, labelsBeside: rankDir === "TB", levelEdgeLabels: rankDir === "TB" && !!options.levelEdgeLabels });

/** A Cytoscape instance in `container`, laid out in `rankDir`, read-only to drags. */
export function createGraph(container: HTMLElement, elements: ElementDefinition[], style: StylesheetJson, rankDir: RankDir): Core {
  return cytoscape({
    container,
    elements,
    style,
    layout: LAYOUTS[rankDir],
    minZoom: 0.2,
    maxZoom: 3,
    boxSelectionEnabled: false,
    autoungrabify: true,
  });
}

/**
 * The graph's look: the site theme (SPEC-SITE-001 REQ-008), reduced motion, and the layout direction, top to bottom
 * below 800 px. A change of theme or motion restyles the graph; crossing the breakpoint restyles it, lays it out again
 * and fits it (the reader's earlier view no longer applies). Call before the effect that creates the graph, and
 * create it with `start()`; `relayout` runs the layout in the current direction.
 */
export function useGraphLook(cyRef: MutableRefObject<Core | null>, movedRef: MutableRefObject<boolean>, options: LookOptions = {}) {
  const level = !!options.levelEdgeLabels;
  const theme = useTheme();
  const reducedMotion = useMedia(REDUCED_MOTION_QUERY);
  const rankDir: RankDir = useMedia(PHONE_QUERY) ? "TB" : "LR";
  const now = useRef({ theme, reducedMotion, rankDir, level });
  now.current = { theme, reducedMotion, rankDir, level };
  // The direction the current layout was run with.
  const laidOut = useRef<RankDir>(rankDir);

  useEffect(() => {
    cyRef.current?.style(stylesheet(theme, reducedMotion, laidOut.current, { levelEdgeLabels: level }));
  }, [cyRef, theme, reducedMotion, level]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || laidOut.current === rankDir) return;
    laidOut.current = rankDir;
    cy.style(stylesheet(now.current.theme, now.current.reducedMotion, rankDir, { levelEdgeLabels: now.current.level }));
    cy.resize();
    cy.layout(LAYOUTS[rankDir]).run();
    readableFit(cy);
    movedRef.current = false;
  }, [cyRef, movedRef, rankDir]);

  const start = useCallback(() => {
    laidOut.current = now.current.rankDir;
    const { theme: t, reducedMotion: still, level: flat } = now.current;
    return { style: stylesheet(t, still, laidOut.current, { levelEdgeLabels: flat }), rankDir: laidOut.current };
  }, []);
  const relayout = useCallback((cy: Core) => {
    cy.layout(LAYOUTS[laidOut.current]).run();
  }, []);
  return { rankDir, start, relayout };
}

/** Delay before a container resize is acted on, so a run of resize notifications refits once. */
const RESIZE_DEBOUNCE_MS = 60;

export function readableFit(cy: Core) {
  const bb = cy.elements().boundingBox();
  cy.viewport(readableViewport({ x1: bb.x1, y1: bb.y1, w: bb.w, h: bb.h }, cy.width(), cy.height(), PADDING));
}

function zoomBy(cy: Core, factor: number) {
  const level = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
  cy.zoom({ level, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
}

export interface Overlay {
  captions: Record<string, CaptionBox>;
  minimap: MinimapModel | null;
}

export const NO_OVERLAY: Overlay = { captions: {}, minimap: null };

/** Caption boxes of every module, and the minimap while the whole graph does not fit the box at the current zoom. */
function measureOverlay(cy: Core): Overlay {
  const zoom = cy.zoom();
  const pan = cy.pan();
  const captions: Record<string, CaptionBox> = {};
  cy.nodes(".module").forEach((n) => {
    const label = n.boundingBox({ includeNodes: false, includeEdges: false, includeLabels: true, includeOverlays: false });
    captions[n.id()] = captionBox(label, zoom, pan);
  });
  const bb = cy.elements().boundingBox();
  if (cy.elements().empty() || graphFits(bb, zoom, cy.width(), cy.height())) return { captions, minimap: null };
  const extent = cy.extent();
  return {
    captions,
    minimap: {
      frame: minimapFrame(bb, MINIMAP_WIDTH, MINIMAP_HEIGHT, MINIMAP_INSET),
      nodes: cy.nodes(".module").map((n) => ({ id: n.id(), ...n.position(), colour: String(n.data("colour")) })),
      edges: cy.edges().map((e) => ({ id: e.id(), from: e.source().position(), to: e.target().position() })),
      view: { x1: extent.x1, y1: extent.y1, x2: extent.x2, y2: extent.y2 },
    },
  };
}

/**
 * Records the reader's own zooms and pans in `movedRef` (Cytoscape's gesture events; programmatic fits and pans do not
 * emit them) and keeps the caption layer and the minimap following the view, at most once a frame. Returns the cleanup.
 */
export function followView(cy: Core, movedRef: MutableRefObject<boolean>, setOverlay: (o: Overlay) => void): () => void {
  cy.on("dragpan scrollzoom pinchzoom", () => {
    movedRef.current = true;
  });
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!cy.destroyed()) setOverlay(measureOverlay(cy));
    });
  };
  cy.on("viewport resize layoutstop add remove data", schedule);
  schedule();
  return () => cancelAnimationFrame(frame);
}

/**
 * When the graph's box changes width (the window, a docked sheet; REQ-024), after a short debounce the graph resizes
 * and, unless the reader has zoomed or panned since the last fit, fits again by the readable rule; a reader's view
 * keeps its centre. `afterRef` may then adjust the view. Nothing is animated, so reduced motion is respected.
 */
export function useRefitOnResize(
  container: RefObject<HTMLElement>,
  cyRef: MutableRefObject<Core | null>,
  movedRef: MutableRefObject<boolean>,
  afterRef?: MutableRefObject<(cy: Core, width: number) => void>,
) {
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
      afterRef?.current(cy, next);
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
  }, [container, cyRef, movedRef, afterRef]);
}

interface CaptionsProps {
  items: { id: string; text: string }[];
  overlay: Overlay;
  /** Labels beside the dots (top to bottom): captions are left-aligned. */
  beside: boolean;
  dimmed?: (id: string) => boolean;
}

/** Captions under the type labels, placed from the measured overlay; hidden from assistive technology. */
export function GraphCaptions({ items, overlay, beside, dimmed }: CaptionsProps) {
  return (
    <div className={beside ? "graph-captions is-beside" : "graph-captions"} aria-hidden="true">
      {items.map(({ id, text }) => {
        const box = overlay.captions[id];
        return (
          <div
            key={id}
            className={dimmed?.(id) ? "graph-caption is-dimmed" : "graph-caption"}
            data-module={id}
            style={
              box
                ? { left: box.left, top: box.top, width: box.width, fontSize: box.fontSize, lineHeight: `${box.lineHeight}px` }
                : { visibility: "hidden" }
            }
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

interface ViewProps {
  cyRef: MutableRefObject<Core | null>;
  movedRef: MutableRefObject<boolean>;
}

/** The minimap of the overlay, when there is one; clicking or dragging on it centres the view there. */
export function GraphMinimapFor({ overlay, cyRef, movedRef }: ViewProps & { overlay: Overlay }) {
  if (!overlay.minimap) return null;
  const centre = (p: Point) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.pan(centreOn(p, cy.zoom(), cy.width(), cy.height()));
    movedRef.current = true;
  };
  return <GraphMinimap model={overlay.minimap} onCentre={centre} />;
}

/** Fit to view, zoom in and out, and an optional legend toggle. */
export function GraphToolbar({ cyRef, movedRef, legend }: ViewProps & { legend?: { open: boolean; onToggle: () => void; controls: string } }) {
  // `moved` records whether the action leaves a view the reader chose (zoom) or the fit.
  const withCy = (action: (cy: Core) => void, moved: boolean) => () => {
    if (!cyRef.current) return;
    action(cyRef.current);
    movedRef.current = moved;
  };
  return (
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
      {legend && (
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Legend"
          title="Legend"
          aria-expanded={legend.open}
          aria-controls={legend.controls}
          onClick={legend.onToggle}
        >
          <Shapes size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
