// "Ask with your own AI" (#/ask): the package named on the page is the one mcp/ publishes, the route resolves, the
// texts state no number that could go stale, and no text claims a human check the data card denies.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ASK_CAUTION,
  ASK_EXAMPLES,
  ASK_LEAD,
  ASK_SERVER_NOTE,
  ASK_SETUPS,
  ASK_TROUBLE,
  MCP_COMMAND,
  MCP_PACKAGE,
  webPrompt,
} from "../src/lib/ask";
import { navCurrent, parseRoute, routeTitle } from "../src/lib/route";
import { numbersIn } from "../src/lib/siteText";

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
