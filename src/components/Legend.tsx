// Legend: display groups, transfer modes and line markers (REQ-007, REQ-009, REQ-010, REQ-011). The unmapped mode
// line takes var(--unmapped), black in light and the text colour in dark (SPEC-SITE-001 REQ-009).
import { DISPLAY_GROUPS, TRANSFER_MODES } from "../lib/moduleGroups";

export function Legend() {
  return (
    <section className="panel legend" aria-labelledby="legend-heading">
      <h2 id="legend-heading">Legend</h2>
      <h3>Module groups</h3>
      <p className="note" data-legend="note">
        Groups are a display choice of this site, not part of the dataset. Each node is labelled with its module type.
      </p>
      <ul data-legend="groups">
        {DISPLAY_GROUPS.map((g) => (
          <li key={g.name}>
            <span className="swatch" style={{ background: g.colour }} aria-hidden="true" />
            <strong>{g.name}</strong>: {g.types.join(", ")}
          </li>
        ))}
      </ul>
      <h3>Transfer modes</h3>
      <ul data-legend="modes">
        {TRANSFER_MODES.map((m) => (
          <li key={m.mode}>
            <span
              className={m.mode === "data_transfer" ? "line thin" : "line"}
              style={{ borderTopColor: m.mode === "unmapped" ? "var(--unmapped)" : m.colour }}
              aria-hidden="true"
            />
            {m.label} <code>{m.mode}</code>
          </li>
        ))}
      </ul>
      <h3>Markers</h3>
      <ul data-legend="markers">
        <li>
          <span className="line dashed" aria-hidden="true" />
          Dashed edge: inferred connection (not stated in the paper)
        </li>
        <li>
          <span className="marker">?</span> Uncertain connection or step
        </li>
      </ul>
    </section>
  );
}
