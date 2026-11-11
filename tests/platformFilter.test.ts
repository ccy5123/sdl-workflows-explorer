// AC-7 and AC-8: platform search on fixture rows and on the real index (REQ-003). The search also reads the module
// names stated in the papers, the readable module types and the readable unit operations, so a reader can search by
// instrument or by step, and says which of those matched.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PlatformRow, SearchJson } from "../src/data/types";
import { filterPlatforms, searchPlatforms } from "../src/lib/platformFilter";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("platformFilter.test.ts");

type Row = PlatformRow & { module_names?: string[] };

const row = (platform_id: string, platform_name: string | null, more: Partial<Row> = {}): Row => ({
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
  ...more,
});

const rows = [
  row("Smith2020/P1", "Chemspeed Swing", { module_names: ["in-line FT-IR (ReactIR 15)"], module_types: ["instrument_optical"] }),
  row("Jones2021/P2", null, { unit_operations: ["react_photo_electro"] }),
  row("Lee2022/P1", "Flow Rig", { module_names: ["HPLC pumps"], module_types: ["fluidics"] }),
];
const ids = (q: string) => filterPlatforms(rows, q).map((r) => r.platform_id);
const reasons = (q: string) => searchPlatforms(rows, q).map((m) => [m.row.platform_id, m.reason]);

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

describe("searchPlatforms: instruments and steps", () => {
  it("matches a module name stated in the paper and names it as the reason", () => {
    expect(reasons("ft-ir")).toEqual([["Smith2020/P1", "Module: in-line FT-IR (ReactIR 15)"]]);
  });

  it("matches the readable module type", () => {
    expect(reasons("optical instrument")).toEqual([["Smith2020/P1", "Module type: Optical instrument"]]);
  });

  it("matches the readable unit operation of a step", () => {
    expect(reasons("photo")).toEqual([["Jones2021/P2", "Step: Photo/electro reaction"]]);
  });

  it("needs every word of the query, each anywhere in the platform", () => {
    expect(reasons("flow hplc")).toEqual([["Lee2022/P1", "Module: HPLC pumps"]]);
    expect(ids("flow ft-ir")).toEqual([]);
  });

  it("gives no reason for a match on the name, id or paper, and lists those first", () => {
    const both = [row("A2020/P1", null, { module_names: ["rig controller"] }), row("B2021/P1", "Rig")];
    expect(searchPlatforms(both, "rig").map((m) => [m.row.platform_id, m.reason])).toEqual([
      ["B2021/P1", null],
      ["A2020/P1", "Module: rig controller"],
    ]);
  });
});

describe.skipIf(!dataAvailable)("filterPlatforms on the real index (AC-8)", () => {
  const search: SearchJson = dataAvailable
    ? JSON.parse(readFileSync(join(import.meta.dirname, "..", "public", "data", "search.json"), "utf8"))
    : { module_names: {} };
  const platforms = dataAvailable
    ? readIndex().platforms.map((p) => ({ ...p, module_names: search.module_names[p.platform_id] ?? [] }))
    : [];

  it("returns all 279 platform rows for an empty filter", () => {
    expect(filterPlatforms(platforms, "")).toHaveLength(279);
  });

  it("returns Aand2024/P1 for aand2024", () => {
    expect(filterPlatforms(platforms, "aand2024").map((r) => r.platform_id)).toEqual(["Aand2024/P1"]);
  });

  it("finds Aand2024/P1 by its in-line FT-IR module", () => {
    const hit = searchPlatforms(platforms, "FT-IR").find((m) => m.row.platform_id === "Aand2024/P1");
    expect(hit?.reason).toMatch(/^Module: .*FT-IR/);
  });
});
