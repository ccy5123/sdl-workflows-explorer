// SPEC-BENCH-001 AC-1 to AC-4 on the real pinned release: the typed benchmark.json, benchmark-items.json, the build
// checks and the file sizes and unchanged files after build-data (REQ-001 to REQ-004). The expected numbers are counted
// from the release's split and item files by tests/release-expect.ts (as .moai/specs/SPEC-BENCH-001/expected-counts.mjs
// did for 1.0.0). deriveAll uses the verified cache in .cache/release/, or SDL_RELEASE_ZIP, and skips with a message
// only when neither is available, as release.test.ts does; the size and hash checks read public/data/ and skip with a
// message when build-data has not run.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { BASELINE_HELP, baselineFor, hashDerived } from "../scripts/lib/baselines";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll, type Derived } from "../scripts/lib/derive";
import { tempDir } from "./fixtures/zip";
import { pinnedExclusionReasons } from "./pinned-release";
import { expectedBenchmark, expectedRelease, type ExpBenchmark, total } from "./release-expect";

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
  let bench: ExpBenchmark;
  const read = (rel: string) => readFileSync(join(releaseDir, "modes/benchmark", rel), "utf8");

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    releaseDir = await fetchRelease({ config, cacheDir, localZip });
    d = deriveAll(releaseDir);
    bench = expectedBenchmark(expectedRelease(releaseDir));
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
    expect(b.split_counts).toEqual(bench.papers);
    // From 1.2.0 on, the papers added after 1.1.0 are left out under a reason of their own, before the 4 development
    // papers (split.csv lists them first); the development papers' reason is the one 1.1.0 states.
    const reasons = pinnedExclusionReasons(releaseDir);
    expect(b.exclusion_reasons).toEqual(reasons);
    expect(reasons.reduce((n, r) => n + r.n, 0)).toBe(bench.papers.excluded);
    expect(reasons.at(-1)).toEqual({ reason: "one of the 10 development papers of the coding instructions", n: 4 });
  });

  it("AC-1: two tasks with exactly the 15 fields, equal to the parsed task files", () => {
    expect(d.benchmark.tasks.map((t) => t.task_id)).toEqual([MT, TM]);
    for (const task of d.benchmark.tasks) {
      expect(Object.keys(task)).toHaveLength(15);
      expect(task).toEqual(JSON.parse(read(`tasks/${task.task_id}.json`)));
    }
  });

  // Expected summaries counted from the item files (tests/release-expect.ts): labels by total, then by name.
  const labelsOf = (task: string) =>
    [...bench.tasks[task]!.labels]
      .map(([label, c]) => ({ label, ...c }))
      .sort((a, b) => total(b) - total(a) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  it("AC-1: summaries of items, uncertain items and labels", () => {
    const [mt, tm] = d.benchmark.summaries;
    expect(mt!.task_id).toBe(MT);
    expect(mt!.items).toEqual(bench.tasks[MT]!.items);
    expect(mt!.uncertain).toEqual(bench.tasks[MT]!.uncertain);
    expect(mt!.labels).toEqual(labelsOf(MT));
    expect(mt!.labels).toHaveLength(22);
    expect(mt!.labels[0]!.label).toBe("software");
    expect(tm!.task_id).toBe(TM);
    expect(tm!.items).toEqual(bench.tasks[TM]!.items);
    expect(tm!.uncertain).toEqual(bench.tasks[TM]!.uncertain);
    expect(tm!.labels).toEqual(labelsOf(TM));
    expect(tm!.labels.map((l) => l.label).sort()).toEqual(["fixed_tubing", "human_transfer", "mobile_robot", "robot_arm_gantry", "unmapped"]);
  });

  it("AC-1: every platform in id order with splits and per-task item counts", () => {
    const p = d.benchmark.platforms;
    expect(p).toHaveLength(config.counts.platforms);
    const ids = p.map((x) => x.platform_id);
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    const bySplit = (s: string) => p.filter((x) => x.split === s).length;
    expect({ train: bySplit("train"), test: bySplit("test"), excluded: bySplit("excluded") }).toEqual(bench.platforms);
    // Two platforms of the test papers, whose codings no release since 1.1.0 has changed.
    expect(p.find((x) => x.platform_id === "Aand2024/P1")).toEqual({ platform_id: "Aand2024/P1", split: "test", n: [6, 3] });
    expect(p.find((x) => x.platform_id === "Zhu2024/P1")).toEqual({ platform_id: "Zhu2024/P1", split: "test", n: [14, 7] });
    for (const x of p) expect(x.n, x.platform_id).toEqual([bench.perPlatform(MT, x.platform_id), bench.perPlatform(TM, x.platform_id)]);
    expect(p.some((x) => x.n[1] === 0)).toBe(true);
    expect(p.reduce((s, x) => s + x.n[0]!, 0)).toBe(total(bench.tasks[MT]!.items));
    expect(p.reduce((s, x) => s + x.n[1]!, 0)).toBe(total(bench.tasks[TM]!.items));
  });

  it("AC-1: reference_results keyed in file order with 8 fields; the text byte for byte", () => {
    const ref = d.benchmark.reference_results;
    expect(Object.keys(ref)).toEqual([MT, TM]);
    for (const entry of Object.values(ref)) expect(Object.keys(entry)).toHaveLength(8);
    expect(ref).toEqual(JSON.parse(read("reference_results.json")));
    expect(d.benchmark.reference_results_text).toBe(read("reference_results.json"));
  });

  it("AC-2: benchmark-items.json columns, rows, first rows and uncertain sums", () => {
    const items = d.benchmarkItems;
    expect(Object.keys(items)).toEqual([MT, TM]);
    expect(items[MT]!.columns).toHaveLength(8);
    expect(items[MT]!.rows).toHaveLength(total(bench.tasks[MT]!.items));
    expect(items[MT]!.rows).toHaveLength(config.counts.steps);
    expect(items[MT]!.rows[0]).toEqual([
      "Aand2024/P1/S1", "test", "fluidics", "chemistry_synthesis", "dispense_liquid", "START", "react_photo_electro", 0,
    ]);
    expect(items[TM]!.columns).toHaveLength(9);
    expect(items[TM]!.rows).toHaveLength(total(bench.tasks[TM]!.items));
    expect(items[TM]!.rows[0]).toEqual([
      "Aand2024/P1/E1", "test", "fixed_tubing", "chemistry_synthesis", "dispense_liquid", "react_photo_electro", "prepare", "react", 0,
    ]);
    const uncertainSum = (task: string) => items[task]!.rows.reduce((s, r) => s + (r[r.length - 1] as number), 0);
    expect(items[MT]!.rows.every((r) => typeof r[7] === "number")).toBe(true);
    expect(items[TM]!.rows.every((r) => typeof r[8] === "number")).toBe(true);
    expect([uncertainSum(MT), uncertainSum(TM)]).toEqual([total(bench.tasks[MT]!.uncertain), total(bench.tasks[TM]!.uncertain)]);
  });
});

