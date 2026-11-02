// Featured-platform card of Home (SPEC-UI-001 REQ-010): the platform's modules drawn from its file (control row above
// the material chain, transfer modes and stated/inferred lines), the steps of one cycle, and where it is described.
import { ArrowRight } from "lucide-react";
import type { Module, PaperRow, PlatformGraph } from "../data/types";
import { evidenceText, featuredLayout } from "../lib/home";
import { displayLabel } from "../lib/labels";
import { groupOf, transferModeStyle } from "../lib/moduleGroups";
import { platformHash } from "../lib/route";
import { Label } from "./Label";
import { Skeleton } from "./Loading";

function ModuleBox({ module }: { module: Module }) {
  return (
    <div className="fp-module" title={module.module_type}>
      <div className="fp-module-type">
        <span className="chip-dot" style={{ background: groupOf(module.module_type).colour }} aria-hidden="true" />
        {displayLabel("module_type", module.module_type)}
      </div>
      {module.name_in_paper && <div className="fp-module-name">{module.name_in_paper}</div>}
    </div>
  );
}

interface Props {
  platform: PlatformGraph | null;
  paper: PaperRow | undefined;
  error: string | null;
}

export function FeaturedPlatform({ platform, paper, error }: Props) {
  if (error) {
    return (
      <article className="card featured" aria-label="Featured platform">
        <p role="alert" className="featured-error">
          Could not load the featured platform: {error}
        </p>
      </article>
    );
  }
  if (!platform) {
    return (
      <article className="card featured" aria-label="Featured platform" aria-busy="true">
        <div className="featured-head">
          <Skeleton width="30%" height={12} />
          <Skeleton width="70%" height={20} />
        </div>
        <div className="featured-graph">
          <Skeleton height={150} />
        </div>
      </article>
    );
  }

  const layout = featuredLayout(platform);
  const steps = [...platform.steps].sort((a, b) => a.step_order - b.step_order);
  return (
    <article className="card featured" aria-labelledby="featured-title">
      <div className="featured-head">
        <div className="featured-title-block">
          <p className="eyebrow">Featured platform</p>
          <h2 id="featured-title">{platform.name ?? platform.platform_id}</h2>
          <p className="featured-meta">
            <span className="mono">{platform.platform_id}</span>
            {paper && ` · ${paper.venue}`} · {platform.first_public_year}
          </p>
        </div>
        <div className="featured-chips">
          {platform.field_tags.map((t) => (
            <span key={t} className="chip">
              <Label kind="field_tag" code={t} />
            </span>
          ))}
        </div>
      </div>

      <div className="featured-graph">
        <h3 className="visually-hidden">Modules and connections</h3>
        {layout.control.length > 0 && (
          <div className="fp-control">
            {layout.control.map((m) => (
              <ModuleBox key={m.module_id} module={m} />
            ))}
          </div>
        )}
        {layout.control.length > 0 && layout.dataLinks > 0 && (
          <div className="fp-data-links" aria-hidden="true">
            <span>data</span>
            <span>data</span>
          </div>
        )}
        <div className="fp-chain-scroll">
          <div className="fp-chain">
            {layout.chain.map((m, i) => (
              <div key={m.module_id} className="fp-chain-item">
                {i > 0 && layout.links[i - 1] && (
                  <span
                    className={`fp-link${layout.links[i - 1]!.stated ? "" : " fp-link-inferred"}`}
                    title={`${displayLabel("transfer_mode", layout.links[i - 1]!.mode)}, ${layout.links[i - 1]!.stated ? "stated in the paper" : "inferred"}`}
                  >
                    <span className="fp-link-mode">{transferModeStyle(layout.links[i - 1]!.mode).label}</span>
                    <span className="fp-link-line" aria-hidden="true" />
                    <span className="visually-hidden">
                      , {layout.links[i - 1]!.stated ? "stated in the paper" : "inferred"}, to
                    </span>
                  </span>
                )}
                <ModuleBox module={m} />
              </div>
            ))}
          </div>
        </div>
        {layout.links.length > 0 && (
          <div className="fp-legend" aria-hidden="true">
            <span>
              <span className="fp-legend-line" /> stated in the paper
            </span>
            <span>
              <span className="fp-legend-line fp-legend-inferred" /> inferred
            </span>
          </div>
        )}
      </div>

      <div className="featured-foot">
        <h3 className="featured-steps-title">One cycle, {steps.length} steps</h3>
        <ol className="fp-steps">
          {steps.map((s) => (
            <li key={s.step_id} className="fp-step">
              <span className="fp-step-n">{s.step_order}</span>
              <Label kind="unit_operation" code={s.unit_operation} />
            </li>
          ))}
        </ol>
        <div className="featured-links">
          <span className="featured-evidence">
            Evidence: {evidenceText(platform.evidence)} ·{" "}
            <a href={`https://doi.org/${platform.doi}`}>doi:{platform.doi}</a>
          </span>
          <a className="btn btn-ghost btn-sm" href={platformHash(platform.platform_id)}>
            Open in viewer
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
