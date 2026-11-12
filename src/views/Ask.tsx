// "Ask with your own AI" (#/ask): setting up the visitor's own AI app to answer from the records, with example
// questions. Text in lib/ask.ts.
import { ArrowRight } from "lucide-react";
import { CopyButton } from "../components/CopyButton";
import {
  ASK_CAUTION,
  ASK_EXAMPLES,
  ASK_LEAD,
  ASK_SERVER_NOTE,
  ASK_SETUPS,
  ASK_TITLE,
  ASK_TROUBLE,
  MCP_PACKAGE,
  NPM_URL,
  webPrompt,
} from "../lib/ask";

function Code({ text, label }: { text: string; label: string }) {
  return (
    <div className="ask-code">
      <pre>
        <code>{text}</code>
      </pre>
      <CopyButton text={text} label={label} />
    </div>
  );
}

export function Ask() {
  // The site's own llms.txt, absolute, for the prompt a web chat app is given.
  const llmsUrl = new URL("llms.txt", window.location.href.split("#")[0]).href;
  return (
    <article className="ask">
      <h1>{ASK_TITLE}</h1>
      <p className="ask-lead">{ASK_LEAD}</p>

      <section className="card panel" aria-labelledby="ask-setup">
        <h2 id="ask-setup">Set up your app</h2>
        {ASK_SETUPS.map((s) => (
          <div key={s.id} className="ask-setup" data-setup={s.id}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            {s.code && <Code text={s.code} label="Copy" />}
            {s.id === "web" && <Code text={webPrompt(llmsUrl)} label="Copy prompt" />}
            {s.after && <p className="ask-after">{s.after}</p>}
          </div>
        ))}
        <p className="table-note">
          The server is the npm package <a href={NPM_URL}>{MCP_PACKAGE}</a>. {ASK_TROUBLE}
        </p>
      </section>

      <section className="card panel" aria-labelledby="ask-examples">
        <h2 id="ask-examples">Questions to try</h2>
        <ul className="ask-examples">
          {ASK_EXAMPLES.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <p>{ASK_SERVER_NOTE}</p>
      </section>

      <section className="card panel" aria-labelledby="ask-check">
        <h2 id="ask-check">Check the answer</h2>
        <p>{ASK_CAUTION}</p>
        <p>
          Every platform an answer names has a page here with its modules, steps and connections and the evidence for
          each.{" "}
          <a className="guide-link" href="#/browse?view=platforms">
            Browse the platforms
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </p>
      </section>
    </article>
  );
}
