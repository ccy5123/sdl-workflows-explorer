// Benchmark view: the benchmark page (tasks, split, label counts, the reference results as published, how to run the
// evaluation, items by platform) and the item explorer (SPEC-BENCH-001 REQ-007 to REQ-016). Loaded lazily;
// data/benchmark.json (through the loader Home shares, useJson.ts) and, for the explorer, data/benchmark-items.json are
// fetched once per page load.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { HowItWorks } from "../components/HowItWorks";
import { Label } from "../components/Label";
import { Loading } from "../components/Loading";
import { loadJsonOnce } from "../components/useJson";
import { PHONE_QUERY, useMedia } from "../components/useMedia";
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
  taskItemsHead,
  taskTitle,
  uncertainSentence,
  type CountCell,
  type ExplorerState,
} from "../lib/benchmark";
import { displayLabel } from "../lib/labels";
import { parseRoute } from "../lib/route";

export type BenchmarkRoute = { kind: "benchmark" } | { kind: "benchmarkItems"; query: string };

let itemsRequest: Promise<BenchmarkItemsJson> | null = null;

function getJson<T>(path: string): Promise<T> {
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

/** data/benchmark.json, requested at most once per page load (shared with Home, SPEC-UI-001). */
const loadBenchmark = () => loadJsonOnce<BenchmarkJson>("data/benchmark.json");
/** data/benchmark-items.json, requested at most once per page load and only by the explorer. */
const loadItems = () => (itemsRequest ??= getJson<BenchmarkItemsJson>("data/benchmark-items.json"));

const DASH = "—";
const headingId = (text: string) => `bench-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** A card section; `code` (a task id) shows beside the heading as secondary text, outside the heading's name. */
function Section({ title, code, card = true, children }: { title: string; code?: string; card?: boolean; children: ReactNode }) {
  const id = headingId(title);
  return (
    <section aria-labelledby={id} className={card ? "card panel" : undefined}>
      <h2 id={id}>{title}</h2>
      {code && (
        <p className="bench-task-id">
          <code className="chip mono">{code}</code>
        </p>
      )}
      {children}
    </section>
  );
}

/** A task by its readable name, the task id under it (SPEC-UI-001 phase 6). */
function TaskName({ task }: { task: BenchmarkJson["tasks"][number] }) {
  return (
    <span className="bench-task-name" title={task.task_id}>
      {taskTitle(task.target)}
      <code className="bench-task-code">
        <Breakable text={task.task_id} />
      </code>
    </span>
  );
}

/** Head of a task's item-count column: "Module type items", the task id in `title` and as secondary text. */
function ItemsHead({ task }: { task: BenchmarkJson["tasks"][number] }) {
  return (
    <span className="bench-task-name" title={task.task_id}>
      {taskItemsHead(task.target)}
      <code className="bench-task-code">
        <Breakable text={task.task_id} />
      </code>
    </span>
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

/** A vocabulary code of a "#/taxonomy/<kind>/<code>" link, shown by its readable name (SPEC-UI-001 REQ-008). */
function linkedLabel(href: string, text: string): ReactNode {
  const match = /^#\/taxonomy\/([^/]+)\/([^/?]+)$/.exec(href);
  return match && decodeURIComponent(match[2]!) === text ? <Label kind={match[1]!} code={text} /> : <Breakable text={text} />;
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
  const heads = data.tasks.map((t) => taskItemsHead(t.target));
  return (
    <table className="bench-table bench-compact" aria-label="Split">
      <thead>
        <tr>
          <th scope="col">Split</th>
          <th scope="col">Papers</th>
          {data.tasks.map((t) => (
            <th scope="col" key={t.task_id}>
              <ItemsHead task={t} />
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
              <Count key={taskIds[i]} cell={c} label={heads[i]!} />
            ))}
          </tr>
        ))}
        <tr>
          <td data-label="Split">Total</td>
          <td data-label="Papers" className="num">
            {table.total.papers}
          </td>
          {table.total.cells.map((c, i) => (
            <Count key={taskIds[i]} cell={c} label={heads[i]!} />
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
    <Section title={taskTitle(task.target)} code={task.task_id}>
      <dl className="taxo-facts card">
        <dt>Unit of an item</dt>
        <dd>{itemUnit(task.target)}</dd>
        <dt>Which items</dt>
        <dd>{task.item_rule}</dd>
        <dt>Inputs</dt>
        <dd>{task.inputs}</dd>
      </dl>
      <table className="bench-table bench-compact">
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
                <a href={r.href}>{linkedLabel(r.href, r.label)}</a>
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
            const known = data.tasks.find((t) => t.task_id === r.task_id);
            const taskCell = (text: string) => (known ? <TaskName task={known} /> : <Breakable text={text} />);
            const row = referenceRow(r);
            const cells = [row.task, row.testItems, row.baseline, row.reference, row.difference, row.interval, row.replicates];
            return (
              <tr key={row.task}>
                {cells.map((text, i) => (
                  <td key={REFERENCE_HEADS[i]} data-label={REFERENCE_HEADS[i]} className={i > 0 ? "num" : undefined}>
                    {/* Statistics and their counts in Latin Modern, numbers upright (SPEC-UI-001 REQ-003). */}
                    {i === 0 ? taskCell(text) : <span className="math">{text}</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">{DIFFERENCE_NOTE}</p>
      <p className="note">{TEST_PAPERS_NOTE}</p>
      <table className="bench-table bench-compact">
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
                <TaskName task={data.tasks.find((t) => t.task_id === m.task)!} />
              </td>
              <td data-label={MODEL_HEADS[1]}>{m.baseline}</td>
              <td data-label={MODEL_HEADS[2]}>{m.referenceModel}</td>
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
    <Section title={SECTION_HEADINGS.evaluation} card={false}>
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

/** Rows of "Items by platform" a phone shows at first, and how many more each "Show more" adds. */
const ITEMS_PAGE = 25;

function ItemsByPlatform({ data, index }: { data: BenchmarkJson; index: IndexJson }) {
  const [split, setSplit] = useState<Split | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(ITEMS_PAGE);
  const phone = useMedia(PHONE_QUERY);
  const names = useMemo(() => new Map(index.platforms.map((p) => [p.platform_id, p.platform_name])), [index]);
  const all = platformRows(data, split);
  // On a phone the 279 rows fold away, with a search and 25 rows at a time (the desktop table is unchanged).
  const q = query.trim().toLowerCase();
  const matched = phone && q ? all.filter((r) => `${r.platform_id} ${names.get(r.platform_id) ?? ""}`.toLowerCase().includes(q)) : all;
  const rows = phone ? matched.slice(0, shown) : matched;
  const taskIds = data.tasks.map((t) => t.task_id);
  const controls = (
    <>
      <label className="bench-control">
        Split{" "}
        <select
          value={split ?? ""}
          onChange={(e) => {
            setSplit((e.target.value || null) as Split | null);
            setShown(ITEMS_PAGE);
          }}
        >
          <option value="">All</option>
          {SPLITS.map((s) => (
            <option key={s} value={s}>
              {SPLIT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {phone && (
        <label className="bench-control bench-search">
          Search{" "}
          <input
            type="search"
            value={query}
            placeholder="Platform id or name"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(ITEMS_PAGE);
            }}
          />
        </label>
      )}
      <p className="result-count" aria-live="polite">
        {platformsCountLine(matched.length, data.platforms.length, split)}
      </p>
    </>
  );
  const tableEl = (
    <table className="bench-table">
      <thead>
        <tr>
          <th scope="col">Platform</th>
          <th scope="col">Name</th>
          <th scope="col">Split</th>
          {data.tasks.map((t) => (
            <th scope="col" key={t.task_id}>
              <ItemsHead task={t} />
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
              <Count key={taskIds[i]} cell={c} label={taskItemsHead(data.tasks[i]!.target)} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <Section title={SECTION_HEADINGS.platforms}>
      {phone ? (
        <details className="note-fold bench-items-fold">
          <summary>
            Show the {data.platforms.length} platforms
          </summary>
          {controls}
          {tableEl}
          {matched.length > shown && (
            <button type="button" className="btn btn-secondary bench-more" onClick={() => setShown((n) => n + ITEMS_PAGE)}>
              Show {Math.min(ITEMS_PAGE, matched.length - shown)} more
            </button>
          )}
        </details>
      ) : (
        <>
          {controls}
          {tableEl}
        </>
      )}
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
      {/* How the reference numbers are computed and how to rerun them (SPEC-UI-001 phase 5). */}
      <HowItWorks>
        <p>{METRIC_DEFINITION}</p>
        <Evaluation data={data} doi={index.release.doi} />
      </HowItWorks>
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
              <option key={t.task_id} value={t.task_id} title={t.task_id}>
                {taskTitle(t.target)} ({t.task_id})
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
              <option key={l.label} value={l.label} title={l.label}>
                {displayLabel(task.target, l.label)}
              </option>
            ))}
          </select>
        </label>
        {state.platform !== null && (
          <p className="bench-control">
            Platform: {state.platform}{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => apply({ ...state, platform: null })}>
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
                        <a href={cell.href}>{linkedLabel(cell.href, cell.text)}</a>
                      ) : columns[i]!.source.endsWith("_family") && cell.text !== "" ? (
                        <Label kind="family" code={cell.text} />
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
            <button type="button" className="btn btn-secondary bench-more" onClick={() => setShown(shown + PAGE_SIZE)}>
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
  if (!data || (explorer && !items)) return <Loading />;
  return explorer ? <Explorer data={data} items={items!} /> : <BenchmarkPage data={data} index={index} />;
}
