// Readable fit for the module graph. Fitting a long chain to the box width can shrink 12px labels below
// legibility, so the fitted zoom is clamped to [READABLE_ZOOM, MAX_FIT_ZOOM]. When the graph does not fit at the
// readable zoom, its left (or top) end is shown at the padding and the reader pans for the rest. A bottom inset (the
// toolbar, which sits at the bottom corner on phones) is kept clear like the box's own edge.

export const READABLE_ZOOM = 1;
/**
 * Lowest fitted zoom of a force-laid-out graph: its frame and the platform box only read as wholes when they are seen
 * whole, so the fit may shrink labels to 75 % (13 px type at about 10 px) before the reader has to pan.
 */
export const CLUSTER_READABLE_ZOOM = 0.75;
export const MAX_FIT_ZOOM = 1.5;

export interface Box {
  x1: number;
  y1: number;
  w: number;
  h: number;
}

export interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

function axisPan(start: number, size: number, view: number, padding: number, zoom: number, centre: boolean): number {
  const rendered = size * zoom;
  const offset = centre || rendered <= view - 2 * padding ? (view - rendered) / 2 : padding;
  return offset - start * zoom;
}

/**
 * With `centre` (a force-laid-out cluster), a graph that does not fit is centred in the box instead of showing its left
 * (or top) end, and the fit may go down to CLUSTER_READABLE_ZOOM.
 */
export function readableViewport(bb: Box, width: number, height: number, padding: number, bottomInset = 0, centre = false): Viewport {
  const view = height - bottomInset;
  const fitX = bb.w > 0 ? (width - 2 * padding) / bb.w : Infinity;
  const fitY = bb.h > 0 ? (view - 2 * padding) / bb.h : Infinity;
  const zoom = Math.min(MAX_FIT_ZOOM, Math.max(centre ? CLUSTER_READABLE_ZOOM : READABLE_ZOOM, Math.min(fitX, fitY)));
  return {
    zoom,
    pan: {
      x: axisPan(bb.x1, bb.w, width, padding, zoom, centre),
      y: axisPan(bb.y1, bb.h, view, padding, zoom, centre),
    },
  };
}
