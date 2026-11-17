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

/**
 * Hashes of the derived files that existed before SPEC-SIM-001, at the start-gate head 817c6ab (progress.md), re-baselined
 * on release 1.2.0 (the values tests/benchmark-derive.test.ts and tests/release-docs.test.ts pin).
 */
const BASELINE: Record<string, string> = {
  "benchmark-items.json": "37034f666bbeeebf6f2c4619311af4df417a3269484e08cb8dc5f6c2ffe0e09f",
  "benchmark.json": "f504ef51f4f42ec29b3f195e7e26018de2eafc38522ecb07c43e56cf137909ec",
  "index.json": "b78de7345ddd2b5c51f4999411e69906c48e1c66e38e32e1e5e9730328b986f1",
  "release-docs.json": "de0e670b90a69b7818c405f1d4030972a80e819d2b736c7694836154c2f229f8",
  "taxonomy.json": "603cac0ce1056c2640c0b921734db1627066a6dbe3e4587a61d44f803e79779c",
  "platforms/*.json": "c9000e02006b546803db5c67931d4dd3ecd46aa3444ca842e78098d1c46cca4b",
};

const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

describe.skipIf(!available || config.sha256 !== "cb248b78cc2e8e0eff4d72885b8225cc65998c7f6d0ff53699c4f91ccd3b6dd4")(
  "simulation.json on the real 1.2.0 release",
  () => {
    let derived: Derived;

    beforeAll(async () => {
      const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
      derived = deriveAll(await fetchRelease({ config, cacheDir, localZip }));
    });

    it("AC-1: class lists, durations, throughputs, transfer times and layouts have the release's counts", () => {
      const sim = derived.simulation;
      expect([sim.unit_operations.length, sim.module_types.length, sim.transfer_modes.length]).toEqual([31, 22, 6]);
      expect(sim.durations).toHaveLength(465);
      expect(sim.durations.filter((d) => d.joint).length).toBe(61);
      expect(sim.durations.filter((d) => !d.joint).length).toBe(404);
      expect(sim.throughputs).toHaveLength(139);
      expect(sim.throughputs.filter((t) => t.kind === "measured").length).toBe(95);
      expect(sim.throughputs.filter((t) => t.kind === "nominal").length).toBe(44);
      expect(sim.throughputs.filter((t) => t.per_day !== null).length).toBe(130);
      expect(sim.throughputs.filter((t) => t.per_day === null).length).toBe(9);
      expect(sim.transfer_times.map((t) => t.seconds)).toEqual([45.7, 6, 7, 30]);
      expect(sim.platforms).toHaveLength(289);
    });

    it("AC-2: the derived files that existed before keep their start-gate hashes", () => {
      const out = join(tempDir(), "data");
      writeDerived(derived, out);
      const got: Record<string, string> = {};
      for (const name of Object.keys(BASELINE)) {
        if (name !== "platforms/*.json") got[name] = sha(readFileSync(join(out, name)));
      }
      const files = readdirSync(join(out, "platforms")).sort();
      expect(files).toHaveLength(244);
      got["platforms/*.json"] = sha(Buffer.concat(files.map((f) => readFileSync(join(out, "platforms", f)))));
      expect(got).toEqual(BASELINE);
    });

    it("AC-3: joint rows stay out of the single-step groups", () => {
      const by = new Map<string, number>();
      for (const d of derived.simulation.durations) if (!d.joint) by.set(d.unit_operation, (by.get(d.unit_operation) ?? 0) + 1);
      expect(by.size).toBe(28);
      expect([...by.values()].reduce((a, b) => a + b, 0)).toBe(404);
      expect([by.get("react_flow"), by.get("react_thermal"), by.get("measure_separation_ms"), by.get("measure_physical")])
        .toEqual([88, 70, 35, 4]);
      for (const uo of ["dispense_solid", "generate_instructions", "purify"]) expect(by.has(uo)).toBe(false);
      expect([...by.values()].filter((n) => n < 10).length).toBe(16);
      for (const d of derived.simulation.durations.filter((x) => x.joint)) {
        expect(d.joint!.step_ids[0]).toBe(d.step_id);
        expect(d.joint!.unit_operations).toHaveLength(d.joint!.step_ids.length);
      }
      const caramelli = derived.simulation.durations.find((d) => d.step_id === "Caramelli2021/P1/S3")!;
      expect(caramelli.joint!.step_ids.at(-1)).toBe("Caramelli2021/P1/S1");
    });
  },
);
