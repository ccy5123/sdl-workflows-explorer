// AC-5: unsafe archive paths are refused before anything is written (REQ-007).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { safeExtract } from "../scripts/lib/extract";
import { FIXTURE_FILES, FIXTURE_TOP, releaseZip, tempDir } from "./fixtures/zip";

describe("safeExtract", () => {
  it("extracts every entry of a well-formed archive under the destination", () => {
    const dest = join(tempDir(), "out");
    const n = safeExtract(releaseZip(), dest, FIXTURE_TOP);
    expect(n).toBe(Object.keys(FIXTURE_FILES).length + 1);
    expect(readFileSync(join(dest, FIXTURE_TOP, "core/a.csv"), "utf8")).toBe(FIXTURE_FILES["core/a.csv"]);
  });

  it("skips directory entries", () => {
    const dest = join(tempDir(), "out");
    const zip = zipSync({ [`${FIXTURE_TOP}/sub/`]: new Uint8Array(0), [`${FIXTURE_TOP}/sub/x.txt`]: strToU8("x") });
    expect(safeExtract(zip, dest, FIXTURE_TOP)).toBe(1);
  });

  it.each([
    ["../evil.txt", /\.\.\/evil\.txt/],
    ["/abs.txt", /\/abs\.txt/],
    ["other/x.txt", /other\/x\.txt/],
    [`${FIXTURE_TOP}/../../evil2.txt`, /evil2\.txt/],
    [`${FIXTURE_TOP}\\..\\win.txt`, /win\.txt/],
    ["C:/drive.txt", /C:\/drive\.txt/],
  ])("refuses entry %s and writes nothing", (name, message) => {
    const root = tempDir();
    const dest = join(root, "out");
    const zip = releaseZip(FIXTURE_FILES, { extra: { [name]: "pwned" } });
    expect(() => safeExtract(zip, dest, FIXTURE_TOP)).toThrow(message);
    expect(existsSync(dest)).toBe(false);
    expect(readdirSync(root)).toEqual([]);
    expect(existsSync(join(root, "..", "evil.txt"))).toBe(false);
  });
});
