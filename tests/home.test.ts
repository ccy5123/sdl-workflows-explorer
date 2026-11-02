// SPEC-UI-001 AC-5: what Home derives from the built data (REQ-010, REQ-011). Fixture cases first; the real-data cases
// read public/data/ and skip with a message when build-data has not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BenchmarkJson, IndexJson, PlatformFile, PlatformGraph, TaxonomyJson } from "../src/data/types";
import {
  FEATURED_PLATFORM,
  SEARCH_EXAMPLES,
  evidenceText,
  featuredLayout,
  fieldTagCounts,
  latestYear,
  licenceChips,
  newestFirst,
  papersPerYear,
  statTiles,
  taxonomyCounts,
} from "../src/lib/home";

const ev = { doc: "main", page: 1, locator: null };
const mod = (id: string, type: string) => ({
  module_id: id, module_type: type, name_in_paper: null, on_platform: true, unmapped_note: null, evidence: ev,
});
const conn = (from: string, to: string, mode: string, material: boolean, stated = true) => ({
  edge_id: `${from}>${to}`, from_module: from, to_module: to, transfer_mode: mode, is_material: material, stated,
  uncertain: false, unmapped_note: null, evidence: ev,
});
const step = (order: number, op: string, modules: string[]) => ({
  step_id: `S${order}`, step_order: order, unit_operation: op, family: null, performed_by: "robot", modules,
  uncertain: false, unmapped_note: null, evidence: ev,
});
const platform = (modules: PlatformGraph["modules"], connections: PlatformGraph["connections"], steps: PlatformGraph["steps"] = []) =>
  ({ modules, connections, steps }) as unknown as PlatformGraph;

describe("featuredLayout", () => {
  it("puts modules without material links in the control row and walks the material chain", () => {
    const p = platform(
      [mod("M1", "software"), mod("M2", "flow_reactor"), mod("M3", "fluidics"), mod("M4", "instrument_optical")],
      [conn("M3", "M2", "fixed_tubing", true), conn("M2", "M4", "fixed_tubing", true, false), conn("M4", "M1", "data_transfer", false)],
    );
    const layout = featuredLayout(p);
    expect(layout.control.map((m) => m.module_id)).toEqual(["M1"]);
    expect(layout.chain.map((m) => m.module_id)).toEqual(["M3", "M2", "M4"]);
    expect(layout.links).toEqual([
      { mode: "fixed_tubing", stated: true },
      { mode: "fixed_tubing", stated: false },
    ]);
    expect(layout.dataLinks).toBe(1);
  });

  it("falls back to step order without links when the material links are not one path", () => {
    const p = platform(
      [mod("A", "fluidics"), mod("B", "batch_reactor"), mod("C", "storage")],
      [conn("A", "B", "fixed_tubing", true), conn("A", "C", "fixed_tubing", true)],
      [step(1, "dispense_liquid", ["C"]), step(2, "react_thermal", ["B"]), step(3, "handle_sample", ["A"])],
    );
    const layout = featuredLayout(p);
    expect(layout.chain.map((m) => m.module_id)).toEqual(["C", "B", "A"]);
    expect(layout.links).toEqual([]);
  });
});

describe("licence chips and evidence text", () => {
  it("splits the release licence into one chip per part", () => {
    expect(licenceChips("data: CC-BY-4.0; code: MIT")).toEqual(["Data CC BY 4.0", "Code MIT"]);
    expect(licenceChips("CC0-1.0")).toEqual(["CC0-1.0"]);
  });

  it("joins document, page and locator", () => {
    expect(evidenceText({ doc: "SI1", page: 10, locator: "§2.2.4 ¶1" })).toBe("SI1 · p. 10 · §2.2.4 ¶1");
    expect(evidenceText({ doc: "main", page: null, locator: null })).toBe("main");
  });
});

describe("papersPerYear and field tags", () => {
  const papers = [2001, 2014, 2015, 2015, 2017, 2018].map((y, i) => ({ first_public_year: y, field_tags: i % 2 ? ["a"] : ["a", "b"] }));
  it("groups years before 2015, fills empty years and marks the last as partial", () => {
    expect(papersPerYear(papers)).toEqual([
      { label: "before 2015", n: 2, partial: false },
      { label: "2015", n: 2, partial: false },
      { label: "2016", n: 0, partial: false },
      { label: "2017", n: 1, partial: false },
      { label: "2018", n: 1, partial: true },
    ]);
  });

  it("counts papers per field tag, most first", () => {
    expect(fieldTagCounts(papers)).toEqual([
      { code: "a", n: 6 },
      { code: "b", n: 3 },
    ]);
  });
});

