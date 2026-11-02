// SPEC-BENCH-001 AC-1 to AC-4 on the real pinned release: the typed benchmark.json, benchmark-items.json, the build
// checks and the file sizes and unchanged files after build-data (REQ-001 to REQ-004). The expected numbers are those
// printed by .moai/specs/SPEC-BENCH-001/expected-counts.mjs. deriveAll uses the verified cache in .cache/release/, or
// SDL_RELEASE_ZIP, and skips with a message only when neither is available, as release.test.ts does; the size and
// hash checks read public/data/ and skip with a message when build-data has not run.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll, type Derived } from "../scripts/lib/derive";
import { tempDir } from "./fixtures/zip";
import { pinnedExclusionReason } from "./pinned-release";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));
if (!available) {
  console.warn(
    "benchmark-derive.test.ts skipped: no verified cache in .cache/release/ and SDL_RELEASE_ZIP is not set " +
      "(run `npm run fetch-release` or set SDL_RELEASE_ZIP=<path to the pinned release zip>)",
  );
}

const MT = "chrono2023-module_type";
const TM = "chrono2023-transfer_mode";

describe.skipIf(!available)("SPEC-BENCH-001 on the real pinned release", () => {
  let releaseDir: string;
  let d: Derived;
  const read = (rel: string) => readFileSync(join(releaseDir, "modes/benchmark", rel), "utf8");

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    releaseDir = await fetchRelease({ config, cacheDir, localZip });
    d = deriveAll(releaseDir);
  });

  it("AC-3: deriveAll does not throw on the real release", () => {
    expect(() => deriveAll(releaseDir)).not.toThrow();
  });

  it("AC-1: keys, benchmark id, split rule, split counts and exclusion reasons", () => {
    const b = d.benchmark;
    expect(Object.keys(b)).toEqual([
      "benchmark_id", "split_rule", "split_counts", "exclusion_reasons", "tasks", "summaries", "platforms",
      "reference_results", "reference_results_text",
    ]);
    expect(b.benchmark_id).toBe("chrono2023");
    expect(b.split_rule).toBe(
      "Benchmark: chrono2023 trains on papers first public in 2023 or earlier and tests on papers first public in 2024 or later.",
    );
    expect(b.split_counts).toEqual({ train: 135, test: 99, excluded: 4 });
    expect(b.exclusion_reasons).toEqual([{ reason: pinnedExclusionReason(releaseDir), n: 4 }]);
  });

  it("AC-1: two tasks with exactly the 15 fields, equal to the parsed task files", () => {
    expect(d.benchmark.tasks.map((t) => t.task_id)).toEqual([MT, TM]);
    for (const task of d.benchmark.tasks) {
      expect(Object.keys(task)).toHaveLength(15);
      expect(task).toEqual(JSON.parse(read(`tasks/${task.task_id}.json`)));
    }
  });

  it("AC-1: summaries of items, uncertain items and labels", () => {
    const [mt, tm] = d.benchmark.summaries;
    expect(mt!.task_id).toBe(MT);
    expect(mt!.items).toEqual({ train: 1384, test: 1199, excluded: 38 });
    expect(mt!.uncertain).toEqual({ train: 171, test: 163, excluded: 6 });
    expect(mt!.labels).toHaveLength(22);
    expect(mt!.labels[0]).toEqual({ label: "software", train: 362, test: 281, excluded: 9 });
    expect(mt!.labels[21]).toEqual({ label: "assembly_unit", train: 0, test: 4, excluded: 0 });
    expect(tm!.task_id).toBe(TM);
    expect(tm!.items).toEqual({ train: 542, test: 426, excluded: 15 });
    expect(tm!.uncertain).toEqual({ train: 47, test: 51, excluded: 1 });
    expect(tm!.labels).toEqual([
      { label: "fixed_tubing", train: 298, test: 120, excluded: 3 },
      { label: "robot_arm_gantry", train: 175, test: 189, excluded: 11 },
      { label: "human_transfer", train: 58, test: 83, excluded: 0 },
      { label: "mobile_robot", train: 10, test: 29, excluded: 1 },
      { label: "unmapped", train: 1, test: 5, excluded: 0 },
    ]);
  });

  it("AC-1: 280 platforms in id order with splits and per-task item counts", () => {
    const p = d.benchmark.platforms;
    expect(p).toHaveLength(280);
    const ids = p.map((x) => x.platform_id);
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    const bySplit = (s: string) => p.filter((x) => x.split === s).length;
    expect([bySplit("train"), bySplit("test"), bySplit("excluded")]).toEqual([160, 116, 4]);
    expect(p.find((x) => x.platform_id === "Aand2024/P1")).toEqual({ platform_id: "Aand2024/P1", split: "test", n: [6, 3] });
    expect(p.find((x) => x.platform_id === "Zhu2024/P1")).toEqual({ platform_id: "Zhu2024/P1", split: "test", n: [14, 7] });
    expect(p.filter((x) => x.n[1] === 0)).toHaveLength(10);
    expect(p.reduce((s, x) => s + x.n[0]!, 0)).toBe(2621);
    expect(p.reduce((s, x) => s + x.n[1]!, 0)).toBe(983);
  });

  it("AC-1: reference_results keyed in file order with 8 fields; the text byte for byte (619 bytes)", () => {
    const ref = d.benchmark.reference_results;
    expect(Object.keys(ref)).toEqual([MT, TM]);
    for (const entry of Object.values(ref)) expect(Object.keys(entry)).toHaveLength(8);
    expect(ref).toEqual(JSON.parse(read("reference_results.json")));
    expect(d.benchmark.reference_results_text).toBe(read("reference_results.json"));
    expect(Buffer.byteLength(d.benchmark.reference_results_text)).toBe(619);
  });

  it("AC-2: benchmark-items.json columns, rows, first rows and uncertain sums", () => {
    const items = d.benchmarkItems;
    expect(Object.keys(items)).toEqual([MT, TM]);
    expect(items[MT]!.columns).toHaveLength(8);
    expect(items[MT]!.rows).toHaveLength(2621);
    expect(items[MT]!.rows[0]).toEqual([
      "Aand2024/P1/S1", "test", "fluidics", "chemistry_synthesis", "dispense_liquid", "START", "react_photo_electro", 0,
    ]);
    expect(items[TM]!.columns).toHaveLength(9);
    expect(items[TM]!.rows).toHaveLength(983);
    expect(items[TM]!.rows[0]).toEqual([
      "Aand2024/P1/E1", "test", "fixed_tubing", "chemistry_synthesis", "dispense_liquid", "react_photo_electro", "prepare", "react", 0,
    ]);
    const uncertainSum = (task: string) => items[task]!.rows.reduce((s, r) => s + (r[r.length - 1] as number), 0);
    expect(items[MT]!.rows.every((r) => typeof r[7] === "number")).toBe(true);
    expect(items[TM]!.rows.every((r) => typeof r[8] === "number")).toBe(true);
    expect([uncertainSum(MT), uncertainSum(TM)]).toEqual([340, 99]);
  });
});

