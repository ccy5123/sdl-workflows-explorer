// Side-by-side comparison of 2 or 3 platforms (REQ-014, REQ-015).
import { useEffect, useState } from "react";
import type { IndexJson, PlatformFile } from "../data/types";
import {
  assembleComparison,
  checkCompareIds,
  loadFailureMessage,
  paperFile,
  pickPlatforms,
  type Comparison,
  type CountRow,
} from "../lib/compare";
import { show } from "../lib/evidence";
import { platformHash } from "../lib/route";

type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; comparison: Comparison };
type Loaded = { paperId: string; file: string; data?: PlatformFile; error?: string };

async function loadPaper(paperId: string, signal: AbortSignal): Promise<Loaded> {
  const file = paperFile(paperId);
  let text: string;
  try {
    const response = await fetch(file, { signal });
    if (!response.ok) return { paperId, file, error: `HTTP ${response.status}` };
    text = await response.text();
  } catch {
    return { paperId, file, error: "request failed" };
  }
  try {
    return { paperId, file, data: JSON.parse(text) as PlatformFile };
  } catch {
    return { paperId, file, error: "not valid JSON" };
  }
}

function CountTable({ name, label, ids, rows }: { name: string; label: string; ids: string[]; rows: CountRow[] }) {
  return (
    <div className="table-scroll">
      <table className="data" data-table={name}>
        <thead>
          <tr>
            <th scope="col">{label}</th>
            {ids.map((id) => (
              <th key={id} scope="col">
                {id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.key}</th>
              {row.counts.map((n, i) => (
                <td key={ids[i]} className="num">
                  {show(n)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Compare({ index, ids }: { index: IndexJson; ids: string[] }) {
  const idsKey = JSON.stringify(ids);
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    const list = JSON.parse(idsKey) as string[];
    const check = checkCompareIds(list, index.platforms);
    if (!check.ok) {
      setStatus({ kind: "error", message: check.message });
      return;
    }
    const controller = new AbortController();
    setStatus({ kind: "loading" });
    void Promise.all(check.paperIds.map((p) => loadPaper(p, controller.signal))).then((loaded) => {
      if (controller.signal.aborted) return;
      const failures = loaded.filter((l) => l.error !== undefined).map((l) => ({ file: l.file, reason: l.error! }));
      if (failures.length) {
        setStatus({ kind: "error", message: loadFailureMessage(failures) });
        return;
      }
      const files = Object.fromEntries(loaded.map((l) => [l.paperId, l.data!]));
      const picked = pickPlatforms(list, index.platforms, files);
      setStatus(picked.ok ? { kind: "ready", comparison: assembleComparison(picked.graphs) } : { kind: "error", message: picked.message });
    });
    return () => controller.abort();
  }, [idsKey, index]);

  if (status.kind === "loading") {
    return (
      <section className="compare">
        <h1>Compare platforms</h1>
        <p role="status">Loading {ids.join(", ")}…</p>
      </section>
    );
  }
  if (status.kind === "error") {
    return (
      <section className="not-found compare-error" role="alert">
        <h1>Cannot compare these platforms</h1>
        <p>{status.message}</p>
        <p>
          <a href="#/browse">Browse</a> · <a href="#/">Home</a>
        </p>
      </section>
    );
  }

  const c = status.comparison;
  const platformIds = c.columns.map((col) => col.platformId);
  return (
    <section className="compare">
      <h1>Compare platforms</h1>
      <div className="table-scroll">
        <table className="data" data-table="compare-platforms">
          <thead>
            <tr>
              <td />
              {c.columns.map((col) => (
                <th key={col.platformId} scope="col">
                  {show(col.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Platform</th>
              {c.columns.map((col) => (
                <td key={col.platformId}>
                  <a href={platformHash(col.platformId)}>{col.platformId}</a>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Paper</th>
              {c.columns.map((col) => (
                <td key={col.platformId}>{col.paperId}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Year</th>
              {c.columns.map((col) => (
                <td key={col.platformId} className="num">
                  {col.year}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Module types</h2>
      <CountTable name="compare-modules" label="Module type" ids={platformIds} rows={c.moduleRows} />

      <h2>Material transfer modes</h2>
      <CountTable name="compare-transfers" label="Transfer mode" ids={platformIds} rows={c.transferRows} />

      <h2>Steps</h2>
      <div className="compare-steps">
        {c.steps.map((steps, i) => (
          <div key={platformIds[i]} className="table-scroll">
            <table className="data" data-steps={platformIds[i]}>
              <caption>{platformIds[i]}</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Unit operation</th>
                  <th scope="col">Performer</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, j) => (
                  <tr key={j} data-step-order={s.order}>
                    <td className="num">{s.order}</td>
                    <td>{s.unitOperation}</td>
                    <td>{show(s.performer)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
