#!/usr/bin/env node
// sdl-workflows-mcp: a read-only MCP server over stdio. It runs on the user's machine, downloads the pinned Zenodo
// release once (or reads SDL_RELEASE_ZIP), verifies it, and answers with the explorer's own functions. The user's own
// LLM client does all the inference; nothing is sent anywhere else.
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadDataset } from "./dataset";
import { createServer } from "./server";

const log = (m: string) => process.stderr.write(`sdl-workflows-mcp: ${m}\n`);

// Node 20 tries each address for only 250 ms before the next; on high-latency routes every attempt times out
// (the same setting as scripts/fetch-release.ts).
setDefaultAutoSelectFamilyAttemptTimeout(2000);

try {
  const ds = await loadDataset({ log });
  log(`serving release ${ds.pin.version} (${ds.derived.index.counts.platforms} platforms)`);
  await createServer(ds).connect(new StdioServerTransport());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
  log(`failed: ${message}${cause}. To work offline, download the zip from the Zenodo record and set SDL_RELEASE_ZIP to its path.`);
  process.exit(1);
}
