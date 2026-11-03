// The six view cards of Home (SPEC-UI-001 REQ-010): each card is one link with a small live preview from the release
// data. Previews wait for their data with a skeleton.
import { ChartColumn, Network, Table, Tag, Target, Workflow, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { BenchmarkJson, IndexJson, PlatformGraph, TaxonomyJson } from "../data/types";
import { FEATURED_PLATFORM, evidenceText, featuredLayout, fieldTagCounts, papersPerYear, taxonomyCounts } from "../lib/home";
import { displayLabel, sentenceCase } from "../lib/labels";
import { platformHash } from "../lib/route";
import { VIEWS, fieldsCaption, yearsCaption, type ViewKey } from "../lib/siteText";
import { Label } from "./Label";
import { Skeleton } from "./Loading";

const ICONS: Record<ViewKey, LucideIcon> = {
  platform: Network,
  browse: Table,
  trends: ChartColumn,
  taxonomy: Tag,
  benchmark: Target,
  workflow: Workflow,
};

const HREFS: Record<ViewKey, string> = {
  platform: platformHash(FEATURED_PLATFORM),
  browse: "#/browse",
  trends: "#/trends",
  taxonomy: "#/taxonomy",
  benchmark: "#/benchmark",
  workflow: "#/workflow",
};

/** Kinds of the taxonomy preview, in the order shown. */
const KINDS = ["unit_operation", "module_type", "field_tag", "transfer_mode"] as const;

const FIELD_TAGS_SHOWN = 5;

const decimals = (x: number) => x.toFixed(3).replace("-", "−");

function PlatformPreview({ platform }: { platform: PlatformGraph | null }) {
  if (!platform) return <Skeleton height={56} />;
  const chain = featuredLayout(platform).chain;
  const shown = chain.find((m) => m.module_type.startsWith("instrument_")) ?? chain[0] ?? platform.modules[0];
  if (!shown) return null;
  return (
    <div className="vc-panel vc-facts">
      <span>
        <span className="vc-muted">Module</span>
        <span className="vc-strong">{shown.name_in_paper ?? displayLabel("module_type", shown.module_type)}</span>
      </span>
      <span>
        <span className="vc-muted">Read from</span>
        <span className="mono">{evidenceText(shown.evidence)}</span>
      </span>
    </div>
  );
}

function BrowsePreview({ index }: { index: IndexJson }) {
  const tags = fieldTagCounts(index.papers);
  const top = tags.slice(0, FIELD_TAGS_SHOWN);
  const max = top[0]?.n ?? 1;
  return (
    <div className="vc-bars">
      {top.map((t) => (
        <div key={t.code} className="vc-bar-row">
          <span className="vc-bar-label">
            <Label kind="field_tag" code={t.code} />
          </span>
          <span className="vc-bar-track">
            <span className="vc-bar-fill" style={{ width: `${(100 * t.n) / max}%` }} />
          </span>
          <span className="vc-bar-n">{t.n}</span>
        </div>
      ))}
      <span className="vc-caption">{fieldsCaption(top.length, tags.length)}</span>
    </div>
  );
}

function TrendsPreview({ index }: { index: IndexJson }) {
  const bars = papersPerYear(index.papers);
  const max = Math.max(...bars.map((b) => b.n));
  const last = bars[bars.length - 1]!;
  const middle = bars[Math.floor(bars.length / 2)]!;
  return (
    <div>
      <div className="vc-spark" aria-hidden="true">
        {bars.map((b) => (
          <span
            key={b.label}
            className={`vc-spark-bar${b.partial ? " vc-spark-partial" : ""}`}
            title={`${b.label}: ${b.n}`}
            style={{ height: `${Math.round((b.n / max) * 66) + 2}px` }}
          />
        ))}
      </div>
      <div className="vc-spark-axis" aria-hidden="true">
        <span>{bars[0]!.label}</span>
        <span>{middle.label}</span>
        <span>{last.label}, partial</span>
      </div>
      <span className="vc-caption">{yearsCaption(Number(last.label))}</span>
    </div>
  );
}

function TaxonomyPreview({ taxonomy }: { taxonomy: TaxonomyJson | null }) {
  if (!taxonomy) return <Skeleton height={112} />;
  const counts = taxonomyCounts(taxonomy);
  return (
    <div className="vc-grid">
      {KINDS.map((k) => (
        <span key={k} className="vc-panel">
          <span className="vc-count">{counts[k] ?? 0}</span>
          <span className="vc-muted">{sentenceCase(k)}s</span>
        </span>
      ))}
    </div>
  );
}

function BenchmarkPreview({ benchmark }: { benchmark: BenchmarkJson | null }) {
  if (!benchmark) return <Skeleton height={112} />;
  const task = benchmark.tasks.find((t) => t.target === "module_type") ?? benchmark.tasks[0];
  if (!task) return null;
  const rows = [
    ["Baseline", task.baseline_top1, "vc-bar-fill vc-bar-muted"],
    ["Reference model", task.reference_model_top1, "vc-bar-fill"],
  ] as const;
  return (
    <div className="vc-panel vc-bench">
      <span className="vc-strong">{sentenceCase(task.target)} of a step, top-1 accuracy</span>
      {rows.map(([name, value, cls]) => (
        <span key={name} className="vc-bench-row">
          <span className="vc-muted">{name}</span>
          <span className="vc-bar-track">
            <span className={cls} style={{ width: `${100 * value}%` }} />
          </span>
          <span className="math">{value.toFixed(3)}</span>
        </span>
      ))}
      <span className="vc-caption">
        <span className="math">
          <i>n</i> = {task.n_test_items}
        </span>{" "}
        test steps from <span className="math">{task.n_test_papers}</span> papers; difference, 95% CI{" "}
        <span className="math vc-nowrap">
          [{decimals(task.diff_ci95_low)}, {decimals(task.diff_ci95_high)}]
        </span>
      </span>
    </div>
  );
}

function WorkflowPreview() {
  return (
    <div className="vc-flow" aria-hidden="true">
      <span className="vc-flow-step">{displayLabel("unit_operation", "dispense_solid")}</span>
      <span className="vc-muted">→</span>
      <span className="vc-flow-step">{displayLabel("unit_operation", "react_thermal")}</span>
      <span className="vc-muted">→</span>
      <span className="vc-flow-step vc-flow-add">+ Add step</span>
    </div>
  );
}

interface Props {
  index: IndexJson;
  platform: PlatformGraph | null;
  taxonomy: TaxonomyJson | null;
  benchmark: BenchmarkJson | null;
}

export function ViewCards({ index, platform, taxonomy, benchmark }: Props) {
  const previews: Record<ViewKey, ReactNode> = {
    platform: <PlatformPreview platform={platform} />,
    browse: <BrowsePreview index={index} />,
    trends: <TrendsPreview index={index} />,
    taxonomy: <TaxonomyPreview taxonomy={taxonomy} />,
    benchmark: <BenchmarkPreview benchmark={benchmark} />,
    workflow: <WorkflowPreview />,
  };
  return (
    <ul className="view-cards">
      {VIEWS.map((v) => {
        const Icon = ICONS[v.key];
        return (
          <li key={v.key}>
            {/* The link is the view's name; its ::after covers the card, so the whole card stays one click target
                while the link's name is the text it shows (SPEC-UI-001 UI AC-49, axe label-content-name-mismatch). */}
            <div className="card card-link view-card">
              <div className="view-card-head">
                <span className="view-card-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <a
                  className="view-card-name view-card-link"
                  href={HREFS[v.key]}
                  data-view={v.key}
                  aria-describedby={`view-${v.key}-text`}
                >
                  {v.name}
                </a>
              </div>
              <p className="view-card-text" id={`view-${v.key}-text`}>
                {v.description}
              </p>
              <div className="view-card-preview">{previews[v.key]}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
