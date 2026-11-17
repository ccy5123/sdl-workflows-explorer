// AC-1 and AC-10: counts and content shape on the real pinned release (REQ-009, REQ-011, spec §3).
// Uses the verified cache in .cache/release/, or SDL_RELEASE_ZIP (hash-checked, extracted into a temp cache).
// Skips with a message only when neither is available.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { checkCounts, countDerived, countReleaseSources } from "../scripts/lib/counts";
import { readCsv } from "../scripts/lib/csv";
import { deriveAll, writeDerived, type Derived } from "../scripts/lib/derive";
import { COUNT_NAMES } from "../src/data/types";
import { tempDir } from "./fixtures/zip";
import { expectedRelease } from "./release-expect";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));
if (!available) {
  console.warn(
    "release.test.ts skipped: no verified cache in .cache/release/ and SDL_RELEASE_ZIP is not set " +
      "(run `npm run fetch-release` or set SDL_RELEASE_ZIP=<path to the pinned release zip>)",
  );
}

describe.skipIf(!available)("real pinned release", () => {
  let releaseDir: string;
  let derived: Derived;

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    releaseDir = await fetchRelease({ config, cacheDir, localZip });
    derived = deriveAll(releaseDir);
  });

  it("AC-1: the seven counts equal release.config.json and their release sources", () => {
    const fromDerived = countDerived(derived);
    const fromRelease = countReleaseSources(releaseDir);
    console.log(`${"count".padEnd(22)} derived  release  expected`);
    for (const name of COUNT_NAMES) {
      console.log(
        `${name.padEnd(22)} ${String(fromDerived[name]).padStart(5)} ${String(fromRelease[name]).padStart(8)} ${String(config.counts[name]).padStart(9)}`,
      );
    }
    // The same counts taken straight from the release tables (tests/release-expect.ts reads them, not scripts/lib).
    const r = expectedRelease(releaseDir);
    const material = new Set(r.csv("core/transfer_mode.csv").filter((t) => t.is_material === "1").map((t) => t.transfer_mode));
    expect(fromDerived).toEqual({
      papers: r.csv("core/paper.csv").length,
      platforms: r.csv("core/platform.csv").length,
      modules: r.csv("core/module.csv").length,
      steps: r.csv("core/step.csv").length,
      connections: r.csv("core/connection.csv").length,
      material_connections: r.csv("core/connection.csv").filter((c) => material.has(c.transfer_mode)).length,
      candidates: r.csv("core/candidate.csv").length,
    });
    expect(fromDerived).toEqual(config.counts);
    expect(fromRelease).toEqual(config.counts);
    expect(checkCounts(config.counts, derived, releaseDir)).toEqual([]);
  });

  it("AC-2 on the real release: removing one platform names the platforms count, one less", () => {
    const copy = structuredClone(derived);
    const removed = copy.index.platforms.pop()!;
    const file = copy.platformFiles[removed.paper_id]!;
    file.platforms = file.platforms.filter((p) => p.platform_id !== removed.platform_id);
    expect(checkCounts(config.counts, copy, releaseDir)).toContainEqual({
      name: "platforms",
      expected: config.counts.platforms,
      actual: config.counts.platforms - 1,
      source: "index.json platforms rows",
    });
  });

  it("AC-10: index rows, platform files and evidence objects", () => {
    expect(derived.index.papers).toHaveLength(config.counts.papers);
    expect(derived.index.platforms).toHaveLength(config.counts.platforms);
    const out = join(tempDir(), "data");
    writeDerived(derived, out);
    expect(readdirSync(join(out, "platforms"))).toHaveLength(config.counts.papers);
    const items = Object.values(derived.platformFiles)
      .flatMap((f) => f.platforms)
      .flatMap((p) => [...p.modules, ...p.steps, ...p.connections]);
    expect(items).toHaveLength(config.counts.modules + config.counts.steps + config.counts.connections);
    expect(items.every((item) => typeof item.evidence.doc === "string" && item.evidence.doc !== "")).toBe(true);
  });

  it("AC-10: taxonomy classes and usage sums", () => {
    const classes = derived.taxonomy.classes;
    expect(classes).toHaveLength(69);
    const byKind = (kind: string) => classes.filter((c) => c.class_kind === kind);
    const sum = (kind: string) => byKind(kind).reduce((n, c) => n + c.n_items, 0);
    expect(byKind("field_tag")).toHaveLength(10);
    expect(byKind("module_type")).toHaveLength(22);
    expect(byKind("transfer_mode")).toHaveLength(6);
    expect(byKind("unit_operation")).toHaveLength(31);
    const fieldTagRows = readCsv(join(releaseDir, "core/paper_field_tag.csv")).length;
    expect(fieldTagRows).toBeGreaterThanOrEqual(config.counts.papers);
    expect(sum("field_tag")).toBe(fieldTagRows);
    expect(sum("module_type")).toBe(config.counts.modules);
    expect(sum("transfer_mode")).toBe(config.counts.connections);
    expect(sum("unit_operation")).toBe(config.counts.steps);
    console.log(
      `taxonomy usage sums: field_tag ${sum("field_tag")}, module_type ${sum("module_type")}, ` +
        `transfer_mode ${sum("transfer_mode")}, unit_operation ${sum("unit_operation")}`,
    );
  });

  it("AC-10: benchmark tasks, split counts and reference results", () => {
    const b = derived.benchmark;
    expect(b.tasks).toHaveLength(2);
    // The chrono2023 split keeps the 135 training and 98 test papers of release 1.1.0; later papers are excluded.
    const split = { train: 0, test: 0, excluded: 0 };
    for (const row of expectedRelease(releaseDir).csv("modes/benchmark/split.csv")) split[row.split as keyof typeof split]++;
    expect(b.split_counts).toEqual(split);
    expect([split.train, split.test]).toEqual([135, 98]);
    const ref = b.reference_results as Record<string, { n_test_papers: number; n_test_items: number }>;
    expect(ref["chrono2023-module_type"]!.n_test_papers).toBe(98);
    expect(ref["chrono2023-transfer_mode"]!.n_test_papers).toBe(92);
    console.log(`benchmark split ${JSON.stringify(b.split_counts)}; n_test_papers 98 / 92`);
  });
});
