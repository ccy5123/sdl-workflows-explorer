// AC-9: derivation on a two-paper fixture release (REQ-009, REQ-010).
import { cpSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveAll, writeDerived } from "../scripts/lib/derive";
import { tempDir } from "./fixtures/zip";

const MINI = "tests/fixtures/release-mini";

const PAPER_FIELDS = [
  "paper_id", "doi", "title", "venue", "first_public_year", "field_tags", "integration_mode",
  "sw_autonomy", "hw_autonomy", "hardware_location", "n_platforms",
];
const PLATFORM_ROW_FIELDS = [
  "platform_id", "paper_id", "platform_name", "first_public_year", "field_tags", "commercial_integrated",
  "identity_id", "n_modules", "n_steps", "module_types", "material_transfer_modes", "unit_operations",
];
const GRAPH_FIELDS = [
  "platform_id", "paper_id", "doi", "first_public_year", "field_tags", "name", "commercial_integrated",
  "identity_id", "evidence", "modules", "steps", "connections", "campaigns", "shared_with",
];
const MODULE_FIELDS = ["module_id", "module_type", "name_in_paper", "on_platform", "unmapped_note", "evidence"];
const STEP_FIELDS = [
  "step_id", "step_order", "unit_operation", "family", "performed_by", "modules", "uncertain", "unmapped_note",
  "evidence",
];
const CONNECTION_FIELDS = [
  "edge_id", "from_module", "to_module", "transfer_mode", "is_material", "stated", "uncertain", "unmapped_note",
  "evidence",
];
const EVIDENCE_FIELDS = ["doc", "page", "locator"];

const sorted = (xs: string[]) => [...xs].sort();

