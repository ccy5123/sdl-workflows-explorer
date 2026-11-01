// AC-3 (tampered zip), AC-7 (download and cache reuse), AC-8 (SDL_RELEASE_ZIP override).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRelease, MARKER_NAME, verifiedReleaseDir } from "../scripts/fetch-release";
import { FIXTURE_FILES, FIXTURE_TOP, fixtureConfig, releaseZip, sha256Hex, tempDir } from "./fixtures/zip";

const zip = releaseZip();
const config = fixtureConfig(zip);

let cacheDir: string;
let fetchMock: ReturnType<typeof vi.fn>;
let logs: string[];
const log = (msg: string) => logs.push(msg);

/** A 200 response carrying the bytes (copied into a plain ArrayBuffer for the DOM BodyInit type). */
function ok(bytes: Uint8Array): Response {
  return new Response(bytes.slice().buffer as ArrayBuffer, { status: 200 });
}

beforeEach(() => {
  cacheDir = join(tempDir(), "release");
  logs = [];
  fetchMock = vi.fn(async () => ok(zip));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("download path and cache reuse (AC-7)", () => {
  it("downloads once from the configured URL, verifies, extracts and writes a marker", async () => {
    const dir = await fetchRelease({ config, cacheDir, log });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(config.url);
    expect(dir).toBe(join(cacheDir, "extract", FIXTURE_TOP));
    expect(readFileSync(join(dir, "core/a.csv"), "utf8")).toBe(FIXTURE_FILES["core/a.csv"]);
    const marker = JSON.parse(readFileSync(join(cacheDir, MARKER_NAME), "utf8"));
    expect(marker).toEqual({ version: "1.0.0", sha256: config.sha256 });
    expect(existsSync(join(cacheDir, config.file_name))).toBe(true);
  });

  it("identifies itself with a User-Agent header (Zenodo answers 403 to the default one)", async () => {
    await fetchRelease({ config, cacheDir, log });
    const init = fetchMock.mock.calls[0]![1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get("user-agent")).toMatch(/^sdl-workflows-explorer\//);
  });

  it("reuses the cache on the second run without fetch and re-runs the MANIFEST check", async () => {
    await fetchRelease({ config, cacheDir, log });
    logs = [];
    const dir = await fetchRelease({ config, cacheDir, log });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dir).toBe(join(cacheDir, "extract", FIXTURE_TOP));
    expect(logs.join("\n")).toMatch(/reusing cached release/);
    expect(logs.join("\n")).toMatch(/MANIFEST verified \(3 files\)/);
  });

  it("fails naming the file when a cached file was altered, and discards the cache", async () => {
    const dir = await fetchRelease({ config, cacheDir, log });
    writeFileSync(join(dir, "core/b.csv"), "tampered\n");
    await expect(fetchRelease({ config, cacheDir, log })).rejects.toThrow(/core\/b\.csv/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(false);
    expect(existsSync(join(cacheDir, "extract"))).toBe(false);
  });

  it("ignores a marker that records a different version and downloads again", async () => {
    await fetchRelease({ config, cacheDir, log });
    writeFileSync(join(cacheDir, MARKER_NAME), JSON.stringify({ version: "0.9.0", sha256: config.sha256 }));
    await fetchRelease({ config, cacheDir, log });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops on an HTTP error", async () => {
    fetchMock.mockImplementation(async () => new Response("gone", { status: 404, statusText: "Not Found" }));
    await expect(fetchRelease({ config, cacheDir, log })).rejects.toThrow(/404/);
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(false);
  });

  it("stops when the downloaded zip's MANIFEST does not match its files", async () => {
    const badManifestZip = releaseZip(FIXTURE_FILES, { manifest: `${"0".repeat(64)}  README.md\n` });
    fetchMock.mockImplementation(async () => ok(badManifestZip));
    const cfg = { ...config, sha256: sha256Hex(badManifestZip) };
    await expect(fetchRelease({ config: cfg, cacheDir, log })).rejects.toThrow(/README\.md/);
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(false);
    expect(existsSync(join(cacheDir, "extract"))).toBe(false);
  });
});

describe("tampered zip (AC-3)", () => {
  const otherZip = releaseZip({ ...FIXTURE_FILES, "README.md": "changed\n" });
  const actual = sha256Hex(otherZip);

  it("refuses a downloaded zip whose hash differs, printing both hashes, with no marker", async () => {
    fetchMock.mockImplementation(async () => ok(otherZip));
    const err = await fetchRelease({ config, cacheDir, log }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(`expected ${config.sha256}`);
    expect((err as Error).message).toContain(`actual ${actual}`);
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(false);
    expect(existsSync(join(cacheDir, "extract"))).toBe(false);
    expect(existsSync(join(cacheDir, config.file_name))).toBe(false);
  });

  it("refuses a local zip whose hash differs and discards an earlier verified extraction", async () => {
    await fetchRelease({ config, cacheDir, log });
    const local = join(tempDir(), "other.zip");
    writeFileSync(local, otherZip);
    await expect(fetchRelease({ config, cacheDir, localZip: local, log })).rejects.toThrow(
      new RegExp(`expected ${config.sha256}[\\s\\S]*actual ${actual}`),
    );
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(false);
    expect(existsSync(join(cacheDir, "extract"))).toBe(false);
  });
});

describe("SDL_RELEASE_ZIP override (AC-8)", () => {
  it("verifies and extracts the local zip without calling fetch", async () => {
    const local = join(tempDir(), "fx.zip");
    writeFileSync(local, zip);
    const dir = await fetchRelease({ config, cacheDir, localZip: local, log });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readFileSync(join(dir, "core/b.csv"), "utf8")).toBe(FIXTURE_FILES["core/b.csv"]);
    expect(existsSync(join(cacheDir, MARKER_NAME))).toBe(true);
  });

  it("fails naming a missing path and does not call fetch", async () => {
    const missing = join(tempDir(), "nope.zip");
    await expect(fetchRelease({ config, cacheDir, localZip: missing, log })).rejects.toThrow(missing);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("verifiedReleaseDir", () => {
  it("fails when no verified extraction exists", () => {
    expect(() => verifiedReleaseDir(config, cacheDir)).toThrow(/no verified release/);
  });

  it("returns the extraction after re-checking the MANIFEST", async () => {
    await fetchRelease({ config, cacheDir, log });
    expect(verifiedReleaseDir(config, cacheDir)).toBe(join(cacheDir, "extract", FIXTURE_TOP));
  });
});
