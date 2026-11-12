// "Ask with your own AI" (#/ask): the package named on the page is the one mcp/ publishes, the route resolves, the
// texts state no number that could go stale, and no text claims a human check the data card denies.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PlatformFile, PlatformGraph, SearchJson } from "../src/data/types";
import {
  ASK_CAUTION,
  ASK_EXAMPLES,
  ASK_LEAD,
  ASK_SERVER_NOTE,
  ASK_SETUPS,
  ASK_TROUBLE,
  CHAT_EXCHANGES,
  MCP_COMMAND,
  MCP_PACKAGE,
  webPrompt,
} from "../src/lib/ask";
import { evidenceText } from "../src/lib/home";
import { searchPlatforms } from "../src/lib/platformFilter";
import { navCurrent, parseRoute, routeTitle } from "../src/lib/route";
import { numbersIn } from "../src/lib/siteText";
import { dataAvailable, readIndex } from "./viewer-data";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");

describe("Ask with your own AI", () => {
  it("names the package mcp/ publishes, in every setup that runs it", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "mcp", "package.json"), "utf8")) as { name: string };
    expect(MCP_PACKAGE).toBe(pkg.name);
    expect(MCP_COMMAND).toBe(`npx -y ${pkg.name}`);
    const desktop = JSON.parse(ASK_SETUPS.find((s) => s.id === "desktop")!.code!) as { mcpServers: Record<string, { command: string; args: string[] }> };
    expect(desktop.mcpServers["sdl-workflows"]).toEqual({ command: "npx", args: ["-y", pkg.name] });
    expect(ASK_SETUPS.find((s) => s.id === "claude-code")!.code).toBe(`claude mcp add sdl-workflows -- npx -y ${pkg.name}`);
  });

  it("gives web chat apps a prompt that points at llms.txt and asks for citations", () => {
    const prompt = webPrompt("https://example.org/site/llms.txt");
    expect(prompt).toContain("https://example.org/site/llms.txt");
    expect(prompt).toMatch(/platform id/);
    expect(prompt).toMatch(/not recorded/);
    expect(prompt.endsWith("My question: ")).toBe(true);
  });

  it("states no number (the examples name only platform ids) and claims no human check", () => {
    const texts = [ASK_LEAD, ASK_SERVER_NOTE, ASK_CAUTION, ASK_TROUBLE, ...ASK_SETUPS.flatMap((s) => [s.title, s.text, s.after ?? ""])];
    expect(texts.flatMap(numbersIn)).toEqual([]);
    expect(ASK_EXAMPLES.map((q) => q.replace(/[A-Za-z]+\d{4}[a-z]?\/P\d+/g, "")).flatMap(numbersIn)).toEqual([]);
    expect(texts.join(" ")).not.toMatch(/checked by|verified by|validated by/i);
    expect(ASK_CAUTION).toContain("the release contains no human coding");
  });

  it("has a route with its title and a current tab", () => {
    expect(parseRoute("#/ask")).toEqual({ kind: "ask" });
    expect(routeTitle({ kind: "ask" })).toBe("Ask with your own AI");
    expect(navCurrent({ kind: "ask" })).toBe("Ask AI");
  });
});

describe.skipIf(!dataAvailable)("the example exchanges on the real release", () => {
  const index = dataAvailable ? readIndex() : null;
  const graph = (platformId: string): PlatformGraph => {
    const file = JSON.parse(readFileSync(join(DATA_DIR, "platforms", `${platformId.split("/")[0]}.json`), "utf8")) as PlatformFile;
    return file.platforms.find((p) => p.platform_id === platformId)!;
  };

  it("cites only records that exist, with their exact evidence locations and module names", () => {
    for (const ex of CHAT_EXCHANGES) {
      for (const c of ex.cites) {
        const g = graph(c.platform);
        expect(g, c.platform).toBeDefined();
        const item = [...g.modules.map((m) => ({ id: m.module_id, evidence: m.evidence, name: m.name_in_paper })), ...g.steps.map((s) => ({ id: s.step_id, evidence: s.evidence, name: null }))].find(
          (x) => x.id === c.id,
        );
        expect(item, c.id).toBeDefined();
        expect(evidenceText(item!.evidence), c.id).toBe(c.evidence);
        if (c.name) expect(item!.name, c.id).toContain(c.name);
      }
    }
  });

  it("states the counts the search gives, and the uncertain step the record marks", () => {
    const names = JSON.parse(readFileSync(join(DATA_DIR, "search.json"), "utf8")) as SearchJson;
    const rows = index!.platforms.map((p) => ({ ...p, module_names: names.module_names[p.platform_id] ?? [] }));
    const ftir = CHAT_EXCHANGES.find((e) => e.question.includes("FT-IR"))!;
    expect(ftir.intro).toContain(`finds ${searchPlatforms(rows, "FT-IR").length} platforms`);
    expect(searchPlatforms(rows, "cryo-EM")).toHaveLength(0);
    expect(searchPlatforms(rows, "cryo")).toHaveLength(0);
    const aand = graph("Aand2024/P1");
    const cycle = CHAT_EXCHANGES.find((e) => e.question.includes("one cycle of Aand2024/P1"))!;
    expect(cycle.cites.map((c) => c.id)).toEqual([...aand.steps].sort((a, b) => a.step_order - b.step_order).map((s) => s.step_id));
    for (const s of aand.steps) {
      const said = cycle.cites.find((c) => c.id === s.step_id)!.text;
      expect(said.includes("uncertain"), s.step_id).toBe(s.uncertain);
    }
  });
});
