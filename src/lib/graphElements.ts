// Cytoscape elements and stylesheet for one platform (REQ-006 to REQ-010).
// Module ids contain "/", so callers must look elements up with cy.getElementById(), never with "#id" selectors.
import type { ElementDefinition, StylesheetJson } from "cytoscape";
import type { PlatformGraph } from "../data/types";
import { groupOf, transferModeStyle } from "./moduleGroups";
import { SITE_TOKENS, type Theme } from "./siteTokens";

/** Id of the compound node that holds the on-platform modules. */
export function boundaryId(platform: Pick<PlatformGraph, "platform_id">): string {
  return `boundary:${platform.platform_id}`;
}

// @MX:ANCHOR: [AUTO] element contract read by the Graph component, the unit tests and the e2e tests via window.__cy
// @MX:REASON: class names (boundary, inferred, uncertain, mode-*) and data fields are matched by selectors elsewhere
export function buildElements(platform: PlatformGraph): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const parent = boundaryId(platform);
  if (platform.modules.some((m) => m.on_platform)) {
    elements.push({
      group: "nodes",
      data: { id: parent, label: `Platform: ${platform.name ?? platform.platform_id}` },
      classes: "boundary",
    });
  }
  for (const m of platform.modules) {
    elements.push({
      group: "nodes",
      data: {
        id: m.module_id,
        label: m.name_in_paper ? `${m.module_type}\n${m.name_in_paper}` : m.module_type,
        colour: groupOf(m.module_type).colour,
        parent: m.on_platform ? parent : undefined,
      },
      classes: "module",
    });
  }
  for (const c of platform.connections) {
    const style = transferModeStyle(c.transfer_mode);
    const classes = [`mode-${style.mode}`];
    if (!c.stated) classes.push("inferred");
    if (c.uncertain) classes.push("uncertain");
    elements.push({
      group: "edges",
      data: {
        id: c.edge_id,
        source: c.from_module,
        target: c.to_module,
        label: c.uncertain ? `${style.label} ?` : style.label,
        colour: style.colour,
      },
      classes: classes.join(" "),
    });
  }
  return elements;
}

/** The site's UI font (styles.css --font-ui); Cytoscape draws on a canvas and does not inherit CSS fonts. */
const GRAPH_FONT = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif';

/** Cytoscape stylesheet; colours come from the site tokens of the theme (SPEC-SITE-001 REQ-008, REQ-009). */
export function buildStylesheet(theme: Theme = "light"): StylesheetJson {
  const t = SITE_TOKENS[theme];
  const sheet: StylesheetJson = [
    {
      selector: "node",
      style: {
        "background-color": "data(colour)",
        label: "data(label)",
        "text-wrap": "wrap",
        "text-max-width": "150px",
        "text-valign": "bottom",
        "text-margin-y": 4,
        // Larger and wider than before SPEC-UI-001 REQ-018; the Graph layout spaces nodes with their labels included.
        "font-size": 13,
        "font-family": GRAPH_FONT,
        color: t["--text"],
        width: 26,
        height: 26,
        "border-width": 1,
        "border-color": t["--muted"],
      },
    },
    {
      selector: "node.boundary",
      style: {
        "background-color": t["--panel"],
        "background-opacity": 0.6,
        "border-style": "dashed",
        "border-color": t["--muted"],
        "text-valign": "top",
        "text-halign": "center",
        "text-margin-y": -4,
        "font-weight": "bold",
        padding: "16px",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2.5,
        "curve-style": "bezier",
        "line-color": "data(colour)",
        "target-arrow-color": "data(colour)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1,
        label: "data(label)",
        "font-size": 12,
        "font-family": GRAPH_FONT,
        color: t["--text"],
        "text-background-color": t["--bg"],
        "text-background-opacity": 0.85,
        "text-background-padding": "1px",
        "text-rotation": "autorotate",
      },
    },
    { selector: "edge.mode-data_transfer", style: { width: 1 } },
    { selector: "edge.inferred", style: { "line-style": "dashed" } },
    { selector: "edge.uncertain", style: { "font-weight": "bold" } },
    { selector: "node.highlighted", style: { "border-width": 4, "border-color": t["--text"] } },
    { selector: "node.dimmed", style: { opacity: 0.25 } },
    { selector: "edge.dimmed", style: { opacity: 0.2 } },
    { selector: ".picked", style: { "overlay-color": t["--accent"], "overlay-opacity": 0.25, "overlay-padding": 4 } },
  ];
  // The unmapped transfer mode is black in the legend palette; on a dark background it takes the dark text colour.
  if (theme === "dark") {
    const ink = t["--unmapped"];
    sheet.push({ selector: "edge.mode-unmapped", style: { "line-color": ink, "target-arrow-color": ink } });
  }
  return sheet;
}