const DATA = join("public", "data");
const built = ["index.json", "taxonomy.json", "benchmark.json"].every((f) => existsSync(join(DATA, f)));

describe.skipIf(!built)("Home on the pinned release (AC-5)", () => {
  if (!built) console.warn("public/data absent: run `npm run build-data` for the real-data cases");
  const read = <T>(f: string) => (built ? (JSON.parse(readFileSync(join(DATA, f), "utf8")) as T) : (null as T));
  const index = read<IndexJson>("index.json");
  const taxonomy = read<TaxonomyJson>("taxonomy.json");
  const benchmark = read<BenchmarkJson>("benchmark.json");

  it("takes every stat tile value from the data", () => {
    const tiles = statTiles(index, taxonomy);
    const kinds = taxonomyCounts(taxonomy);
    const latest = latestYear(index.platforms);
    expect(tiles.map((t) => [t.label, t.value])).toEqual([
      ["Papers", index.counts.papers],
      ["Platforms", index.counts.platforms],
      ["Modules", index.counts.modules],
      ["Cycle steps", index.counts.steps],
      ["Connections", index.counts.connections],
      ["Taxonomy classes", taxonomy.classes.length],
    ]);
    expect(tiles.map((t) => t.note)).toEqual([
      `from ${index.counts.candidates.toLocaleString("en")} screened`,
      `${latest.n} first public in ${latest.year}`,
      `${kinds.module_type} module types`,
      `${kinds.unit_operation} unit operations`,
      `${index.counts.material_connections.toLocaleString("en")} move material`,
      `mapped to ${taxonomy.vocabularies.length} vocabularies`,
    ]);
    expect(latest.n).toBe(index.platforms.filter((p) => p.first_public_year === latest.year).length);
  });

  it("counts taxonomy classes per kind as taxonomy.json does", () => {
    const kinds = taxonomyCounts(taxonomy);
    expect(Object.values(kinds).reduce((a, b) => a + b, 0)).toBe(taxonomy.classes.length);
    for (const [kind, n] of Object.entries(kinds)) {
      expect(n).toBe(taxonomy.classes.filter((c) => c.class_kind === kind).length);
    }
  });

  it("counts papers per year and per field tag as index.json does", () => {
    const years = papersPerYear(index.papers);
    expect(years.reduce((a, y) => a + y.n, 0)).toBe(index.counts.papers);
    expect(years[0]!.n).toBe(index.papers.filter((p) => p.first_public_year < 2015).length);
    expect(years.at(-1)!.partial).toBe(true);
    const tags = fieldTagCounts(index.papers);
    expect(tags[0]!.n).toBe(index.papers.filter((p) => p.field_tags.includes(tags[0]!.code)).length);
  });

  it("lays out the featured platform from its file", () => {
    expect(FEATURED_PLATFORM).toBe("Aand2024/P1");
    const file = read<PlatformFile>("platforms/Aand2024.json");
    const p = file.platforms.find((x) => x.platform_id === FEATURED_PLATFORM)!;
    const layout = featuredLayout(p);
    expect(layout.control.map((m) => m.module_type)).toEqual(["software"]);
    expect(layout.chain.map((m) => m.module_type)).toEqual(["fluidics", "flow_reactor", "instrument_optical", "sample_handling_station"]);
    expect(layout.links.map((l) => l.stated)).toEqual([true, true, false]);
  });

  it("sorts the platform list newest first, then by id", () => {
    const rows = newestFirst(index.platforms);
    expect(rows).toHaveLength(index.counts.platforms);
    for (let i = 1; i < rows.length; i++) {
      const [a, b] = [rows[i - 1]!, rows[i]!];
      expect(a.first_public_year > b.first_public_year || (a.first_public_year === b.first_public_year && a.platform_id < b.platform_id)).toBe(true);
    }
  });

  it("offers example searches that each match a platform (AC-4)", () => {
    for (const q of SEARCH_EXAMPLES) {
      const hit = index.platforms.some((p) =>
        [p.platform_id, p.paper_id, p.platform_name ?? ""].some((s) => s.toLowerCase().includes(q.toLowerCase())),
      );
      expect(hit, q).toBe(true);
    }
  });

  it("finds the module-type benchmark task", () => {
    expect(benchmark.tasks.find((t) => t.target === "module_type")).toBeDefined();
  });
});
