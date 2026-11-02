// Similar platforms: the coded platforms ranked by the three measures of similarity.ts, 10 rows at a time, sortable,
// with a selection that links to the comparison (SPEC-SIM-001 REQ-009, REQ-010).
import { useState } from "react";
import { compareHash, platformHash } from "../lib/route";
import type { SimilarityRow } from "../lib/similarity";
import { SIMILAR_INTRO, SIMILAR_MEASURES, SIMILAR_ORDER, compareReason } from "../lib/workflowText";

type SortKey = "select" | "platform" | "name" | "paper" | "year" | "order" | "types" | "modes";
const COLUMNS: { key: SortKey; header: string; num?: boolean; value: (r: SimilarityRow) => string | number }[] = [
  { key: "platform", header: "Platform", value: (r) => r.platform.platform_id },
  { key: "name", header: "Name", value: (r) => r.platform.name ?? "" },
  { key: "paper", header: "Paper", value: (r) => r.platform.paper_id },
  { key: "year", header: "Year", num: true, value: (r) => r.platform.year },
  { key: "order", header: "Step order", num: true, value: (r) => r.order },
  { key: "types", header: "Module types", num: true, value: (r) => r.types },
  { key: "modes", header: "Transfer modes", num: true, value: (r) => r.modes },
];
const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
const collator = new Intl.Collator("en", { sensitivity: "accent" });

export function SimilarPlatforms({ rows }: { rows: SimilarityRow[] }) {
  const [shown, setShown] = useState(10);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const col = sort && COLUMNS.find((c) => c.key === sort.key);
  const sorted = col
    ? [...rows].sort((a, b) => {
        const x = col.value(a);
        const y = col.value(b);
        const d = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
        return sort!.dir === "asc" ? d : -d;
      })
    : rows;
  const reason = compareReason(selected.length);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const onSort = (key: SortKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  return (
    <section aria-labelledby="wf-similar">
      <h2 id="wf-similar">Similar platforms</h2>
      <p>{SIMILAR_INTRO}</p>
      <dl className="wf-measures">
        {SIMILAR_MEASURES.map((m) => (
          <div key={m.term}>
            <dt>{m.term}</dt>
            <dd>{m.text}</dd>
          </div>
        ))}
      </dl>
      <p className="table-note">{SIMILAR_ORDER}</p>
      <div className="table-scroll">
        <table className="data" data-table="wf-similar">
          <thead>
            <tr>
              <th scope="col">Select</th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className={c.num ? "num" : undefined}
                  aria-sort={sort?.key === c.key ? ARIA_SORT[sort.dir] : "none"}>
                  <button type="button" className="sort-button" onClick={() => onSort(c.key)}>
                    {c.header}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, shown).map((r) => {
              const id = r.platform.platform_id;
              return (
                <tr key={id} data-platform={id}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${id}`} checked={selected.includes(id)} onChange={() => toggle(id)} />
                  </td>
                  <td>
                    <a href={platformHash(id)}>{id}</a>
                  </td>
                  <td>{r.platform.name ?? "—"}</td>
                  <td>{r.platform.paper_id}</td>
                  <td className="num">{r.platform.year}</td>
                  <td className="num">{r.order.toFixed(2)}</td>
                  <td className="num">{r.types.toFixed(2)}</td>
                  <td className="num">{r.modes.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="result-count">
        Showing {Math.min(shown, rows.length)} of {rows.length} platforms.{" "}
        {shown < rows.length && (
          <button type="button" onClick={() => setShown((n) => n + 10)}>
            Show 10 more
          </button>
        )}
      </p>
      <p className="wf-compare">
        {reason === null ? (
          <a href={compareHash(selected)}>Compare {selected.join(", ")}</a>
        ) : (
          <span>{reason}</span>
        )}
      </p>
    </section>
  );
}
