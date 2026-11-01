// SPEC-TAXO-001 AC-1 to AC-3 on the real 1.0.0 release: unit operations on platform rows, per-class counts and
// examples, structured correspondence, vocabularies, sources and relations (REQ-001 to REQ-003). The expected numbers
// are those printed by .moai/specs/SPEC-TAXO-001/expected-counts.mjs. Uses the verified cache in .cache/release/, or
// SDL_RELEASE_ZIP; skips with a message only when neither is available, as release.test.ts does.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CACHE_DIR, fetchRelease, MARKER_NAME } from "../scripts/fetch-release";
import { loadConfig } from "../scripts/lib/config";
import { readCsv } from "../scripts/lib/csv";
import { deriveAll, type Derived } from "../scripts/lib/derive";
import type { TaxonomyClass } from "../src/data/types";
import { tempDir } from "./fixtures/zip";

const config = loadConfig();
const localZip = process.env.SDL_RELEASE_ZIP || undefined;
const available = localZip !== undefined || existsSync(join(CACHE_DIR, MARKER_NAME));
if (!available) {
  console.warn(
    "taxonomy-derive.test.ts skipped: no verified cache in .cache/release/ and SDL_RELEASE_ZIP is not set " +
      "(run `npm run fetch-release` or set SDL_RELEASE_ZIP=<path to sdl-workflows-1.0.0.zip>)",
  );
}

