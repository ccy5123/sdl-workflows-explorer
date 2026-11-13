// Recall and precision of the earlier Home search and of the technique search on the evaluation set
// (SPEC-TECH-001 REQ-013). Usage: npx tsx scripts/technique-eval.ts [--markdown]. Reads public/data (run build-data
// first); without public/data/techniques.json only the earlier search is scored.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IndexJson, SearchJson, TechniquesJson } from "../src/data/types";
import { displayLabel } from "../src/lib/labels";
import { searchWithTechniques, techniqueData, type SearchRow } from "../src/lib/techniqueMatch";

export interface EvalQuery {
  query: string;
  family: string;
  expected: string[];
  ignore: string[];
  must_not?: string[];
}

export interface Score {
  query: string;
  expected: number;
  returned: number;
  hits: number;
  recall: number;
  precision: number | null;
  /** Expected platforms not returned, and returned platforms not expected (ignore list left out). */
  missed: string[];
  extra: string[];
  forbidden: string[];
}

export function score(q: EvalQuery, returned: readonly string[]): Score {
  const exp = new Set(q.expected);
  const ign = new Set(q.ignore);
  const got = returned.filter((id) => !ign.has(id));
  const hits = got.filter((id) => exp.has(id));
  return {
    query: q.query,
    expected: exp.size,
    returned: got.length,
    hits: hits.length,
    recall: exp.size === 0 ? 1 : hits.length / exp.size,
    precision: got.length === 0 ? null : hits.length / got.length,
    missed: q.expected.filter((id) => !got.includes(id)),
    extra: got.filter((id) => !exp.has(id)),
    forbidden: (q.must_not ?? []).filter((id) => returned.includes(id)),
  };
}

export function loadEval(root = join(import.meta.dirname, "..")) {
  const data = join(root, "public", "data");
  const index = JSON.parse(readFileSync(join(data, "index.json"), "utf8")) as IndexJson;
  const search = JSON.parse(readFileSync(join(data, "search.json"), "utf8")) as SearchJson;
  const techPath = join(data, "techniques.json");
  const tech = existsSync(techPath) ? techniqueData(JSON.parse(readFileSync(techPath, "utf8")) as TechniquesJson) : null;
  const rows: SearchRow[] = index.platforms.map((p) => ({
    ...p,
    module_names: search.module_names[p.platform_id] ?? [],
    module_refs: (search.modules?.[p.platform_id] ?? []).map(([id, name, evidence]) => ({ id, name, evidence })),
  }));
  const queries = (JSON.parse(readFileSync(join(root, "tests", "fixtures", "technique-queries.json"), "utf8")) as { queries: EvalQuery[] }).queries;
  return { rows, tech, queries };
}

/**
 * The Home search as it was before SPEC-TECH-001 (src/lib/platformFilter.ts at 03679ea), kept here as the baseline:
 * every word must be a case-insensitive substring of the platform id, paper id, name, a stated module name, a readable
 * module type or a readable unit operation.
 */
export function oldSearch(rows: readonly SearchRow[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.map((r) => r.platform_id);
  const words = q.split(/\s+/);
  const direct: string[] = [];
  const detailed: string[] = [];
  for (const row of rows) {
    const head = [row.platform_id, row.paper_id, row.platform_name ?? ""].join(" ").toLowerCase();
    if (head.includes(q)) {
      direct.push(row.platform_id);
      continue;
    }
    const fields = [
      ...(row.module_names ?? []),
      ...row.module_types.map((c) => `${displayLabel("module_type", c)} ${c}`),
      ...row.unit_operations.map((c) => `${displayLabel("unit_operation", c)} ${c}`),
    ].map((t) => t.toLowerCase());
    if (words.every((w) => head.includes(w) || fields.some((f) => f.includes(w)))) detailed.push(row.platform_id);
  }
  return [...direct, ...detailed];
}
export const newSearch = (rows: readonly SearchRow[], q: string, tech: Parameters<typeof searchWithTechniques>[2]) =>
  searchWithTechniques(rows, q, tech, displayLabel).hits.map((h) => h.row.platform_id);

const pct = (x: number | null) => (x === null ? "–" : x.toFixed(2));

function main(): void {
  const { rows, tech, queries } = loadEval();
  const md = process.argv.includes("--markdown");
  const lines: string[] = [];
  if (md) {
    lines.push(
      "| Query | Expected | Earlier: returned, recall, precision | Technique search: returned, recall, precision | Expected platforms gained | Expected platforms lost | Other platforms no longer returned | Other platforms returned |",
      "|---|---|---|---|---|---|---|---|",
    );
  }
  let oe = 0, oh = 0, or = 0, ne = 0, nh = 0, nr = 0;
  for (const q of queries) {
    const oldIds = oldSearch(rows, q.query);
    const o = score(q, oldIds);
    const newIds = tech ? newSearch(rows, q.query, tech) : [];
    const n = tech ? score(q, newIds) : null;
    oe += o.expected; oh += o.hits; or += o.returned;
    if (n) { ne += n.expected; nh += n.hits; nr += n.returned; }
    const exp = new Set(q.expected);
    const ign = new Set(q.ignore);
    const gain = newIds.filter((id) => exp.has(id) && !oldIds.includes(id));
    const lose = oldIds.filter((id) => exp.has(id) && !newIds.includes(id));
    const dropped = oldIds.filter((id) => !exp.has(id) && !ign.has(id) && !newIds.includes(id)).length;
    const list = (xs: string[]) => xs.join(", ") || "–";
    if (md) {
      lines.push(
        `| ${q.query} | ${o.expected} | ${o.returned}, ${pct(o.recall)}, ${pct(o.precision)} | ${n ? `${n.returned}, ${pct(n.recall)}, ${pct(n.precision)}` : "–"} | ` +
          (n ? `${gain.length} | ${list(lose)} | ${dropped} | ${list(n.extra)} |` : "– | – | – | – |"),
      );
    } else {
      lines.push(`${q.query.padEnd(22)} exp ${String(o.expected).padStart(3)} | old ${o.returned} r=${pct(o.recall)} p=${pct(o.precision)}${n ? ` | new ${n.returned} r=${pct(n.recall)} p=${pct(n.precision)} forbidden=${n.forbidden.join(",") || "-"}` : ""}`);
    }
  }
  const tot = `Total over ${queries.length} queries: earlier recall ${pct(oh / oe)}, precision ${pct(or ? oh / or : null)}` + (tech ? `; technique search recall ${pct(nh / ne)}, precision ${pct(nr ? nh / nr : null)}` : "");
  console.log([...lines, "", tot].join("\n"));
}

if (process.argv[1]?.endsWith("technique-eval.ts")) main();
