// Geometry of the HTML layer over the module graph (SPEC-UI-001 UI AC-35, UI AC-37): where an equipment-name caption
// sits in the room its node label keeps for it, whether the graph fits its box, and the minimap's mapping between
// map and graph coordinates. Pure functions; Graph.tsx feeds them Cytoscape's boxes.
import { CAPTION_LINES, LABEL_FONT_SIZE } from "./graphElements";

/** Caption type size in model px; one caption line takes one 13 px label line. */
export const CAPTION_FONT_SIZE = 11;
/** Cytoscape widens every label box by this margin on each side (cytoscape updateBoundsFromLabel). */
const LABEL_BOX_MARGIN = 2;

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CaptionBox {
  left: number;
  top: number;
  width: number;
  fontSize: number;
  lineHeight: number;
}

/**
 * Rendered box of a caption: the last CAPTION_LINES lines of the node's label box (model px), scaled by the zoom and
 * moved by the pan, with type that scales the same way, so it stays inside the room dagre spaced for it.
 */
export function captionBox(label: Bounds, zoom: number, pan: Point): CaptionBox {
  const x1 = label.x1 + LABEL_BOX_MARGIN;
  const x2 = label.x2 - LABEL_BOX_MARGIN;
  const top = label.y2 - LABEL_BOX_MARGIN - CAPTION_LINES * LABEL_FONT_SIZE;
  return {
    left: x1 * zoom + pan.x,
    top: top * zoom + pan.y,
    width: (x2 - x1) * zoom,
    fontSize: CAPTION_FONT_SIZE * zoom,
    lineHeight: LABEL_FONT_SIZE * zoom,
  };
}

/** Whether the whole graph (model size `bb`) fits a box of `width` x `height` at `zoom`. */
export function graphFits(bb: { w: number; h: number }, zoom: number, width: number, height: number): boolean {
  return bb.w * zoom <= width && bb.h * zoom <= height;
}

export interface MinimapFrame {
  scale: number;
  /** Map position of the graph's top-left corner (bb.x1, bb.y1). */
  ox: number;
  oy: number;
  x1: number;
  y1: number;
}

/** Scale and offset that fit the graph's box into a `width` x `height` map with `inset` px around it, centred. */
export function minimapFrame(bb: { x1: number; y1: number; w: number; h: number }, width: number, height: number, inset: number): MinimapFrame {
  const innerW = width - 2 * inset;
  const innerH = height - 2 * inset;
  const scale = Math.min(bb.w > 0 ? innerW / bb.w : Infinity, bb.h > 0 ? innerH / bb.h : Infinity);
  const s = Number.isFinite(scale) ? scale : 1;
  return { scale: s, ox: inset + (innerW - bb.w * s) / 2, oy: inset + (innerH - bb.h * s) / 2, x1: bb.x1, y1: bb.y1 };
}

export function toMinimap(p: Point, f: MinimapFrame): Point {
  return { x: f.ox + (p.x - f.x1) * f.scale, y: f.oy + (p.y - f.y1) * f.scale };
}

export function fromMinimap(p: Point, f: MinimapFrame): Point {
  return { x: f.x1 + (p.x - f.ox) / f.scale, y: f.y1 + (p.y - f.oy) / f.scale };
}

/** The pan that puts graph point `p` at the centre of a `width` x `height` box at `zoom`. */
export function centreOn(p: Point, zoom: number, width: number, height: number): Point {
  return { x: width / 2 - p.x * zoom, y: height / 2 - p.y * zoom };
}
