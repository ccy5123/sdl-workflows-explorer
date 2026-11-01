// AC-7 and AC-8: platform list filter on fixture rows and on the real index (REQ-003).
import { describe, expect, it } from "vitest";
import type { PlatformRow } from "../src/data/types";
import { filterPlatforms } from "../src/lib/platformFilter";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("platformFilter.test.ts");

const row = (platform_id: string, platform_name: string | null): PlatformRow => ({
  platform_id,
  paper_id: platform_id.split("/")[0]!,
  platform_name,
  first_public_year: 2021,
  field_tags: [],
  commercial_integrated: false,
  identity_id: platform_id,
  n_modules: 1,
  n_steps: 1,
  module_types: [],
  material_transfer_modes: [],
  unit_operations: [],
});

const rows = [row("Smith2020/P1", "Chemspeed Swing"), row("Jones2021/P2", null), row("Lee2022/P1", "Flow Rig")];
const ids = (q: string) => filterPlatforms(rows, q).map((r) => r.platform_id);

describe("filterPlatforms (AC-7)", () => {
  it("returns all rows for an empty or blank query", () => {
    expect(ids("")).toHaveLength(3);
    expect(ids("   ")).toHaveLength(3);
  });

  it("matches the platform id case-insensitively", () => {
    expect(ids("p2")).toEqual(["Jones2021/P2"]);
  });

  it("matches the name case-insensitively and ignores null names", () => {
    expect(ids("chemSPEED")).toEqual(["Smith2020/P1"]);
    expect(ids("null")).toEqual([]);
  });

  it("matches the paper id case-insensitively", () => {
    expect(ids("LEE2022")).toEqual(["Lee2022/P1"]);
  });
});

describe.skipIf(!dataAvailable)("filterPlatforms on the real index (AC-8)", () => {
  const platforms = dataAvailable ? readIndex().platforms : [];

  it("returns all 280 platform rows for an empty filter", () => {
    expect(filterPlatforms(platforms, "")).toHaveLength(280);
  });

  it("returns Aand2024/P1 for 'aand2024'", () => {
    expect(filterPlatforms(platforms, "aand2024").map((r) => r.platform_id)).toEqual(["Aand2024/P1"]);
  });
});
