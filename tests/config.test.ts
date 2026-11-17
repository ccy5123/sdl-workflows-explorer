// AC-6: release.config.json loading and validation (REQ-001, REQ-002).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig, type ReleasePin, validateConfig } from "../scripts/lib/config";

const repoConfig = JSON.parse(readFileSync("release.config.json", "utf8")) as Record<string, unknown>;

function copy(): Record<string, unknown> {
  return structuredClone(repoConfig);
}

describe("release config", () => {
  // The pinned values themselves are checked against the release by tests/release.test.ts (counts) and fetch-release
  // (sha256); here the pin and its previous release must name one Zenodo record consistently.
  const consistent = (pin: ReleasePin) => {
    expect(pin.file_name).toBe(`sdl-workflows-${pin.version}.zip`);
    expect(pin.doi).toBe(`10.5281/zenodo.${pin.record_id}`);
    expect(pin.url).toBe(`https://zenodo.org/api/records/${pin.record_id}/files/${pin.file_name}/content`);
    expect(pin.sha256).toMatch(/^[0-9a-f]{64}$/);
  };
  const semver = (v: string) => v.split(".").map(Number).reduce((n, x) => n * 1000 + x, 0);

  it("loads the repository config: one Zenodo record named consistently, and the seven counts", () => {
    const cfg = loadConfig("release.config.json");
    consistent(cfg);
    expect(Object.keys(cfg.counts)).toEqual([
      "papers", "platforms", "modules", "steps", "connections", "material_connections", "candidates",
    ]);
    expect(cfg.counts.papers).toBeGreaterThan(0);
    expect(cfg.counts.platforms).toBeGreaterThanOrEqual(cfg.counts.papers);
    expect(cfg.counts.material_connections).toBeLessThanOrEqual(cfg.counts.connections);
    expect(cfg.counts.candidates).toBeGreaterThanOrEqual(cfg.counts.papers);
  });

  it.skipIf(!repoConfig.previous)("names an earlier release as the previous one, on another record", () => {
    const cfg = loadConfig("release.config.json");
    consistent(cfg.previous!);
    expect(semver(cfg.previous!.version)).toBeLessThan(semver(cfg.version));
    expect(cfg.previous!.record_id).not.toBe(cfg.record_id);
  });

  it("accepts a config without a previous release and validates a previous block field by field", () => {
    const none = copy();
    delete none.previous;
    expect(validateConfig(none).previous).toBeUndefined();
    const pin = {
      version: "0.9.0",
      doi: "10.5281/zenodo.11",
      record_id: "11",
      file_name: "sdl-workflows-0.9.0.zip",
      url: "https://zenodo.org/api/records/11/files/sdl-workflows-0.9.0.zip/content",
      sha256: "a".repeat(64),
    };
    expect(validateConfig({ ...none, previous: pin }).previous).toEqual(pin);
    expect(() => validateConfig({ ...none, previous: { ...pin, sha256: "abc" } })).toThrow(/"previous\.sha256"/);
    expect(() => validateConfig({ ...none, previous: { ...pin, url: undefined } })).toThrow(/"previous\.url" is missing/);
    expect(() => validateConfig({ ...none, previous: "1.1.0" })).toThrow(/"previous"/);
    expect(() => validateConfig({ ...none, previous: { ...pin, version: none.version } })).toThrow(/"previous\.version"/);
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
