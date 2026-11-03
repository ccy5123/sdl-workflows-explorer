// SPEC-SITE-001 AC-5: site colour tokens, their CSS custom properties and contrast (REQ-008, REQ-009).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../src/lib/chartTokens";
import { SITE_TOKENS, THEME_STORAGE_KEY, resolveTheme } from "../src/lib/siteTokens";

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
  // SPEC-UI-001 AC-1: the values of the approved mock, variant B with the indigo accent (design.md §1).
  it("equals the variant-B values, light and dark", () => {
    expect(SITE_TOKENS.light).toEqual({
      "--bg": "#ffffff",
      "--panel": "#f6f7f9",
      "--card": "#ffffff",
      "--text": "#0e1116",
      "--muted": "#586170",
      "--line": "#e4e7ec",
      "--line-strong": "#cdd2da",
      "--accent": "#4338ca",
      "--accent-ink": "#ffffff",
      "--accent-text": "#3730a3",
      "--highlight": "#eef0ff",
      "--warn": "#b35900",
      "--danger": "#cf222e",
      "--unmapped": "#000000",
    });
    expect(SITE_TOKENS.dark).toEqual({
      "--bg": "#0b0d12",
      "--panel": "#11141a",
      "--card": "#151922",
      "--text": "#eceef2",
      "--muted": "#a0a8b6",
      "--line": "#252b36",
      "--line-strong": "#363d4a",
      "--accent": "#8c94ff",
      "--accent-ink": "#0b0d12",
      "--accent-text": "#b9beff",
      "--highlight": "#1d2142",
      "--warn": "#e8a25c",
      "--danger": "#ff7b72",
      "--unmapped": "#eceef2",
    });
    expect(Object.keys(SITE_TOKENS.dark)).toEqual(Object.keys(SITE_TOKENS.light));
    expect(SITE_TOKENS.dark["--unmapped"]).toBe(SITE_TOKENS.dark["--text"]);
  });

  it("resolves the theme from a stored choice, else the system scheme (SPEC-UI-001 REQ-005)", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
    expect(THEME_STORAGE_KEY).toBe("sdl-theme");
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
      // SPEC-UI-001 REQ-002: link text, cards and the primary button.
      ["--accent-text", "--bg", 4.5],
      ["--accent-text", "--panel", 4.5],
      ["--accent-text", "--card", 4.5],
      ["--accent-text", "--highlight", 4.5],
      ["--text", "--card", 4.5],
      ["--muted", "--card", 4.5],
      ["--accent", "--card", 4.5],
      ["--accent-ink", "--accent", 4.5],
      ["--accent-ink", "--accent-text", 4.5], // primary button on hover
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
