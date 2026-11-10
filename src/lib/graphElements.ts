// Cytoscape elements and stylesheet for one platform (REQ-006 to REQ-010).
// Module ids contain "/", so callers must look elements up with cy.getElementById(), never with "#id" selectors.
import type { ElementDefinition, StylesheetJson } from "cytoscape";
import type { PlatformGraph } from "../data/types";
import { displayLabel } from "./labels";
import { groupOf, transferModeStyle } from "./moduleGroups";
import { SITE_TOKENS, type Theme } from "./siteTokens";

/** Id of the compound node that holds the on-platform modules. */
export function boundaryId(platform: Pick<PlatformGraph, "platform_id">): string {
  return `boundary:${platform.platform_id}`;
}

/** Id of the compound node around every module, on and off the platform (the solid frame). */
export function frameId(platform: Pick<PlatformGraph, "platform_id">): string {
  return `frame:${platform.platform_id}`;
}

/**
 * Caption under the solid frame: what the dashed box and the space outside it mean. Worded as the Modules table's
 * note on "Part of the platform" (release data_dictionary.csv, module.on_platform).
 */
export function frameCaption(platform: Pick<PlatformGraph, "modules">): string {
  const on = platform.modules.filter((m) => m.on_platform).length;
  const off = platform.modules.length - on;
  if (on === 0) return "None of these modules is part of the platform: all are equipment outside it that the loop uses.";
  if (off === 0) return "Dashed box: the platform. Every module here is part of it.";
  return "Dashed box: the platform. Modules outside it are equipment the loop uses that is not part of the platform.";
}

/** Node label size and wrap width (SPEC-UI-001 REQ-018); the caption layer of the Graph reads the same values. */
export const LABEL_FONT_SIZE = 13;
export const LABEL_MAX_WIDTH = 150;
/** Lines kept blank under the type for the equipment-name caption (SPEC-UI-001 UI AC-35). */
export const CAPTION_LINES = 2;
/** Rough width of one caption character (11 px Arial), used to size the reserved room. */
const CAPTION_CHAR_WIDTH = 5.6;
const EM_SPACE = String.fromCharCode(0x2003);
/**
 * Zero-width space closing a label that ends in reserved lines: Cytoscape trims the white space around a label, which
 * would drop the blank lines; this character is not white space to it and draws nothing.
 */
export const LABEL_END = String.fromCharCode(0x200b);

/**
 * One blank line of the room kept for a caption: em spaces about as wide as the caption, at most the label wrap
 * width. Cytoscape measures the blank lines, so dagre spaces the modules for a caption it cannot draw itself (a canvas
 * label has one font weight and colour; the caption is an HTML layer over the graph).
 */
export function captionReserve(name: string): string {
  const width = Math.min(LABEL_MAX_WIDTH, name.length * CAPTION_CHAR_WIDTH);
  const most = Math.floor(LABEL_MAX_WIDTH / LABEL_FONT_SIZE);
  return EM_SPACE.repeat(Math.max(1, Math.min(most, Math.ceil(width / LABEL_FONT_SIZE))));
}

// @MX:ANCHOR: [AUTO] element contract read by the Graph component, the unit tests and the e2e tests via window.__cy
// @MX:REASON: class names (boundary, inferred, uncertain, mode-*) and data fields are matched by selectors elsewhere
/**
 * With `frame`, a solid compound node (class `frame`) holds every module and the dashed boundary, and carries
 * frameCaption as its label; the force-laid-out graph uses it.
 */
export function buildElements(platform: PlatformGraph, options: { frame?: boolean } = {}): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const parent = boundaryId(platform);
  const outer = options.frame ? frameId(platform) : undefined;
  if (outer) {
    elements.push({ group: "nodes", data: { id: outer, label: frameCaption(platform) }, classes: "frame" });
  }
  if (platform.modules.some((m) => m.on_platform)) {
    elements.push({
      group: "nodes",
      data: { id: parent, label: `Platform: ${platform.name ?? platform.platform_id}`, parent: outer },
      classes: "boundary",
    });
  }
  // Labels show the readable type (SPEC-UI-001 REQ-021) and keep blank lines for the name in the paper, which the
  // Graph draws as a lighter caption (UI AC-35); `code` keeps the vocabulary code for the legend and the sheet.
  for (const m of platform.modules) {
    const type = displayLabel("module_type", m.module_type);
    const room = m.name_in_paper ? Array<string>(CAPTION_LINES).fill(captionReserve(m.name_in_paper)) : [];
    elements.push({
      group: "nodes",
      data: {
        id: m.module_id,
        label: room.length ? [type, ...room].join("\n") + LABEL_END : type,
        code: m.module_type,
        colour: groupOf(m.module_type).colour,
        parent: m.on_platform ? parent : outer,
      },
      classes: "module",
    });
  }
  for (const c of platform.connections) {
    const style = transferModeStyle(c.transfer_mode);
    const classes = [`mode-${style.mode}`];
    if (!c.stated) classes.push("inferred");
    if (c.uncertain) classes.push("uncertain");
    const mode = displayLabel("transfer_mode", c.transfer_mode);
    elements.push({
      group: "edges",
      data: {
        id: c.edge_id,
        source: c.from_module,
        target: c.to_module,
        label: c.uncertain ? `${mode} ?` : mode,
        code: c.transfer_mode,
        colour: style.colour,
      },
      classes: classes.join(" "),
    });
  }
  return elements;
}

