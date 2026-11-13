// llms.txt and the per-paper Markdown pages on the real pinned release: the numbers come from the derived data, every
// link points at a file the build writes, and each page names every module, step and connection with its evidence.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll, writeDerived, type Derived } from "../scripts/lib/derive";
import { CITATION_RULE, llmsTxt, SITE_URL, techniquePage, writeLlms } from "../scripts/lib/llms";
import { readOverlay, TAG_PROVENANCE } from "../scripts/lib/techniques";
import { evidenceText } from "../src/lib/home";
import { tempDir } from "./fixtures/zip";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));

describe.skipIf(!available)("llms.txt and paper pages", () => {
  let derived: Derived;
  let publicDir: string;
  let dataDir: string;

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    derived = deriveAll(await fetchRelease({ config, cacheDir, localZip }), readOverlay());
    publicDir = tempDir();
    dataDir = join(publicDir, "data");
    writeDerived(derived, dataDir);
    writeLlms(derived, publicDir, dataDir);
  });

  it("states the release, its counts and the citation rule", () => {
    const text = llmsTxt(derived);
    const { release, counts } = derived.index;
    expect(text.startsWith("# SDL Workflows Explorer\n\n> ")).toBe(true);
    expect(text).toContain(`Data release ${release.version}, DOI ${release.doi}`);
    for (const k of ["platforms", "papers", "modules", "steps", "connections"] as const) expect(text).toContain(counts[k].toLocaleString("en"));
    expect(text).toContain(CITATION_RULE);
  });

  it("links only files the build writes, and lists every paper", () => {
    const text = readFileSync(join(publicDir, "llms.txt"), "utf8");
    const links = [...text.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]!).filter((u) => u.startsWith(SITE_URL) && u !== SITE_URL);
    for (const link of links) expect(existsSync(join(publicDir, decodeURIComponent(link.slice(SITE_URL.length)))), link).toBe(true);
    const listed = links.filter((u) => u.includes("/data/papers/"));
    expect(listed.length).toBe(derived.index.papers.length);
    expect(readdirSync(join(dataDir, "papers")).filter((f) => f.endsWith(".md")).length).toBe(derived.index.papers.length);
  });

  it("links one page per technique, each with the provenance sentence and every tagged module with its evidence (SPEC-TECH-001 REQ-011)", () => {
    const text = readFileSync(join(publicDir, "llms.txt"), "utf8");
    expect(text).toContain(TAG_PROVENANCE);
    const t = derived.techniques!;
    for (const tech of t.techniques) {
      expect(text).toContain(`${SITE_URL}${techniquePage(tech.id)}`);
      const page = readFileSync(join(publicDir, techniquePage(tech.id)), "utf8");
      expect(page).toContain(TAG_PROVENANCE);
      expect(page).toContain(tech.definition);
      expect(page).not.toMatch(/checked by/i);
      for (const m of t.modules.filter((x) => x.techniques.includes(tech.id))) expect(page).toContain(`- ${m.module_id}: ${m.name} (evidence: ${m.evidence})`);
    }
  });

  it("names every module, step and connection of a paper with its evidence location", () => {
    for (const [paperId, file] of Object.entries(derived.platformFiles)) {
      const page = readFileSync(join(dataDir, "papers", `${paperId}.md`), "utf8");
      for (const g of file.platforms) {
        for (const item of [...g.modules.map((m) => [m.module_id, m.evidence] as const), ...g.steps.map((s) => [s.step_id, s.evidence] as const), ...g.connections.map((c) => [c.edge_id, c.evidence] as const)]) {
          expect(page).toContain(`${item[0]}: `);
          expect(page).toContain(`evidence: ${evidenceText(item[1])}`);
        }
      }
    }
  });
});
