// Benchmark view: the benchmark page (tasks, split, label counts, the reference results as published, how to run the
// evaluation, items by platform) and the item explorer (SPEC-BENCH-001 REQ-007 to REQ-016). Loaded lazily;
// data/benchmark.json and, for the explorer, data/benchmark-items.json are fetched by this module on first use and kept
// for the page's lifetime.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { SPLITS, type BenchmarkItemsJson, type BenchmarkJson, type IndexJson, type Split } from "../data/types";
import {
  BACK_LINK_TEXT,
  DIFFERENCE_NOTE,
  EXPLORER_HEADING,
  METRIC_DEFINITION,
  MODEL_HEADS,
  NO_ITEMS_TEXT,
  PAGE_SIZE,
  PUBLISHED_JSON_SUMMARY,
  REFERENCE_HEADS,
  SECTION_HEADINGS,
  SHOW_MORE_TEXT,
  SPLIT_LABELS,
  TEST_PAPERS_NOTE,
  benchmarkCaption,
  benchmarkItemsHash,
  countLine,
  decodeExplorerQuery,
  evaluationNote,
  exclusionLine,
  explorerCells,
  explorerColumns,
  filterItems,
  itemUnit,
  labelRows,
  loadErrorText,
  metricLines,
  modelRows,
  platformRows,
  platformsCountLine,
  referenceRow,
  splitTable,
  taskTitle,
  uncertainSentence,
  type CountCell,
  type ExplorerState,
} from "../lib/benchmark";
import { parseRoute } from "../lib/route";

export type BenchmarkRoute = { kind: "benchmark" } | { kind: "benchmarkItems"; query: string };

let benchmarkRequest: Promise<BenchmarkJson> | null = null;
let itemsRequest: Promise<BenchmarkItemsJson> | null = null;

function getJson<T>(path: string): Promise<T> {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

/** data/benchmark.json, requested at most once per page load. */
const loadBenchmark = () => (benchmarkRequest ??= getJson<BenchmarkJson>("data/benchmark.json"));
/** data/benchmark-items.json, requested at most once per page load and only by the explorer. */
const loadItems = () => (itemsRequest ??= getJson<BenchmarkItemsJson>("data/benchmark-items.json"));

const DASH = "—";
const headingId = (text: string) => `bench-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = headingId(title);
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** An id or class name that may break across lines only after "_" or "/" (and at spaces): a <wbr> after each. */
function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=[_/])/);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}

function Count({ cell, label }: { cell: CountCell; label: string }) {
  return (
    <td data-label={label} className="num">
      {cell.href ? <a href={cell.href}>{cell.n}</a> : cell.n}
    </td>
  );
}

function SplitTable({ data }: { data: BenchmarkJson }) {
  const table = splitTable(data);
  const taskIds = data.tasks.map((t) => t.task_id);
  return (
    <table className="bench-table" aria-label="Split">
      <thead>
        <tr>
          <th scope="col">Split</th>
          <th scope="col">Papers</th>
          {taskIds.map((id) => (
            <th scope="col" key={id}>
              <Breakable text={`${id} items`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.split}>
            <td data-label="Split">{r.split}</td>
            <td data-label="Papers" className="num">
              {r.papers}
            </td>
            {r.cells.map((c, i) => (
              <Count key={taskIds[i]} cell={c} label={`${taskIds[i]} items`} />
            ))}
          </tr>
        ))}
        <tr>
          <td data-label="Split">Total</td>
          <td data-label="Papers" className="num">
            {table.total.papers}
          </td>
          {table.total.cells.map((c, i) => (
            <Count key={taskIds[i]} cell={c} label={`${taskIds[i]} items`} />
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function TaskSection({ data, index }: { data: BenchmarkJson; index: number }) {
  const task = data.tasks[index]!;
  const summary = data.summaries[index]!;
  return (
    <Section title={task.task_id}>
      <p className="caption">{taskTitle(task.target)}</p>
      <dl className="taxo-facts">
        <dt>Unit of an item</dt>
        <dd>{itemUnit(task.target)}</dd>
        <dt>Which items</dt>
        <dd>{task.item_rule}</dd>
        <dt>Inputs</dt>
        <dd>{task.inputs}</dd>
      </dl>
      <table className="bench-table">
        <thead>
          <tr>
            <th scope="col">Label</th>
            {SPLITS.map((s) => (
              <th scope="col" key={s}>
                {SPLIT_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labelRows(data, index).map((r) => (
            <tr key={r.label}>
              <td data-label="Label">
                <a href={r.href}>
                  <Breakable text={r.label} />
                </a>
              </td>
              {r.cells.map((c, i) => (
                <Count key={SPLITS[i]} cell={c} label={SPLIT_LABELS[SPLITS[i]!]} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>{uncertainSentence(summary)}</p>
    </Section>
  );
}

function ReferenceResults({ data }: { data: BenchmarkJson }) {
  return (
    <Section title={SECTION_HEADINGS.reference}>
      <p>{METRIC_DEFINITION}</p>
      {metricLines(data.tasks).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <table className="bench-table">
        <thead>
          <tr>
            {REFERENCE_HEADS.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.values(data.reference_results).map((r) => {
            const row = referenceRow(r);
            const cells = [row.task, row.testItems, row.baseline, row.reference, row.difference, row.interval, row.replicates];
            return (
              <tr key={row.task}>
                {cells.map((text, i) => (
                  <td key={REFERENCE_HEADS[i]} data-label={REFERENCE_HEADS[i]} className={i > 0 ? "num" : undefined}>
                    {i === 0 ? <Breakable text={text} /> : text}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">{DIFFERENCE_NOTE}</p>
      <p className="note">{TEST_PAPERS_NOTE}</p>
      <table className="bench-table">
        <thead>
          <tr>
            {MODEL_HEADS.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modelRows(data.tasks).map((m) => (
            <tr key={m.task}>
              <td data-label={MODEL_HEADS[0]}>
                <Breakable text={m.task} />
              </td>
              <td data-label={MODEL_HEADS[1]}>{m.baseline}</td>
              <td data-label={MODEL_HEADS[2]}>{m.referenceModel}</td>
              {/* Model names, not numbers: no `num` class (SPEC-SITE-001 REQ-012). */}
            </tr>
          ))}
        </tbody>
      </table>
      <details className="bench-published">
        <summary>{PUBLISHED_JSON_SUMMARY}</summary>
        <pre>{data.reference_results_text}</pre>
      </details>
    </Section>
  );
}

function Evaluation({ data, doi }: { data: BenchmarkJson; doi: string }) {
  const note = evaluationNote(data);
  const doiUrl = `https://doi.org/${doi}`;
  return (
    <Section title={SECTION_HEADINGS.evaluation}>
      <p>{note.release}</p>
      <p>
        {note.doiLead} <a href={doiUrl}>{doiUrl}</a>
      </p>
      <p>{note.where}</p>
      <p>{note.checkLead}</p>
      <pre className="bench-command">
        <code>{note.checkCommand}</code>
      </pre>
      <p>{note.predictionsLead}</p>
      {note.predictionCommands.map((c) => (
        <pre className="bench-command" key={c}>
          <code>{c}</code>
        </pre>
      ))}
      <p>{note.format}</p>
    </Section>
  );
}

