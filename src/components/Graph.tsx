// Module graph: Cytoscape with the dagre layout, left to right (REQ-006 to REQ-010, REQ-013), full width with a
// floating toolbar (fit, zoom in and out, legend) and spacing that keeps labels apart (SPEC-UI-001 REQ-018).
// Below 800 px it runs top to bottom (UI AC-36). An HTML layer over the canvas draws each module's name in the paper
// as a caption under its bold type label (UI AC-35), and a minimap shows a graph that does not fit (UI AC-37).
import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Maximize, Shapes, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlatformGraph } from "../data/types";
import { buildElements, buildStylesheet } from "../lib/graphElements";
import type { Theme } from "../lib/siteTokens";
import { captionBox, centreOn, graphFits, minimapFrame, type CaptionBox, type Point } from "../lib/graphOverlay";
import { highlightSet, type Selection } from "../lib/steps";
import { readableViewport } from "../lib/viewport";
import { GraphMinimap, MINIMAP_HEIGHT, MINIMAP_INSET, MINIMAP_WIDTH, type MinimapModel } from "./GraphMinimap";
import { Legend } from "./Legend";
import { useMedia } from "./useMedia";
import { useTheme } from "./useTheme";

cytoscape.use(dagre);

const PADDING = 24;
const ZOOM_STEP = 1.25;

/** The phone breakpoint of the site's CSS (styles.css), below which the graph runs top to bottom. */
const PHONE_QUERY = "(max-width: 799.98px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type RankDir = "LR" | "TB";

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
const LAYOUTS: Record<RankDir, cytoscape.LayoutOptions> = {
  LR: { name: "dagre", rankDir: "LR", fit: false, nodeSep: 36, rankSep: 70, edgeSep: 16, nodeDimensionsIncludeLabels: true, transform: centreLabelBox } as cytoscape.LayoutOptions,
  TB: { name: "dagre", rankDir: "TB", fit: false, nodeSep: 24, rankSep: 36, edgeSep: 12, nodeDimensionsIncludeLabels: true, transform: centreLabelBox } as cytoscape.LayoutOptions,
};

const stylesheet = (theme: Theme, reducedMotion: boolean, rankDir: RankDir) =>
  buildStylesheet(theme, { reducedMotion, labelsBeside: rankDir === "TB" });

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

interface Overlay {
  captions: Record<string, CaptionBox>;
  minimap: MinimapModel | null;
}

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
  if (graphFits(bb, zoom, cy.width(), cy.height())) return { captions, minimap: null };
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
  const theme = useTheme();
  const reducedMotion = useMedia(REDUCED_MOTION_QUERY);
  const rankDir: RankDir = useMedia(PHONE_QUERY) ? "TB" : "LR";
  const styleRef = useRef({ theme, reducedMotion });
  styleRef.current = { theme, reducedMotion };
  const rankDirRef = useRef(rankDir);
  // The direction the current layout was run with.
  const laidOutRef = useRef<RankDir>(rankDir);
  const [legendOpen, setLegendOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>({ captions: {}, minimap: null });
  // True once the reader zooms or pans; a fit (on load or from "Fit to view") clears it (SPEC-UI-001 REQ-024).
  const movedRef = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    laidOutRef.current = rankDirRef.current;
    const cy = cytoscape({
      container: container.current,
      elements: buildElements(platform),
      style: stylesheet(styleRef.current.theme, styleRef.current.reducedMotion, laidOutRef.current),
      layout: LAYOUTS[laidOutRef.current],
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
    // The caption layer and the minimap follow the view, at most once a frame.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!cy.destroyed()) setOverlay(measureOverlay(cy));
      });
    };
    cy.on("viewport resize layoutstop", schedule);
    readableFit(cy);
    movedRef.current = false;
    schedule();
    cyRef.current = cy;
    // Test hook: only the `vite build --mode e2e` bundle exposes the instance (AC-14 checks dist/ has none).
    if (import.meta.env.MODE === "e2e") window.__cy = cy;
    return () => {
      cancelAnimationFrame(frame);
      if (import.meta.env.MODE === "e2e") delete window.__cy;
      cyRef.current = null;
      cy.destroy();
    };
  }, [platform]);

  // The site theme changed while the graph is open (SPEC-SITE-001 REQ-008), or the reduced-motion preference.
  useEffect(() => {
    cyRef.current?.style(stylesheet(theme, reducedMotion, laidOutRef.current));
  }, [theme, reducedMotion]);

  // Crossing the phone breakpoint turns the layout (labels below or beside the dots) and fits it again; the reader's
  // earlier view no longer applies.
  useEffect(() => {
    rankDirRef.current = rankDir;
    const cy = cyRef.current;
    if (!cy || laidOutRef.current === rankDir) return;
    laidOutRef.current = rankDir;
    cy.style(stylesheet(styleRef.current.theme, styleRef.current.reducedMotion, rankDir));
    cy.resize();
    cy.layout(LAYOUTS[rankDir]).run();
    readableFit(cy);
    movedRef.current = false;
  }, [rankDir]);

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

  // A previewed step shows as a selected step does, without selecting it; leaving it shows the selection again.
  const shown: Selection = preview ? { kind: "step", id: preview } : selection;
  const shownStep = shown?.kind === "step" ? platform.steps.find((s) => s.step_id === shown.id) : undefined;
  const keep = useMemo(() => (shownStep ? highlightSet(shownStep) : null), [shownStep]);

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

  // `moved` records whether the toolbar action leaves a view the reader chose (zoom) or the fit.
  const withCy = (action: (cy: Core) => void, moved: boolean) => () => {
    if (!cyRef.current) return;
    action(cyRef.current);
    movedRef.current = moved;
  };

  const centre = (p: Point) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.pan(centreOn(p, cy.zoom(), cy.width(), cy.height()));
    movedRef.current = true;
  };

  return (
    <div className="card graph-wrap">
      <div
        ref={container}
        className="graph"
        role="img"
        aria-label={`Module graph of ${platform.platform_id}: ${platform.modules.length} modules, ${platform.connections.length} connections. The tables below give the same information as text.`}
      />
      <div className={rankDir === "TB" ? "graph-captions is-beside" : "graph-captions"} aria-hidden="true">
        {platform.modules.map((m) => {
          const box = overlay.captions[m.module_id];
          if (!m.name_in_paper) return null;
          return (
            <div
              key={m.module_id}
              className={keep && !keep.has(m.module_id) ? "graph-caption is-dimmed" : "graph-caption"}
              data-module={m.module_id}
              style={
                box
                  ? { left: box.left, top: box.top, width: box.width, fontSize: box.fontSize, lineHeight: `${box.lineHeight}px` }
                  : { visibility: "hidden" }
              }
            >
              {m.name_in_paper}
            </div>
          );
        })}
      </div>
      {overlay.minimap && <GraphMinimap model={overlay.minimap} onCentre={centre} />}
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
