// Elements of the read-only workflow graph on the Workflow builder page (SPEC-UI-001 UI AC-39 to UI AC-41), built
// from the builder's state alone. Nodes are the visitor's modules, every one of them (a module no step uses is drawn
// unconnected, since the visitor defined it). Edges are the transfer boundaries, in step order: boundary i joins the
// modules of steps i and i+1 where they differ (parallel edges are kept). Nothing is inferred or uncertain here, so
// no edge is dashed. Pure.
import type { ElementDefinition } from "cytoscape";
import { CAPTION_LINES, captionReserve, LABEL_END } from "./graphElements";
import { displayLabel } from "./labels";
import { groupOf, transferModeStyle } from "./moduleGroups";
import { SITE_TOKENS } from "./siteTokens";
import { isTransferBoundary, NOT_SPECIFIED, transferAt, type WorkflowState } from "./workflowState";

export interface WorkflowGraph {
  elements: ElementDefinition[];
  /** Caption under each module's type label: its number and device count. */
  captions: { id: string; text: string }[];
  modules: number;
  transfers: number;
}

export const moduleNodeId = (k: number) => `wf-m${k}`;
export const transferEdgeId = (i: number) => `wf-t${i}`;

const deviceCount = (n: number) => (n === 1 ? "1 device" : `${n} devices`);

export function buildWorkflowGraph(s: WorkflowState): WorkflowGraph {
  const elements: ElementDefinition[] = [];
  const captions: WorkflowGraph["captions"] = [];
  s.modules.forEach((m, index) => {
    const k = index + 1;
    const caption = `Module ${k} · ${deviceCount(m.devices)}`;
    const room = Array<string>(CAPTION_LINES).fill(captionReserve(caption));
    elements.push({
      group: "nodes",
      data: {
        id: moduleNodeId(k),
        label: [displayLabel("module_type", m.type), ...room].join("\n") + LABEL_END,
        code: m.type,
        colour: groupOf(m.type).colour,
      },
      classes: "module",
    });
    captions.push({ id: moduleNodeId(k), text: caption });
  });
  let transfers = 0;
  for (let i = 1; i < s.steps.length; i++) {
    if (!isTransferBoundary(s, i)) continue;
    transfers++;
    const { mode } = transferAt(s, i);
    const set = mode !== NOT_SPECIFIED;
    elements.push({
      group: "edges",
      data: {
        id: transferEdgeId(i),
        source: moduleNodeId(s.steps[i - 1]!.module),
        target: moduleNodeId(s.steps[i]!.module),
        // The step pair is not in the label: on a workflow with several transfers between the same two modules
        // (Kim2026/P1) the longer labels ran into each other. The builder's transfer fields name the steps.
        label: set ? displayLabel("transfer_mode", mode) : "not specified",
        steps: `${i}→${i + 1}`,
        code: mode,
        // An unset mode is drawn in the theme's muted colour (stylesheet class mode-na); the light value only keeps
        // Cytoscape's colour mapping defined.
        colour: set ? transferModeStyle(mode).colour : SITE_TOKENS.light["--muted"],
      },
      classes: set ? `mode-${transferModeStyle(mode).mode}` : "mode-na",
    });
  }
  return { elements, captions, modules: s.modules.length, transfers };
}
