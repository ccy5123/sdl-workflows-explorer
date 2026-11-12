// The MCP server: instructions, the nine read-only tools and the release resources. The entry point is main.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PACKAGE_VERSION, PIN, type Dataset } from "./dataset";
import {
  comparePlatforms,
  countByYear,
  getPaper,
  getPlatform,
  listVocabulary,
  PLATFORM_PARTS,
  releaseInfo,
  searchPlatformsTool,
  similarPlatforms,
  simulateCycleTime,
  SPLIT_VALUES,
  ToolError,
  VOCABULARY_KINDS,
} from "./tools";

export const INSTRUCTIONS = `This server answers questions about the sdl-workflows database: published self-driving laboratories coded step by step (modules, steps, material connections, step durations), release ${PIN.version} (DOI ${PIN.doi}). The records were coded from the papers by a language model and the release contains no human coding (see the data card resource), so every answer must point back to the records and the pages they cite.

Rules for answers:
- Answer only from tool results, not from memory. If a tool returns nothing or a field is null, say it is not recorded in the database.
- Name every platform by its platform_id (e.g. Aand2024/P1) and paper key with DOI; for a module, step or connection, give its id and evidence location (evidence.text, e.g. "SI1 · p. 13 · §2.2.8 ¶1").
- Map the user's words to codes with list_vocabulary before filtering; search_platforms text takes 1–3 keywords such as an instrument name. Papers spell instruments differently (FT-IR, FTIR, ReactIR; XRD, diffractometer): search each spelling before saying a platform is absent.
- Do not add properties the record does not state (an instrument's temperature, the kind of sample, why a choice was made); if the user asks for one, say it is not recorded.
- Cycle-time results are simulated from durations recorded on other platforms; say so and name the duration rows used.
- Give the explorer_url so the user can check the record, and end with the cite_as line.`;

const filters = z
  .object({
    years: z.object({ from: z.number().int().nullable().optional(), to: z.number().int().nullable().optional() }).optional(),
    field_tags: z.array(z.string()).optional(),
    integration_modes: z.array(z.string()).optional(),
    sw_autonomy: z.array(z.number().int()).optional(),
    hw_autonomy: z.array(z.number().int()).optional(),
    module_types: z.array(z.string()).optional(),
    module_types_match: z.enum(["all", "any"]).optional(),
    transfer_modes: z.array(z.string()).optional(),
    transfer_modes_match: z.enum(["all", "any"]).optional(),
    unit_operations: z.array(z.string()).optional(),
    unit_operations_match: z.enum(["all", "any"]).optional(),
  })
  .describe("Coded filters; codes come from list_vocabulary. *_match: all (default) or any of the listed codes.")
  .optional();

const workflow = z
  .object({
    modules: z.array(
      z.object({
        type: z.string().describe("module_type code"),
        devices: z.number().int().optional().describe("Identical units of this module (default 1); batches queue when fewer than parallel"),
      }),
    ),
    steps: z.array(z.object({ unit_operation: z.string(), module: z.number().int().describe("1-based index into modules") })),
    transfers: z
      .array(z.object({ after_step: z.number().int(), mode: z.string().optional(), seconds: z.number().optional() }))
      .optional()
      .describe("Transfer between step after_step and the next, when they use different modules"),
  })
  .optional();

const workflowSource = {
  workflow_query: z.string().optional().describe("The query of an explorer #/workflow?… link"),
  workflow,
};

const simulationOptions = {
  batch: z.number().int().optional().describe("Samples per batch (default 1)"),
  samples: z.number().int().optional().describe("Samples per experiment (default 1)"),
  parallel: z
    .number()
    .int()
    .optional()
    .describe("Batches released at once (default 1). They run side by side only on modules with at least as many devices; otherwise they queue"),
  n: z.number().int().optional().describe("Batches to simulate (default 10)"),
  runs: z.number().int().optional().describe("Simulation runs (default 20)"),
  seed: z.number().int().optional(),
  per_run: z.array(z.object({ step: z.number().int(), samples: z.number().int() })).optional(),
  entered: z.array(z.object({ step: z.number().int(), seconds: z.number() })).optional().describe("User-given step durations"),
  joints: z.array(z.object({ first_step: z.number().int(), duration_step_id: z.string() })).optional(),
  agents: z.array(z.object({ mode: z.enum(["robot_arm_gantry", "mobile_robot", "human_transfer"]), count: z.number().int() })).optional(),
  bounds: z.boolean().optional().describe("Include durations recorded only as lower or upper bounds"),
  rule: z.enum(["fifo", "released"]).optional(),
  draw: z.enum(["sample", "median"]).optional(),
  include_events: z.boolean().optional().describe("Add the event list of the first simulation run (at most 500 events)"),
  include_durations: z.boolean().optional().describe("List every recorded duration row used, not only the lowest, median and highest"),
};

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** Runs a tool function and returns its result as JSON text, or the refusal as an error the model can read. */
function answer(run: () => unknown) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(run()) }] };
  } catch (error) {
    if (error instanceof ToolError) return { isError: true, content: [{ type: "text" as const, text: error.message }] };
    throw error;
  }
}

