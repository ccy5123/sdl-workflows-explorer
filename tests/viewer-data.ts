// Loads the real public/data/ written by `npm run build-data`, or reports why it is absent (SPEC-VIEW-001 AC-2/6/8).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IndexJson, TaxonomyJson } from "../src/data/types";

const DATA_DIR = join(import.meta.dirname, "..", "public", "data");

export const dataAvailable = existsSync(join(DATA_DIR, "index.json")) && existsSync(join(DATA_DIR, "taxonomy.json"));

export function warnIfMissing(file: string): void {
  if (!dataAvailable) {
    console.warn(`${file}: real-data tests skipped: public/data/ is absent (run \`npm run build-data\`)`);
  }
}

export function readIndex(): IndexJson {
  return JSON.parse(readFileSync(join(DATA_DIR, "index.json"), "utf8")) as IndexJson;
}

export function readTaxonomy(): TaxonomyJson {
  return JSON.parse(readFileSync(join(DATA_DIR, "taxonomy.json"), "utf8")) as TaxonomyJson;
}