// AC-4: sizes of the two benchmark files and the files that must stay byte-identical (progress.md §E.1 baseline).
const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const built = existsSync(join(DATA_DIR, "benchmark-items.json"));
if (!built) console.warn("benchmark-derive.test.ts: AC-4 skipped: public/data/benchmark-items.json is absent (run `npm run build-data`)");

describe.skipIf(!built)("files after build-data (SPEC-BENCH-001 AC-4)", () => {
  const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

  it("keeps benchmark.json within 40,000 bytes and benchmark-items.json within 500,000 bytes", () => {
    const benchmark = statSync(join(DATA_DIR, "benchmark.json")).size;
    const items = statSync(join(DATA_DIR, "benchmark-items.json")).size;
    console.log(`benchmark.json ${benchmark} bytes, benchmark-items.json ${items} bytes`);
    expect(benchmark).toBeLessThanOrEqual(40_000);
    expect(items).toBeLessThanOrEqual(500_000);
  });

  // Baselines of release 1.1.0 (SPEC-RELEASE-001 AC-3); tests/release-docs.test.ts checks what changed since 1.0.0.
  it("keeps index.json, taxonomy.json and the platform files at the baseline of the pinned release", () => {
    const dir = join(DATA_DIR, "platforms");
    const names = readdirSync(dir).sort();
    expect(names).toHaveLength(238);
    const platforms = sha256(Buffer.concat(names.map((n) => readFileSync(join(dir, n)))));
    expect(sha256(readFileSync(join(DATA_DIR, "index.json")))).toBe("464b1c6dce9f30f39a89c2f3ac5f32b9d7d0d688d0e9c926a4c7715543a21064");
    expect(sha256(readFileSync(join(DATA_DIR, "taxonomy.json")))).toBe("f4b111b046402fcb332050a67bc19ff9126dc82003b1e5c1e71e9fbdcd392537");
    expect(platforms).toBe("9001ca64126b7bb996076a0b8b172d5c3d5b293171529dcf9aca08d8599889a8");
  });
});