// AC-4: sizes of the two benchmark files and the files that must stay byte-identical (progress.md §E.1 baseline).
const DATA_DIR = join(import.meta.dirname, "..", "public", "data");
const built = existsSync(join(DATA_DIR, "benchmark-items.json"));
if (!built) console.warn("benchmark-derive.test.ts: AC-4 skipped: public/data/benchmark-items.json is absent (run `npm run build-data`)");

describe.skipIf(!built)("files after build-data (SPEC-BENCH-001 AC-4)", () => {
  it("keeps benchmark.json within 40,000 bytes and benchmark-items.json within 500,000 bytes", () => {
    const benchmark = statSync(join(DATA_DIR, "benchmark.json")).size;
    const items = statSync(join(DATA_DIR, "benchmark-items.json")).size;
    console.log(`benchmark.json ${benchmark} bytes, benchmark-items.json ${items} bytes`);
    expect(benchmark).toBeLessThanOrEqual(40_000);
    expect(items).toBeLessThanOrEqual(500_000);
  });

  // The derived files of the pinned release as recorded for it in tests/derived-baselines.json (SPEC-RELEASE-001 AC-3),
  // so a code change that alters them fails here; tests/release-docs.test.ts checks what changed from the previous
  // release. A release with no recorded baseline skips this case (npm run record-baselines records one).
  const baseline = baselineFor(config.sha256);
  if (!baseline) console.warn(`benchmark-derive.test.ts: no baseline recorded for release ${config.version}; ${BASELINE_HELP}`);
  it.skipIf(!baseline)("keeps index.json, taxonomy.json and the platform files at the baseline of the pinned release", () => {
    expect(readdirSync(join(DATA_DIR, "platforms"))).toHaveLength(config.counts.papers);
    const got = hashDerived(DATA_DIR);
    for (const name of ["index.json", "taxonomy.json", "platforms/*.json"]) expect(got[name], name).toBe(baseline!.files[name]);
  });
});
