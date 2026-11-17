// Download (or take a local copy of) the pinned release, verify it in two stages and extract it (the logic is in
// scripts/lib/release.ts). REQ-003 .. REQ-008. When release.config.json names a `previous` release, that one is fetched
// and verified the same way into its own cache folder (PREVIOUS_CACHE_DIR), for tests/release-docs.test.ts.
//   SDL_RELEASE_ZIP=<path>           use this zip for the pinned release instead of downloading it
//   SDL_PREVIOUS_RELEASE_ZIP=<path>  the same for the previous release
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./lib/config";
import { CACHE_DIR, fetchRelease } from "./lib/release";

export { CACHE_DIR, MARKER_NAME, USER_AGENT, fetchRelease, verifiedReleaseDir, type FetchOptions } from "./lib/release";

/** Cache folder of the previous release named in release.config.json (its own zip, extract/ and marker). */
export const PREVIOUS_CACHE_DIR = join(CACHE_DIR, "previous");

async function main(): Promise<void> {
  // Node 20 tries each address for only 250 ms before the next; on high-latency routes every attempt times out.
  setDefaultAutoSelectFamilyAttemptTimeout(2000);
  const config = loadConfig();
  const log = (m: string) => console.log(m);
  const localZip = process.env.SDL_RELEASE_ZIP || undefined;
  const dir = await fetchRelease({ config, cacheDir: CACHE_DIR, localZip, log });
  console.log(`verified release ${config.version} at ${dir}`);
  if (config.previous) {
    const previousZip = process.env.SDL_PREVIOUS_RELEASE_ZIP || undefined;
    const prev = await fetchRelease({ config: config.previous, cacheDir: PREVIOUS_CACHE_DIR, localZip: previousZip, log });
    console.log(`verified previous release ${config.previous.version} at ${prev}`);
  } else {
    console.log("release.config.json names no previous release; the release-to-release check will skip");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
    console.error(`fetch-release failed: ${message}${cause}`);
    process.exit(1);
  });
}
