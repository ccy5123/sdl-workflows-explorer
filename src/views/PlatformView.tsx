// One platform: header, graph, steps, evidence, legend and text tables (REQ-001, REQ-002, REQ-005 to REQ-016); laid out
// as a header card, a full-width graph, the step timeline beside the tables, and an evidence sheet that opens on a
// selection with an empty state before it (SPEC-UI-001 REQ-017 to REQ-020).
import { MousePointerClick } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { EvidencePanel } from "../components/EvidencePanel";
import { Graph } from "../components/Graph";
import { Header } from "../components/Header";
import { Label } from "../components/Label";
import { StepList } from "../components/StepList";
import type { IndexJson, PlatformFile, PlatformGraph } from "../data/types";
import { formatEvidence } from "../lib/evidence";
import { displayLabel } from "../lib/labels";
import { sharedIdentityLinks } from "../lib/identity";
import { selectionReducer, sortSteps, type Selection } from "../lib/steps";
import { Loading } from "../components/Loading";
import { NotFound } from "./NotFound";

type Load = { state: "loading" } | { state: "ready"; platform: PlatformGraph } | { state: "missing" };

interface Props {
  index: IndexJson;
  paperId: string;
  platformId: string;
  hash: string;
}

const yesNo = (v: boolean) => (v ? "yes" : "no");

/** A module named by its readable type, with its short id ("M3") beside it and the full id on hover. */
function ModuleRef({ id, type }: { id: string; type: string | undefined }) {
  const short = id.slice(id.lastIndexOf("/") + 1);
  return (
    <span className="module-ref" title={id}>
      {type ? displayLabel("module_type", type) : id} <code>{short}</code>
    </span>
  );
}

/** How long after the selection is cleared a focus event is not taken as a preview (the sheet hands focus back). */
const QUIET_FOCUS_MS = 100;

/**
 * Scrolls the graph into view when less than half of it shows, so the modules a chosen step uses are seen
 * highlighted (SPEC-UI-001 UI AC-46). Only on a step's selection (click, Enter or Space), never on hover or focus,
 * so the page does not move under the pointer. The top bar is cleared by the root's `scroll-padding-top`.
 */
function revealGraph(root: HTMLElement | null) {
  const graph = root?.querySelector<HTMLElement>(".graph-wrap");
  if (!graph) return;
  const box = graph.getBoundingClientRect();
  const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, top);
  if (shown >= box.height / 2) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  graph.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
}

function activate(e: KeyboardEvent, action: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}