export function createServer(ds: Dataset): McpServer {
  const server = new McpServer({ name: "sdl-workflows", version: PACKAGE_VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "list_vocabulary",
    {
      title: "List vocabulary codes",
      description:
        "Codes, readable labels, definitions and usage counts of one coded vocabulary (module types, unit operations, transfer modes, field tags, integration modes). Use it to turn the user's words into the codes the other tools take. For module types, the query also searches the module names the papers state (module_name_hits), so a technique name such as diffraction leads to its code.",
      inputSchema: { kind: z.enum(VOCABULARY_KINDS), query: z.string().optional().describe("Optional words to narrow the list") },
      annotations: READ_ONLY,
    },
    (input) => answer(() => listVocabulary(ds, input)),
  );

  server.registerTool(
    "search_platforms",
    {
      title: "Search platforms",
      description:
        "Platforms matching coded filters and/or a short text (instrument or module name as the paper states it, platform name, unit operation). Returns ids, paper keys, DOIs, module types, unit operations, why each matched, the matching modules with their ids and evidence locations, and explorer links. A word written in capitals (IR, STEM, UPLC) matches only where the field also writes it in capitals and not inside a longer capital run, so IR finds ReactIR but not stirrer, and SEM does not find TSEMO; another word of up to 3 letters matches whole words only. Instrument spellings vary between papers: search each (FT-IR, FTIR, ReactIR).",
      inputSchema: {
        text: z.string().optional().describe("1–3 keywords; every word must match"),
        filters,
        limit: z.number().int().optional().describe("Default 20, at most 100"),
        offset: z.number().int().optional(),
      },
      annotations: READ_ONLY,
    },
    (input) => answer(() => searchPlatformsTool(ds, input)),
  );

  server.registerTool(
    "get_platform",
    {
      title: "Get a platform record",
      description:
        "One platform's full record: paper, modules (with names as stated in the paper), ordered steps, connections, recorded step durations and throughputs, each with its evidence location in the paper.",
      inputSchema: {
        platform_id: z.string().describe('e.g. "Aand2024/P1"'),
        include: z.array(z.enum(PLATFORM_PARTS)).optional().describe("Parts to return (default all)"),
      },
      annotations: READ_ONLY,
    },
    (input) => answer(() => getPlatform(ds, input)),
  );

  server.registerTool(
    "get_paper",
    {
      title: "Get a paper",
      description: "A paper's metadata (title, venue, year, field tags, integration mode, autonomy levels) and its platform ids.",
      inputSchema: { paper_id: z.string().describe('Paper key, e.g. "Aand2024"') },
      annotations: READ_ONLY,
    },
    (input) => answer(() => getPaper(ds, input)),
  );

  server.registerTool(
    "similar_platforms",
    {
      title: "Find structurally similar platforms",
      description:
        "Platforms ranked by similarity of step order, module types and material transfer modes to a coded platform or to a workflow the user describes. Structure only; not a rating.",
      inputSchema: { platform_id: z.string().optional(), ...workflowSource, limit: z.number().int().optional().describe("Default 10, at most 50") },
      annotations: READ_ONLY,
    },
    (input) => answer(() => similarPlatforms(ds, input)),
  );

  server.registerTool(
    "simulate_cycle_time",
    {
      title: "Simulate cycle time and throughput",
      description:
        "Cycle-time range and a discrete-event simulation (makespan, experiments per day, utilisation, bottleneck) for a workflow, using step durations recorded on other platforms for the same unit operations. Start from a coded platform (from_platform), an explorer workflow link, or a described workflow. Returns the duration rows used and a link that opens the same inputs in the explorer.",
      inputSchema: { from_platform: z.string().optional().describe('A platform id to start from, e.g. "Aand2024/P1"'), ...workflowSource, ...simulationOptions },
      annotations: READ_ONLY,
    },
    (input) => answer(() => simulateCycleTime(ds, input)),
  );

  server.registerTool(
    "compare_platforms",
    {
      title: "Compare platforms",
      description: "Side-by-side counts of module types and material transfer modes, and the ordered steps, of 2 or 3 platforms.",
      inputSchema: { platform_ids: z.array(z.string()).describe("2 or 3 platform ids") },
      annotations: READ_ONLY,
    },
    (input) => answer(() => comparePlatforms(ds, input)),
  );

  server.registerTool(
    "count_by_year",
    {
      title: "Count papers or platforms by year",
      description:
        "Papers or platforms per first public year, split by integration mode (im), field tag (field), software or hardware autonomy (sw, hw), module type (mt) or transfer mode (tm), under optional filters. The same counts as the explorer's trends view.",
      inputSchema: { unit: z.enum(["papers", "platforms"]), split: z.enum(SPLIT_VALUES), filters },
      annotations: READ_ONLY,
    },
    (input) => answer(() => countByYear(ds, input)),
  );

  server.registerTool(
    "release_info",
    {
      title: "Release information",
      description: "Version, DOI, SHA-256, licence, counts and citation of the data release this server serves.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => answer(() => releaseInfo(ds)),
  );

  const text = (uri: string, mimeType: string, body: string) => ({ contents: [{ uri, mimeType, text: body }] });
  const fromRelease = (rel: string) => readFileSync(join(ds.releaseDir, rel), "utf8");
  const resources: [string, string, string, string, () => string][] = [
    ["data-card", "sdl://release/DATA_CARD.md", "text/markdown", "How the database was collected, extracted and checked", () => ds.derived.releaseDocs.data_card],
    ["citation", "sdl://release/CITATION.cff", "text/plain", "Citation file of the release", () => ds.derived.releaseDocs.citation_cff],
    ["data-dictionary", "sdl://release/data_dictionary.csv", "text/csv", "Every table and column of the release", () => fromRelease("data_dictionary.csv")],
    ["coding-guideline", "sdl://release/protocol/coding-guideline.md", "text/markdown", "The coding guideline the records follow", () => fromRelease("protocol/coding-guideline.md")],
  ];
  for (const [name, uri, mimeType, description, read] of resources) {
    server.registerResource(name, uri, { description, mimeType }, () => text(uri, mimeType, read()));
  }
  return server;
}
