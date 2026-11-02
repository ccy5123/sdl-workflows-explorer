// About the data: a summary of the release's data card and its full text (SPEC-SITE-001 REQ-005, REQ-006).
import { useReleaseDocs } from "../components/useReleaseDocs";
import type { IndexJson } from "../data/types";
import { ABOUT_AUTHOR_LEAD, ABOUT_SECTIONS, AUTHOR, aboutIntro } from "../lib/siteText";

export function About({ index }: { index: IndexJson }) {
  const { docs, error } = useReleaseDocs();
  const doiUrl = `https://doi.org/${index.release.doi}`;
  return (
    <article className="about">
      <h1>About the data</h1>
      <p>{aboutIntro(index.release.version)}</p>
      <p>
        {ABOUT_AUTHOR_LEAD} <a href={AUTHOR.url}>{AUTHOR.name}</a>.
      </p>
      {ABOUT_SECTIONS.map((s) => (
        <section key={s.heading} aria-labelledby={`about-${s.heading}`}>
          <h2 id={`about-${s.heading}`}>{s.heading}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <section aria-labelledby="about-full-text">
        <h2 id="about-full-text">Full text</h2>
        <p>
          The data card is also in the release files: <a href={doiUrl}>release {index.release.version} on Zenodo</a>.
        </p>
        {error && <p role="alert">Could not load the data card: {error}</p>}
        {docs && (
          <details className="data-card">
            <summary>DATA_CARD.md of release {index.release.version}</summary>
            <pre>{docs.data_card}</pre>
          </details>
        )}
      </section>
    </article>
  );
}