export function PlatformView({ index, paperId, platformId, hash }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch(`data/platforms/${encodeURIComponent(paperId)}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<PlatformFile>;
      })
      .then((file) => {
        const platform = Array.isArray(file?.platforms) ? file.platforms.find((p) => p.platform_id === platformId) : undefined;
        if (!cancelled) setLoad(platform ? { state: "ready", platform } : { state: "missing" });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [paperId, platformId]);

  if (load.state === "loading") return <Loading />;
  if (load.state === "missing") return <NotFound hash={hash} />;
  // Keyed by the platform, so a selection never carries over to another platform (SPEC-UI-001 REQ-023).
  return <Platform key={load.platform.platform_id} index={index} platform={load.platform} />;
}

function Platform({ index, platform }: { index: IndexJson; platform: PlatformGraph }) {
  const [selection, dispatch] = useReducer(selectionReducer, null as Selection);
  const select = (s: NonNullable<Selection>) => dispatch({ type: "select", selection: s });
  // A step under the pointer or keyboard focus, previewed in the graph without selecting it (SPEC-UI-001 UI AC-38).
  const [preview, setPreview] = useState<string | null>(null);
  // Set while the sheet returns focus to the step that opened it, so that focus does not bring the highlight back.
  const quietFocus = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const clear = useCallback(() => {
    quietFocus.current = true;
    setPreview(null);
    dispatch({ type: "clear" });
    setTimeout(() => {
      quietFocus.current = false;
    }, QUIET_FOCUS_MS);
  }, []);
  const onPreview = (stepId: string | null, by: "pointer" | "focus") => {
    if (stepId && by === "focus" && quietFocus.current) return;
    setPreview(stepId);
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const steps = useMemo(() => sortSteps(platform.steps), [platform]);
  const moduleTypes = useMemo(() => new Map(platform.modules.map((m) => [m.module_id, m.module_type])), [platform]);
  const paper = index.papers.find((p) => p.paper_id === platform.paper_id);
  const shared = sharedIdentityLinks(platform, index.platforms);
  const isPicked = (kind: string, id: string) => selection?.kind === kind && selection.id === id;

  return (
    <div className="platform" ref={root}>
      <Header
        platform={platform}
        paper={paper}
        shared={shared}
        release={index.release.version}
        onSelectPlatform={() => select({ kind: "platform", id: platform.platform_id })}
      />
      <Graph platform={platform} selection={selection} preview={preview} onSelect={select} />
      {!selection && (
        <p className="evidence-empty">
          <MousePointerClick size={16} aria-hidden="true" />
          Select a module or connection in the graph, a step or a table row to see the page in the paper that describes
          it.
        </p>
      )}
      {selection && (
        <EvidencePanel
          view={formatEvidence(platform, selection)}
          release={index.release.version}
          onClose={clear}
        />
      )}
      <div className="viewer">
        <StepList
          steps={steps}
          modules={platform.modules}
          selectedStepId={selection?.kind === "step" ? selection.id : null}
          onSelect={(id) => {
            select({ kind: "step", id });
            revealGraph(root.current);
          }}
          onPreview={onPreview}
        />
        <div className="viewer-tables">
      <section className="card panel" aria-labelledby="modules-heading">
        <h2 id="modules-heading">Modules</h2>
        <div className="table-scroll">
          <table className="data card-table" data-table="modules">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Name in paper</th>
                <th scope="col">Part of the platform</th>
                <th scope="col">Id</th>
              </tr>
            </thead>
            <tbody>
              {platform.modules.map((m) => (
                <tr
                  key={m.module_id}
                  tabIndex={0}
                  aria-selected={isPicked("module", m.module_id)}
                  onClick={() => select({ kind: "module", id: m.module_id })}
                  onKeyDown={(e) => activate(e, () => select({ kind: "module", id: m.module_id }))}
                >
                  <td className="card-name" data-label="Type">
                    <Label kind="module_type" code={m.module_type} />
                  </td>
                  <td className="card-title" data-label="Name in paper">{m.name_in_paper ?? "—"}</td>
                  <td className="card-field" data-label="Part of the platform">{yesNo(m.on_platform)}</td>
                  <td className="card-aside" data-label="Id">
                    <code>{m.module_id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* What the yes/no column means (release data_dictionary.csv, module.on_platform; SPEC-RELEASE-001 REQ-011). */}
        <p className="table-note">
          Part of the platform: yes for modules of the platform, no for equipment outside it that the loop uses.
        </p>
      </section>
      <section className="card panel" aria-labelledby="connections-heading">
        <h2 id="connections-heading">Connections</h2>
        <div className="table-scroll">
          <table className="data card-table" data-table="connections">
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">Transfer mode</th>
                <th scope="col">Stated</th>
                <th scope="col">Uncertain</th>
              </tr>
            </thead>
            <tbody>
              {platform.connections.map((c) => (
                <tr
                  key={c.edge_id}
                  tabIndex={0}
                  aria-selected={isPicked("connection", c.edge_id)}
                  onClick={() => select({ kind: "connection", id: c.edge_id })}
                  onKeyDown={(e) => activate(e, () => select({ kind: "connection", id: c.edge_id }))}
                >
                  <td className="card-head" data-label="From">
                    <ModuleRef id={c.from_module} type={moduleTypes.get(c.from_module)} />
                  </td>
                  <td className="card-head card-to" data-label="To">
                    <ModuleRef id={c.to_module} type={moduleTypes.get(c.to_module)} />
                  </td>
                  <td className="card-title" data-label="Transfer mode">
                    <Label kind="transfer_mode" code={c.transfer_mode} />
                  </td>
                  <td className="card-field" data-label="Stated">{yesNo(c.stated)}</td>
                  <td className="card-field" data-label="Uncertain">{c.uncertain ? "yes ?" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </div>
      </div>
    </div>
  );
}
