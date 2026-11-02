// One platform: header, graph, steps, evidence, legend and text tables (REQ-001, REQ-002, REQ-005 to REQ-016).
import { useEffect, useMemo, useReducer, useState, type KeyboardEvent } from "react";
import { EvidencePanel } from "../components/EvidencePanel";
import { Graph } from "../components/Graph";
import { Header } from "../components/Header";
import { Legend } from "../components/Legend";
import { StepList } from "../components/StepList";
import type { IndexJson, PlatformFile, PlatformGraph } from "../data/types";
import { formatEvidence } from "../lib/evidence";
import { sharedIdentityLinks } from "../lib/identity";
import { selectionReducer, sortSteps, type Selection } from "../lib/steps";
import { NotFound } from "./NotFound";

type Load = { state: "loading" } | { state: "ready"; platform: PlatformGraph } | { state: "missing" };

interface Props {
  index: IndexJson;
  paperId: string;
  platformId: string;
  hash: string;
}

const yesNo = (v: boolean) => (v ? "yes" : "no");

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

  if (load.state === "loading") return <p>Loading…</p>;
  if (load.state === "missing") return <NotFound hash={hash} />;
  return <Platform index={index} platform={load.platform} />;
}

function Platform({ index, platform }: { index: IndexJson; platform: PlatformGraph }) {
  const [selection, dispatch] = useReducer(selectionReducer, null as Selection);
  const select = (s: NonNullable<Selection>) => dispatch({ type: "select", selection: s });

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "clear" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steps = useMemo(() => sortSteps(platform.steps), [platform]);
  const paper = index.papers.find((p) => p.paper_id === platform.paper_id);
  const shared = sharedIdentityLinks(platform, index.platforms);
  const isPicked = (kind: string, id: string) => selection?.kind === kind && selection.id === id;

  return (
    <div className="platform">
      <Header
        platform={platform}
        paper={paper}
        shared={shared}
        release={index.release.version}
        onSelectPlatform={() => select({ kind: "platform", id: platform.platform_id })}
      />
      <div className="viewer">
        <div className="viewer-main">
          <Graph platform={platform} selection={selection} onSelect={select} />
        </div>
        <div className="viewer-side">
          <EvidencePanel view={formatEvidence(platform, selection)} release={index.release.version} />
          <StepList
            steps={steps}
            modules={platform.modules}
            selectedStepId={selection?.kind === "step" ? selection.id : null}
            onSelect={(id) => select({ kind: "step", id })}
          />
        </div>
      </div>
      <Legend />
      <section className="panel" aria-labelledby="modules-heading">
        <h2 id="modules-heading">Modules</h2>
        <div className="table-scroll">
          <table className="data" data-table="modules">
            <thead>
              <tr>
                <th scope="col">Id</th>
                <th scope="col">Type</th>
                <th scope="col">Name in paper</th>
                <th scope="col">Part of the platform</th>
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
                  <td>
                    <code>{m.module_id}</code>
                  </td>
                  <td>{m.module_type}</td>
                  <td>{m.name_in_paper ?? "—"}</td>
                  <td>{yesNo(m.on_platform)}</td>
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
      <section className="panel" aria-labelledby="connections-heading">
        <h2 id="connections-heading">Connections</h2>
        <div className="table-scroll">
          <table className="data" data-table="connections">
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
                  <td>
                    <code>{c.from_module}</code>
                  </td>
                  <td>
                    <code>{c.to_module}</code>
                  </td>
                  <td>{c.transfer_mode}</td>
                  <td>{yesNo(c.stated)}</td>
                  <td>{c.uncertain ? "yes ?" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
