// Evidence panel content and null display (REQ-014, REQ-015).
import type { Evidence, PlatformGraph } from "../data/types";
import type { Selection } from "./steps";

export const DASH = "—";

/** Text for a value that may be null; null, undefined and "" become an em dash. */
export function show(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return DASH;
  return String(value);
}

export interface EvidenceView {
  kind: "Module" | "Connection" | "Step" | "Platform";
  id: string;
  doc: string;
  page: string;
  locator: string;
  note: string | null;
  doiUrl: string;
}

function view(kind: EvidenceView["kind"], id: string, evidence: Evidence, note: string | null, doi: string): EvidenceView {
  return {
    kind,
    id,
    doc: show(evidence.doc),
    page: show(evidence.page),
    locator: show(evidence.locator),
    note: note || null,
    doiUrl: `https://doi.org/${doi}`,
  };
}

/** Evidence of the selected item, or of the platform itself when nothing (or an unknown id) is selected. */
export function formatEvidence(platform: PlatformGraph, selection: Selection): EvidenceView {
  const doi = platform.doi;
  if (selection?.kind === "module") {
    const m = platform.modules.find((x) => x.module_id === selection.id);
    if (m) return view("Module", m.module_id, m.evidence, m.unmapped_note, doi);
  } else if (selection?.kind === "connection") {
    const c = platform.connections.find((x) => x.edge_id === selection.id);
    if (c) return view("Connection", c.edge_id, c.evidence, c.unmapped_note, doi);
  } else if (selection?.kind === "step") {
    const s = platform.steps.find((x) => x.step_id === selection.id);
    if (s) return view("Step", s.step_id, s.evidence, s.unmapped_note, doi);
  }
  return view("Platform", platform.platform_id, platform.evidence, null, doi);
}
