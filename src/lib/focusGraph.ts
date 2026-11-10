// The phone view of a platform's module graph: one module in the middle and the modules it connects to around it
// (SPEC-UI-001 phone pass). Pure functions: which module to start on, the neighbourhood of a module, which module a
// selection should centre on, and where the neighbours sit.
import type { Connection, Module, PlatformGraph } from "../data/types";
import type { Selection } from "./steps";

export interface Neighbour {
  module: Module;
  /** Connections between the focus module and this one, either direction, in data order. */
  connections: Connection[];
}

export interface Neighbourhood {
  focus: Module;
  neighbours: Neighbour[];
}

const touches = (c: Connection, id: string) => c.from_module === id || c.to_module === id;

/** Number of connections of each module, self-loops counted once. */
export function degrees(platform: Pick<PlatformGraph, "modules" | "connections">): Map<string, number> {
  const d = new Map(platform.modules.map((m) => [m.module_id, 0]));
  for (const c of platform.connections) {
    d.set(c.from_module, (d.get(c.from_module) ?? 0) + 1);
    if (c.to_module !== c.from_module) d.set(c.to_module, (d.get(c.to_module) ?? 0) + 1);
  }
  return d;
}

/** The module the view starts on: the one with the most connections, the first in data order on a tie. */
export function hubModule(platform: Pick<PlatformGraph, "modules" | "connections">): string | null {
  const d = degrees(platform);
  let best: string | null = null;
  for (const m of platform.modules) if (best === null || (d.get(m.module_id) ?? 0) > (d.get(best) ?? 0)) best = m.module_id;
  return best;
}

/** The focus module and every module one connection away, in data order of the modules. */
export function neighbourhood(platform: Pick<PlatformGraph, "modules" | "connections">, focusId: string): Neighbourhood | null {
  const focus = platform.modules.find((m) => m.module_id === focusId);
  if (!focus) return null;
  const mine = platform.connections.filter((c) => touches(c, focusId));
  const neighbours: Neighbour[] = [];
  for (const m of platform.modules) {
    if (m.module_id === focusId) continue;
    const connections = mine.filter((c) => touches(c, m.module_id));
    if (connections.length) neighbours.push({ module: m, connections });
  }
  return { focus, neighbours };
}

/**
 * The module a selection centres the view on, or null to keep the current one: a module itself; a connection's
 * source unless the current focus is one of its ends; a step's first module unless the focus is one of its modules.
 */
export function focusFor(platform: Pick<PlatformGraph, "connections" | "steps">, selection: Selection, current: string | null): string | null {
  if (!selection) return null;
  if (selection.kind === "module") return selection.id;
  if (selection.kind === "connection") {
    const c = platform.connections.find((e) => e.edge_id === selection.id);
    if (!c || (current && touches(c, current))) return null;
    return c.from_module;
  }
  if (selection.kind === "step") {
    const s = platform.steps.find((e) => e.step_id === selection.id);
    if (!s || !s.modules.length || (current && s.modules.includes(current))) return null;
    return s.modules[0]!;
  }
  return null;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Places for n neighbours on a ring (an ellipse in a box taller than wide) around the centre of a w by h box, kept
 * `margin` from its edges; the first at the top, going clockwise.
 */
export function ringPositions(n: number, w: number, h: number, margin: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const rx = Math.max(0, cx - margin);
  const ry = Math.max(0, cy - margin);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

/** A connection label for one neighbour: each transfer mode once, with a count when it repeats ("arm/gantry ×2"). */
export function modeLabel(labels: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(" · ");
}
