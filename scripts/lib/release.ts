// Download (or take a local copy of) a pinned release, verify it in two stages and extract it.
// Stage 1: the zip SHA-256 against the pin. Stage 2: every file against MANIFEST.sha256. REQ-003 .. REQ-008.
// Shared by scripts/fetch-release.ts (the site build) and the MCP server in mcp/ (which passes its own cache folder
// and User-Agent). No top-level side effects, so it can be bundled.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256, verifyManifest } from "./checksum";
import type { ReleaseConfig } from "./config";
import { safeExtract } from "./extract";

export const CACHE_DIR = ".cache/release";
export const MARKER_NAME = "verified.json";
// Zenodo answers 403 to Node's default "node" User-Agent; a descriptive one is accepted.
export const USER_AGENT = "sdl-workflows-explorer/0.1.0 (+https://github.com/ccy5123/sdl-workflows-explorer)";

export interface FetchOptions {
  config: ReleaseConfig;
  /** Holds the downloaded zip, `extract/<top>/` and the marker file. */
  cacheDir: string;
  /** Path given by SDL_RELEASE_ZIP; when set it is always used and verified, never the network. */
  localZip?: string;
  log?: (message: string) => void;
  /** User-Agent sent to Zenodo; defaults to USER_AGENT. */
  userAgent?: string;
}

interface Marker {
  version: string;
  sha256: string;
}

function topFolder(config: ReleaseConfig): string {
  return config.file_name.replace(/\.zip$/, "");
}

function extractedDir(config: ReleaseConfig, cacheDir: string): string {
  return join(cacheDir, "extract", topFolder(config));
}

function readMarker(cacheDir: string): Marker | null {
  const path = join(cacheDir, MARKER_NAME);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Marker;
  } catch {
    return null;
  }
}

function markerMatches(config: ReleaseConfig, cacheDir: string): boolean {
  const marker = readMarker(cacheDir);
  return marker !== null && marker.version === config.version && marker.sha256 === config.sha256;
}

/** Removes the marker first, then the extraction, so a half-removed cache is never taken as verified. */
function discardVerified(cacheDir: string): void {
  rmSync(join(cacheDir, MARKER_NAME), { force: true });
  rmSync(join(cacheDir, "extract"), { recursive: true, force: true });
  rmSync(join(cacheDir, "extract.tmp"), { recursive: true, force: true });
}

async function download(
  config: ReleaseConfig,
  cacheDir: string,
  log: (m: string) => void,
  userAgent: string,
): Promise<Uint8Array> {
  log(`downloading ${config.url}`);
  const response = await fetch(config.url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status} ${response.statusText} for ${config.url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(join(cacheDir, config.file_name), bytes);
  return bytes;
}

/** Returns the verified release folder (`<cacheDir>/extract/<top>`). Throws on any verification failure. */
export async function fetchRelease(options: FetchOptions): Promise<string> {
  const { config, cacheDir, localZip } = options;
  const log = options.log ?? (() => {});
  const dir = extractedDir(config, cacheDir);
  mkdirSync(cacheDir, { recursive: true });

  if (localZip === undefined && markerMatches(config, cacheDir)) {
    log(`reusing cached release ${config.version} in ${dir}`);
    try {
      const n = verifyManifest(dir);
      log(`MANIFEST verified (${n} files)`);
      return dir;
    } catch (error) {
      discardVerified(cacheDir);
      throw error;
    }
  }

  let zip: Uint8Array;
  if (localZip !== undefined) {
    if (!existsSync(localZip)) throw new Error(`SDL_RELEASE_ZIP file not found: ${localZip}`);
    log(`using local zip ${localZip}`);
    zip = new Uint8Array(readFileSync(localZip));
  } else {
    zip = await download(config, cacheDir, log, options.userAgent ?? USER_AGENT);
  }

  discardVerified(cacheDir);
  const actual = sha256(zip);
  if (actual !== config.sha256) {
    rmSync(join(cacheDir, config.file_name), { force: true });
    throw new Error(
      `SHA-256 mismatch for ${config.file_name}:\n  expected ${config.sha256}\n  actual ${actual}`,
    );
  }
  log(`zip SHA-256 verified (${actual})`);

  const tmp = join(cacheDir, "extract.tmp");
  try {
    safeExtract(zip, tmp, topFolder(config));
    const n = verifyManifest(join(tmp, topFolder(config)));
    log(`MANIFEST verified (${n} files)`);
    renameSync(tmp, join(cacheDir, "extract"));
  } catch (error) {
    discardVerified(cacheDir);
    throw error;
  }
  const marker: Marker = { version: config.version, sha256: config.sha256 };
  writeFileSync(join(cacheDir, MARKER_NAME), `${JSON.stringify(marker)}\n`);
  return dir;
}

/** The verified extraction for build-data; re-runs the MANIFEST check. */
export function verifiedReleaseDir(config: ReleaseConfig, cacheDir: string): string {
  if (!markerMatches(config, cacheDir)) {
    throw new Error(`no verified release ${config.version} in ${cacheDir}; run npm run fetch-release first`);
  }
  const dir = extractedDir(config, cacheDir);
  verifyManifest(dir);
  return dir;
}
