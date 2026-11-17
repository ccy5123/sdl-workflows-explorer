// SPEC-SIM-001 AC-1, AC-2, AC-3 on the real pinned release (REQ-001 to REQ-003). The expected counts are counted from
// the release's timing tables by tests/release-expect.ts; the file hashes are the pinned release's entry in
// tests/derived-baselines.json (scripts/lib/baselines.ts), and that case skips for a release with no entry.
// Uses the verified cache in .cache/release/, or SDL_RELEASE_ZIP (hash-checked, extracted into a temp cache).
// Skips with a message only when neither is available.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { BASELINE_HELP, baselineFor, hashDerived } from "../scripts/lib/baselines";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll, writeDerived, type Derived } from "../scripts/lib/derive";
import { tempDir } from "./fixtures/zip";
import { expectedDurations, expectedRelease, expectedThroughputs, type ExpDuration, type ExpRelease } from "./release-expect";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));
if (!available) console.warn("simulation-data.test.ts skipped: no verified release cache and SDL_RELEASE_ZIP is not set");

const SECONDS: Record<string, number> = { s: 1, min: 60, h: 3600, d: 86400 };

describe.skipIf(!available)("simulation.json on the real pinned release", () => {
  let derived: Derived;
  let r: ExpRelease;
  let durations: ExpDuration[];

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    const dir = await fetchRelease({ config, cacheDir, localZip });
    derived = deriveAll(dir);
    r = expectedRelease(dir);
    durations = expectedDurations(r);
  });

  it("AC-1: class lists, durations, throughputs, transfer times and layouts have the release's counts", () => {
    const sim = derived.simulation;
    expect([sim.unit_operations.length, sim.module_types.length, sim.transfer_modes.length]).toEqual([
      r.csv("core/unit_operation.csv").length,
      r.csv("core/module_type.csv").length,
      r.csv("core/transfer_mode.csv").length,
    ]);
    expect(sim.durations).toHaveLength(durations.length);
    expect(sim.durations.filter((d) => d.joint).length).toBe(durations.filter((d) => d.joint).length);
    expect(sim.durations.filter((d) => !d.joint).length).toBe(durations.filter((d) => !d.joint).length);
    expect(sim.durations.map((d) => d.seconds)).toEqual(durations.map((d) => d.seconds));
    const t = expectedThroughputs(r);
    expect(sim.throughputs).toHaveLength(t.measured + t.nominal);
    expect(sim.throughputs.filter((x) => x.kind === "measured").length).toBe(t.measured);
    expect(sim.throughputs.filter((x) => x.kind === "nominal").length).toBe(t.nominal);
    expect(sim.throughputs.filter((x) => x.per_day !== null).length).toBe(t.perDay);
    expect(sim.throughputs.filter((x) => x.per_day === null).length).toBe(t.notConverted);
    const transfers = r
      .csv("modes/simulation/process_values.csv")
      .filter((v) => v.target_kind === "connection" && v.quantity === "transfer_time")
      .map((v) => Number(v.value) * SECONDS[v.unit!]!);
    expect(transfers.length).toBeGreaterThan(0);
    expect(sim.transfer_times.map((x) => x.seconds)).toEqual(transfers);
    expect(sim.platforms).toHaveLength(config.counts.platforms);
  });

  const baseline = baselineFor(config.sha256);
  if (!baseline) console.warn(`simulation-data.test.ts: no baseline recorded for release ${config.version}; ${BASELINE_HELP}`);
  it.skipIf(!baseline)("AC-2: the derived files that existed before keep the pinned release's recorded hashes", () => {
    const out = join(tempDir(), "data");
    writeDerived(derived, out);
    expect(readdirSync(join(out, "platforms"))).toHaveLength(config.counts.papers);
    expect(hashDerived(out)).toEqual(baseline!.files);
  });

  it("AC-3: joint rows stay out of the single-step groups", () => {
    const by = new Map<string, number>();
    for (const d of derived.simulation.durations) if (!d.joint) by.set(d.unit_operation, (by.get(d.unit_operation) ?? 0) + 1);
    const want = new Map<string, number>();
    for (const d of durations) if (!d.joint) want.set(d.uo, (want.get(d.uo) ?? 0) + 1);
    expect(by).toEqual(want);
    // Unit operations with no single-step duration have no group (dispense_solid, generate_instructions, purify in 1.2.0).
    const none = derived.simulation.unit_operations.map((u) => u.id).filter((id) => !want.has(id));
    for (const uo of none) expect(by.has(uo)).toBe(false);
    expect(by.size + none.length).toBe(derived.simulation.unit_operations.length);
    for (const d of derived.simulation.durations.filter((x) => x.joint)) {
      expect(d.joint!.step_ids[0]).toBe(d.step_id);
      expect(d.joint!.unit_operations).toHaveLength(d.joint!.step_ids.length);
    }
    const joint = new Map(durations.filter((d) => d.joint).map((d) => [d.step_id, d.joint!]));
    for (const d of derived.simulation.durations.filter((x) => x.joint)) expect(d.joint!.unit_operations).toEqual(joint.get(d.step_id));
    // A joint duration whose covered steps run past the end of the cycle into its start (a known record of 1.1.0).
    const caramelli = derived.simulation.durations.find((d) => d.step_id === "Caramelli2021/P1/S3")!;
    expect(caramelli.joint!.step_ids.at(-1)).toBe("Caramelli2021/P1/S1");
  });
});
