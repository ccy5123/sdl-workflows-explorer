// AC-8: the filter and compare modules stay free of UI code so the trends dashboard can import them (REQ-009).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = ["filterState.ts", "filterUrl.ts", "filterApply.ts", "compare.ts"];
const UI_PACKAGE = String.raw`(?:react|react-dom|@tanstack\/[^"']*)`;
const RULES: [string, RegExp][] = [
  ["import from a UI package", new RegExp(String.raw`\bfrom\s*["']${UI_PACKAGE}["']`)],
  ["side-effect import of a UI package", new RegExp(String.raw`\bimport\s*["']${UI_PACKAGE}["']`)],
  ["dynamic import of a UI package", new RegExp(String.raw`\bimport\s*\(\s*["']${UI_PACKAGE}["']\s*\)`)],
  ["use of window or document", /\b(window|document)\s*[.[]/],
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/** Names of the rules a source text breaks, comments ignored. */
function violations(source: string): string[] {
  const code = stripComments(source);
  return RULES.filter(([, re]) => re.test(code)).map(([name]) => name);
}

describe("UI-free library modules (AC-8)", () => {
  it.each(FILES)("src/lib/%s imports no UI package and reads no window or document", (file) => {
    expect(violations(readFileSync(join(import.meta.dirname, "..", "src", "lib", file), "utf8"))).toEqual([]);
  });

  it("flags each forbidden form and ignores comments and message text", () => {
    expect(violations(`import { useState } from "react";`)).toEqual(["import from a UI package"]);
    expect(violations(`import type { Row } from '@tanstack/react-table';`)).toEqual(["import from a UI package"]);
    expect(violations(`import "react-dom";`)).toEqual(["side-effect import of a UI package"]);
    expect(violations(`const m = await import('@tanstack/table-core');`)).toEqual(["dynamic import of a UI package"]);
    expect(violations(`const h = window.location.hash;`)).toEqual(["use of window or document"]);
    expect(violations(`document["title"] = "x";`)).toEqual(["use of window or document"]);
    expect(violations(`// import "react";\n/* window.x */ const s = "open a window or document";`)).toEqual([]);
    expect(violations(`import { x } from "./reactive";`)).toEqual([]);
  });
});
