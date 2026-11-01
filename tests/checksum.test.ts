// AC-4: MANIFEST.sha256 verification (REQ-006, REQ-007); SHA-256 helpers used by AC-3.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseManifest, sha256, sha256File, verifyManifest } from "../scripts/lib/checksum";
import { FIXTURE_FILES, manifestFor, sha256Hex, tempDir } from "./fixtures/zip";

function writeTree(dir: string, files: Record<string, string>): void {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
}

describe("sha256", () => {
  it("hashes buffers and files", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "x.txt"), "hello");
    const expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    expect(sha256(Buffer.from("hello"))).toBe(expected);
    expect(sha256File(join(dir, "x.txt"))).toBe(expected);
  });
});

describe("parseManifest", () => {
  it("reads '<hash>  <path>' lines, including the binary-mode '*' marker", () => {
    const h = "a".repeat(64);
    const m = parseManifest(`${h}  core/a.csv\n${h} *core/b.csv\n\n`);
    expect([...m.entries()]).toEqual([
      ["core/a.csv", h],
      ["core/b.csv", h],
    ]);
  });

  it("rejects a malformed line", () => {
    expect(() => parseManifest("nothash core/a.csv\n")).toThrow(/line 1/);
  });

  it("rejects listed paths that escape the folder", () => {
    const h = "b".repeat(64);
    expect(() => parseManifest(`${h}  ../x.csv\n`)).toThrow(/\.\.\/x\.csv/);
    expect(() => parseManifest(`${h}  /etc/passwd\n`)).toThrow(/\/etc\/passwd/);
  });
});

describe("verifyManifest", () => {
  let dir: string;
  beforeEach(() => {
    dir = tempDir();
    writeTree(dir, FIXTURE_FILES);
    writeFileSync(join(dir, "MANIFEST.sha256"), manifestFor(FIXTURE_FILES));
  });

  it("passes when every listed file matches, without MANIFEST listing itself", () => {
    expect(verifyManifest(dir)).toBe(Object.keys(FIXTURE_FILES).length);
  });

  it("fails naming the file whose bytes differ", () => {
    writeFileSync(join(dir, "core/b.csv"), "id,name\n2,BETA\n");
    expect(() => verifyManifest(dir)).toThrow(/core\/b\.csv/);
  });

  it("fails naming a listed file that is missing", () => {
    rmSync(join(dir, "core/a.csv"));
    expect(() => verifyManifest(dir)).toThrow(/missing.*core\/a\.csv/);
  });

  it("fails naming an unlisted file that is present", () => {
    writeFileSync(join(dir, "core/extra.csv"), "x\n");
    expect(() => verifyManifest(dir)).toThrow(/not listed.*core\/extra\.csv/);
  });

  it("fails when MANIFEST.sha256 itself is absent", () => {
    rmSync(join(dir, "MANIFEST.sha256"));
    expect(() => verifyManifest(dir)).toThrow(/MANIFEST\.sha256/);
  });

  it("uses the hash helper consistently with the manifest", () => {
    expect(sha256Hex(FIXTURE_FILES["README.md"]!)).toBe(sha256File(join(dir, "README.md")));
  });
});
