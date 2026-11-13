// Recall and precision of the earlier Home search and of the technique search on the evaluation set
// (SPEC-TECH-001 REQ-013). Usage: npx tsx scripts/technique-eval.ts [--markdown]. Reads public/data (run build-data
// first); without public/data/techniques.json only the earlier search is scored.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IndexJson, SearchJson, TechniquesJson } from "../src/data/types";
import { displayLabel } from "../src/lib/labels";
import { searchPlatforms } from "../src/lib/platformFilter";
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

export const oldSearch = (rows: readonly SearchRow[], q: string) => searchPlatforms(rows, q).map((m) => m.row.platform_id);
export const newSearch = (rows: readonly SearchRow[], q: string, tech: Parameters<typeof searchWithTechniques>[2]) =>
  searchWithTechniques(rows, q, tech, displayLabel).hits.map((h) => h.row.platform_id);

const pct = (x: number | null) => (x === null ? "–" : x.toFixed(2));

function main(): void {
  const { rows, tech, queries } = loadEval();
  const md = process.argv.includes("--markdown");
  const lines: string[] = [];
  lines.push(md ? "| Query | Expected | Earlier: returned, recall, precision | Technique search: returned, recall, precision | Gained | Lost |" : "");
  if (md) lines.push("|---|---|---|---|---|---|");
  let oe = 0, oh = 0, or = 0, ne = 0, nh = 0, nr = 0;
  for (const q of queries) {
    const o = score(q, oldSearch(rows, q.query));
    const n = tech ? score(q, newSearch(rows, q.query, tech)) : null;
    oe += o.expected; oh += o.hits; or += o.returned;
    if (n) { ne += n.expected; nh += n.hits; nr += n.returned; }
    const gained = n ? n.extra.length + n.hits - o.hits : 0;
    const oldSet = new Set(oldSearch(rows, q.query));
    const newSet = n ? new Set(newSearch(rows, q.query, tech)) : new Set<string>();
    const gain = [...newSet].filter((id) => !oldSet.has(id));
    const lose = [...oldSet].filter((id) => !newSet.has(id));
    if (md) {
      lines.push(
        `| ${q.query} | ${o.expected} | ${o.returned}, ${pct(o.recall)}, ${pct(o.precision)} | ${n ? `${n.returned}, ${pct(n.recall)}, ${pct(n.precision)}` : "–"} | ${n ? gain.join(", ") || "–" : "–"} | ${n ? lose.join(", ") || "–" : "–"} |`,
      );
    } else {
      lines.push(`${q.query.padEnd(22)} exp ${String(o.expected).padStart(3)} | old ${o.returned} r=${pct(o.recall)} p=${pct(o.precision)}${n ? ` | new ${n.returned} r=${pct(n.recall)} p=${pct(n.precision)} forbidden=${n.forbidden.join(",") || "-"}` : ""}${gained ? "" : ""}`);
    }
  }
  const tot = `Total over ${queries.length} queries: earlier recall ${pct(oh / oe)}, precision ${pct(or ? oh / or : null)}` + (tech ? `; technique search recall ${pct(nh / ne)}, precision ${pct(nr ? nh / nr : null)}` : "");
  console.log([...lines.filter(Boolean), "", tot].join("\n"));
}

if (process.argv[1]?.endsWith("technique-eval.ts")) main();
