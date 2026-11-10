// Force-directed layout of the platform viewer's module graph: a d3-force simulation drives the Cytoscape node
// positions, so the modules drift into place and come to rest, can be dragged (the others make room and settle again),
// and the reader pans and zooms as before. Text keeps clear of text: module labels and connection labels push each
// other apart. The first layout starts from whichever of three starting points ends with the fewest edge crossings.
// Reduced motion lays the graph out once and never animates it.
import type { Core, EventObject, NodeSingular } from "cytoscape";
import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceX,
  type ForceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

/** Scratch key on a Cytoscape core whose readable fit centres the graph rather than showing its start. */
export const CENTRE_FIT = "_centreFit";
/** Scratch key recording the edge crossings of each starting point and the one chosen (read by the e2e tests). */
export const FORCE_STARTS = "_forceStarts";
/** Scratch key: true while the simulation is at rest (the e2e tests measure the graph once it is). */
export const FORCE_SETTLED = "_forceSettled";

interface SimNode extends SimulationNodeDatum {
  id: string;
  /** Half width and half height of the dot-and-label box, and its centre's offset from the dot. */
  hw: number;
  hh: number;
  dx: number;
  dy: number;
  onPlatform: boolean;
}

type SimLink = SimulationLinkDatum<SimNode>;

/** A point the simulation has placed (d3 fills in x and y). */
interface Placed {
  x?: number;
  y?: number;
}

/** Gap kept between two modules' label boxes, in model pixels. */
const BOX_GAP = 12;
/** Room the dashed platform boundary takes around its modules (its padding and its title above). */
const BOUNDARY_PAD = { side: 28, top: 20 };
/** Distance between two label boxes within which they push each other apart, in model pixels. */
const LABEL_RANGE = 18;

/**
 * Moves overlapping label boxes apart along the axis of least overlap. A position correction rather than a push, so
 * the link and charge forces cannot hold two labels on top of each other; a pinned (dragged) module does not move and
 * the other takes the whole correction.
 */
function boxCollide(nodes: SimNode[]) {
  return () => {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          const ax = a.x! + a.dx;
          const ay = a.y! + a.dy;
          const bx = b.x! + b.dx;
          const by = b.y! + b.dy;
          const ox = a.hw + b.hw + BOX_GAP - Math.abs(bx - ax);
          const oy = a.hh + b.hh + BOX_GAP - Math.abs(by - ay);
          if (ox <= 0 || oy <= 0) continue;
          const aFixed = a.fx != null;
          const bFixed = b.fx != null;
          const shareA = aFixed ? 0 : bFixed ? 1 : 0.5;
          const shareB = bFixed ? 0 : aFixed ? 1 : 0.5;
          if (ox < oy) {
            const s = (bx >= ax ? 1 : -1) * ox * 0.6;
            a.x! -= s * shareA;
            b.x! += s * shareB;
          } else {
            const s = (by >= ay ? 1 : -1) * oy * 0.6;
            a.y! -= s * shareA;
            b.y! += s * shareB;
          }
        }
      }
    }
  };
}

/**
 * The label of a connection, or the stacked labels of a bundle of parallel connections: a box at the middle of the
 * edge, moved by moving the edge's two ends. `along` is its length along the edge and `across` its thickness. A level
 * label keeps its box at any angle; the labels of a bundle turn with their curves, so their box turns with the edge.
 */
interface EdgeLabel {
  source: SimNode;
  target: SimNode;
  along: number;
  across: number;
  turned: boolean;
}

/** Centre and half sizes of a connection label box for the edge's current ends. */
function edgeBox(e: EdgeLabel): { x: number; y: number; hw: number; hh: number } {
  const x = (e.source.x! + e.target.x!) / 2;
  const y = (e.source.y! + e.target.y!) / 2;
  if (!e.turned) return { x, y, hw: e.along / 2, hh: e.across / 2 };
  const angle = Math.atan2(e.target.y! - e.source.y!, e.target.x! - e.source.x!);
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return { x, y, hw: (c * e.along + s * e.across) / 2, hh: (s * e.along + c * e.across) / 2 };
}

