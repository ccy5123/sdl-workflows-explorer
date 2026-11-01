// SHA-256 helpers and MANIFEST.sha256 verification (REQ-005, REQ-006, REQ-007).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MANIFEST_NAME = "MANIFEST.sha256";

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

/** True when a relative archive path is absolute, has a drive letter, a backslash or a `..` segment. */
export function isUnsafePath(path: string): boolean {
  return (
    path.startsWith("/") ||
    /^[A-Za-z]:/.test(path) ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "..")
  );
}

/** Parses `<sha256>  <path>` lines (sha256sum format) into path -> hash. */
export function parseManifest(text: string): Map<string, string> {
  const entries = new Map<string, string>();
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.trim() === "") return;
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!match) throw new Error(`${MANIFEST_NAME}: malformed line ${i + 1}: ${line}`);
    const [, hash, path] = match as unknown as [string, string, string];
    if (isUnsafePath(path)) throw new Error(`${MANIFEST_NAME}: unsafe path ${path}`);
    entries.set(path, hash);
  });
  return entries;
}

function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(dir, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Checks every file listed in `<dir>/MANIFEST.sha256` against its hash. Listed paths are relative to `dir`.
 * The manifest itself is exempt; a file present but not listed fails. Returns the number of files checked.
 */
export function verifyManifest(dir: string): number {
  const manifestPath = join(dir, MANIFEST_NAME);
  if (!existsSync(manifestPath)) throw new Error(`${MANIFEST_NAME} not found in ${dir}`);
  const listed = parseManifest(readFileSync(manifestPath, "utf8"));
  const problems: string[] = [];
  for (const [path, expected] of listed) {
    const full = join(dir, path);
    if (!existsSync(full)) {
      problems.push(`missing file: ${path}`);
      continue;
    }
    const actual = sha256File(full);
    if (actual !== expected) problems.push(`hash mismatch: ${path} (expected ${expected}, actual ${actual})`);
  }
  for (const path of listFiles(dir)) {
    if (path !== MANIFEST_NAME && !listed.has(path)) problems.push(`file not listed in ${MANIFEST_NAME}: ${path}`);
  }
  if (problems.length > 0) {
    throw new Error(`MANIFEST check failed in ${dir}:\n  ${problems.join("\n  ")}`);
  }
  return listed.size;
}
