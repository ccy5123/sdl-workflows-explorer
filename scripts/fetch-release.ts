// Download (or take a local copy of) the pinned release, verify it in two stages and extract it (the logic is in
// scripts/lib/release.ts). REQ-003 .. REQ-008.
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./lib/config";
import { CACHE_DIR, fetchRelease } from "./lib/release";

export { CACHE_DIR, MARKER_NAME, USER_AGENT, fetchRelease, verifiedReleaseDir, type FetchOptions } from "./lib/release";

async function main(): Promise<void> {
  // Node 20 tries each address for only 250 ms before the next; on high-latency routes every attempt times out.
  setDefaultAutoSelectFamilyAttemptTimeout(2000);
  const config = loadConfig();
  const localZip = process.env.SDL_RELEASE_ZIP || undefined;
  const dir = await fetchRelease({ config, cacheDir: CACHE_DIR, localZip, log: (m) => console.log(m) });
  console.log(`verified release ${config.version} at ${dir}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : "";
    console.error(`fetch-release failed: ${message}${cause}`);
    process.exit(1);
  });
}
