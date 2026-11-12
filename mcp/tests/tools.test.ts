// The MCP tools on the pinned release: the loader checks it like the site build, each tool returns what the
// explorer's own functions return, and every result carries the citation fields (record ids, paper keys, DOIs,
// evidence locations, the release and its citation).
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { searchPlatforms } from "../../src/lib/platformFilter";
import { decodeWorkflow, encodeWorkflow, fromPlatform } from "../../src/lib/workflowState";
import { loadDataset, PIN, type Dataset } from "../src/dataset";
import { createServer } from "../src/server";
import {
  comparePlatforms,
  countByYear,
  getPaper,
  getPlatform,
  listVocabulary,
  releaseInfo,
  searchPlatformsTool,
  similarPlatforms,
  simulateCycleTime,
  ToolError,
} from "../src/tools";

const ZIP = join(import.meta.dirname, "..", "..", ".cache", "release", PIN.file_name);
const SITE_DATA = join(import.meta.dirname, "..", "..", "public", "data");

let ds: Dataset;
let cache: string;

beforeAll(async () => {
  if (!existsSync(ZIP)) throw new Error(`${ZIP} is missing: run npm run fetch-release in the repository root first`);
  cache = mkdtempSync(join(tmpdir(), "sdl-mcp-"));
  ds = await loadDataset({ cacheDir: cache, localZip: ZIP });
}, 120_000);

afterAll(() => rmSync(cache, { recursive: true, force: true }));

const ref = (e: { doc: string; text: string }) => expect(e.doc && e.text).toBeTruthy();