/**
 * Moves connection labels off module labels, as boxCollide does for module labels: the module takes half the
 * correction and the edge's two ends the other half between them (a label on its own end module lengthens its edge).
 */
function edgeLabelCollide(nodes: SimNode[], edges: EdgeLabel[]) {
  return () => {
    for (const e of edges) {
      for (const n of nodes) {
        const b = edgeBox(e);
        const nx = n.x! + n.dx;
        const ny = n.y! + n.dy;
        const ox = b.hw + n.hw + BOX_GAP / 2 - Math.abs(nx - b.x);
        const oy = b.hh + n.hh + BOX_GAP / 2 - Math.abs(ny - b.y);
        if (ox <= 0 || oy <= 0) continue;
        const alongX = ox < oy;
        const s = (alongX ? (nx >= b.x ? 1 : -1) * ox : (ny >= b.y ? 1 : -1) * oy) * 0.5;
        const move = (m: SimNode, by: number) => {
          if (m.fx != null) return;
          if (alongX) m.x! += by;
          else m.y! += by;
        };
        move(n, s * 0.5);
        move(e.source, -s * 0.25);
        move(e.target, -s * 0.25);
      }
    }
  };
}

/** Width of a connection label in the graph's 12 px type (a canvas measurement; an estimate where there is none). */
function labelWidth(text: string): number {
  const ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  if (!ctx) return text.length * 6.5;
  ctx.font = "12px Arial, Helvetica, sans-serif";
  return ctx.measureText(text).width;
}

/**
 * Text pushes text away, not only dots: every module label (type and caption) and every connection label repels the
 * others while their boxes are closer than LABEL_RANGE, harder the more they overlap. A connection label's push is
 * shared by the two modules it joins, so a label crowding its own end module lengthens its edge. The push is along
 * the line between the two box centres, scaled by the boxes' sizes, so wide labels part sideways less readily than
 * they part up and down.
 */
function labelRepel(nodes: SimNode[], edges: EdgeLabel[], strength: number) {
  return (alpha: number) => {
    const bodies = [
      ...nodes.map((n) => ({ x: n.x! + n.dx, y: n.y! + n.dy, hw: n.hw, hh: n.hh, ends: [n], share: 1 })),
      ...edges.map((e) => ({ ...edgeBox(e), ends: [e.source, e.target], share: 0.5 })),
    ];
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i]!;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j]!;
        const sx = a.hw + b.hw;
        const sy = a.hh + b.hh;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const gap = Math.max(Math.abs(dx) - sx, Math.abs(dy) - sy);
        if (gap >= LABEL_RANGE) continue;
        if (dx === 0 && dy === 0) {
          dx = (i - j) * 0.01;
          dy = 0.01;
        }
        // Direction in box units: two wide labels side by side part along whichever axis frees them sooner.
        const ux = dx / sx;
        const uy = dy / sy;
        const len = Math.hypot(ux, uy);
        const f = strength * alpha * (LABEL_RANGE - gap);
        const fx = (ux / len) * f;
        const fy = (uy / len) * f;
        for (const n of a.ends) {
          n.vx! -= fx * a.share;
          n.vy! -= fy * a.share;
        }
        for (const n of b.ends) {
          n.vx! += fx * b.share;
          n.vy! += fy * b.share;
        }
      }
    }
  };
}

/** True when segments p1-p2 and q1-q2 cross at a point inside both. */
function segmentsCross(p1: Placed, p2: Placed, q1: Placed, q2: Placed): boolean {
  const side = (a: Placed, b: Placed, c: Placed) => (c.y! - a.y!) * (b.x! - a.x!) - (b.y! - a.y!) * (c.x! - a.x!);
  return side(p1, p2, q1) * side(p1, p2, q2) < 0 && side(q1, q2, p1) * side(q1, q2, p2) < 0;
}

/** True when two connections share a module (such edges meet at it and are not counted as crossing). */
function adjacent<T>(a: { source: T; target: T }, b: { source: T; target: T }): boolean {
  return a.source === b.source || a.source === b.target || a.target === b.source || a.target === b.target;
}

