// The release pinned in release.config.json, as the tests and e2e specs expect to see it (SPEC-RELEASE-001 REQ-002,
// REQ-003): version, DOI, the folder `fetch-release` extracts it into, values read from the release itself, and the
// previous release when the config names one.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCsv } from "../scripts/lib/csv";

const ROOT = join(import.meta.dirname, "..");
interface Pin {
  version: string;
  doi: string;
  sha256: string;
  file_name: string;
}
const config = JSON.parse(readFileSync(join(ROOT, "release.config.json"), "utf8")) as Pin & { previous?: Pin };

export const PINNED_VERSION: string = config.version;
export const PINNED_DOI: string = config.doi;
export const PINNED_SHA256: string = config.sha256;

/** Folder of the verified, extracted pinned release (written by `npm run fetch-release`). */
export const PINNED_RELEASE_DIR = join(ROOT, ".cache", "release", "extract", `sdl-workflows-${PINNED_VERSION}`);

/** The previous release named in release.config.json (`previous`), or null when the config names none. */
export const PREVIOUS_VERSION: string | null = config.previous?.version ?? null;
export const PREVIOUS_SHA256: string | null = config.previous?.sha256 ?? null;

/** Folder of the verified, extracted previous release (written by `npm run fetch-release`), or null. */
export const PREVIOUS_RELEASE_DIR: string | null = config.previous
  ? join(ROOT, ".cache", "release", "previous", "extract", config.previous.file_name.replace(/\.zip$/, ""))
  : null;

/** True when `fetch-release` has verified the previous release named in the config (its marker matches the pin). */
export function previousReleaseAvailable(): boolean {
  if (!config.previous || !PREVIOUS_RELEASE_DIR) return false;
  const marker = join(ROOT, ".cache", "release", "previous", "verified.json");
  if (!existsSync(marker) || !existsSync(PREVIOUS_RELEASE_DIR)) return false;
  try {
    const m = JSON.parse(readFileSync(marker, "utf8")) as { version: string; sha256: string };
    return m.version === config.previous.version && m.sha256 === config.previous.sha256;
  } catch {
    return false;
  }
}

/**
 * The exclusion reasons of the benchmark's excluded papers, as the pinned release states them, in their order in
 * split.csv, with the number of papers under each.
 */
export function pinnedExclusionReasons(releaseDir: string = PINNED_RELEASE_DIR): { reason: string; n: number }[] {
  const n = new Map<string, number>();
  for (const r of readCsv(join(releaseDir, "modes", "benchmark", "split.csv"))) {
    if (r.split === "excluded") n.set(r.exclusion_reason!, (n.get(r.exclusion_reason!) ?? 0) + 1);
  }
  return [...n].map(([reason, count]) => ({ reason, n: count }));
}