describe("loader", () => {
  it("serves the pinned release with the pinned counts", () => {
    expect(ds.derived.index.release.version).toBe(PIN.version);
    expect(ds.derived.index.counts).toEqual(PIN.counts);
    expect(releaseInfo(ds).results.zip_sha256).toBe(PIN.sha256);
  });

  it.skipIf(!existsSync(join(SITE_DATA, "index.json")))("derives the same JSON as the site build", () => {
    for (const file of ["index.json", "search.json", "simulation.json", "taxonomy.json"]) {
      const key = { "index.json": "index", "search.json": "search", "simulation.json": "simulation", "taxonomy.json": "taxonomy" }[file] as
        | "index"
        | "search"
        | "simulation"
        | "taxonomy";
      expect(JSON.stringify(ds.derived[key])).toBe(readFileSync(join(SITE_DATA, file), "utf8"));
    }
  });

  it("refuses a zip whose SHA-256 differs from the pin", async () => {
    const other = mkdtempSync(join(tmpdir(), "sdl-mcp-"));
    try {
      await expect(loadDataset({ cacheDir: other, localZip: ZIP, pin: { ...PIN, sha256: "0".repeat(64) } })).rejects.toThrow(/SHA-256 mismatch/);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });
});

describe("envelope", () => {
  it("names the release and its citation on every result", () => {
    const r = listVocabulary(ds, { kind: "module_type" });
    expect(r.release).toMatchObject({ version: PIN.version, doi: PIN.doi, sha256: PIN.sha256 });
    expect(r.cite_as).toContain(PIN.doi);
  });
});

describe("list_vocabulary", () => {
  it("lists every taxonomy class of a kind with its definition", () => {
    const r = listVocabulary(ds, { kind: "unit_operation" }).results;
    const classes = r.classes as { definition: string }[];
    expect(classes.length).toBe(ds.derived.taxonomy.classes.filter((c) => c.class_kind === "unit_operation").length);
    expect(classes.every((c) => c.definition.length > 0)).toBe(true);
  });

  it("lists the integration modes present in the papers", () => {
    expect(listVocabulary(ds, { kind: "integration_mode" }).results.classes.map((c) => c.code)).toEqual(ds.offered.im);
  });
});

describe("search_platforms", () => {
  it("finds the same platforms as the site's search, with the citation fields", () => {
    const r = searchPlatformsTool(ds, { text: "FT-IR", limit: 100 }).results;
    expect(r.platforms.map((p) => p.platform_id)).toEqual(searchPlatforms(ds.searchable, "FT-IR").map((m) => m.row.platform_id));
    expect(r.platforms.map((p) => p.platform_id)).toContain("Aand2024/P1");
    for (const p of r.platforms) {
      expect(p.paper_id).toBeTruthy();
      expect(p.doi).toMatch(/^10\./);
      expect(p.explorer_url).toContain(encodeURIComponent(p.paper_id));
    }
  });

  it("applies coded filters", () => {
    const r = searchPlatformsTool(ds, { filters: { module_types: ["flow_reactor"] }, limit: 100 }).results;
    expect(r.total).toBeGreaterThan(0);
    expect(r.platforms.every((p) => p.module_types.includes("flow_reactor"))).toBe(true);
  });

  it("refuses an unknown code and names the closest", () => {
    expect(() => searchPlatformsTool(ds, { filters: { module_types: ["flow reactor"] } })).toThrow(ToolError);
    expect(() => searchPlatformsTool(ds, { filters: { module_types: ["flow reactor"] } })).toThrow(/flow_reactor/);
    expect(() => searchPlatformsTool(ds, { filters: { module_types: ["XRD"] } })).toThrow(/Closest: instrument_structural/);
  });

  it("reports per-word matches when no platform matches every word", () => {
    const r = searchPlatformsTool(ds, { text: "FT-IR zzqqxx" });
    expect(r.results.total).toBe(0);
    expect(r.results.per_word).toEqual([
      { word: "ft-ir", platforms: searchPlatforms(ds.searchable, "FT-IR").length },
      { word: "zzqqxx", platforms: 0 },
    ]);
  });
});

describe("get_platform and get_paper", () => {
  it("returns every module, step and connection with its id and evidence location", () => {
    const r = getPlatform(ds, { platform_id: "Aand2024/P1" }).results;
    const g = ds.graphs.get("Aand2024/P1")!;
    expect(r.modules!.map((m) => m.module_id)).toEqual(g.modules.map((m) => m.module_id));
    expect(r.steps!.map((s) => s.order)).toEqual([...g.steps].map((s) => s.step_order).sort((a, b) => a - b));
    expect(r.connections!.length).toBe(g.connections.length);
    [...r.modules!, ...r.steps!, ...r.connections!].forEach((x) => ref(x.evidence));
    expect(r.paper.doi).toBe("10.1039/d4re00138a");
  });

  it("refuses an unknown platform id", () => {
    expect(() => getPlatform(ds, { platform_id: "Aand2024/P9" })).toThrow(/No platform "Aand2024\/P9"/);
  });

  it("lists a paper's platforms", () => {
    expect(getPaper(ds, { paper_id: "Aand2024" }).results.platforms.map((p) => p.platform_id)).toEqual(["Aand2024/P1"]);
  });
});

describe("similar_platforms", () => {
  it("ranks other platforms and leaves the platform itself out", () => {
    const rows = similarPlatforms(ds, { platform_id: "Aand2024/P1", limit: 20 }).results.platforms;
    expect(rows.length).toBe(20);
    expect(rows.map((r) => r.platform_id)).not.toContain("Aand2024/P1");
    for (let k = 1; k < rows.length; k++) expect(rows[k - 1]!.order).toBeGreaterThanOrEqual(rows[k]!.order);
  });

  it("takes a described workflow", () => {
    const rows = similarPlatforms(ds, {
      workflow: { modules: [{ type: "fluidics" }, { type: "flow_reactor" }], steps: [{ unit_operation: "dispense_liquid", module: 1 }, { unit_operation: "react_flow", module: 2 }] },
    }).results.platforms;
    expect(rows.length).toBe(10);
  });
});

describe("simulate_cycle_time", () => {
  it("is deterministic, links the same inputs in the explorer and names the durations it used", () => {
    const a = simulateCycleTime(ds, { from_platform: "Aand2024/P1", n: 5, runs: 5 });
    const b = simulateCycleTime(ds, { from_platform: "Aand2024/P1", n: 5, runs: 5 });
    expect(a).toEqual(b);
    const query = a.results.workflow_url.split("#/workflow?")[1] ?? "";
    const decoded = decodeWorkflow(query, ds.catalog).state;
    const expected = fromPlatform(ds.layouts.get("Aand2024/P1")!, ds.catalog).state;
    expect(encodeWorkflow(decoded)).toBe(encodeWorkflow({ ...expected, n: 5, runs: 5 }));
    for (const s of a.results.cycle_range.steps) {
      for (const d of s.durations_used) {
        expect(d.step_id).toBeTruthy();
        expect(d.doi).toMatch(/^10\./);
        expect(d.evidence).toBeTruthy();
      }
    }
  });

  it("asks for a duration when a step has none recorded", () => {
    const uos = ds.derived.taxonomy.classes.filter((c) => c.class_kind === "unit_operation").map((c) => c.class);
    const without = uos.find((u) => !ds.groups.has(u) && u !== "unmapped");
    if (!without) return;
    const r = simulateCycleTime(ds, { workflow: { modules: [{ type: "fluidics" }], steps: [{ unit_operation: without, module: 1 }] } });
    expect(r.results.simulation).toBeNull();
    expect(r.notes.join(" ")).toMatch(/entered/);
    const filled = simulateCycleTime(ds, {
      workflow: { modules: [{ type: "fluidics" }], steps: [{ unit_operation: without, module: 1 }] },
      entered: [{ step: 1, seconds: 60 }],
    });
    expect(filled.results.simulation).not.toBeNull();
  });

  it("refuses inputs out of the explorer's limits with its message", () => {
    expect(() => simulateCycleTime(ds, { from_platform: "Aand2024/P1", runs: 1000 })).toThrow(/Simulation runs must be a whole number/);
    expect(() => simulateCycleTime(ds, { from_platform: "Aand2024/P1", workflow_query: "" })).toThrow(/exactly one/);
  });
});

describe("compare_platforms and count_by_year", () => {
  it("compares 2 or 3 platforms and refuses other numbers", () => {
    const r = comparePlatforms(ds, { platform_ids: ["Aand2024/P1", "AbdelLatif2021/P1"] }).results;
    expect(r.platforms.map((p) => p.platformId)).toEqual(["Aand2024/P1", "AbdelLatif2021/P1"]);
    expect(() => comparePlatforms(ds, { platform_ids: ["Aand2024/P1"] })).toThrow(/needs 2 or 3/);
  });

  it("counts every paper once over the year bins of an exclusive split", () => {
    const r = countByYear(ds, { unit: "papers", split: "im" }).results;
    expect(r.total).toBe(PIN.counts.papers);
    expect(r.bins.reduce((a, b) => a + (b.n ?? 0), 0)).toBe(PIN.counts.papers);
    expect(r.trends_url).toContain("#/trends");
  });
});

describe("MCP server", () => {
  it("lists the nine tools and answers a call over the protocol", async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const server = createServer(ds);
    await server.connect(serverSide);
    const client = new Client({ name: "test", version: "0" });
    await client.connect(clientSide);
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(
      ["compare_platforms", "count_by_year", "get_paper", "get_platform", "list_vocabulary", "release_info", "search_platforms", "similar_platforms", "simulate_cycle_time"],
    );
    const res = await client.callTool({ name: "get_platform", arguments: { platform_id: "Nope/P1" } });
    expect(res.isError).toBe(true);
    const ok = await client.callTool({ name: "release_info", arguments: {} });
    const body = JSON.parse((ok.content as { text: string }[])[0]!.text);
    expect(body.results.counts).toEqual(PIN.counts);
    const card = await client.readResource({ uri: "sdl://release/DATA_CARD.md" });
    expect((card.contents[0] as { text: string }).text.length).toBeGreaterThan(100);
    await client.close();
  });
});