function ItemsByPlatform({ data, index }: { data: BenchmarkJson; index: IndexJson }) {
  const [split, setSplit] = useState<Split | null>(null);
  const names = useMemo(() => new Map(index.platforms.map((p) => [p.platform_id, p.platform_name])), [index]);
  const rows = platformRows(data, split);
  const taskIds = data.tasks.map((t) => t.task_id);
  return (
    <Section title={SECTION_HEADINGS.platforms}>
      <label className="bench-control">
        Split{" "}
        <select value={split ?? ""} onChange={(e) => setSplit((e.target.value || null) as Split | null)}>
          <option value="">All</option>
          {SPLITS.map((s) => (
            <option key={s} value={s}>
              {SPLIT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <p className="result-count" aria-live="polite">
        {platformsCountLine(rows.length, data.platforms.length, split)}
      </p>
      <table className="bench-table">
        <thead>
          <tr>
            <th scope="col">Platform</th>
            <th scope="col">Name</th>
            <th scope="col">Split</th>
            {taskIds.map((id) => (
              <th scope="col" key={id}>
                <Breakable text={`${id} items`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.platform_id}>
              <td data-label="Platform">
                <a href={r.href}>
                  <Breakable text={r.platform_id} />
                </a>
              </td>
              <td data-label="Name">{names.get(r.platform_id) ?? DASH}</td>
              <td data-label="Split">{r.split}</td>
              {r.cells.map((c, i) => (
                <Count key={taskIds[i]} cell={c} label={`${taskIds[i]} items`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function BenchmarkPage({ data, index }: { data: BenchmarkJson; index: IndexJson }) {
  return (
    <div className="benchmark">
      <h1>Benchmark {data.benchmark_id}</h1>
      <p className="caption">{benchmarkCaption(data)}</p>
      <SplitTable data={data} />
      {data.exclusion_reasons.map((e) => (
        <p key={e.reason}>{exclusionLine(e)}</p>
      ))}
      {data.tasks.map((t, i) => (
        <TaskSection key={t.task_id} data={data} index={i} />
      ))}
      <ReferenceResults data={data} />
      <Evaluation data={data} doi={index.release.doi} />
      <ItemsByPlatform data={data} index={index} />
    </div>
  );
}

/** Explorer state of the current hash; replaces the hash with its canonical form so URL and controls agree (REQ-006). */
function stateFromLocation(data: BenchmarkJson): ExplorerState | null {
  const route = parseRoute(window.location.hash);
  if (route.kind !== "benchmarkItems") return null;
  const state = decodeExplorerQuery(route.query, data);
  const canonical = benchmarkItemsHash(state);
  if (canonical !== window.location.hash) history.replaceState(history.state, "", canonical);
  return state;
}

function Explorer({ data, items }: { data: BenchmarkJson; items: BenchmarkItemsJson }) {
  const [state, setState] = useState<ExplorerState>(() => stateFromLocation(data) ?? decodeExplorerQuery("", data));
  const [shown, setShown] = useState(PAGE_SIZE);

  // replaceState fires no hashchange, so the router's hash can lag; read the real hash on every navigation.
  useEffect(() => {
    const onHashChange = () => {
      const next = stateFromLocation(data);
      if (!next) return;
      setState(next);
      setShown(PAGE_SIZE);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [data]);

  const apply = (next: ExplorerState) => {
    setState(next);
    setShown(PAGE_SIZE);
    history.replaceState(history.state, "", benchmarkItemsHash(next));
  };

  const task = data.tasks.find((t) => t.task_id === state.task)!;
  const labels = data.summaries.find((s) => s.task_id === state.task)!.labels;
  const taskItems = items[state.task]!;
  const matching = filterItems(taskItems, state);
  const columns = explorerColumns(task.target);

  return (
    <div className="benchmark">
      <h1>{EXPLORER_HEADING}</h1>
      <p>
        <a href="#/benchmark">{BACK_LINK_TEXT}</a>
      </p>
      <div className="bench-controls">
        <label className="bench-control">
          Task{" "}
          <select value={state.task} onChange={(e) => apply({ ...state, task: e.target.value, label: null })}>
            {data.tasks.map((t) => (
              <option key={t.task_id} value={t.task_id}>
                {t.task_id}
              </option>
            ))}
          </select>
        </label>
        <label className="bench-control">
          Split{" "}
          <select value={state.split ?? ""} onChange={(e) => apply({ ...state, split: (e.target.value || null) as Split | null })}>
            <option value="">All</option>
            {SPLITS.map((s) => (
              <option key={s} value={s}>
                {SPLIT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="bench-control">
          Label{" "}
          <select value={state.label ?? ""} onChange={(e) => apply({ ...state, label: e.target.value || null })}>
            <option value="">All</option>
            {labels.map((l) => (
              <option key={l.label} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {state.platform !== null && (
          <p className="bench-control">
            Platform: {state.platform}{" "}
            <button type="button" onClick={() => apply({ ...state, platform: null })}>
              Remove platform
            </button>
          </p>
        )}
      </div>
      <p className="result-count" aria-live="polite">
        {countLine(matching.length, taskItems.rows.length)}
      </p>
      {matching.length === 0 ? (
        <p>{NO_ITEMS_TEXT}</p>
      ) : (
        <>
          <table className="bench-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th scope="col" key={c.head}>
                    {c.head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matching.slice(0, shown).map((row) => (
                <tr key={String(row[0])}>
                  {explorerCells(task.target, taskItems.columns, row).map((cell, i) => (
                    <td key={columns[i]!.head} data-label={columns[i]!.head}>
                      {cell.href ? (
                        <a href={cell.href}>
                          <Breakable text={cell.text} />
                        </a>
                      ) : (
                        <Breakable text={cell.text} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {shown < matching.length && (
            <button type="button" className="bench-more" onClick={() => setShown(shown + PAGE_SIZE)}>
              {SHOW_MORE_TEXT}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function Benchmark({ index, route }: { index: IndexJson; route: BenchmarkRoute }) {
  const explorer = route.kind === "benchmarkItems";
  const [data, setData] = useState<BenchmarkJson | null>(null);
  const [items, setItems] = useState<BenchmarkItemsJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const fail = (e: unknown) => live && setError(e instanceof Error ? e.message : String(e));
    loadBenchmark().then((d) => live && setData(d), fail);
    if (explorer) loadItems().then((d) => live && setItems(d), fail);
    return () => {
      live = false;
    };
  }, [explorer]);

  if (error) return <p role="alert">{loadErrorText(error)}</p>;
  if (!data || (explorer && !items)) return <p>Loading…</p>;
  return explorer ? <Explorer data={data} items={items!} /> : <BenchmarkPage data={data} index={index} />;
}
