// Side-by-side comparison: id check, paper files and the assembled rows (REQ-014, REQ-015, REQ-009). Pure.
import type { PlatformFile, PlatformGraph, PlatformRow } from "../data/types";

export type CompareCheck =
  | { ok: true; paperIds: string[] }
  | { ok: false; problem: "tooFew" | "tooMany" | "duplicate" | "unknown"; ids: string[]; message: string };

/** Checks, in this order, the number of ids, duplicates and unknown ids; reports the first failing check only. */
export function checkCompareIds(ids: readonly string[], platforms: readonly PlatformRow[]): CompareCheck {
  if (ids.length < 2 || ids.length > 3) {
    const given = `${ids.length} platform id${ids.length === 1 ? "" : "s"} given`;
    return { ok: false, problem: ids.length < 2 ? "tooFew" : "tooMany", ids: [...ids], message: `${given}; a comparison needs 2 or 3.` };
  }
  const twice = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (twice.length) return { ok: false, problem: "duplicate", ids: twice, message: `Listed twice: ${twice.join(", ")}.` };
  const rows = new Map(platforms.map((l) => [l.platform_id, l]));
  const unknown = ids.filter((id) => !rows.has(id));
  if (unknown.length) return { ok: false, problem: "unknown", ids: unknown, message: `Unknown platform ids: ${unknown.join(", ")}.` };
  return { ok: true, paperIds: [...new Set(ids.map((id) => rows.get(id)!.paper_id))] };
}

/** Path of a paper's platform file, as fetched by the site. */
export function paperFile(paperId: string): string {
  return `data/platforms/${encodeURIComponent(paperId)}.json`;
}

export function loadFailureMessage(failures: readonly { file: string; reason: string }[]): string {
  return `Could not load ${failures.map((f) => `${f.file} (${f.reason})`).join(", ")}.`;
}

export type PickResult = { ok: true; graphs: PlatformGraph[] } | { ok: false; message: string };

/** The graphs of the ids, in id order, from the loaded paper files keyed by paper id. */
export function pickPlatforms(
  ids: readonly string[],
  platforms: readonly PlatformRow[],
  files: Readonly<Record<string, PlatformFile>>,
): PickResult {
  const paperOf = new Map(platforms.map((l) => [l.platform_id, l.paper_id]));
  const graphs: PlatformGraph[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const paperId = paperOf.get(id) ?? id.split("/")[0]!;
    const graph = files[paperId]?.platforms.find((g) => g.platform_id === id);
    if (graph) graphs.push(graph);
    else missing.push(`${id} is not in ${paperFile(paperId)}`);
  }
  return missing.length ? { ok: false, message: `${missing.join("; ")}.` } : { ok: true, graphs };
}

export interface CountRow {
  key: string;
  /** One entry per compared platform; null when the platform has none. */
  counts: (number | null)[];
}

export interface Comparison {
  columns: { platformId: string; name: string | null; paperId: string; year: number }[];
  moduleRows: CountRow[];
  transferRows: CountRow[];
  steps: { order: number; unitOperation: string; performer: string | null }[][];
}

function countRows(perPlatform: string[][]): CountRow[] {
  const tallies = perPlatform.map((keys) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  });
  const keys = [...new Set(perPlatform.flat())].sort();
  return keys.map((key) => ({ key, counts: tallies.map((m) => m.get(key) ?? null) }));
}

/** Module types over all modules (on and off the platform), material connections by transfer mode, and steps in order. */
export function assembleComparison(graphs: readonly PlatformGraph[]): Comparison {
  return {
    columns: graphs.map((g) => ({ platformId: g.platform_id, name: g.name, paperId: g.paper_id, year: g.first_public_year })),
    moduleRows: countRows(graphs.map((g) => g.modules.map((m) => m.module_type))),
    transferRows: countRows(graphs.map((g) => g.connections.filter((c) => c.is_material).map((c) => c.transfer_mode))),
    steps: graphs.map((g) =>
      [...g.steps]
        .sort((a, b) => a.step_order - b.step_order)
        .map((s) => ({ order: s.step_order, unitOperation: s.unit_operation, performer: s.performed_by })),
    ),
  };
}