describe("deriveAll on the fixture release", () => {
  const d = deriveAll(MINI);

  it("writes release metadata and counts into index.json", () => {
    expect(d.index.release).toEqual({
      version: "1.0.0",
      released_on: "2026-11-01",
      doi: "10.5281/zenodo.1",
      taxonomy_version: "v1",
      license: "data: CC-BY-4.0; code: MIT",
    });
    expect(d.index.counts).toEqual({
      papers: 2,
      platforms: 3,
      modules: 6,
      steps: 6,
      connections: 5,
      material_connections: 2,
      candidates: 3,
    });
  });

  it("holds exactly the listed fields per paper row, with typed values", () => {
    expect(d.index.papers).toHaveLength(2);
    for (const row of d.index.papers) expect(sorted(Object.keys(row))).toEqual(sorted(PAPER_FIELDS));
    expect(d.index.papers[0]).toEqual({
      paper_id: "PaperA2024",
      doi: "10.1/a",
      title: "Paper A, a platform study",
      venue: "Venue A",
      first_public_year: 2024,
      field_tags: ["chem", "materials"],
      integration_mode: "mixed",
      sw_autonomy: 2,
      hw_autonomy: 2,
      hardware_location: "both",
      n_platforms: 2,
    });
  });

  it("holds exactly the listed fields per platform row, with typed values", () => {
    expect(d.index.platforms).toHaveLength(3);
    for (const row of d.index.platforms) expect(sorted(Object.keys(row))).toEqual(sorted(PLATFORM_ROW_FIELDS));
    expect(d.index.platforms[1]).toEqual({
      platform_id: "PaperA2024/P2",
      paper_id: "PaperA2024",
      platform_name: null,
      first_public_year: 2024,
      field_tags: ["chem", "materials"],
      commercial_integrated: true,
      identity_id: "I001",
      n_modules: 2,
      n_steps: 3,
      module_types: ["fluidics", "robot_arm"],
      material_transfer_modes: ["fixed_tubing"],
      unit_operations: ["analyze_data", "dispense_liquid", "measure_optical"],
    });
    expect(d.index.platforms[0]!.material_transfer_modes).toEqual([]);
  });

  it("SPEC-TAXO-001 AC-1: gives each platform row the sorted distinct unit operations of its steps", () => {
    expect(Object.fromEntries(d.index.platforms.map((l) => [l.platform_id, l.unit_operations]))).toEqual({
      "PaperA2024/P1": ["analyze_data", "dispense_liquid"],
      "PaperA2024/P2": ["analyze_data", "dispense_liquid", "measure_optical"],
      "PaperB2025/P1": ["analyze_data"],
    });
  });

  it("builds one platform file per paper with graphs, evidence, campaigns and shared_with", () => {
    expect(Object.keys(d.platformFiles).sort()).toEqual(["PaperA2024", "PaperB2025"]);
    const a = d.platformFiles.PaperA2024!;
    expect(a.paper_id).toBe("PaperA2024");
    expect(a.platforms.map((p) => p.platform_id)).toEqual(["PaperA2024/P1", "PaperA2024/P2"]);
    const [p1, p2] = a.platforms as [(typeof a.platforms)[0], (typeof a.platforms)[0]];
    expect(p1.campaigns).toBe("Two campaigns, 10 runs each");
    expect(p1.shared_with).toEqual([]);
    expect(p2.shared_with).toEqual(["PaperB2025"]);
    expect(d.platformFiles.PaperB2025!.platforms[0]!.shared_with).toEqual(["PaperA2024"]);
    expect(d.platformFiles.PaperB2025!.platforms[0]!.campaigns).toBeNull();
    expect(p2.modules[1]).toEqual({
      module_id: "PaperA2024/P2/M2",
      module_type: "robot_arm",
      name_in_paper: "arm",
      on_platform: false,
      unmapped_note: "off-platform arm",
      evidence: { doc: "main", page: 4, locator: "Fig. 2" },
    });
    expect(p2.steps[2]!.evidence).toEqual({ doc: "main", page: 4, locator: null });
    expect(p2.connections[1]).toMatchObject({ is_material: true, stated: false, uncertain: true });
    for (const file of Object.values(d.platformFiles)) {
      expect(sorted(Object.keys(file))).toEqual(["paper_id", "platforms"]);
      for (const p of file.platforms) {
        expect(sorted(Object.keys(p))).toEqual(sorted(GRAPH_FIELDS));
        expect(sorted(Object.keys(p.evidence))).toEqual(sorted(EVIDENCE_FIELDS));
        for (const m of p.modules) expect(sorted(Object.keys(m))).toEqual(sorted(MODULE_FIELDS));
        for (const s of p.steps) expect(sorted(Object.keys(s))).toEqual(sorted(STEP_FIELDS));
        for (const c of p.connections) expect(sorted(Object.keys(c))).toEqual(sorted(CONNECTION_FIELDS));
        for (const item of [...p.modules, ...p.steps, ...p.connections]) {
          expect(sorted(Object.keys(item.evidence))).toEqual(sorted(EVIDENCE_FIELDS));
          expect(item.evidence.doc).toBeTruthy();
        }
      }
    }
  });

  it("counts taxonomy usage per class equal to the fixture's items", () => {
    const usage = Object.fromEntries(d.taxonomy.classes.map((c) => [`${c.class_kind}:${c.class}`, c.n_items]));
    expect(usage).toEqual({
      "field_tag:bio": 0,
      "field_tag:chem": 2,
      "field_tag:materials": 1,
      "module_type:fluidics": 3,
      "module_type:robot_arm": 1,
      "module_type:software": 2,
      "transfer_mode:data_transfer": 3,
      "transfer_mode:fixed_tubing": 2,
      "unit_operation:analyze_data": 3,
      "unit_operation:dispense_liquid": 2,
      "unit_operation:measure_optical": 1,
    });
    expect(d.taxonomy.classes[0]).toEqual({
      class_kind: "field_tag",
      class: "bio",
      family: null,
      definition: "Biology.",
      n_items: 0,
      n_platforms: 0,
      n_papers: 0,
      examples: [],
      correspondence: null,
    });
    expect(d.taxonomy.classes.find((c) => c.class === "analyze_data")!.family).toBe("analyze");
  });

  it("SPEC-TAXO-001 AC-2: per-class platform and paper counts and examples", () => {
    const counts = Object.fromEntries(
      d.taxonomy.classes.map((c) => [`${c.class_kind}:${c.class}`, [c.n_items, c.n_platforms, c.n_papers]]),
    );
    expect(counts).toEqual({
      "field_tag:bio": [0, 0, 0],
      "field_tag:chem": [2, 3, 2],
      "field_tag:materials": [1, 2, 1],
      "module_type:fluidics": [3, 3, 2],
      "module_type:robot_arm": [1, 1, 1],
      "module_type:software": [2, 2, 2],
      "transfer_mode:data_transfer": [3, 3, 2],
      "transfer_mode:fixed_tubing": [2, 1, 1],
      "unit_operation:analyze_data": [3, 3, 2],
      "unit_operation:dispense_liquid": [2, 2, 1],
      "unit_operation:measure_optical": [1, 1, 1],
    });
    const cls = (name: string) => d.taxonomy.classes.find((c) => c.class === name)!;
    expect(cls("chem").examples).toEqual([
      { platform_id: "PaperA2024/P1", platform_name: "Rig One", n: null },
      { platform_id: "PaperA2024/P2", platform_name: null, n: null },
      { platform_id: "PaperB2025/P1", platform_name: "Shared Rig", n: null },
    ]);
    expect(cls("fixed_tubing").examples).toEqual([{ platform_id: "PaperA2024/P2", platform_name: null, n: 2 }]);
    expect(cls("fluidics").examples.map((e) => [e.platform_id, e.n])).toEqual([
      ["PaperA2024/P1", 1],
      ["PaperA2024/P2", 1],
      ["PaperB2025/P1", 1],
    ]);
    expect(Object.keys(cls("fluidics"))).toEqual([
      "class_kind", "class", "family", "definition", "n_items", "n_platforms", "n_papers", "examples", "correspondence",
    ]);
  });

  it("SPEC-TAXO-001 AC-3: structured correspondence, vocabularies, sources and relations; no raw rows", () => {
    const cls = (name: string) => d.taxonomy.classes.find((c) => c.class === name)!;
    expect(Object.keys(d.taxonomy)).toEqual(["classes", "vocabularies", "sources", "relations"]);
    expect(cls("fluidics").correspondence).toEqual([
      { vocabulary: "XDL", targets: [{ target: "Pump", match: "exact" }], sources: [{ key: "Mehr2020", page: "p.4", locator: "Fig. 2" }] },
      {
        vocabulary: "OntoLab_SAREF",
        targets: [{ target: "pump", match: "narrower" }],
        sources: [{ key: "Bai2024", page: "p.5", locator: "Table 1" }],
      },
      {
        vocabulary: "Gottstein2026",
        targets: [{ target: "setup", match: "exact" }],
        sources: [{ key: "Gottstein2026", page: "pdf p.3", locator: "Fig. 1" }],
      },
    ]);
    expect(cls("dispense_liquid").correspondence).toEqual([
      {
        vocabulary: "XDL",
        targets: [
          { target: "Add", match: "exact" },
          { target: "Dispense", match: "narrower" },
        ],
        sources: [
          { key: "Mehr2020", page: "p.4", locator: "Fig. 2" },
          { key: "Mehr2020", page: "p.11", locator: "main text" },
        ],
      },
      {
        vocabulary: "Gottstein2026",
        targets: [{ target: "unit_operation", match: "broader" }],
        sources: [{ key: "Gottstein2026", page: "pdf p.3", locator: "§UO" }],
      },
    ]);
    expect(cls("data_transfer").correspondence!.map((e) => e.vocabulary)).toEqual(["XDL", "Gottstein2026"]);
    expect(cls("data_transfer").correspondence![0]).toEqual({
      vocabulary: "XDL",
      targets: [{ target: "none", match: "none" }],
      sources: [{ key: "Mehr2020", page: null, locator: null }],
    });
    expect(cls("robot_arm").correspondence).toBeNull();
    expect(cls("chem").correspondence).toBeNull();
    expect(d.taxonomy.vocabularies).toEqual([
      { vocabulary: "XDL", kinds: ["module_type", "transfer_mode", "unit_operation"], source_keys: ["Mehr2020"] },
      { vocabulary: "OntoLab_SAREF", kinds: ["module_type"], source_keys: ["Bai2024"] },
      { vocabulary: "Gottstein2026", kinds: ["module_type", "transfer_mode", "unit_operation"], source_keys: ["Gottstein2026"] },
    ]);
    expect(d.taxonomy.sources).toEqual([
      {
        keys: ["Mehr2020"],
        vocabulary: "XDL",
        reference: "Mehr et al., Science (2020), doi:10.1/xdl. Page numbers refer to the accepted manuscript",
        doi: "10.1/xdl",
      },
      {
        keys: ["Bai2024", "Bai2024_SI"],
        vocabulary: "OntoLab / SAREF (module types only)",
        reference: "Bai et al., Journal B (2024), doi:10.1/saref, and its supplementary information",
        doi: "10.1/saref",
      },
      {
        keys: ["Gottstein2026"],
        vocabulary: "Orchestration levels",
        reference: "Gottstein et al., Journal G (2026), doi:10.1/gott",
        doi: "10.1/gott",
      },
    ]);
    expect(d.taxonomy.relations).toEqual([
      { match: "exact", meaning: null },
      { match: "broader", meaning: "the target is wider than our class" },
      { match: "narrower", meaning: "the target is narrower; for Gottstein2026, one of our items may span several of its objects" },
      { match: "none", meaning: null },
    ]);
  });

  it("derives the benchmark tasks, split counts and reference results as published", () => {
    expect(d.benchmark.tasks.map((t) => (t as { task_id: string }).task_id)).toEqual([
      "mini-module_type",
      "mini-transfer_mode",
    ]);
    expect(d.benchmark.split_counts).toEqual({ train: 1, test: 1 });
    expect(d.benchmark.reference_results).toEqual(
      JSON.parse(readFileSync(join(MINI, "modes/benchmark/reference_results.json"), "utf8")),
    );
  });

  it("carries no abstract or other text field from the release", () => {
    const all = JSON.stringify(d);
    expect(all).not.toContain("abstract");
    expect(all).not.toContain("This abstract must never be carried");
  });
});

