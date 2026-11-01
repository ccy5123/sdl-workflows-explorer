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
    expect(cfg.version).toBe("1.0.0");
    expect(cfg.sha256).toBe("dd1d18cf2fb7978105d422b2c1e6810c0c35306511fb56491f3d05f6d997e245");
    expect(cfg.counts).toEqual({
      papers: 238,
      platforms: 280,
      modules: 1603,
      steps: 2621,
      connections: 1687,
      material_connections: 1076,
      candidates: 2172,
    });
    expect(cfg.doi).toBe("10.5281/zenodo.23857126");
    expect(cfg.record_id).toBe("23857126");
    expect(cfg.file_name).toBe("sdl-workflows-1.0.0.zip");
    expect(cfg.url).toBe("https://zenodo.org/api/records/23857126/files/sdl-workflows-1.0.0.zip/content");
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
    ["doi", "zenodo.23857126"],
    ["record_id", 23857126],
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
