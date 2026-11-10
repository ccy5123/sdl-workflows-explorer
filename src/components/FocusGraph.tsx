// The module graph on a phone (SPEC-UI-001 phone pass): one module in the middle with the modules it connects to on a
// ring around it, drawn large enough to read (14 px names). Tapping a neighbour moves the middle to it, tapping the
// middle module or a line selects it (its evidence opens), and a row of module buttons above reaches any module.
// Below, a key of the line colours and the middle module's connections, one per row. With more than five neighbours
// the ring grows taller and the lines lose their labels (the list names every mode). "Whole graph" opens the full
// force-directed graph on the whole screen.
import { Maximize2 } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Connection, PlatformGraph } from "../data/types";
import { focusFor, hubModule, modeLabel, neighbourhood, ringPositions } from "../lib/focusGraph";
import { displayLabel } from "../lib/labels";
import { groupOf, transferModeStyle } from "../lib/moduleGroups";
import type { Selection } from "../lib/steps";
import { Sheet } from "./Sheet";

const W = 340;
/** Height of the drawing; taller when the ring holds more than CROWDED neighbours. */
const H = 360;
const H_CROWDED = 470;
const CROWDED = 5;
const RING_MARGIN = 46;
/** How far along the line from the middle a connection's label sits: past the middle module's name. */
const LABEL_AT = 0.6;
/** Space between parallel lines to one neighbour. */
const LANE = 9;

const typeName = (code: string) => displayLabel("module_type", code);
const shortId = (id: string) => id.slice(id.lastIndexOf("/") + 1);

function onKeys(e: KeyboardEvent, action: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}

/** Where a label sits so it stays inside the drawing: under the dot, nudged in from the side edges. */
function labelX(x: number, text: string) {
  const half = (text.length * 7.6) / 2;
  return Math.min(W - 4 - half, Math.max(4 + half, x));
}

function connectionName(c: Connection, names: Map<string, string>) {
  return `${names.get(c.from_module)} ${shortId(c.from_module)} to ${names.get(c.to_module)} ${shortId(c.to_module)}, ${displayLabel("transfer_mode", c.transfer_mode)}, ${c.stated ? "stated in the paper" : "inferred"}`;
}

