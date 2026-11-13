// SPEC-TECH-001 AC-2, AC-7: the build checks of the tag table, on a hand-made release of two platforms.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PlatformFile } from "../src/data/types";
import { buildTechniques, checkOverlay, modulesNeedingRows, parseTagTable, parseVocabulary, type Overlay } from "../scripts/lib/techniques";

const vocabulary = parseVocabulary(readFileSync(join(import.meta.dirname, "..", "data-overlay", "techniques.json"), "utf8"));
const ev = { doc: "main", page: 3, locator: "Fig. 1" };
const mod = (id: string, type: string, name: string) => ({ module_id: id, module_type: type, name_in_paper: name, on_platform: true, unmapped_note: null, evidence: ev });
const files: Record<string, PlatformFile> = {
  A2024: {
    paper_id: "A2024",
    platforms: [
      {
        platform_id: "A2024/P1", paper_id: "A2024", doi: "10.1/a", first_public_year: 2024, field_tags: [], name: null,
        commercial_integrated: false, identity_id: "A2024/P1", evidence: ev, steps: [], connections: [], campaigns: null, shared_with: [],
        modules: [mod("A2024/P1/M1", "fluidics", "HPLC pumps"), mod("A2024/P1/M2", "instrument_optical", "in-line FT-IR"), mod("A2024/P1/M3", "thermal_unit", "IR lamp"), mod("A2024/P1/M4", "mixer", "stirrer")],
      },
    ],
  },
};
const table = (lines: string[]) => parseTagTable(["module_id,techniques,name_in_paper", ...lines].join("\n"), vocabulary);
const good = ["A2024/P1/M1,none,HPLC pumps", "A2024/P1/M2,ir_spectroscopy,in-line FT-IR", "A2024/P1/M3,none,IR lamp"];
const overlay = (lines: string[]): Overlay => ({ vocabulary, rows: table(lines) });

describe("tag table checks (REQ-003)", () => {
  it("requires a row for every instrument_* module and every module whose name contains an alias, and only those", () => {
    expect(modulesNeedingRows({ platformFiles: files }, vocabulary).map((m) => m.module_id)).toEqual(["A2024/P1/M1", "A2024/P1/M2", "A2024/P1/M3"]);
  });

  it("accepts a fitting table and builds techniques.json with evidence", () => {
    const t = buildTechniques({ platformFiles: files }, overlay(good));
    expect(t.modules).toEqual([{ platform_id: "A2024/P1", module_id: "A2024/P1/M2", techniques: ["ir_spectroscopy"], name: "in-line FT-IR", evidence: "main · p. 3 · Fig. 1" }]);
    expect(t.provenance).toMatch(/language model/);
    expect(t.provenance).not.toMatch(/checked by/);
  });

  it("fails on (a) an unknown module, (c) a stale name, (d) a missing row and (e) a duplicate", () => {
    expect(() => checkOverlay({ platformFiles: files }, overlay([...good, "A2024/P9/M1,none,x"]))).toThrow(/A2024\/P9\/M1 is not a module/);
    expect(() => checkOverlay({ platformFiles: files }, overlay([good[0]!, "A2024/P1/M2,ir_spectroscopy,FT-IR", good[2]!]))).toThrow(/differs from the release/);
    expect(() => checkOverlay({ platformFiles: files }, overlay(good.slice(0, 2)))).toThrow(/A2024\/P1\/M3 \(thermal_unit; aliases in name: IR\) has no row/);
    expect(() => checkOverlay({ platformFiles: files }, overlay([...good, good[0]!]))).toThrow(/appears twice/);
  });

  it("fails on (b) an unknown technique, none with a technique, and an empty cell", () => {
    expect(() => table(["A2024/P1/M2,ir,in-line FT-IR"])).toThrow(/"ir" is not a technique/);
    expect(() => table(["A2024/P1/M2,none;ir_spectroscopy,in-line FT-IR"])).toThrow(/none is combined/);
    expect(() => table(["A2024/P1/M2,,in-line FT-IR"])).toThrow(/write none/);
  });
});

describe("the committed table on the real vocabulary", () => {
  it("parses, and lists the IR false positives of the brief as none", () => {
    const rows = parseTagTable(readFileSync(join(import.meta.dirname, "..", "data-overlay", "module-techniques.csv"), "utf8"), vocabulary);
    const byName = (needle: string) => rows.filter((r) => r.name_in_paper.toLowerCase().includes(needle));
    for (const r of [...byName("ir lamp"), ...byName("infrared thermometer"), ...byName("ir sensors")]) {
      expect(r.techniques, `${r.module_id} ${r.name_in_paper}`).not.toContain("ir_spectroscopy");
    }
  });
});
