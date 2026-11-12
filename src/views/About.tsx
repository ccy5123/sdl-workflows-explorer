// About the data: a summary of the release's data card and its full text (SPEC-SITE-001 REQ-005, REQ-006), and what
// the workflow builder's outputs show (SPEC-SIM-001 REQ-021), and what the footer's visitor count keeps (SPEC-VISIT-001
// REQ-009).
import { HowItWorks } from "../components/HowItWorks";
import { PHONE_QUERY, useMedia } from "../components/useMedia";
import { useReleaseDocs } from "../components/useReleaseDocs";
import type { IndexJson } from "../data/types";
import { ABOUT_AUTHOR_LEAD, ABOUT_SECTIONS, AUTHOR, LLM_ABOUT, PREPRINT, WORKFLOW_ABOUT, aboutIntro } from "../lib/siteText";
import { VISITOR_ABOUT } from "../lib/visitors";

/**
 * "On this page" for phones: one button per section that scrolls to its heading. Buttons, not "#" links, because the
 * site's routes live in the URL hash.
 */
function Contents({ items }: { items: { id: string; text: string }[] }) {
  const go = (id: string) => {
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  };
  return (
    <nav className="about-contents" aria-label="On this page">
      <h2 className="about-contents-title">On this page</h2>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className="chip" onClick={() => go(it.id)}>
              {it.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function About({ index }: { index: IndexJson }) {
  const { docs, error } = useReleaseDocs();
  const phone = useMedia(PHONE_QUERY);
  const doiUrl = `https://doi.org/${index.release.doi}`;
  const contents = [
    ...ABOUT_SECTIONS.map((s) => ({ id: `about-${s.heading}`, text: s.heading })),
    { id: "about-full-text", text: "Full text" },
    { id: "about-workflow", text: WORKFLOW_ABOUT.heading },
    { id: "about-llm", text: LLM_ABOUT.heading },
    { id: "about-visitors", text: VISITOR_ABOUT.heading },
  ];
  return (
    <article className="about">
      <h1>About the data</h1>
      <p>{aboutIntro(index.release.version)}</p>
      <p>
        {ABOUT_AUTHOR_LEAD} <a href={AUTHOR.url}>{AUTHOR.name}</a>.
      </p>
      <p>
        {PREPRINT.aboutLead} <a href={`https://doi.org/${PREPRINT.doi}`}>the preprint on ChemRxiv</a>.
      </p>
      {phone && <Contents items={contents} />}
      {ABOUT_SECTIONS.map((s) => (
        <section key={s.heading} aria-labelledby={`about-${s.heading}`} className="card panel">
          <h2 id={`about-${s.heading}`}>{s.heading}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      <section aria-labelledby="about-full-text" className="card panel">
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
      <section aria-labelledby="about-workflow" className="card panel">
        <h2 id="about-workflow">{WORKFLOW_ABOUT.heading}</h2>
        {/* The builder's method notes (SPEC-UI-001 phase 5); the link to the builder stays in view. */}
        <HowItWorks>
          {WORKFLOW_ABOUT.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </HowItWorks>
        <p>
          <a href="#/workflow">Open the workflow builder</a>.
        </p>
      </section>
      <section aria-labelledby="about-llm" className="card panel">
        <h2 id="about-llm">{LLM_ABOUT.heading}</h2>
        <p>{LLM_ABOUT.lead}</p>
        <p>
          {LLM_ABOUT.mcp} <code>npx -y {LLM_ABOUT.mcpPackage}</code> (
          <a href={`https://www.npmjs.com/package/${LLM_ABOUT.mcpPackage}`}>{LLM_ABOUT.mcpPackage} on npm</a>).
        </p>
        <p>
          {LLM_ABOUT.webBefore} <a href="llms.txt">llms.txt</a> {LLM_ABOUT.webAfter}
        </p>
        <p>{LLM_ABOUT.caution}</p>
      </section>
      <section aria-labelledby="about-visitors" className="card panel">
        <h2 id="about-visitors">{VISITOR_ABOUT.heading}</h2>
        {VISITOR_ABOUT.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>
    </article>
  );
}