/** The site's UI font (styles.css --font-ui); Cytoscape draws on a canvas and does not inherit CSS fonts. */
const GRAPH_FONT = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif';

/**
 * Cytoscape stylesheet; colours come from the site tokens of the theme (SPEC-SITE-001 REQ-008, REQ-009). Dimming
 * fades over 150 ms unless the reader prefers reduced motion (SPEC-UI-001 UI AC-38). With `labelsBeside` (the
 * top-to-bottom phone layout, UI AC-36) module labels sit to the right of their dot, out of the way of the edges that
 * leave it downwards. With `levelEdgeLabels` edge labels stay horizontal: on the short edges between stacked
 * modules a label turned along the edge would not fit (the workflow graph, UI AC-41).
 */
export function buildStylesheet(
  theme: Theme = "light",
  options: { reducedMotion?: boolean; labelsBeside?: boolean; levelEdgeLabels?: boolean; labelBackdrop?: boolean } = {},
): StylesheetJson {
  const t = SITE_TOKENS[theme];
  // Cytoscape reads a bare transition-duration number as milliseconds.
  const fade = options.reducedMotion ? {} : { "transition-property": "opacity", "transition-duration": 150 };
  const sheet: StylesheetJson = [
    {
      selector: "node",
      style: {
        "background-color": "data(colour)",
        label: "data(label)",
        "text-wrap": "wrap",
        "text-max-width": `${LABEL_MAX_WIDTH}px`,
        "text-valign": "bottom",
        "text-margin-y": 4,
        // Larger and wider than before SPEC-UI-001 REQ-018; the Graph layout spaces nodes with their labels included.
        // Bold: the type line is the label's heading, the caption below it is lighter (UI AC-35).
        "font-size": LABEL_FONT_SIZE,
        "font-family": GRAPH_FONT,
        "font-weight": "bold",
        color: t["--text"],
        width: 26,
        height: 26,
        "border-width": 1,
        "border-color": t["--muted"],
        ...fade,
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
        ...fade,
      },
    },
    // The solid frame around every module: a thin line, no fill, its caption below in the muted colour. It takes no
    // pointer events, so a press on it pans the graph as the background does.
    {
      selector: "node.frame",
      style: {
        // Set, although drawn transparent: the node rule maps the fill to data(colour), which the frame has not got.
        "background-color": t["--card"],
        "background-opacity": 0,
        "border-width": 1.5,
        "border-style": "solid",
        "border-color": t["--muted"],
        padding: "12px",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 8,
        "text-max-width": "440px",
        "font-size": 13,
        "font-weight": "normal",
        color: t["--muted"],
        events: "no",
      },
    },
    ...(options.labelsBeside
      ? [
          {
            selector: "node.module",
            style: { "text-valign": "center", "text-halign": "right", "text-justification": "left", "text-margin-x": 6, "text-margin-y": 0 },
          } as const,
        ]
      : []),
    // Module labels over a backdrop of the graph's background, so an edge or edge label passing behind stays out of
    // the text (force layouts, forceLayout.ts).
    ...(options.labelBackdrop
      ? [
          {
            selector: "node.module",
            style: {
              "text-background-color": t["--card"],
              "text-background-opacity": 0.88,
              "text-background-padding": "3px",
              "text-background-shape": "roundrectangle",
            },
          } as const,
          // The platform's name runs across its box rather than down a narrow column above it.
          { selector: "node.boundary", style: { "text-max-width": "360px" } } as const,
          // Edges run at any angle: level labels read more easily, except on a bundle of parallel edges.
          { selector: "edge", style: { "text-rotation": "none" } } as const,
          { selector: "edge.bundled", style: { "text-rotation": "autorotate" } } as const,
        ]
      : []),
    { selector: "edge.mode-data_transfer", style: { width: 1 } },
    // Level labels, except on a bundle of parallel edges (marked by the graph), whose side-by-side level labels would
    // run into each other; those follow their edge (SPEC-UI-001 UI AC-48).
    ...(options.levelEdgeLabels
      ? [{ selector: "edge", style: { "text-rotation": "none" } } as const, { selector: "edge.bundled", style: { "text-rotation": "autorotate" } } as const]
      : []),
    // A workflow transfer whose mode the visitor has not specified (SPEC-UI-001 UI AC-39): a neutral line.
    { selector: "edge.mode-na", style: { "line-color": t["--muted"], "target-arrow-color": t["--muted"] } },
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