describe("writeDerived", () => {
  it("writes index.json, taxonomy.json, benchmark.json and one platform file per paper", () => {
    const out = join(tempDir(), "data");
    writeDerived(deriveAll(MINI), out);
    expect(readdirSync(out).sort()).toEqual(["benchmark.json", "index.json", "platforms", "taxonomy.json"]);
    expect(readdirSync(join(out, "platforms")).sort()).toEqual(["PaperA2024.json", "PaperB2025.json"]);
    const index = JSON.parse(readFileSync(join(out, "index.json"), "utf8"));
    expect(index.papers).toHaveLength(2);
  });
});

describe("deriveAll errors", () => {
  function copyMini(): string {
    const dir = join(tempDir(), "rel");
    cpSync(MINI, dir, { recursive: true });
    return dir;
  }

  it("fails when a graph uses a class missing from the taxonomy", () => {
    const dir = copyMini();
    const path = join(dir, "modes/taxonomy/classes.csv");
    const text = readFileSync(path, "utf8").replace("module_type,robot_arm,,A robot arm.\n", "");
    writeFileSync(path, text);
    expect(() => deriveAll(dir)).toThrow(/robot_arm/);
  });

  it("fails when a graph platform has no row in platforms.csv", () => {
    const dir = copyMini();
    const path = join(dir, "modes/builder/platforms.csv");
    const lines = readFileSync(path, "utf8").split("\n");
    writeFileSync(path, [lines[0], lines[1], lines[2], ""].join("\n"));
    expect(() => deriveAll(dir)).toThrow(/PaperB2025\/P1/);
  });

  it("fails when a graph field has the wrong type, naming it", () => {
    const dir = copyMini();
    const path = join(dir, "modes/builder/platform_graphs.jsonl");
    writeFileSync(path, readFileSync(path, "utf8").replace('"step_order": 1', '"step_order": "1"'));
    expect(() => deriveAll(dir)).toThrow(/step_order/);
  });

  it("fails when a graph belongs to a paper missing from papers.csv", () => {
    const dir = copyMini();
    const path = join(dir, "modes/trends/papers.csv");
    const lines = readFileSync(path, "utf8").split("\n");
    writeFileSync(path, [lines[0], lines[1], ""].join("\n"));
    expect(() => deriveAll(dir)).toThrow(/PaperB2025/);
  });

  it("fails when core/release.csv does not hold exactly one row", () => {
    const dir = copyMini();
    writeFileSync(join(dir, "core/release.csv"), "release_version,released_on\n");
    expect(() => deriveAll(dir)).toThrow(/release\.csv/);
  });
});

