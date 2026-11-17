// AC-6: release.config.json loading and validation (REQ-001, REQ-002).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig, validateConfig } from "../scripts/lib/config";

const repoConfig = JSON.parse(readFileSync("release.config.json", "utf8")) as Record<string, unknown>;

function copy(): Record<string, unknown> {
  return structuredClone(repoConfig);
}

describe("release config", () => {
  it("loads the repository config with version, pinned hash and the seven counts", () => {
    const cfg = loadConfig("release.config.json");
    expect(cfg.version).toBe("1.2.0");
    expect(cfg.sha256).toBe("cb248b78cc2e8e0eff4d72885b8225cc65998c7f6d0ff53699c4f91ccd3b6dd4");
    expect(cfg.counts).toEqual({
      papers: 244,
      platforms: 289,
      modules: 1647,
      steps: 2678,
      connections: 1724,
      material_connections: 1098,
      candidates: 2540,
    });
    expect(cfg.doi).toBe("10.5281/zenodo.24088968");
    expect(cfg.record_id).toBe("24088968");
    expect(cfg.file_name).toBe("sdl-workflows-1.2.0.zip");
    expect(cfg.url).toBe("https://zenodo.org/api/records/24088968/files/sdl-workflows-1.2.0.zip/content");
  });

  it("rejects a malformed sha256, naming the field", () => {
    const bad = copy();
    bad.sha256 = "abc123";
    expect(() => validateConfig(bad)).toThrow(/"sha256"/);
  });

  it("rejects a missing counts.modules, naming the field", () => {
    const bad = copy();
    delete (bad.counts as Record<string, unknown>).modules;
    expect(() => validateConfig(bad)).toThrow(/"counts\.modules"/);
  });

  it.each([
    ["version", "1.0"],
    ["doi", "zenodo.24088968"],
    ["record_id", 24088968],
    ["file_name", "sub/release.zip"],
    ["url", "http://zenodo.org/x.zip"],
    ["counts", "many"],
  ])("rejects a wrong %s, naming the field", (field, value) => {
    const bad = copy();
    bad[field] = value;
    expect(() => validateConfig(bad)).toThrow(new RegExp(`"${field}"`));
  });

  it("rejects a negative or fractional count, naming the field", () => {
    const bad = copy();
    (bad.counts as Record<string, unknown>).steps = 2.5;
    expect(() => validateConfig(bad)).toThrow(/"counts\.steps"/);
  });

  it("rejects a config that is not an object", () => {
    expect(() => validateConfig([])).toThrow(/object/);
  });

  it("reports a file that is not valid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "cfg-"));
    const path = join(dir, "release.config.json");
    writeFileSync(path, "{ not json");
    expect(() => loadConfig(path)).toThrow(/not valid JSON/);
  });
});
