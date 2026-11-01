// Readable fit for the module graph. Fitting a long chain to the box width can shrink 12px labels below
// legibility, so the fitted zoom is clamped to [READABLE_ZOOM, MAX_FIT_ZOOM]. When the graph does not fit at the
// readable zoom, its left (or top) end is shown at the padding and the reader pans for the rest.

export const READABLE_ZOOM = 1;
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

function axisPan(start: number, size: number, view: number, padding: number, zoom: number): number {
  const rendered = size * zoom;
  const offset = rendered <= view - 2 * padding ? (view - rendered) / 2 : padding;
  return offset - start * zoom;
}

export function readableViewport(bb: Box, width: number, height: number, padding: number): Viewport {
  const fitX = bb.w > 0 ? (width - 2 * padding) / bb.w : Infinity;
  const fitY = bb.h > 0 ? (height - 2 * padding) / bb.h : Infinity;
  const zoom = Math.min(MAX_FIT_ZOOM, Math.max(READABLE_ZOOM, Math.min(fitX, fitY)));
  return {
    zoom,
    pan: {
      x: axisPan(bb.x1, bb.w, width, padding, zoom),
      y: axisPan(bb.y1, bb.h, height, padding, zoom),
    },
  };
}
