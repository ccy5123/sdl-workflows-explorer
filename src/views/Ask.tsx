// "Ask with your own AI" (#/ask): example exchanges shown as a chat, setting up the visitor's own AI app to answer
// from the records, and example questions. Text in lib/ask.ts.
import { ArrowRight, Bot, Wrench } from "lucide-react";
import { CopyButton } from "../components/CopyButton";
import type { IndexJson } from "../data/types";
import {
  ASK_CAUTION,
  ASK_EXAMPLES,
  ASK_LEAD,
  ASK_SERVER_NOTE,
  ASK_SETUPS,
  ASK_TITLE,
  ASK_TROUBLE,
  CHAT_EXCHANGES,
  CHAT_HEADING,
  CHAT_NOTE,
  MCP_PACKAGE,
  NPM_URL,
  webPrompt,
  type ChatExchange,
} from "../lib/ask";
import { platformHash } from "../lib/route";

/** One question and its answer, drawn as a chat: the visitor's message, the tool call, then the answer. */
function Exchange({ ex, doiOf, release }: { ex: ChatExchange; doiOf: (platformId: string) => string | null; release: IndexJson["release"] }) {
  return (
    <div className="chat-exchange">
      <div className="chat-msg chat-user">
        <span className="chat-who">You</span>
        <p>{ex.question}</p>
      </div>
      <div className="chat-msg chat-ai">
        <span className="chat-who">
          <Bot size={14} aria-hidden="true" /> Your AI app
        </span>
        <p className="chat-tool">
          <Wrench size={13} aria-hidden="true" /> Used sdl-workflows: {ex.tools.join(", ")}
        </p>
        <p>{ex.intro}</p>
        <ul className="chat-cites">
          {ex.cites.map((c) => {
            const doi = doiOf(c.platform);
            return (
              <li key={c.id}>
                <a href={platformHash(c.platform)}>{c.platform}</a> <code>{c.id}</code>: {c.text}
                <span className="chat-ev">
                  {" "}
                  ({c.evidence}
                  {doi && (
                    <>
                      , <a href={`https://doi.org/${doi}`}>doi:{doi}</a>
                    </>
                  )}
                  )
                </span>
              </li>
            );
          })}
        </ul>
        {ex.outro && <p>{ex.outro}</p>}
        <p className="chat-source">
          Source: sdl-workflows release {release.version}, doi:{release.doi}
        </p>
      </div>
    </div>
  );
}

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

export function Ask({ index }: { index: IndexJson }) {
  // The site's own llms.txt, absolute, for the prompt a web chat app is given.
  const llmsUrl = new URL("llms.txt", window.location.href.split("#")[0]).href;
  const paperOf = new Map(index.platforms.map((p) => [p.platform_id, p.paper_id]));
  const doiOfPaper = new Map(index.papers.map((p) => [p.paper_id, p.doi]));
  const doiOf = (platformId: string) => doiOfPaper.get(paperOf.get(platformId) ?? "") ?? null;
  return (
    <article className="ask">
      <h1>{ASK_TITLE}</h1>
      <p className="ask-lead">{ASK_LEAD}</p>

      <section className="card panel" aria-labelledby="ask-chat">
        <h2 id="ask-chat">{CHAT_HEADING}</h2>
        <p className="table-note">{CHAT_NOTE}</p>
        <div className="chat">
          {CHAT_EXCHANGES.map((ex) => (
            <Exchange key={ex.question} ex={ex} doiOf={doiOf} release={index.release} />
          ))}
        </div>
      </section>

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
