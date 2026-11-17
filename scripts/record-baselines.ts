// Records the SHA-256 baseline of the derived files of the pinned release (public/data/, written by build-data) into
// tests/derived-baselines.json, under the release zip's SHA-256 (scripts/lib/baselines.ts). Run it once a newly pinned
// release has passed typecheck, the unit tests and the e2e specs, and commit the file with the pin: later code changes
// that alter the derived files then fail tests/benchmark-derive.test.ts and tests/simulation-data.test.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { IndexJson } from "../src/data/types";
import { BASELINE_PATH, hashDerived, readBaselines } from "./lib/baselines";
import { loadConfig } from "./lib/config";
import { OUT_DIR } from "./build-data";

function main(): void {
  const config = loadConfig();
  const index = JSON.parse(readFileSync(join(OUT_DIR, "index.json"), "utf8")) as IndexJson;
  if (index.release.version !== config.version) {
    throw new Error(`${OUT_DIR} holds release ${index.release.version}, the config pins ${config.version}; run npm run build-data`);
  }
  const all = readBaselines();
  const files = hashDerived(OUT_DIR);
  const before = all[config.sha256];
  all[config.sha256] = { version: config.version, files };
  const sorted = Object.fromEntries(Object.entries(all).sort(([, a], [, b]) => a.version.localeCompare(b.version, "en", { numeric: true })));
  writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  const changed = before ? Object.keys(files).filter((k) => before.files[k] !== files[k]) : Object.keys(files);
  console.log(`recorded the baseline of release ${config.version} in ${BASELINE_PATH} (${before ? `changed: ${changed.join(", ") || "none"}` : "new"})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`record-baselines failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
