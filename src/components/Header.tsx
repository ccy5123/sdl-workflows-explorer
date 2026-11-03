// Platform header (REQ-005, REQ-015; SPEC-CONTRIB-001 REQ-003) as a card (SPEC-UI-001 REQ-017): the title, chips for
// year, fields and a commercial system, the paper, and buttons for the paper's DOI and the platform's evidence.
import { ExternalLink, FileSearch } from "lucide-react";
import type { PaperRow, PlatformGraph } from "../data/types";
import { CORRECTION_LINK_TEXT, correctionUrl } from "../lib/contribute";
import type { SharedLink } from "../lib/identity";
import { platformHash } from "../lib/route";
import { IssueLink } from "./IssueLink";
import { Label } from "./Label";

interface Props {
  platform: PlatformGraph;
  paper: PaperRow | undefined;
  shared: SharedLink[];
  release: string;
  onSelectPlatform: () => void;
}

export function Header({ platform, paper, shared, release, onSelectPlatform }: Props) {
  return (
    <header className="card platform-header">
      <div className="platform-header-main">
        <div className="platform-title-block">
          <p className="platform-id">
            Platform <code>{platform.platform_id}</code>
          </p>
          <h1>{platform.name ?? platform.platform_id}</h1>
        </div>
        <div className="platform-actions">
          <a className="btn btn-secondary btn-sm" href={`https://doi.org/${platform.doi}`} aria-label="Paper DOI" title={`https://doi.org/${platform.doi}`}>
            <ExternalLink size={15} aria-hidden="true" />
            DOI
          </a>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSelectPlatform}>
            <FileSearch size={15} aria-hidden="true" />
            Show platform evidence
          </button>
        </div>
      </div>
      <div className="platform-chips">
        <span className="chip" data-field="year">
          {platform.first_public_year}
        </span>
        {platform.field_tags.map((t) => (
          <span key={t} className="chip" title={t}>
            <Label kind="field_tag" code={t} />
          </span>
        ))}
        {platform.commercial_integrated && <span className="chip chip-accent badge">commercial integrated system</span>}
      </div>
      <dl className="facts">
        <dt>Paper</dt>
        <dd>
          {paper ? (
            <>
              {paper.title} <span className="venue">({paper.venue})</span>
            </>
          ) : (
            platform.paper_id
          )}
        </dd>
        {platform.campaigns && (
          <>
            <dt>Campaigns</dt>
            <dd>{platform.campaigns}</dd>
          </>
        )}
        {shared.length > 0 && (
          <>
            <dt>Same platform in</dt>
            <dd>
              <ul className="shared">
                {shared.map((s) => (
                  <li key={s.paperId}>
                    {s.platforms.length === 0
                      ? s.paperId
                      : s.platforms.map((p, i) => (
                          <span key={p.platformId}>
                            {i > 0 && ", "}
                            <a href={platformHash(p.platformId)}>{p.label}</a>
                          </span>
                        ))}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
      <p className="report">
        <IssueLink href={correctionUrl(platform.platform_id, release)}>{CORRECTION_LINK_TEXT}</IssueLink>
      </p>
    </header>
  );
}
