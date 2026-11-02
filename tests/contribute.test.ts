// AC-1 to AC-3: issue-form URLs of the dataset repository, built by one pure helper (SPEC-CONTRIB-001 REQ-001, REQ-002).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { correctionUrl, paperUrl, taxonomyUrl } from "../src/lib/contribute";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

const B = "https://github.com/ccy5123/sdl-workflows/issues/new";

/** Parameter names and decoded values of a URL, in order. */
function params(url: string): [string, string][] {
  return [...new URL(url).searchParams.entries()];
}

describe("exact URLs (AC-1)", () => {
  it("correction of a module", () => {
    expect(correctionUrl("Aand2024/P1/M2", "1.0.0")).toBe(
      `${B}?template=correction.yml&title=%5Bcorrection%5D%20Aand2024%2FP1%2FM2&item_id=Aand2024%2FP1%2FM2&release=1.0.0`,
    );
  });

  it("correction of a paper-level field", () => {
    expect(correctionUrl("Aand2024", "1.0.0")).toBe(
      `${B}?template=correction.yml&title=%5Bcorrection%5D%20Aand2024&item_id=Aand2024&release=1.0.0`,
    );
  });

  it("missing paper, trailing space of the title kept", () => {
    expect(paperUrl()).toBe(`${B}?template=paper.yml&title=%5Bpaper%5D%20`);
  });

  it("taxonomy class", () => {
    expect(taxonomyUrl("module_type", "flow_reactor")).toBe(
      `${B}?template=taxonomy.yml&title=%5Btaxonomy%5D%20module_type%2Fflow_reactor&class=module_type%20%2F%20flow_reactor`,
    );
  });
});

describe("every value is encoded (AC-2)", () => {
  const nasty = "a b&c#d+e=f?g%h/i é";

  it("correction values round-trip, in order, with no extra parameter", () => {
    const url = correctionUrl(nasty, `${nasty}!`);
    expect(params(url)).toEqual([
      ["template", "correction.yml"],
      ["title", `[correction] ${nasty}`],
      ["item_id", nasty],
      ["release", `${nasty}!`],
    ]);
  });

  it("taxonomy values round-trip, in order, with no extra parameter", () => {
    expect(params(taxonomyUrl(nasty, "x y"))).toEqual([
      ["template", "taxonomy.yml"],
      ["title", `[taxonomy] ${nasty}/x y`],
      ["class", `${nasty} / x y`],
    ]);
  });

  it("paper URL parses to template and title only", () => {
    expect(params(paperUrl())).toEqual([
      ["template", "paper.yml"],
      ["title", "[paper] "],
    ]);
  });

  it.each([
    ["correction", correctionUrl(nasty, nasty)],
    ["taxonomy", taxonomyUrl(nasty, nasty)],
    ["paper", paperUrl()],
  ])("%s query has no raw space, #, + or [", (_, url) => {
    const query = url.slice(url.indexOf("?") + 1);
    expect(query).not.toMatch(/[ #+[\]]/);
  });
});

describe("version source (AC-3)", () => {
  const SRC = join(import.meta.dirname, "..", "src");

  function codeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return codeFiles(path);
      return /\.tsx?$/.test(name) ? [path] : [];
    });
  }

  const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("no code file under src/ holds a version string literal", () => {
    const offenders = codeFiles(SRC).filter((f) => /["'`]\d+\.\d+\.\d+["'`]/.test(stripComments(readFileSync(f, "utf8"))));
    expect(offenders).toEqual([]);
  });

  warnIfMissing("contribute.test.ts");
  it.skipIf(!dataAvailable)("index.json's release version equals release.config.json's version", () => {
    const config = JSON.parse(readFileSync(join(import.meta.dirname, "..", "release.config.json"), "utf8")) as { version: string };
    expect(readIndex().release.version).toBe(config.version);
  });
});
