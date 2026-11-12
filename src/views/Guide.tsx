// Getting started (#/guide): the five tasks of lib/guide.ts, each a card with its steps in order and a link to the
// page a step uses.
import { ArrowRight } from "lucide-react";
import { GUIDE_LEAD, GUIDE_TASKS, GUIDE_TITLE } from "../lib/guide";

export function Guide() {
  return (
    <article className="guide">
      <h1>{GUIDE_TITLE}</h1>
      <p className="guide-lead">{GUIDE_LEAD}</p>
      <nav className="guide-contents" aria-label="Tasks">
        <ol>
          {GUIDE_TASKS.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                className="chip chip-button"
                onClick={() => document.getElementById(`guide-${t.id}`)?.scrollIntoView({ block: "start" })}
              >
                {i + 1}. {t.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {GUIDE_TASKS.map((t, i) => (
        <section key={t.id} className="card guide-task" aria-labelledby={`guide-${t.id}`}>
          <h2 id={`guide-${t.id}`}>
            <span className="guide-task-number" aria-hidden="true">
              {i + 1}
            </span>
            {t.title}
          </h2>
          <p className="guide-outcome">{t.outcome}</p>
          <ol className="guide-steps">
            {t.steps.map((s, k) => (
              <li key={k}>
                <p>{s.text}</p>
                {s.link && (
                  <a className="guide-link" href={s.link.href}>
                    {s.link.text}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </article>
  );
}
