// SPEC-SITE-001 AC-11, AC-14 (configuration part): the Pages base per build mode and the deploy workflow file.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { UserConfig, UserConfigFnObject } from "vite";
import { describe, expect, it } from "vitest";
import config from "../vite.config";

const ROOT = join(import.meta.dirname, "..");

describe("Vite base (AC-14)", () => {
  const resolve = (mode: string) =>
    (config as UserConfigFnObject)({ mode, command: "build", isSsrBuild: false, isPreview: false }) as UserConfig;

  it("serves the production build under /sdl-workflows-explorer/", () => {
    expect(resolve("production").base).toBe("/sdl-workflows-explorer/");
  });

  it("keeps the e2e build relative, at the origin root of its preview server", () => {
    expect(resolve("e2e").base).toBe("./");
  });

  it("pins the preview servers of the Playwright run to their modes", () => {
    const pw = readFileSync(join(ROOT, "playwright.config.ts"), "utf8");
    expect(pw).toMatch(/vite preview --mode e2e --outDir dist-e2e --port \$\{PORT\}/);
    expect(pw).toMatch(/vite preview --mode production --outDir dist-pages --port \$\{PAGES_PORT\}/);
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.e2e).toContain("vite build --outDir dist-pages");
  });
});

describe("GitHub Pages workflow (AC-11)", () => {
  const path = join(ROOT, ".github", "workflows", "pages.yml");
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("runs only when started by hand", () => {
    const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(text)?.[1] ?? "";
    expect(on).toMatch(/^\s+workflow_dispatch:/m);
    for (const trigger of ["push", "pull_request", "pull_request_target", "schedule", "workflow_run", "release"]) {
      expect(on, trigger).not.toMatch(new RegExp(String.raw`^\s+${trigger}:`, "m"));
    }
  });

  it("builds the data from Zenodo, checks, builds and deploys to Pages", () => {
    const steps = [
      "npm ci",
      "npm run fetch-release",
      "npm run build-data",
      "npm run typecheck",
      "npm test",
      "npx vite build",
      "actions/upload-pages-artifact",
      "actions/deploy-pages",
    ];
    let at = -1;
    for (const step of steps) {
      const next = text.indexOf(step, at + 1);
      expect(next, `${step} after the previous step`).toBeGreaterThan(at);
      at = next;
    }
    expect(text).toMatch(/upload-pages-artifact@[^\n]+\n(?:\s+.*\n)*?\s+path: dist\b/);
    expect(text).toMatch(/pages: write/);
    expect(text).toMatch(/id-token: write/);
  });
});