// SPEC-TAXO-001 AC-4: every contradiction of REQ-004 (a) to (i) makes deriveAll throw, naming what is concerned.
describe("deriveAll taxonomy checks (SPEC-TAXO-001 AC-4)", () => {
  const WIDE = "modes/taxonomy/correspondence.csv";
  const LONG = "core/taxonomy_correspondence.csv";

  /** Copy of the fixture with each [file, from, to] edit applied; every `from` must occur exactly once. */
  function edited(...edits: [string, string, string][]): string {
    const dir = join(tempDir(), "rel");
    cpSync(MINI, dir, { recursive: true });
    for (const [rel, from, to] of edits) {
      const path = join(dir, rel);
      const text = readFileSync(path, "utf8");
      expect(text.split(from)).toHaveLength(2);
      writeFileSync(path, text.replace(from, to));
    }
    return dir;
  }

  it("accepts the extended fixture unmodified", () => {
    expect(() => deriveAll(MINI)).not.toThrow();
  });

  it("(a) fails on a target renamed in the wide table", () => {
    expect(() => deriveAll(edited([WIDE, "Pump (exact)", "Pumps (exact)"]))).toThrow(/fluidics.*XDL|XDL.*fluidics/);
  });

  it("(a) fails on a relation changed in the wide table", () => {
    expect(() => deriveAll(edited([WIDE, "Pump (exact)", "Pump (broader)"]))).toThrow(/fluidics.*XDL|XDL.*fluidics/);
  });

  it("(a) fails on two targets of one cell swapped in the wide table", () => {
    expect(() => deriveAll(edited([WIDE, "Add (exact); Dispense (narrower)", "Dispense (narrower); Add (exact)"]))).toThrow(
      /dispense_liquid.*XDL|XDL.*dispense_liquid/,
    );
  });

  it("(a) fails on a source text changed in the long table", () => {
    expect(() =>
      deriveAll(edited([LONG, "fluidics,XDL,Pump,exact,Mehr2020 ; p.4 ; Fig. 2", "fluidics,XDL,Pump,exact,Mehr2020 ; p.4 ; Fig. 3"])),
    ).toThrow(/fluidics.*XDL|XDL.*fluidics/);
  });

  it("(a) fails on a wide cell emptied while its long rows stay", () => {
    expect(() => deriveAll(edited([WIDE, "pump (narrower),Bai2024 ; p.5 ; Table 1", ","]))).toThrow(
      /fluidics.*OntoLab_SAREF|OntoLab_SAREF.*fluidics/,
    );
  });

  it("(a) fails on a wide cell emptied with its long rows removed in a kind the vocabulary still covers", () => {
    const dir = edited(
      [WIDE, "module_type,software,none,Mehr2020,none,Bai2024,", "module_type,software,none,Mehr2020,,,"],
      [LONG, "module_type,software,OntoLab_SAREF,none,none,Bai2024\n", ""],
    );
    expect(() => deriveAll(dir)).toThrow(/software.*OntoLab_SAREF|OntoLab_SAREF.*software/);
  });

  it("(b) fails on a source key missing from the README source table", () => {
    expect(() => deriveAll(edited([LONG, "module_type,software,XDL,none,none,Mehr2020", "module_type,software,XDL,none,none,Nobody2020"]))).toThrow(
      /Nobody2020/,
    );
  });

  it("(c) fails on a long-table class absent from classes.csv", () => {
    expect(() => deriveAll(edited([LONG, "module_type,software,XDL,none,none,Mehr2020\n", "module_type,software,XDL,none,none,Mehr2020\nmodule_type,ghost,XDL,none,none,Mehr2020\n"]))).toThrow(
      /ghost/,
    );
  });

  it("(d) fails on a duplicated long-table row", () => {
    const row = "module_type,fluidics,XDL,Pump,exact,Mehr2020 ; p.4 ; Fig. 2\n";
    expect(() => deriveAll(edited([LONG, row, row + row]))).toThrow(/fluidics/);
  });

  it("(e) fails when the README heading is missing", () => {
    expect(() => deriveAll(edited(["README.md", "## Sources of the correspondence table", "## Sources"]))).toThrow(
      /Sources of the correspondence table/,
    );
  });

  it("(e) fails when a README source row has no doi", () => {
    expect(() => deriveAll(edited(["README.md", "doi:10.1/gott", "no identifier"]))).toThrow(/Gottstein2026/);
  });

  it("(e) fails when the data-dictionary match row is missing", () => {
    expect(() => deriveAll(edited(["data_dictionary.csv", "taxonomy_correspondence,table,match,", "taxonomy_correspondence,table,match_old,"]))).toThrow(
      /match/,
    );
  });

  it("(e) fails on a long-table match value that the relations do not define", () => {
    expect(() => deriveAll(edited([LONG, "fluidics,XDL,Pump,exact,", "fluidics,XDL,Pump,partial,"]))).toThrow(/partial/);
  });

  it("(f) fails when one vocabulary's keys belong to two README rows", () => {
    const dir = edited(
      [WIDE, "module_type,software,none,Mehr2020,", "module_type,software,none,Gottstein2026,"],
      [LONG, "module_type,software,XDL,none,none,Mehr2020", "module_type,software,XDL,none,none,Gottstein2026"],
    );
    expect(() => deriveAll(dir)).toThrow(/XDL/);
  });

  it("(g) fails when the non-material transfer mode is not on every platform", () => {
    const path = "modes/builder/platform_graphs.jsonl";
    const text = readFileSync(join(MINI, path), "utf8");
    const start = text.indexOf(', {"edge_id": "PaperA2024/P2/E3"');
    const conn = text.slice(start, text.indexOf("]}", start));
    expect(conn).toContain("data_transfer");
    expect(() => deriveAll(edited([path, conn, ""]))).toThrow(/data_transfer/);
  });

  it("(h) fails when a platforms.csv browse column disagrees with the graphs", () => {
    expect(() => deriveAll(edited(["modes/builder/platforms.csv", '2,0,2,0,"software,fluidics",,main', "2,0,2,0,software,,main"]))).toThrow(
      /fluidics/,
    );
  });

  it("(i) fails on a source with two parts", () => {
    const dir = edited(
      [WIDE, "setup (exact),Gottstein2026 ; pdf p.3 ; Fig. 1", "setup (exact),Gottstein2026 ; pdf p.3"],
      [LONG, "setup,exact,Gottstein2026 ; pdf p.3 ; Fig. 1", "setup,exact,Gottstein2026 ; pdf p.3"],
    );
    expect(() => deriveAll(dir)).toThrow(/Gottstein2026 ; pdf p\.3/);
  });

  it("control: a transfer mode with no connection at all passes with zero counts", () => {
    const dir = edited([
      "modes/taxonomy/classes.csv",
      "transfer_mode,fixed_tubing,",
      "transfer_mode,unmapped,,Not mapped.\ntransfer_mode,fixed_tubing,",
    ]);
    const unmapped = deriveAll(dir).taxonomy.classes.find((c) => c.class_kind === "transfer_mode" && c.class === "unmapped")!;
    expect([unmapped.n_items, unmapped.n_platforms, unmapped.n_papers]).toEqual([0, 0, 0]);
    expect(unmapped.examples).toEqual([]);
  });
});
