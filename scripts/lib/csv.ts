// CSV reading helpers. Release CSV values are strings; numbers, 0/1 booleans and lists are parsed explicitly.
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export function readCsv(path: string): CsvRow[] {
  return parse(readFileSync(path), { columns: true, bom: true, skip_empty_lines: true }) as CsvRow[];
}

export function toInt(value: string, where: string): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`${where}: expected an integer, got "${value}"`);
  return Number(value);
}

export function toBool01(value: string, where: string): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  throw new Error(`${where}: expected 0 or 1, got "${value}"`);
}

/** `field_tags` use ";", `module_types` and `material_transfer_modes` use "," (see data_dictionary.csv). */
export function splitList(value: string, separator: ";" | ","): string[] {
  return value === "" ? [] : value.split(separator);
}

export function nullIfEmpty(value: string): string | null {
  return value === "" ? null : value;
}
