// Builds small release-shaped zips in memory for tests (no committed binaries).
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import type { ReleaseConfig } from "../../scripts/lib/config";

export const FIXTURE_TOP = "fx-1.0.0";

export const FIXTURE_FILES: Record<string, string> = {
  "README.md": "fixture release\n",
  "core/a.csv": "id,name\n1,alpha\n",
  "core/b.csv": "id,name\n2,beta\n",
};

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function manifestFor(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([path, body]) => `${sha256Hex(body)}  ${path}\n`)
    .join("");
}

/** A zip with every entry under `top/`, including a MANIFEST.sha256 that lists the files. */
export function releaseZip(
  files: Record<string, string> = FIXTURE_FILES,
  options: { top?: string; manifest?: string; extra?: Record<string, string> } = {},
): Uint8Array {
  const top = options.top ?? FIXTURE_TOP;
  const entries: Record<string, Uint8Array> = {};
  for (const [path, body] of Object.entries(files)) entries[`${top}/${path}`] = strToU8(body);
  entries[`${top}/MANIFEST.sha256`] = strToU8(options.manifest ?? manifestFor(files));
  for (const [name, body] of Object.entries(options.extra ?? {})) entries[name] = strToU8(body);
  return zipSync(entries);
}

export function tempDir(prefix = "sdl-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function fixtureConfig(zip: Uint8Array): ReleaseConfig {
  return {
    version: "1.0.0",
    doi: "10.5281/zenodo.1",
    record_id: "1",
    file_name: `${FIXTURE_TOP}.zip`,
    url: "https://example.test/records/1/files/fx-1.0.0.zip/content",
    sha256: sha256Hex(zip),
    counts: {
      papers: 0,
      platforms: 0,
      modules: 0,
      steps: 0,
      connections: 0,
      material_connections: 0,
      candidates: 0,
    },
  };
}
