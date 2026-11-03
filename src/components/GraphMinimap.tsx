// Minimap of a module graph that does not fit its box (SPEC-UI-001 UI AC-37): a dot per module in its group colour,
// faint connections and a rectangle for the part in view. Clicking or dragging on it centres the view there. Hidden
// from assistive technology; the toolbar and the tables are the accessible path.
import type { PointerEvent } from "react";
import { fromMinimap, toMinimap, type Bounds, type MinimapFrame, type Point } from "../lib/graphOverlay";

export const MINIMAP_WIDTH = 160;
export const MINIMAP_HEIGHT = 100;
export const MINIMAP_INSET = 8;

export interface MinimapModel {
  frame: MinimapFrame;
  nodes: { id: string; x: number; y: number; colour: string }[];
  edges: { id: string; from: Point; to: Point }[];
  /** The part of the graph in view, in graph coordinates. */
  view: Bounds;
}

interface Props {
  model: MinimapModel;
  onCentre: (graphPoint: Point) => void;
}

export function GraphMinimap({ model, onCentre }: Props) {
  const { frame } = model;
  const centreAt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) * MINIMAP_WIDTH) / r.width, y: ((e.clientY - r.top) * MINIMAP_HEIGHT) / r.height };
    onCentre(fromMinimap(p, frame));
  };
  const a = toMinimap({ x: model.view.x1, y: model.view.y1 }, frame);
  const b = toMinimap({ x: model.view.x2, y: model.view.y2 }, frame);
  return (
    <svg
      className="graph-minimap"
      aria-hidden="true"
      focusable="false"
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      viewBox={`0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        centreAt(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) centreAt(e);
      }}
    >
      {model.edges.map((edge) => {
        const s = toMinimap(edge.from, frame);
        const t = toMinimap(edge.to, frame);
        return <line key={edge.id} className="graph-minimap-edge" x1={s.x} y1={s.y} x2={t.x} y2={t.y} />;
      })}
      {model.nodes.map((n) => {
        const p = toMinimap(n, frame);
        return <circle key={n.id} className="graph-minimap-node" cx={p.x} cy={p.y} r={3} fill={n.colour} />;
      })}
      <rect className="graph-minimap-view" x={a.x} y={a.y} width={Math.max(0, b.x - a.x)} height={Math.max(0, b.y - a.y)} />
    </svg>
  );
}