export function FocusGraph({
  platform,
  selection,
  onSelect,
  whole,
}: {
  platform: PlatformGraph;
  selection: Selection;
  onSelect: (selection: NonNullable<Selection>) => void;
  /** The full graph, shown on the whole screen by "Whole graph". */
  whole: ReactNode;
}) {
  const [focus, setFocus] = useState<string | null>(() => hubModule(platform));
  const [wholeOpen, setWholeOpen] = useState(false);
  // A selection made elsewhere (a step, a table row) moves the middle to it when it is not already in view.
  useEffect(() => {
    const next = focusFor(platform, selection, focus);
    if (next && next !== focus) setFocus(next);
  }, [platform, selection]); // not on focus: moving the middle by hand must not snap back to the selection

  const names = useMemo(() => new Map(platform.modules.map((m) => [m.module_id, typeName(m.module_type)])), [platform]);
  const hood = focus ? neighbourhood(platform, focus) : null;
  const picked = (kind: string, id: string) => selection?.kind === kind && selection.id === id;
  const stepModules = selection?.kind === "step" ? new Set(platform.steps.find((s) => s.step_id === selection.id)?.modules ?? []) : null;

  // Moving the middle only moves it; the evidence opens from the middle module or a line, so walking the graph does
  // not keep raising the evidence sheet over it.
  const goTo = (id: string) => setFocus(id);

  const crowded = (hood?.neighbours.length ?? 0) > CROWDED;
  const h = crowded ? H_CROWDED : H;
  const places = hood ? ringPositions(hood.neighbours.length, W, h, RING_MARGIN) : [];
  const cx = W / 2;
  const cy = h / 2;
  const modes = [...new Set(platform.connections.map((c) => transferModeStyle(c.transfer_mode).colour))];
  const shownModes = hood
    ? [...new Map(hood.neighbours.flatMap((n) => n.connections).map((c) => [c.transfer_mode, transferModeStyle(c.transfer_mode)])).entries()]
    : [];

  return (
    <div className="card graph-wrap focus-graph">
      <div className="focus-head">
        <h2 className="focus-title">Modules and connections</h2>
        <button type="button" className="btn btn-secondary btn-sm" aria-haspopup="dialog" onClick={() => setWholeOpen(true)}>
          <Maximize2 size={15} aria-hidden="true" />
          Whole graph
        </button>
      </div>
      <div className="focus-chips" role="group" aria-label="Module in the middle">
        {platform.modules.map((m) => (
          <button key={m.module_id} type="button" className="chip" aria-pressed={m.module_id === focus} onClick={() => goTo(m.module_id)}>
            <span className="chip-dot" style={{ background: groupOf(m.module_type).colour }} aria-hidden="true" />
            {typeName(m.module_type)} <span className="focus-chip-id">{shortId(m.module_id)}</span>
          </button>
        ))}
      </div>
      {hood && (
        <svg
          className="focus-svg"
          viewBox={`0 0 ${W} ${h}`}
          role="group"
          aria-label={`${typeName(hood.focus.module_type)} ${shortId(hood.focus.module_id)} and the ${hood.neighbours.length} modules it connects to`}
        >
          <defs>
            {modes.map((colour) => (
              <marker key={colour} id={`focus-arrow-${colour.slice(1)}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={colour} />
              </marker>
            ))}
          </defs>
          {hood.neighbours.map((n, i) => {
            const p = places[i]!;
            const dx = p.x - cx;
            const dy = p.y - cy;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            return n.connections.map((c, k) => {
              const off = (k - (n.connections.length - 1) / 2) * LANE;
              const ox = -uy * off;
              const oy = ux * off;
              const outward = c.from_module === hood.focus.module_id;
              // Lines stop at the dots' edges so the arrowhead shows.
              const a = { x: cx + ux * 20 + ox, y: cy + uy * 20 + oy };
              const b = { x: p.x - ux * 16 + ox, y: p.y - uy * 16 + oy };
              const style = transferModeStyle(c.transfer_mode);
              const on = picked("connection", c.edge_id);
              const [x1, y1, x2, y2] = outward ? [a.x, a.y, b.x, b.y] : [b.x, b.y, a.x, a.y];
              return (
                <g
                  key={c.edge_id}
                  className={on ? "focus-edge picked" : "focus-edge"}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={connectionName(c, names)}
                  onClick={() => onSelect({ kind: "connection", id: c.edge_id })}
                  onKeyDown={(e) => onKeys(e, () => onSelect({ kind: "connection", id: c.edge_id }))}
                >
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={18} />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={style.colour}
                    strokeWidth={on ? 4.5 : 2.5}
                    strokeDasharray={c.stated ? undefined : "7 5"}
                    markerEnd={`url(#focus-arrow-${style.colour.slice(1)})`}
                  />
                </g>
              );
            });
          })}
          {!crowded && hood.neighbours.map((n, i) => {
            const p = places[i]!;
            const text = modeLabel(n.connections.map((c) => transferModeStyle(c.transfer_mode).label));
            const mx = cx + (p.x - cx) * LABEL_AT;
            const my = cy + (p.y - cy) * LABEL_AT;
            const w = text.length * 7 + 8;
            return (
              <g key={`label-${n.module.module_id}`} className="focus-edge-label" aria-hidden="true">
                <rect x={mx - w / 2} y={my - 10} width={w} height={20} rx={4} />
                <text x={mx} y={my + 4.5} textAnchor="middle">
                  {text}
                </text>
              </g>
            );
          })}
          {hood.neighbours.map((n, i) => {
            const p = places[i]!;
            const m = n.module;
            const name = typeName(m.module_type);
            const dim = stepModules !== null && !stepModules.has(m.module_id);
            return (
              <g
                key={m.module_id}
                className={dim ? "focus-node dimmed" : "focus-node"}
                role="button"
                tabIndex={0}
                aria-label={`${name} ${shortId(m.module_id)}${m.on_platform ? "" : ", outside the platform"}: put it in the middle`}
                onClick={() => goTo(m.module_id)}
                onKeyDown={(e) => onKeys(e, () => goTo(m.module_id))}
              >
                <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={12} fill={groupOf(m.module_type).colour} className={m.on_platform ? undefined : "off-platform"} />
                {/* Below a module in the lower part of the ring, above it otherwise: the name stays off its lines and
                    off the middle module's name, which sits under the middle dot. */}
                <text x={labelX(p.x, name)} y={p.y > cy + 40 ? p.y + 30 : p.y - 20} textAnchor="middle" className="focus-name">
                  {name}
                </text>
              </g>
            );
          })}
          {(() => {
            const m = hood.focus;
            const name = typeName(m.module_type);
            const on = picked("module", m.module_id);
            const dim = stepModules !== null && !stepModules.has(m.module_id);
            return (
              <g
                className={dim ? "focus-node focus-centre dimmed" : "focus-node focus-centre"}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${name} ${shortId(m.module_id)}${m.on_platform ? "" : ", outside the platform"}: show its evidence`}
                onClick={() => onSelect({ kind: "module", id: m.module_id })}
                onKeyDown={(e) => onKeys(e, () => onSelect({ kind: "module", id: m.module_id }))}
              >
                <circle cx={cx} cy={cy} r={24} fill="transparent" />
                <circle cx={cx} cy={cy} r={16} fill={groupOf(m.module_type).colour} className={on ? "picked" : m.on_platform ? undefined : "off-platform"} />
                <text x={labelX(cx, name)} y={cy + 36} textAnchor="middle" className="focus-name focus-name-centre">
                  {name}
                </text>
              </g>
            );
          })()}
        </svg>
      )}
      {hood && hood.neighbours.length === 0 && <p className="focus-none">No connections to or from this module are coded.</p>}
      {shownModes.length > 0 && (
        <ul className="focus-modes" aria-label="Line colours">
          {shownModes.map(([code, style]) => (
            <li key={code}>
              <span className="focus-swatch" style={{ background: style.colour }} aria-hidden="true" />
              {displayLabel("transfer_mode", code)}
            </li>
          ))}
        </ul>
      )}
      {hood && (
        <>
          <h3 className="focus-list-title">
            Connections of {typeName(hood.focus.module_type)} {shortId(hood.focus.module_id)}
          </h3>
          <ul className="focus-list">
            {hood.neighbours.flatMap((n) =>
              n.connections.map((c) => {
                const out = c.from_module === hood.focus.module_id;
                const other = out ? c.to_module : c.from_module;
                return (
                  <li key={c.edge_id}>
                    <button
                      type="button"
                      aria-pressed={picked("connection", c.edge_id)}
                      aria-label={connectionName(c, names)}
                      onClick={() => onSelect({ kind: "connection", id: c.edge_id })}
                    >
                      <span className="focus-dir" aria-hidden="true">
                        {out ? "→" : "←"}
                      </span>
                      <span className="focus-other">
                        {names.get(other)} <span className="focus-chip-id">{shortId(other)}</span>
                      </span>
                      <span className={c.stated ? "focus-mode" : "focus-mode inferred"}>
                        {displayLabel("transfer_mode", c.transfer_mode)}
                        {c.stated ? "" : ", inferred"}
                      </span>
                    </button>
                  </li>
                );
              }),
            )}
          </ul>
        </>
      )}
      <p className="focus-key">Solid line: stated in the paper; dashed line: inferred. A dashed ring marks equipment outside the platform.</p>
      {wholeOpen && (
        <Sheet id="whole-graph" title="Whole graph" full onClose={() => setWholeOpen(false)}>
          {whole}
        </Sheet>
      )}
    </div>
  );
}
