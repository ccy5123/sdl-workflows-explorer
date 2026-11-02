// SPEC-SIM-001 AC-1, AC-2, AC-3 on the real pinned release (REQ-001 to REQ-003).
// Uses the verified cache in .cache/release/, or SDL_RELEASE_ZIP (hash-checked, extracted into a temp cache).
// Skips with a message only when neither is available.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { deriveAll, writeDerived, type Derived } from "../scripts/lib/derive";
import { tempDir } from "./fixtures/zip";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));
if (!available) console.warn("simulation-data.test.ts skipped: no verified release cache and SDL_RELEASE_ZIP is not set");

/** Hashes of the derived files that existed before SPEC-SIM-001, at the start-gate head 817c6ab (progress.md). */
const BASELINE: Record<string, string> = {
  "benchmark-items.json": "0f12de153f14285d8ac5b7abe8ab2de2f3dd6dce8a8159317f0e5f336994950d",
  "benchmark.json": "585ca40067f3d1d42091c70c8f69d6b0c4e936edbe5ae1e05aad9cc4d6395474",
  "index.json": "a452131e2fc31e3b8c39dd4aa42c00dbd910712ac2034f0f89b1d19adbca8174",
  "release-docs.json": "a734f38aea2fe831ab016d04cd3832761a81698510cc30d5638f628e8de70378",
  "taxonomy.json": "677615d0272c7a7dd8c297ccf482c0d4ba743dbb9748bdc1bd6766ba98e7ab47",
  "platforms/*.json": "b4212f2b4b91640dbdfeb66b0d69d8c944e0f2836a9e8f321d1f3829e50d841e",
};

const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

describe.skipIf(!available || config.sha256 !== "673b2dbb4c79ef4eb8f7af8c298d640c1cf4e393ab78359bbce0b4cff7c897f6")(
  "simulation.json on the real 1.1.0 release",
  () => {
    let derived: Derived;

    beforeAll(async () => {
      const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
      derived = deriveAll(await fetchRelease({ config, cacheDir, localZip }));
    });

    it("AC-1: class lists, durations, throughputs, transfer times and layouts have the release's counts", () => {
      const sim = derived.simulation;
      expect([sim.unit_operations.length, sim.module_types.length, sim.transfer_modes.length]).toEqual([31, 22, 6]);
      expect(sim.durations).toHaveLength(454);
      expect(sim.durations.filter((d) => d.joint).length).toBe(57);
      expect(sim.durations.filter((d) => !d.joint).length).toBe(397);
      expect(sim.throughputs).toHaveLength(135);
      expect(sim.throughputs.filter((t) => t.kind === "measured").length).toBe(91);
      expect(sim.throughputs.filter((t) => t.kind === "nominal").length).toBe(44);
      expect(sim.throughputs.filter((t) => t.per_day !== null).length).toBe(126);
      expect(sim.throughputs.filter((t) => t.per_day === null).length).toBe(9);
      expect(sim.transfer_times.map((t) => t.seconds)).toEqual([45.7, 6, 7, 30]);
      expect(sim.platforms).toHaveLength(279);
    });

    it("AC-2: the derived files that existed before keep their start-gate hashes", () => {
      const out = join(tempDir(), "data");
      writeDerived(derived, out);
      const got: Record<string, string> = {};
      for (const name of Object.keys(BASELINE)) {
        if (name !== "platforms/*.json") got[name] = sha(readFileSync(join(out, name)));
      }
      const files = readdirSync(join(out, "platforms")).sort();
      expect(files).toHaveLength(237);
      got["platforms/*.json"] = sha(Buffer.concat(files.map((f) => readFileSync(join(out, "platforms", f)))));
      expect(got).toEqual(BASELINE);
    });

    it("AC-3: joint rows stay out of the single-step groups", () => {
      const by = new Map<string, number>();
      for (const d of derived.simulation.durations) if (!d.joint) by.set(d.unit_operation, (by.get(d.unit_operation) ?? 0) + 1);
      expect(by.size).toBe(28);
      expect([...by.values()].reduce((a, b) => a + b, 0)).toBe(397);
      expect([by.get("react_flow"), by.get("react_thermal"), by.get("measure_separation_ms"), by.get("measure_physical")])
        .toEqual([87, 70, 35, 4]);
      for (const uo of ["dispense_solid", "generate_instructions", "purify"]) expect(by.has(uo)).toBe(false);
      expect([...by.values()].filter((n) => n < 10).length).toBe(17);
      for (const d of derived.simulation.durations.filter((x) => x.joint)) {
        expect(d.joint!.step_ids[0]).toBe(d.step_id);
        expect(d.joint!.unit_operations).toHaveLength(d.joint!.step_ids.length);
      }
      const caramelli = derived.simulation.durations.find((d) => d.step_id === "Caramelli2021/P1/S3")!;
      expect(caramelli.joint!.step_ids.at(-1)).toBe("Caramelli2021/P1/S1");
    });
  },
);
