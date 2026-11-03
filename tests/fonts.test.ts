// SPEC-UI-001 AC-2: the self-hosted typefaces, their licences and the .math rule (REQ-003).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const FONTS = join(ROOT, "public", "fonts");
const css = readFileSync(join(ROOT, "src", "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const WOFF2 = [
  "lmroman10-regular.woff2",
  "lmroman10-italic.woff2",
  "jetbrains-mono-latin-400.woff2",
  "jetbrains-mono-latin-500.woff2",
];

describe("self-hosted fonts (AC-2)", () => {
  it.each(WOFF2)("ships %s as woff2", (name) => {
    const bytes = readFileSync(join(FONTS, name));
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
  });

  it("ships the licence of each family beside the fonts", () => {
    expect(readFileSync(join(FONTS, "GUST-FONT-LICENSE.txt"), "utf8")).toContain("GUST Font License");
    expect(readFileSync(join(FONTS, "OFL.txt"), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(existsSync(join(FONTS, "README.md"))).toBe(true);
  });

  it("declares a @font-face for each file and no other font file", () => {
    const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]!);
    const urls = faces.map((f) => f.match(/url\("\/fonts\/([^"]+)"\)/)?.[1]);
    expect(urls.sort()).toEqual([...WOFF2].sort());
    for (const face of faces) expect(face).toMatch(/font-display:\s*swap/);
  });

  it("sets statistics in Latin Modern, 10% larger, with italic variables", () => {
    const math = css.match(/\n\.math\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(math).toContain("font-family: var(--font-math)");
    expect(math).toContain("font-size: 1.1em");
    expect(math).toContain("font-style: normal");
    expect(css).toMatch(/--font-math:\s*"Latin Modern Roman"/);
    expect(css).toMatch(/\n\.math i\s*\{\s*font-style: italic;/);
  });

  it("uses Arial for UI text and JetBrains Mono for codes", () => {
    expect(css).toMatch(/--font-ui:\s*Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif;/);
    expect(css).toMatch(/--font-mono:\s*"JetBrains Mono"/);
    expect(css).not.toMatch(/font-family:\s*ui-monospace/);
  });
});
