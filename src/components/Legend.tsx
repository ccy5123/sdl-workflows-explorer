// Legend: display groups, transfer modes and line markers (REQ-007, REQ-009, REQ-010, REQ-011). The unmapped mode
// line takes var(--unmapped), black in light and the text colour in dark (SPEC-SITE-001 REQ-009). It floats over the
// graph and opens from the graph toolbar (SPEC-UI-001 REQ-018). Each module type and transfer mode shows its readable
// name, as the graph does, with the vocabulary code beside it (SPEC-UI-001 REQ-021).
import { displayLabel } from "../lib/labels";
import { DISPLAY_GROUPS, TRANSFER_MODES } from "../lib/moduleGroups";

export function Legend({ id, hidden }: { id: string; hidden: boolean }) {
  return (
    // tabIndex 0: the legend scrolls inside itself, so a keyboard must be able to reach it (axe scrollable-region-focusable).
    <section id={id} className="legend" aria-labelledby="legend-heading" hidden={hidden} tabIndex={0}>
      <h2 id="legend-heading">Legend</h2>
      <h3>Module groups</h3>
      <p className="note" data-legend="note">
        Groups are a display choice of this site, not part of the dataset. Each node is labelled with its module type;
        the codes used in the data are given beside the names.
      </p>
      <ul data-legend="groups">
        {DISPLAY_GROUPS.map((g) => (
          <li key={g.name}>
            <span className="swatch" style={{ background: g.colour }} aria-hidden="true" />
            <strong>{g.name}</strong>
            <ul className="legend-types">
              {g.types.map((t) => (
                <li key={t}>
                  {displayLabel("module_type", t)} <code>{t}</code>
                </li>
              ))}
            </ul>
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
            {displayLabel("transfer_mode", m.mode)} <code>{m.mode}</code>
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
