// SHA-256 baselines of the derived files, one entry per release (keyed by the release zip's SHA-256), kept in
// tests/derived-baselines.json. tests/benchmark-derive.test.ts and tests/simulation-data.test.ts compare the files
// build-data writes for the pinned release with its entry, so a code change that alters them fails; a release with no
// entry skips those cases. `npm run record-baselines` (scripts/record-baselines.ts) records the entry of the pinned
// release from public/data/ once its checks have passed.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const BASELINE_PATH = join(import.meta.dirname, "..", "..", "tests", "derived-baselines.json");

/** The derived files with a baseline; "platforms/*.json" is the hash of the platform files concatenated in name order. */
export const BASELINE_NAMES = [
  "benchmark-items.json",
  "benchmark.json",
  "index.json",
  "release-docs.json",
  "taxonomy.json",
  "platforms/*.json",
] as const;

export interface Baseline {
  version: string;
  files: Record<string, string>;
}

export const BASELINE_HELP =
  "after the pinned release passes its checks, `npm run build-data && npm run record-baselines` records its baseline";

const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

/** Hashes of the baseline files in a folder written by build-data or writeDerived. */
export function hashDerived(dataDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of BASELINE_NAMES) {
    if (name === "platforms/*.json") {
      const files = readdirSync(join(dataDir, "platforms")).sort();
      out[name] = sha(Buffer.concat(files.map((f) => readFileSync(join(dataDir, "platforms", f)))));
    } else out[name] = sha(readFileSync(join(dataDir, name)));
  }
  return out;
}

export function readBaselines(path = BASELINE_PATH): Record<string, Baseline> {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, Baseline>) : {};
}

/** The recorded baseline of the release with this zip SHA-256, or undefined. */
export const baselineFor = (releaseSha256: string, path = BASELINE_PATH): Baseline | undefined => readBaselines(path)[releaseSha256];
