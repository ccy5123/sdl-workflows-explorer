// "Ask with your own AI" (#/ask, LLM-access plan of 2026-11-12): how a visitor asks about the data in plain language
// with the language-model app they already use. The site runs no model; the local MCP server (npm package of mcp/)
// and llms.txt let the visitor's own app read the records. Pure text; views/Ask.tsx renders it. tests/ask.test.ts
// checks the package name against mcp/package.json and that the text states no number.

/** The npm package of mcp/; tests/ask.test.ts keeps it equal to mcp/package.json. */
export const MCP_PACKAGE = "sdl-workflows-mcp";
export const NPM_URL = `https://www.npmjs.com/package/${MCP_PACKAGE}`;
export const MCP_COMMAND = `npx -y ${MCP_PACKAGE}`;

export const ASK_TITLE = "Ask with your own AI";
export const ASK_NAV = "Ask AI";

export const ASK_LEAD =
  "Ask questions about the coded platforms in plain language, in the AI app you already use. This site runs no " +
  "language model and needs no account: your app reads the records and answers, citing the platform ids, the papers " +
  "and the page each item was read from.";

export interface AskSetup {
  id: string;
  title: string;
  /** Who it is for and what to do. */
  text: string;
  /** Text to copy, if any. */
  code?: string;
  /** What to do after copying, if anything. */
  after?: string;
}

/** The ready-made prompt for web chat apps that can read web pages; `llmsUrl` is the site's llms.txt. */
export function webPrompt(llmsUrl: string): string {
  return (
    `Use the SDL Workflows data at ${llmsUrl} (follow its links). Answer only from those files, name every platform ` +
    "by its platform id with the paper's DOI, give the page each item was read from, and say \"not recorded\" when " +
    "the data has nothing. My question: "
  );
}

export const ASK_SETUPS: readonly AskSetup[] = [
  {
    id: "desktop",
    title: "Claude Desktop, Cursor, VS Code and other desktop apps",
    text:
      "Apps that start local MCP servers can run the SDL Workflows server on your computer. Add this entry to the " +
      "app's MCP settings (in Claude Desktop: Settings, Developer, Edit config):",
    code: JSON.stringify({ mcpServers: { "sdl-workflows": { command: "npx", args: ["-y", MCP_PACKAGE] } } }, null, 2),
    after: "Restart the app. The server needs Node.js; on first start it downloads the data release from Zenodo once.",
  },
  {
    id: "claude-code",
    title: "Claude Code",
    text: "Run this once in a terminal; the server is then available in every Claude Code session:",
    code: `claude mcp add sdl-workflows -- ${MCP_COMMAND}`,
  },
  {
    id: "web",
    title: "Web chat apps (claude.ai, ChatGPT and others)",
    text:
      "Web chat apps cannot start a server on your computer, but a model that can read web pages can read the data " +
      "files this site publishes for language models. Copy this start of a prompt, add your question, and paste it " +
      "into the chat:",
    after: "If the model answers without opening the link, it is answering from memory; ask it to read the link first.",
  },
];

export const ASK_EXAMPLES: readonly string[] = [
  "Which self-driving labs use an in-line FT-IR?",
  "Walk me through one cycle of Aand2024/P1 and say where in the paper each step is described.",
  "I plan a liquid handler, a heated batch reactor and a UV-vis spectrometer, two batches in parallel. How many " +
    "experiments per day could it run?",
  "Which platforms are built most like Aand2024/P1?",
];

export const ASK_SERVER_NOTE =
  "The MCP server downloads the data release this site shows from Zenodo, checks its checksums and answers with the " +
  "same search, workflow and trends code as this site. It sends nothing anywhere else. A cycle-time answer is " +
  "simulated from durations recorded on other platforms, and the server says so.";

export const ASK_CAUTION =
  "The records were coded from the papers by a language model and the release contains no human coding (see About " +
  "the data). Check a claim against the page it cites before relying on it.";

export const ASK_TROUBLE =
  "On Windows, npx can fail when the name of your user folder contains an ampersand; run the same command through " +
  "WSL instead.";

// ---- Example exchanges, shown as a chat ------------------------------------------------------------------------------

/** One record an answer cites: the record id, what the answer says of it, the paper's DOI and where it was read. */
export interface ChatCite {
  /** Platform id the record belongs to. */
  platform: string;
  /** Module or step id. */
  id: string;
  /** What the answer says of the record; a quoted module name is a substring of its name_in_paper. */
  text: string;
  /** Exactly the record's evidence location as the tools give it ("SI1 · p. 10 · §2.2.4 ¶1"). */
  evidence: string;
  /** For a module: its name in the paper (or a part of it), checked against the record. */
  name?: string;
}

