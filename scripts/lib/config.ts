// Load and validate release.config.json (REQ-001, REQ-002). The optional `previous` block pins the release published
// before the pinned one; `npm run fetch-release` fetches it too, and tests/release-docs.test.ts checks that the pinned
// release changes nothing of it except the papers it adds (SPEC-RELEASE-001 REQ-003).
import { readFileSync } from "node:fs";
import { COUNT_NAMES, type Counts } from "../../src/data/types";

/** What identifies one published release file: enough to fetch and verify it. */
export interface ReleasePin {
  version: string;
  doi: string;
  record_id: string;
  file_name: string;
  url: string;
  sha256: string;
}

export interface ReleaseConfig extends ReleasePin {
  counts: Counts;
  /** The release published before the pinned one, when the config names it. */
  previous?: ReleasePin;
}

const STRING_FIELDS: [keyof ReleasePin, RegExp, string][] = [
  ["version", /^\d+\.\d+\.\d+$/, "a version like 1.0.0"],
  ["doi", /^10\.\d{4,9}\/\S+$/, "a DOI like 10.5281/zenodo.123"],
  ["record_id", /^\d+$/, "a string of digits"],
  ["file_name", /^[^/\\]+\.zip$/, "a .zip file name without directories"],
  ["url", /^https:\/\/\S+$/, "an https URL"],
  ["sha256", /^[0-9a-f]{64}$/, "64 lowercase hex characters"],
];

function fail(field: string, problem: string): never {
  throw new Error(`release.config.json: field "${field}" ${problem}`);
}

function validatePin(obj: Record<string, unknown>, prefix: string): ReleasePin {
  const out: Record<string, unknown> = {};
  for (const [field, pattern, expected] of STRING_FIELDS) {
    const value = obj[field];
    if (value === undefined) fail(`${prefix}${field}`, "is missing");
    if (typeof value !== "string" || !pattern.test(value)) fail(`${prefix}${field}`, `must be ${expected}`);
    out[field] = value;
  }
  return out as unknown as ReleasePin;
}

export function validateConfig(raw: unknown): ReleaseConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("release.config.json: the top level must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const out: ReleaseConfig = { ...validatePin(obj, ""), counts: {} as Counts };
  const counts = obj.counts;
  if (counts === undefined) fail("counts", "is missing");
  if (typeof counts !== "object" || counts === null || Array.isArray(counts)) fail("counts", "must be an object");
  const outCounts: Partial<Counts> = {};
  for (const name of COUNT_NAMES) {
    const value = (counts as Record<string, unknown>)[name];
    if (value === undefined) fail(`counts.${name}`, "is missing");
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      fail(`counts.${name}`, "must be a non-negative integer");
    }
    outCounts[name] = value;
  }
  out.counts = outCounts as Counts;
  const previous = obj.previous;
  if (previous !== undefined) {
    if (typeof previous !== "object" || previous === null || Array.isArray(previous)) fail("previous", "must be an object");
    const pin = validatePin(previous as Record<string, unknown>, "previous.");
    if (pin.version === out.version) fail("previous.version", `must differ from the pinned version ${out.version}`);
    if (pin.sha256 === out.sha256) fail("previous.sha256", "must differ from the pinned sha256");
    out.previous = pin;
  }
  return out;
}

export function loadConfig(path = "release.config.json"): ReleaseConfig {
  const text = readFileSync(path, "utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
  return validateConfig(raw);
}
