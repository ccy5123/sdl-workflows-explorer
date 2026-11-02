// Similar platforms: step order, module types and transfer modes of the visitor's workflow against each coded platform
// (SPEC-SIM-001 REQ-009, design §4). Structure only; nothing here rates a platform. Pure.
import type { PlatformLayout } from "../data/types";
import { boundaryConnection, isTransferBoundary, transferAt, type Catalog, type WorkflowState } from "./workflowState";

/** What the three measures compare, for the visitor's workflow or one platform. */
export interface LayoutSets {
  uos: string[];
  types: Set<string>;
  modes: Set<string>;
}

export interface PlatformSets extends LayoutSets {
  platform: PlatformLayout;
}

export interface SimilarityRow {
  platform: PlatformLayout;
  /** Step order: 1 − edit distance / length of the longer step list. */
  order: number;
  /** Module types: shared types as a share of all types either uses. */
  types: number;
  /** Transfer modes: the same for material transfer modes between consecutive steps. */
  modes: number;
}

/** Fewest single-step insertions, deletions or replacements turning one list into the other. */
export function editDistance(a: readonly string[], b: readonly string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row.push(Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** |A ∩ B| / |A ∪ B|; two empty sets count as the same (1). */
export function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / union.size;
}

export function workflowSets(s: WorkflowState, c: Catalog): LayoutSets {
  const modes = new Set<string>();
  for (let i = 1; i < s.steps.length; i++) {
    if (!isTransferBoundary(s, i)) continue;
    const mode = transferAt(s, i).mode;
    if (c.materialModes.has(mode)) modes.add(mode);
  }
  return {
    uos: s.steps.map((st) => st.uo),
    types: new Set(s.steps.map((st) => s.modules[st.module - 1]!.type)),
    modes,
  };
}

export function platformSets(p: PlatformLayout, c: Catalog): PlatformSets {
  const modes = new Set<string>();
  for (let k = 1; k < p.steps.length; k++) {
    const a = p.steps[k - 1]!.module_id;
    const b = p.steps[k]!.module_id;
    if (a === null || b === null || a === b) continue;
    const mode = boundaryConnection(p, a, b).mode;
    if (c.materialModes.has(mode)) modes.add(mode);
  }
  return { platform: p, uos: p.steps.map((s) => s.unit_operation), types: new Set(p.modules.map((m) => m.module_type)), modes };
}

/** Platforms by step order, then module types, then transfer modes (descending, exact values), then platform id. */
export function rankPlatforms(w: LayoutSets, platforms: readonly PlatformSets[]): SimilarityRow[] {
  return platforms
    .map((p) => ({
      platform: p.platform,
      order: 1 - editDistance(w.uos, p.uos) / Math.max(w.uos.length, p.uos.length, 1),
      types: overlap(w.types, p.types),
      modes: overlap(w.modes, p.modes),
    }))
    .sort(
      (x, y) =>
        y.order - x.order ||
        y.types - x.types ||
        y.modes - x.modes ||
        (x.platform.platform_id < y.platform.platform_id ? -1 : x.platform.platform_id > y.platform.platform_id ? 1 : 0),
    );
}