export interface ChatExchange {
  question: string;
  /** The server tools the answer rests on, shown as the app shows a tool call. */
  tools: readonly string[];
  intro: string;
  cites: readonly ChatCite[];
  outro?: string;
}

export const CHAT_HEADING = "What an answer looks like";
export const CHAT_NOTE =
  "Example exchanges written from the server's results for this release. Your app words its answers its own way; " +
  "the record ids and pages come from the data.";

/**
 * The example exchanges. tests/ask.test.ts checks every id, name and evidence location against the release, and the
 * counts the answers state against the search, so a new release that changes them fails the test instead of leaving
 * a stale example.
 */
export const CHAT_EXCHANGES: readonly ChatExchange[] = [
  {
    question: "Which self-driving labs use an in-line FT-IR?",
    tools: ["search_platforms"],
    intro:
      "Searching for “FT-IR” finds 19 platforms; the search reads FTIR, ReactIR, FlowIR and the other IR spellings as " +
      "one technique. Three of them:",
    cites: [
      {
        platform: "Aand2024/P1",
        id: "Aand2024/P1/M4",
        name: "in-line FT-IR (Mettler-Toledo ReactIR 15 with flow cell)",
        text: "in-line FT-IR (Mettler-Toledo ReactIR 15 with flow cell)",
        evidence: "SI1 · p. 10 · §2.2.4 ¶1",
      },
      {
        platform: "Ahn2023/P1",
        id: "Ahn2023/P1/M4",
        name: "in-line FT-IR spectrometer (Jasco FT/IR-4600 with flow cell)",
        text: "in-line FT-IR spectrometer (Jasco FT/IR-4600 with flow cell)",
        evidence: "main · p. 2 · Fig. 1a",
      },
      {
        platform: "Granda2018/P1",
        id: "Granda2018/P1/M3",
        name: "Thermo Scientific Nicolet iS5 FT-IR with ZnSe Golden Gate ATR-IR flow cell",
        text: "Nicolet iS5 FT-IR with an ATR-IR flow cell",
        evidence: "main · p. 5 · §Online attenuated total-reflectance infrared spectroscopy ¶1",
      },
    ],
    outro:
      "The technique tags behind this search were assigned by a language model from the module names the papers " +
      "state; whether an IR is in-line is in the module name.",
  },
  {
    question: "Walk me through one cycle of Aand2024/P1 and say where each step is described.",
    tools: ["get_platform"],
    intro: "Aand2024/P1, the auto-optimization platform (AOP), runs these steps in one cycle:",
    cites: [
      { platform: "Aand2024/P1", id: "Aand2024/P1/S1", text: "Dispense liquid, by the HPLC pumps", evidence: "SI1 · p. 15 · §S2.4 ¶1" },
      { platform: "Aand2024/P1", id: "Aand2024/P1/S2", text: "Photo/electro reaction, in the photo-flow reactor", evidence: "SI1 · p. 15 · §S2.4 ¶1" },
      { platform: "Aand2024/P1", id: "Aand2024/P1/S3", text: "Optical measurement, by the in-line FT-IR", evidence: "SI1 · p. 15 · §S2.4 ¶1" },
      {
        platform: "Aand2024/P1",
        id: "Aand2024/P1/S4",
        text: "Handle sample, at the auto-collector; the record marks this step uncertain",
        evidence: "SI1 · p. 15 · §S2.4 ¶1",
      },
      { platform: "Aand2024/P1", id: "Aand2024/P1/S5", text: "Analyze data, in software", evidence: "SI1 · p. 11 · §2.2.5 ¶1" },
      { platform: "Aand2024/P1", id: "Aand2024/P1/S6", text: "Plan next experiment, by Bayesian optimization", evidence: "SI1 · p. 14 · §S2.3 ¶1" },
    ],
  },
  {
    question: "Is there a self-driving lab with a cryo-EM in the database?",
    tools: ["search_platforms"],
    intro:
      "No platform in this release records a cryo-EM: searching platform and module names for “cryo-EM” and " +
      "“cryo” finds none. The closest record is an electron microscope that is not a cryo-EM:",
    cites: [
      {
        platform: "Wu2026a/P1",
        id: "Wu2026a/P1/M1",
        name: "Nion UltraSTEM100 aberration-corrected scanning transmission electron microscope",
        text: "Nion UltraSTEM100 aberration-corrected scanning transmission electron microscope",
        evidence: "main · p. 16 · §STEM imaging ¶1",
      },
    ],
  },
];
