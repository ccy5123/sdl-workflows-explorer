// Platform header (REQ-005, REQ-015).
import type { PaperRow, PlatformGraph } from "../data/types";
import type { SharedLink } from "../lib/identity";
import { platformHash } from "../lib/route";

interface Props {
  platform: PlatformGraph;
  paper: PaperRow | undefined;
  shared: SharedLink[];
  onSelectPlatform: () => void;
}

export function Header({ platform, paper, shared, onSelectPlatform }: Props) {
  return (
    <header className="platform-header">
      <h1>{platform.name ?? platform.platform_id}</h1>
      <p className="platform-id">
        Platform <code>{platform.platform_id}</code>
        {platform.commercial_integrated && <span className="badge">commercial integrated system</span>}
      </p>
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
        <dt>Year</dt>
        <dd data-field="year">{platform.first_public_year}</dd>
        <dt>Fields</dt>
        <dd>{platform.field_tags.length ? platform.field_tags.join(", ") : "—"}</dd>
        {platform.campaigns && (
          <>
            <dt>Campaigns</dt>
            <dd>{platform.campaigns}</dd>
          </>
        )}
        <dt>DOI</dt>
        <dd>
          <a href={`https://doi.org/${platform.doi}`}>{`https://doi.org/${platform.doi}`}</a>
        </dd>
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
      <button type="button" onClick={onSelectPlatform}>
        Show platform evidence
      </button>
    </header>
  );
}
