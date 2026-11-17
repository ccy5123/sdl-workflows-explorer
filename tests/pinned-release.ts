// The release pinned in release.config.json, as the tests and e2e specs expect to see it (SPEC-RELEASE-001 REQ-002,
// REQ-003): version, DOI, the folder `fetch-release` extracts it into, and values read from the release itself.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCsv } from "../scripts/lib/csv";

const ROOT = join(import.meta.dirname, "..");
const config = JSON.parse(readFileSync(join(ROOT, "release.config.json"), "utf8")) as { version: string; doi: string };

export const PINNED_VERSION: string = config.version;
export const PINNED_DOI: string = config.doi;

/** Folder of the verified, extracted pinned release (written by `npm run fetch-release`). */
export const PINNED_RELEASE_DIR = join(ROOT, ".cache", "release", "extract", `sdl-workflows-${PINNED_VERSION}`);

/**
 * The two exclusion reasons of the benchmark's excluded papers, as the pinned release states them, in the order of
 * split.csv: the papers added after release 1.1.0 (first in the file), then the development papers.
 */
export function pinnedExclusionReasons(releaseDir: string = PINNED_RELEASE_DIR): [string, string] {
  const reasons = new Set(
    readCsv(join(releaseDir, "modes", "benchmark", "split.csv"))
      .filter((r) => r.split === "excluded")
      .map((r) => r.exclusion_reason!),
  );
  if (reasons.size !== 2) throw new Error(`expected two exclusion reasons, found ${reasons.size}`);
  const [added, development] = [...reasons];
  return [added!, development!];
}