describe.skipIf(!available)("SPEC-TAXO-001 on the real release 1.0.0", () => {
  let releaseDir: string;
  let d: Derived;
  const cls = (kind: string, name: string): TaxonomyClass =>
    d.taxonomy.classes.find((c) => c.class_kind === kind && c.class === name)!;

  beforeAll(async () => {
    const cacheDir = localZip ? join(tempDir(), "release") : CACHE_DIR;
    releaseDir = await fetchRelease({ config, cacheDir, localZip });
    d = deriveAll(releaseDir);
  });

  it("AC-1: every platform row has 4 to 15 unit operations, 2155 in all, covering the 31 classes", () => {
    const lists = d.index.platforms.map((l) => l.unit_operations);
    expect(lists).toHaveLength(280);
    expect(Math.min(...lists.map((l) => l.length))).toBe(4);
    expect(Math.max(...lists.map((l) => l.length))).toBe(15);
    expect(lists.reduce((n, l) => n + l.length, 0)).toBe(2155);
    expect(d.index.platforms.find((l) => l.platform_id === "Aand2024/P1")!.unit_operations).toEqual([
      "analyze_data", "dispense_liquid", "handle_sample", "measure_optical", "plan_next_experiment", "react_photo_electro",
    ]);
    const union = [...new Set(lists.flat())].sort();
    const uoClasses = readCsv(join(releaseDir, "modes/taxonomy/classes.csv"))
      .filter((r) => r.class_kind === "unit_operation")
      .map((r) => r.class!)
      .sort();
    expect(union).toEqual(uoClasses);
    expect(union).toHaveLength(31);
    expect(union[0]).toBe("analyze_data");
    expect(union.at(-1)).toBe("wash_extract");
    expect(union).toContain("unmapped");
  });

  it("AC-2: classes per kind in classes.csv order and unchanged item sums", () => {
    const classes = d.taxonomy.classes;
    expect(classes.map((c) => `${c.class_kind}/${c.class}`)).toEqual(
      readCsv(join(releaseDir, "modes/taxonomy/classes.csv")).map((r) => `${r.class_kind}/${r.class}`),
    );
    const byKind = (kind: string) => classes.filter((c) => c.class_kind === kind);
    expect([byKind("field_tag"), byKind("module_type"), byKind("transfer_mode"), byKind("unit_operation")].map((k) => k.length)).toEqual([
      10, 22, 6, 31,
    ]);
    const sum = (kind: string) => byKind(kind).reduce((n, c) => n + c.n_items, 0);
    expect([sum("field_tag"), sum("module_type"), sum("transfer_mode"), sum("unit_operation")]).toEqual([270, 1603, 1687, 2621]);
  });

  it("AC-2: n_items / n_platforms / n_papers of the chosen classes", () => {
    const table: [string, string, number, number, number][] = [
      ["field_tag", "catalysis", 23, 23, 23],
      ["field_tag", "chemistry_synthesis", 85, 123, 85],
      ["field_tag", "unmapped", 0, 0, 0],
      ["module_type", "flow_reactor", 139, 127, 99],
      ["module_type", "software", 358, 280, 238],
      ["module_type", "assembly_unit", 4, 4, 4],
      ["transfer_mode", "data_transfer", 611, 280, 238],
      ["transfer_mode", "mobile_robot", 42, 9, 9],
      ["transfer_mode", "unmapped", 7, 6, 6],
      ["unit_operation", "sonicate", 11, 5, 5],
      ["unit_operation", "dispense_liquid", 427, 248, 209],
      ["unit_operation", "unmapped", 45, 39, 37],
    ];
    for (const [kind, name, items, platforms, papers] of table) {
      const c = cls(kind, name);
      expect([`${kind}/${name}`, c.n_items, c.n_platforms, c.n_papers]).toEqual([`${kind}/${name}`, items, platforms, papers]);
    }
  });

  it("AC-2: examples, ties in platform id order, and the classes with fewer than five", () => {
    const ex = (kind: string, name: string) => cls(kind, name).examples.map((e) => [e.platform_id, e.n]);
    expect(ex("module_type", "flow_reactor")).toEqual([
      ["Bedard2018/P11", 3], ["Nambiar2022/P2", 3], ["AbdelLatif2021/P1", 2], ["Bedard2018/P10", 2], ["Bedard2018/P6", 2],
    ]);
    expect(ex("module_type", "assembly_unit")).toEqual([["Dai2025/P1", 1], ["Gao2026/P1", 1], ["Toyama2025/P1", 1], ["Yik2025/P1", 1]]);
    expect(ex("unit_operation", "sonicate")).toEqual([
      ["Zhao2026/P1", 6], ["Pilz2023/P1", 2], ["Dave2022/P1", 1], ["Kim2026/P1", 1], ["Yang2026a/P1", 1],
    ]);
    expect(ex("transfer_mode", "mobile_robot")).toEqual([
      ["Song2025/P1", 7], ["Wang2026a/P1", 7], ["Zhu2024/P1", 7], ["Burger2020/P1", 6], ["Yang2026a/P1", 5],
    ]);
    expect(ex("field_tag", "catalysis")).toEqual([
      ["Amara2015/P1", null], ["Bai2023a/P1", null], ["Baumgartner2019/P1", null], ["Bennett2024/P1", null], ["Brody2026/P1", null],
    ]);
    expect(ex("field_tag", "unmapped")).toEqual([]);
    expect(
      d.taxonomy.classes.filter((c) => c.examples.length < 5).map((c) => `${c.class_kind}/${c.class}:${c.examples.length}`),
    ).toEqual(["field_tag/unmapped:0", "module_type/assembly_unit:4", "module_type/commercial_integrated:4"]);
    expect(cls("module_type", "flow_reactor").examples[0]!.platform_name).toBe(
      "Reconfigurable continuous-flow system, ketene generation and [2+2] cycloaddition configuration",
    );
  });

  it("AC-3: which classes have a correspondence, and no raw rows at the top level", () => {
    const withCorr = d.taxonomy.classes.filter((c) => c.correspondence !== null);
    expect(withCorr).toHaveLength(56);
    const perKind = (kind: string) => withCorr.filter((c) => c.class_kind === kind).length;
    expect([perKind("field_tag"), perKind("module_type"), perKind("transfer_mode"), perKind("unit_operation")]).toEqual([0, 21, 5, 30]);
    const nulls = d.taxonomy.classes.filter((c) => c.correspondence === null).map((c) => `${c.class_kind}/${c.class}`);
    expect(nulls).toHaveLength(13);
    expect(nulls.filter((n) => !n.startsWith("field_tag/"))).toEqual(["module_type/unmapped", "transfer_mode/unmapped", "unit_operation/unmapped"]);
    expect("correspondence" in d.taxonomy).toBe(false);
  });

  it("AC-3: vocabularies with their kinds and source keys", () => {
    const all3 = ["module_type", "transfer_mode", "unit_operation"];
    expect(d.taxonomy.vocabularies).toEqual([
      { vocabulary: "XDL", kinds: all3, source_keys: ["Mehr2020"] },
      { vocabulary: "WCSO", kinds: all3, source_keys: ["Schilling2026"] },
      { vocabulary: "Leong2022", kinds: all3, source_keys: ["Leong2022"] },
      { vocabulary: "OntoLab_SAREF", kinds: ["module_type"], source_keys: ["Bai2024"] },
      { vocabulary: "Gottstein2026", kinds: all3, source_keys: ["Gottstein2026"] },
    ]);
  });

  it("AC-3: entry, target and source totals, stored once per entry", () => {
    const entries = d.taxonomy.classes.flatMap((c) => c.correspondence ?? []);
    expect(entries).toHaveLength(245);
    expect(entries.filter((e) => e.targets.length === 1 && e.targets[0]!.match === "none")).toHaveLength(106);
    expect(entries.filter((e) => e.targets.length > 1)).toHaveLength(21);
    const targets = entries.flatMap((e) => e.targets.map((t) => ({ ...t, vocabulary: e.vocabulary })));
    expect(targets).toHaveLength(280);
    const tally = (key: (t: (typeof targets)[number]) => string) =>
      targets.reduce<Record<string, number>>((acc, t) => ({ ...acc, [key(t)]: (acc[key(t)] ?? 0) + 1 }), {});
    expect(tally((t) => t.vocabulary)).toEqual({ XDL: 74, WCSO: 61, Leong2022: 68, OntoLab_SAREF: 21, Gottstein2026: 56 });
    expect(tally((t) => t.match)).toEqual({ exact: 92, broader: 33, narrower: 49, none: 106 });
    const sources = entries.flatMap((e) => e.sources);
    expect(sources).toHaveLength(294);
    expect(sources.filter((s) => s.page !== null && s.locator !== null)).toHaveLength(192);
    expect(sources.filter((s) => s.page === null && s.locator === null)).toHaveLength(102);
    const keyOnlyEntries = entries.filter((e) => e.sources.some((s) => s.page === null));
    expect(keyOnlyEntries.every((e) => e.targets.length === 1 && e.targets[0]!.match === "none")).toBe(true);
  });

  it("AC-3: entries of thermal_unit, mobile_robot and human", () => {
    const thermal = cls("module_type", "thermal_unit").correspondence!;
    expect(thermal.find((e) => e.vocabulary === "XDL")).toEqual({
      vocabulary: "XDL",
      targets: ["Heater/chiller", "Low temperature", "circulation chiller", "heater chiller", "stirrer hotplate"].map((target) => ({
        target,
        match: "exact",
      })),
      sources: [
        { key: "Mehr2020", page: "p.10", locator: "Fig. 5" },
        { key: "Mehr2020", page: "p.4", locator: "Fig. 2" },
        { key: "Mehr2020", page: "p.11", locator: "main text" },
      ],
    });
    const mobile = cls("transfer_mode", "mobile_robot").correspondence!;
    expect(mobile.map((e) => e.vocabulary)).not.toContain("OntoLab_SAREF");
    expect(mobile.find((e) => e.vocabulary === "Leong2022")).toEqual({
      vocabulary: "Leong2022",
      targets: [{ target: "transportation task", match: "broader" }],
      sources: [{ key: "Leong2022", page: "p.9", locator: "Limitations" }],
    });
    expect(cls("module_type", "human").correspondence!.find((e) => e.vocabulary === "Gottstein2026")).toEqual({
      vocabulary: "Gottstein2026",
      targets: [{ target: "none", match: "none" }],
      sources: [{ key: "Gottstein2026", page: "pdf p.3", locator: "Fig. 1" }],
    });
  });

  it("AC-3: README sources and relation meanings", () => {
    expect(d.taxonomy.sources.map((s) => [s.keys, s.doi, s.vocabulary])).toEqual([
      [["Mehr2020"], "10.1126/science.abc2986", "XDL"],
      [["Schilling2026", "Schilling2026_SI"], "10.1039/d6dd00058d", "WeChemSynOntology (WCSO)"],
      [["Leong2022"], "10.1016/j.matt.2022.08.017", "MAP workflow framework"],
      [["Bai2024"], "10.1038/s41467-023-44599-9", "OntoLab / SAREF (module types only)"],
      [["Gottstein2026"], "10.1016/j.device.2026.101202", "Orchestration levels"],
    ]);
    expect(d.taxonomy.relations).toEqual([
      { match: "exact", meaning: null },
      { match: "broader", meaning: "the target is wider than our class" },
      { match: "narrower", meaning: "the target is narrower; for Gottstein2026, one of our items may span several of its objects" },
      { match: "none", meaning: null },
    ]);
  });
});
