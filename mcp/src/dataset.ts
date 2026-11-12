// The pinned release, downloaded and verified on the user's machine, derived with the site's own code and indexed for
// the tools. Nothing here talks to any server other than Zenodo (one download, then the local cache).
import { homedir } from "node:os";
import { join } from "node:path";
import pinJson from "../../release.config.json";
import { validateConfig, type ReleaseConfig } from "../../scripts/lib/config";
import { checkCounts, formatProblems } from "../../scripts/lib/counts";
import { deriveAll, type Derived } from "../../scripts/lib/derive";
import { fetchRelease } from "../../scripts/lib/release";
import type { DurationRow, PaperRow, PlatformGraph, PlatformLayout, PlatformRow } from "../../src/data/types";
import { singleStepGroups } from "../../src/lib/cycleRange";
import type { SearchablePlatform } from "../../src/lib/filterApply";
import { offeredValues, type Offered } from "../../src/lib/filterState";
import { platformSets, type PlatformSets } from "../../src/lib/similarity";
import { catalogOf, type Catalog } from "../../src/lib/workflowState";

export const PACKAGE_VERSION = "0.1.1";
export const USER_AGENT = `sdl-workflows-mcp/${PACKAGE_VERSION} (+https://github.com/ccy5123/sdl-workflows-explorer)`;

/** The release this package version serves, copied from the explorer's release.config.json at build time. */
export const PIN: ReleaseConfig = validateConfig(pinJson);

export interface Dataset {
  pin: ReleaseConfig;
  /** The verified, extracted release folder (for the data card, dictionary and protocol resources). */
  releaseDir: string;
  derived: Derived;
  papers: Map<string, PaperRow>;
  platforms: Map<string, PlatformRow>;
  /** Platform rows with the module names stated in the papers (search.json), as the site's search reads them. */
  searchable: SearchablePlatform[];
  graphs: Map<string, PlatformGraph>;
  layouts: Map<string, PlatformLayout>;
  layoutSets: PlatformSets[];
  catalog: Catalog;
  offered: Offered;
  groups: Map<string, DurationRow[]>;
  jointRows: Map<string, DurationRow>;
}

/** Cache folder: SDL_WORKFLOWS_MCP_CACHE, else %LOCALAPPDATA% on Windows, else $XDG_CACHE_HOME or ~/.cache. */
export function defaultCacheDir(version: string): string {
  const base =
    process.env.SDL_WORKFLOWS_MCP_CACHE ||
    (process.platform === "win32" && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "sdl-workflows-mcp")
      : join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "sdl-workflows-mcp"));
  return join(base, version);
}

/** Indexes a derived release for the tools. */
export function indexDataset(pin: ReleaseConfig, derived: Derived, releaseDir: string): Dataset {
  const graphs = new Map<string, PlatformGraph>();
  for (const file of Object.values(derived.platformFiles)) for (const g of file.platforms) graphs.set(g.platform_id, g);
  const catalog = catalogOf(derived.simulation);
  return {
    pin,
    releaseDir,
    derived,
    papers: new Map(derived.index.papers.map((p) => [p.paper_id, p])),
    platforms: new Map(derived.index.platforms.map((p) => [p.platform_id, p])),
    searchable: derived.index.platforms.map((p) => ({ ...p, module_names: derived.search.module_names[p.platform_id] ?? [] })),
    graphs,
    layouts: new Map(derived.simulation.platforms.map((l) => [l.platform_id, l])),
    layoutSets: derived.simulation.platforms.map((l) => platformSets(l, catalog)),
    catalog,
    offered: offeredValues(derived.index),
    groups: singleStepGroups(derived.simulation.durations),
    jointRows: new Map(derived.simulation.durations.filter((d) => d.joint).map((d) => [d.step_id, d])),
  };
}

export interface LoadOptions {
  pin?: ReleaseConfig;
  cacheDir?: string;
  /** A local copy of the release zip; checked against the pin like a download. Defaults to SDL_RELEASE_ZIP. */
  localZip?: string;
  log?: (message: string) => void;
}

/**
 * Downloads (once) and verifies the pinned release, derives it with the site's deriveAll and refuses to serve when a
 * count differs from the pin.
 */
export async function loadDataset(options: LoadOptions = {}): Promise<Dataset> {
  const pin = options.pin ?? PIN;
  const releaseDir = await fetchRelease({
    config: pin,
    cacheDir: options.cacheDir ?? defaultCacheDir(pin.version),
    localZip: options.localZip ?? (process.env.SDL_RELEASE_ZIP || undefined),
    log: options.log,
    userAgent: USER_AGENT,
  });
  const derived = deriveAll(releaseDir);
  const problems = checkCounts(pin.counts, derived, releaseDir);
  if (problems.length > 0) {
    throw new Error(`release ${pin.version} does not match its pinned counts:\n${formatProblems(problems)}`);
  }
  return indexDataset(pin, derived, releaseDir);
}
