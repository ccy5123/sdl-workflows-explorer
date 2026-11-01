// Verified release -> public/data/*.json, refusing to write anything if a count differs (REQ-009, REQ-011).
import { rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { COUNT_NAMES } from "../src/data/types";
import { loadConfig } from "./lib/config";
import { checkCounts, countDerived, formatProblems } from "./lib/counts";
import { deriveAll, writeDerived } from "./lib/derive";
import { CACHE_DIR, verifiedReleaseDir } from "./fetch-release";

export const OUT_DIR = "public/data";

function main(): void {
  const config = loadConfig();
  rmSync(OUT_DIR, { recursive: true, force: true });
  const releaseDir = verifiedReleaseDir(config, CACHE_DIR);
  const derived = deriveAll(releaseDir);
  const problems = checkCounts(config.counts, derived, releaseDir);
  if (problems.length > 0) {
    throw new Error(`count check failed (${problems.length} differences):\n${formatProblems(problems)}`);
  }
  writeDerived(derived, OUT_DIR);
  const counts = countDerived(derived);
  console.log(`derived release ${derived.index.release.version} into ${OUT_DIR}; counts match release.config.json:`);
  for (const name of COUNT_NAMES) console.log(`  ${name.padEnd(22)} ${counts[name]}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`build-data failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