/** Edge crossings between connections that share no module, with edges drawn as straight lines. */
export function countCrossings<T extends Placed>(links: { source: T; target: T }[]): number {
  let count = 0;
  for (let i = 0; i < links.length; i++) {
    for (let j = i + 1; j < links.length; j++) {
      const a = links[i]!;
      const b = links[j]!;
      if (!adjacent(a, b) && segmentsCross(a.source, a.target, b.source, b.target)) count++;
    }
  }
  return count;
}

/**
 * Untangles crossing connections: while two edges that share no module cross, their middles push apart, which
 * carries one edge off the other.
 */
function uncross(links: { source: SimNode; target: SimNode }[], strength: number) {
  return (alpha: number) => {
    for (let i = 0; i < links.length; i++) {
      const a = links[i]!;
      for (let j = i + 1; j < links.length; j++) {
        const b = links[j]!;
        if (adjacent(a, b) || !segmentsCross(a.source, a.target, b.source, b.target)) continue;
        let dx = (b.source.x! + b.target.x! - a.source.x! - a.target.x!) / 2;
        let dy = (b.source.y! + b.target.y! - a.source.y! - a.target.y!) / 2;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const f = strength * alpha;
        for (const n of [a.source, a.target]) {
          n.vx! -= dx * f;
          n.vy! -= dy * f;
        }
        for (const n of [b.source, b.target]) {
          n.vx! += dx * f;
          n.vy! += dy * f;
        }
      }
    }
  };
}

/** Keeps modules off the platform outside the box that holds the on-platform modules. */
function boundaryForce(nodes: SimNode[], titleRoom: number, wide: () => boolean) {
  return () => {
    const inside = nodes.filter((n) => n.onPlatform);
    const outside = nodes.filter((n) => !n.onPlatform);
    if (!inside.length || !outside.length) return;
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const n of inside) {
      x1 = Math.min(x1, n.x! + n.dx - n.hw);
      x2 = Math.max(x2, n.x! + n.dx + n.hw);
      y1 = Math.min(y1, n.y! + n.dy - n.hh);
      y2 = Math.max(y2, n.y! + n.dy + n.hh);
    }
    x1 -= BOUNDARY_PAD.side;
    x2 += BOUNDARY_PAD.side;
    y1 -= BOUNDARY_PAD.top + titleRoom;
    y2 += BOUNDARY_PAD.side;
    for (const n of outside) {
      const cx = n.x! + n.dx;
      const cy = n.y! + n.dy;
      const push = [
        { d: cx + n.hw - x1, vx: -1, vy: 0 },
        { d: x2 - (cx - n.hw), vx: 1, vy: 0 },
        { d: cy + n.hh - y1, vx: 0, vy: -1 },
        { d: y2 - (cy - n.hh), vx: 0, vy: 1 },
      ];
      if (push.some((p) => p.d <= 0)) continue;
      // Out along the box's long axis: through a side in a wide box, through the top or bottom on a phone.
      const across = wide() ? 1.25 : 1 / 1.25;
      const cost = (p: { d: number; vy: number }) => p.d * (p.vy === 0 ? 1 : across);
      const least = push.reduce((m, p) => (cost(p) < cost(m) ? p : m));
      // Moved most of the way out at once; the inside modules give way a little, so the two groups part.
      const s = least.d * 0.5;
      if (n.fx == null) {
        n.x! += least.vx * s;
        n.y! += least.vy * s;
      }
      for (const m of inside) {
        if (m.fx != null) continue;
        m.vx! -= (least.vx * s) / (inside.length * 4);
        m.vy! -= (least.vy * s) / (inside.length * 4);
      }
    }
  };
}

/** Height of the platform boundary's title above its box, in model pixels. */
function titleRoom(cy: Core): number {
  const boundary = cy.nodes(".boundary");
  if (boundary.empty()) return 0;
  const withTitle = boundary.boundingBox({ includeLabels: true, includeOverlays: false });
  const box = boundary.boundingBox({ includeLabels: false, includeOverlays: false });
  return Math.max(0, box.y1 - withTitle.y1);
}

