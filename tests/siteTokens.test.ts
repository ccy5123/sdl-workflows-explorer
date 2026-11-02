// SPEC-SITE-001 AC-5: site colour tokens, their CSS custom properties and contrast (REQ-008, REQ-009).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../src/lib/chartTokens";
import { SITE_TOKENS } from "../src/lib/siteTokens";

const css = readFileSync(join(import.meta.dirname, "..", "src", "styles.css"), "utf8");

/** Site-token declarations (not chart tokens) of every rule block whose selector is exactly `selector`, merged. */
function declared(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(?:^|\n)([^\n{}]+)\{([^}]*)\}/g)) {
    if (m[1]!.trim() !== selector) continue;
    for (const d of m[2]!.matchAll(/(--[a-z][a-z0-9-]*)\s*:\s*(#[0-9a-f]{6})\s*;/g)) {
      if (!d[1]!.startsWith("--chart-")) out[d[1]!] = d[2]!;
    }
  }
  return out;
}

describe("site colour tokens (AC-5)", () => {
  it("keeps the light values of 69d2dc7 and adds the dark set", () => {
    expect(SITE_TOKENS.light).toEqual({
      "--bg": "#ffffff",
      "--text": "#1f2328",
      "--muted": "#57606a",
      "--line": "#d0d7de",
      "--panel": "#f6f8fa",
      "--accent": "#0969da",
      "--highlight": "#ddf4ff",
      "--warn": "#b35900",
      "--danger": "#cf222e",
      "--unmapped": "#000000",
    });
    expect(Object.keys(SITE_TOKENS.dark)).toEqual(Object.keys(SITE_TOKENS.light));
    expect(SITE_TOKENS.dark["--bg"]).toBe("#1a1a19");
    expect(SITE_TOKENS.dark["--text"]).toBe("#f0efec");
    expect(SITE_TOKENS.dark["--unmapped"]).toBe(SITE_TOKENS.dark["--text"]);
  });

  it("declares each token in styles.css, light under :root and dark under :root[data-theme=dark]", () => {
    expect(declared(":root")).toEqual(SITE_TOKENS.light);
    expect(declared(':root[data-theme="dark"]')).toEqual(SITE_TOKENS.dark);
  });

  it.each(["light", "dark"] as const)("reaches WCAG contrast in the %s set", (theme) => {
    const t = SITE_TOKENS[theme];
    for (const [fg, bg, min] of [
      ["--text", "--bg", 4.5],
      ["--muted", "--bg", 4.5],
      ["--accent", "--bg", 4.5],
      ["--muted", "--panel", 4.5],
      ["--accent", "--panel", 4.5],
      ["--warn", "--bg", 4.5],
      ["--danger", "--bg", 4.5],
      ["--text", "--highlight", 4.5],
      ["--accent", "--highlight", 4.5],
      ["--accent", "--bg", 3], // focus outline
    ] as const) {
      expect(contrastRatio(t[fg], t[bg]), `${theme} ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    }
  });

  it("leaves no hard-coded colour in a site rule outside the token blocks", () => {
    const outside = css
      .replace(/(?:^|\n):root(?:\[data-theme="dark"\])?\s*\{[^}]*\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(outside.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});
