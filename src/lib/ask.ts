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
