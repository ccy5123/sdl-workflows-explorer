// CSV helpers: quoted fields and explicit parsing of string-typed numbers, booleans and lists.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nullIfEmpty, readCsv, splitList, toBool01, toInt } from "../scripts/lib/csv";
import { tempDir } from "./fixtures/zip";

describe("csv helpers", () => {
  it("reads rows keyed by header, keeping quoted commas", () => {
    const path = join(tempDir(), "x.csv");
    writeFileSync(path, '﻿id,name\n1,"a, b"\n2,\n');
    expect(readCsv(path)).toEqual([
      { id: "1", name: "a, b" },
      { id: "2", name: "" },
    ]);
  });

  it("parses integers strictly", () => {
    expect(toInt("2024", "year")).toBe(2024);
    expect(() => toInt("", "x.csv row 3 year")).toThrow(/x\.csv row 3 year/);
    expect(() => toInt("2.5", "year")).toThrow(/year/);
  });

  it("parses 0/1 booleans strictly", () => {
    expect(toBool01("1", "b")).toBe(true);
    expect(toBool01("0", "b")).toBe(false);
    expect(() => toBool01("true", "flag")).toThrow(/flag/);
  });

  it("splits list fields on the given delimiter, empty to []", () => {
    expect(splitList("a;b", ";")).toEqual(["a", "b"]);
    expect(splitList("a,b", ",")).toEqual(["a", "b"]);
    expect(splitList("", ",")).toEqual([]);
  });

  it("maps empty strings to null", () => {
    expect(nullIfEmpty("")).toBeNull();
    expect(nullIfEmpty("x")).toBe("x");
  });
});
