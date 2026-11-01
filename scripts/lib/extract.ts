// Safe unzip: every entry is checked before any file is written (REQ-006, REQ-007).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { unzipSync } from "fflate";
import { isUnsafePath } from "./checksum";

/**
 * Extracts `zip` into `destDir`. Every entry must sit under `topFolder/` and must not be absolute or contain a
 * `..` segment; otherwise nothing is written and an error names the entry. Returns the number of files written.
 */
export function safeExtract(zip: Uint8Array, destDir: string, topFolder: string): number {
  const entries = unzipSync(zip);
  const root = resolve(destDir);
  const files: [string, Uint8Array][] = [];
  for (const [name, data] of Object.entries(entries)) {
    if (isUnsafePath(name)) throw new Error(`unsafe archive entry: ${name}`);
    if (!name.startsWith(`${topFolder}/`)) throw new Error(`archive entry outside ${topFolder}/: ${name}`);
    const target = resolve(root, name);
    if (!target.startsWith(root + sep)) throw new Error(`unsafe archive entry: ${name}`);
    if (!name.endsWith("/")) files.push([target, data]);
  }
  for (const [target, data] of files) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
  return files.length;
}