/**
 * Positions centred on 0 with the long axis squeezed towards the box's proportions (never below half, so neighbouring
 * ranks keep room for their labels). Squeezing one axis keeps every edge crossing as it was.
 */
export function squeezed(at: { x: number; y: number }[], boxAspect: number): { x: number; y: number }[] {
  const xs = at.map((p) => p.x);
  const ys = at.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...ys) - Math.min(...ys) || 1;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const aspect = w / h;
  const sx = aspect > boxAspect ? Math.max(0.5, boxAspect / aspect) : 1;
  const sy = aspect < boxAspect ? Math.max(0.5, aspect / boxAspect) : 1;
  return at.map((p) => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy }));
}

/** d3-force's own starting spiral (phyllotaxis), as used when a node has no position. */
function spiral(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const r = 10 * Math.sqrt(0.5 + i);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

/** How far the label boxes reach beyond a box of `width` x `height` at zoom 1. */
function overflow(nodes: SimNode[], width: number, height: number): number {
  const x1 = Math.min(...nodes.map((n) => n.x! + n.dx - n.hw));
  const x2 = Math.max(...nodes.map((n) => n.x! + n.dx + n.hw));
  const y1 = Math.min(...nodes.map((n) => n.y! + n.dy - n.hh));
  const y2 = Math.max(...nodes.map((n) => n.y! + n.dy + n.hh));
  return Math.max(0, x2 - x1 - width) + Math.max(0, y2 - y1 - height);
}

/** Pull towards the centre on each axis: a wide box holds a wide cluster, a phone a tall one. */
function centring(width: number, height: number) {
  return width >= height ? { x: 0.08, y: 0.13 } : { x: 0.2, y: 0.06 };
}

export interface ForceOptions {
  reducedMotion: boolean;
  /** Box width and height: a wide box gets a wider cluster, a phone a taller one. */
  width: number;
  height: number;
  /** Called once when the first settling is nearly done (alpha below SETTLED_ALPHA), for a final fit. */
  onSettled?: () => void;
  /**
   * Runs a layered layout (dagre) on the graph, left to right (`wide`) or top to bottom. Both are tried as starting
   * points, since a layered layout has few edge crossings to begin with.
   */
  seed?: (wide: boolean) => void;
}

export interface ForceController {
  /** Box size changed: the cluster reshapes to the new box and settles again. */
  setBox(width: number, height: number): void;
  stop(): void;
}

const SETTLED_ALPHA = 0.06;
/** Starting alpha from a layered layout: enough to compact it and part the labels, not to turn it inside out. */
const SEEDED_ALPHA = 0.4;
/** The simulation runs unseen until alpha falls to this, so the first frame already shows the graph's shape. */
const FIRST_FRAME_ALPHA = 0.3;

/**
 * Lays out the `.module` nodes of `cy` with a force simulation and keeps it ready: dragging a module pins it under the
 * pointer and the rest move out of its way; releasing it lets it settle again. The platform boundary and the frame
 * (compound nodes) follow their modules and cannot be dragged themselves.
 */
export function startForceLayout(cy: Core, options: ForceOptions): ForceController {
  const { reducedMotion } = options;
  const modules = cy.nodes(".module");
  cy.nodes(".boundary, .frame").ungrabify();
  // A cluster has no start to show first: fits centre it when it does not fit (graphCanvas readableFit).
  cy.scratch(CENTRE_FIT, true);
  modules.grabify();

  const boxSize = { width: options.width, height: options.height };
  const nodes: SimNode[] = modules.map((n: NodeSingular) => {
    const bb = n.boundingBox({ includeLabels: true, includeOverlays: false, includeEdges: false });
    const at = n.position();
    return {
      id: n.id(),
      hw: bb.w / 2,
      hh: bb.h / 2,
      dx: (bb.x1 + bb.x2) / 2 - at.x,
      dy: (bb.y1 + bb.y2) / 2 - at.y,
      onPlatform: n.parent().is(".boundary"),
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: SimLink[] = cy
    .edges()
    .map((e) => ({ source: e.source().id(), target: e.target().id() }))
    .filter((e) => e.source !== e.target && byId.has(e.source) && byId.has(e.target));
  // Every connection between two different modules, for the untangling force and the crossing count.
  const segments = links.map((l) => ({ source: byId.get(l.source as string)!, target: byId.get(l.target as string)! }));

  // Connection label boxes, measured once: level labels keep their size wherever the edge runs. A bundled edge's label
  // turns with its edge, so it is given a box as tall as it is wide.
  // A bundle of parallel connections is one box: its labels stack across the edge, one line each with the curves'
  // spacing between them (Cytoscape's 40 px control-point step puts the curves' middles about 20 px apart).
  const edgeLabels: EdgeLabel[] = [];
  const bundles = new Map<string, { source: SimNode; target: SimNode; widths: number[] }>();
  cy.edges().forEach((e) => {
    const source = byId.get(e.source().id());
    const target = byId.get(e.target().id());
    const text = String(e.data("label") ?? "");
    if (!source || !target || source === target || !text) return;
    if (e.hasClass("bundled")) {
      const key = [source.id, target.id].sort().join(" ");
      const bundle = bundles.get(key) ?? { source, target, widths: [] };
      bundle.widths.push(labelWidth(text));
      bundles.set(key, bundle);
      return;
    }
    const bb = e.boundingBox({ includeNodes: false, includeEdges: false, includeLabels: true, includeOverlays: false });
    if (bb.w > 0) edgeLabels.push({ source, target, along: bb.w, across: bb.h, turned: false });
  });
  for (const b of bundles.values()) {
    const k = b.widths.length;
    edgeLabels.push({ source: b.source, target: b.target, along: Math.max(...b.widths) + 6, across: k * 16 + (k - 1) * 20, turned: true });
  }

  const pull = centring(options.width, options.height);
  const sim: Simulation<SimNode, SimLink> = forceSimulation<SimNode>(nodes)
    .velocityDecay(0.35)
    .force("link", forceLink<SimNode, SimLink>(links).id((n) => n.id).distance(150).strength(0.4))
    .force("charge", forceManyBody<SimNode>().strength(-240).distanceMax(640))
    .force("labels", labelRepel(nodes, edgeLabels, 0.6))
    .force("uncross", uncross(segments, 40))
    .force("box", boxCollide(nodes))
    .force("edgeLabels", edgeLabelCollide(nodes, edgeLabels))
    .force("boundary", boundaryForce(nodes, titleRoom(cy), () => boxSize.width >= boxSize.height))
    .force("x", forceX<SimNode>(0).strength(pull.x))
    .force("y", forceY<SimNode>(0).strength(pull.y));
  sim.stop();

  // Starting points: the layered layout both ways (squeezed to the box's proportions) and d3's spiral. Each is run to
  // rest unseen; the one that ends with the fewest edge crossings (then the least overflow of the box) is the one the
  // reader sees settle. The simulation is deterministic, so the animated run ends where the trial did. Run again when
  // the box turns from wide to tall or back, since a layout relaxed for one shape does not reshape well for the other.
  type Start = { at: { x: number; y: number }[]; alpha: number };
  const place = (start: Start) => {
    nodes.forEach((n, i) => {
      n.x = start.at[i]!.x;
      n.y = start.at[i]!.y;
      n.vx = 0;
      n.vy = 0;
    });
    sim.alpha(start.alpha);
  };
  const chooseStart = () => {
    const aspect = boxSize.width / Math.max(1, boxSize.height);
    const wide = boxSize.width >= boxSize.height;
    const starts: Start[] = [];
    for (const dir of options.seed ? [wide, !wide] : []) {
      options.seed!(dir);
      starts.push({ at: squeezed(modules.map((n) => n.position()), aspect), alpha: SEEDED_ALPHA });
    }
    starts.push({ at: spiral(nodes.length), alpha: 1 });
    let best = starts[0]!;
    const trials: number[] = [];
    if (starts.length > 1) {
      let bestScore = [Infinity, Infinity];
      for (const start of starts) {
        place(start);
        while (sim.alpha() > sim.alphaMin()) sim.tick();
        const score = [countCrossings(segments), overflow(nodes, boxSize.width, boxSize.height)];
        trials.push(score[0]!);
        if (score[0]! < bestScore[0]! || (score[0] === bestScore[0] && score[1]! < bestScore[1]!)) {
          best = start;
          bestScore = score;
        }
      }
    }
    place(best);
    cy.scratch(FORCE_STARTS, { chosen: starts.indexOf(best), crossings: trials });
  };
  chooseStart();

  let grabbed: string | null = null;
  const apply = () => {
    if (cy.destroyed()) return;
    cy.batch(() => {
      for (const n of nodes) {
        if (n.id === grabbed) continue;
        cy.getElementById(n.id).position({ x: n.x!, y: n.y! });
      }
    });
  };

  let settled = false;
  cy.scratch(FORCE_SETTLED, false);
  sim.on("end", () => {
    if (!cy.destroyed()) cy.scratch(FORCE_SETTLED, true);
  });
  if (reducedMotion) {
    while (sim.alpha() > sim.alphaMin()) sim.tick();
    apply();
    cy.scratch(FORCE_SETTLED, true);
  } else {
    while (sim.alpha() > FIRST_FRAME_ALPHA) sim.tick();
    apply();
    sim.on("tick", () => {
      apply();
      if (!settled && sim.alpha() < SETTLED_ALPHA) {
        settled = true;
        options.onSettled?.();
      }
    });
    sim.restart();
  }

  // Dragging: the module follows the pointer and the simulation warms up so its neighbours make room.
  const onGrab = (e: EventObject) => {
    const n = byId.get(e.target.id());
    if (!n) return;
    grabbed = n.id;
    if (!reducedMotion) cy.scratch(FORCE_SETTLED, false);
    const p = e.target.position();
    n.fx = p.x;
    n.fy = p.y;
    if (!reducedMotion) sim.alphaTarget(0.25).restart();
  };
  const onDrag = (e: EventObject) => {
    const n = byId.get(e.target.id());
    if (!n) return;
    const p = e.target.position();
    n.fx = p.x;
    n.fy = p.y;
    if (reducedMotion) {
      n.x = p.x;
      n.y = p.y;
    }
  };
  const onFree = (e: EventObject) => {
    const n = byId.get(e.target.id());
    if (!n) return;
    grabbed = null;
    n.fx = null;
    n.fy = null;
    if (reducedMotion) {
      const p = e.target.position();
      n.x = p.x;
      n.y = p.y;
    } else sim.alphaTarget(0).restart();
  };
  modules.on("grab", onGrab);
  modules.on("drag", onDrag);
  modules.on("free", onFree);

  // Off screen the simulation pauses; it carries on from where it was when the graph scrolls back into view.
  const box = cy.container();
  let visible = true;
  const observer =
    box && typeof IntersectionObserver !== "undefined" && !reducedMotion
      ? new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (!visible) sim.stop();
          else if (sim.alpha() > sim.alphaMin()) sim.restart();
        })
      : null;
  if (box) observer?.observe(box);

  return {
    setBox(width, height) {
      boxSize.width = width;
      boxSize.height = height;
      const next = centring(width, height);
      if (next.x === pull.x) return;
      pull.x = next.x;
      pull.y = next.y;
      (sim.force("x") as ForceX<SimNode>).strength(next.x);
      (sim.force("y") as ForceY<SimNode>).strength(next.y);
      sim.stop();
      chooseStart();
      settled = false;
      if (reducedMotion) {
        while (sim.alpha() > sim.alphaMin()) sim.tick();
        apply();
      } else {
        cy.scratch(FORCE_SETTLED, false);
        while (sim.alpha() > FIRST_FRAME_ALPHA) sim.tick();
        apply();
        if (visible) sim.restart();
      }
    },
    stop() {
      sim.stop();
      sim.on("tick", null);
      sim.on("end", null);
      observer?.disconnect();
      if (!cy.destroyed()) {
        modules.off("grab", undefined, onGrab);
        modules.off("drag", undefined, onDrag);
        modules.off("free", undefined, onFree);
      }
    },
  };
}
