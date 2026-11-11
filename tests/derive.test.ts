// AC-9: derivation on a two-paper fixture release (REQ-009, REQ-010).
import { cpSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

  it("gives the search file each platform's distinct module names stated in the paper, in module order", () => {
    expect(d.search.module_names).toEqual({
      "PaperA2024/P1": ["controller", "pumps"],
      "PaperA2024/P2": ["syringe pump", "arm"],
      "PaperB2025/P1": ["PC", "pump"],
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
    expect(d.benchmark.tasks.map((t) => t.task_id)).toEqual([
      "mini-module_type",
      "mini-transfer_mode",
    ]);
    expect(d.benchmark.split_counts).toEqual({ train: 1, test: 1, excluded: 0 });
    expect(d.benchmark.reference_results).toEqual(
      JSON.parse(readFileSync(join(MINI, "modes/benchmark/reference_results.json"), "utf8")),
    );
  });

  it("carries no abstract or other text field from the release", () => {
    // The release documents quote the data card, which uses the word "abstracts"; the view data must not.
    const { releaseDocs: _docs, ...viewData } = d;
    expect(JSON.stringify(viewData)).not.toContain("abstract");
    expect(JSON.stringify(d)).not.toContain("This abstract must never be carried");
  });
});

describe("writeDerived", () => {
  it("writes index.json, taxonomy.json, benchmark.json, release-docs.json, simulation.json and one platform file per paper", () => {
    const out = join(tempDir(), "data");
    writeDerived(deriveAll(MINI), out);
    expect(readdirSync(out).sort()).toEqual([
      "benchmark-items.json", "benchmark.json", "index.json", "platforms", "release-docs.json", "search.json", "simulation.json",
      "taxonomy.json",
    ]);
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

// SPEC-BENCH-001 AC-1 and AC-2 on the fixture: the typed benchmark.json and benchmark-items.json (REQ-001, REQ-002).
// The expected values are listed in .moai/specs/SPEC-BENCH-001/progress.md §E.2.
describe("benchmark on the fixture release (SPEC-BENCH-001 AC-1, AC-2)", () => {
  const d = deriveAll(MINI);
  const b = d.benchmark;
  const BENCHMARK_KEYS = [
    "benchmark_id", "split_rule", "split_counts", "exclusion_reasons", "tasks", "summaries", "platforms",
    "reference_results", "reference_results_text",
  ];
  const TASK_FIELDS = [
    "task_id", "benchmark_id", "target", "item_rule", "inputs", "metric", "baseline_rule", "baseline_top1",
    "reference_model", "reference_model_top1", "diff_ci95_low", "diff_ci95_high", "n_test_items", "n_test_papers",
    "recorded_in",
  ];
  const REFERENCE_FIELDS = [
    "task_id", "n_test_items", "n_test_papers", "baseline_top1", "reference_model_top1", "diff_ci95_low",
    "diff_ci95_high", "replicates",
  ];
  const read = (rel: string) => readFileSync(join(MINI, "modes/benchmark", rel), "utf8");

  it("holds exactly the keys of REQ-001 with the split, its rule and no exclusion reason", () => {
    expect(Object.keys(b)).toEqual(BENCHMARK_KEYS);
    expect(b.benchmark_id).toBe("mini");
    expect(b.split_rule).toBe("Benchmark: mini trains on papers first public in 2024 and tests on papers first public in 2025.");
    expect(b.split_counts).toEqual({ train: 1, test: 1, excluded: 0 });
    expect(b.exclusion_reasons).toEqual([]);
  });

  it("builds each task field by field, equal to the parsed task file", () => {
    for (const task of b.tasks) {
      expect(Object.keys(task)).toEqual(TASK_FIELDS);
      expect(task).toEqual(JSON.parse(read(`tasks/${task.task_id}.json`)));
    }
    expect(b.tasks.map((t) => t.target)).toEqual(["module_type", "transfer_mode"]);
  });

  it("summarises items, uncertain items and labels by split", () => {
    expect(b.summaries).toEqual([
      {
        task_id: "mini-module_type",
        items: { train: 4, test: 1, excluded: 0 },
        uncertain: { train: 1, test: 0, excluded: 0 },
        labels: [
          { label: "fluidics", train: 2, test: 0, excluded: 0 },
          { label: "software", train: 1, test: 1, excluded: 0 },
          { label: "robot_arm", train: 1, test: 0, excluded: 0 },
        ],
      },
      {
        task_id: "mini-transfer_mode",
        items: { train: 2, test: 0, excluded: 0 },
        uncertain: { train: 1, test: 0, excluded: 0 },
        labels: [{ label: "fixed_tubing", train: 2, test: 0, excluded: 0 }],
      },
    ]);
  });

  it("lists every platform of index.json in id order with its split and items per task", () => {
    expect(b.platforms).toEqual([
      { platform_id: "PaperA2024/P1", split: "train", n: [2, 0] },
      { platform_id: "PaperA2024/P2", split: "train", n: [2, 2] },
      { platform_id: "PaperB2025/P1", split: "test", n: [1, 0] },
    ]);
  });

  it("keeps reference_results keyed in file order, typed, and the file text byte for byte", () => {
    expect(Object.keys(b.reference_results)).toEqual(["mini-module_type", "mini-transfer_mode"]);
    for (const entry of Object.values(b.reference_results)) expect(Object.keys(entry)).toEqual(REFERENCE_FIELDS);
    expect(b.reference_results).toEqual(JSON.parse(read("reference_results.json")));
    expect(b.reference_results_text).toBe(read("reference_results.json"));
  });

  it("writes the item rows of each task in file order with the columns of its target", () => {
    expect(Object.keys(d.benchmarkItems)).toEqual(["mini-module_type", "mini-transfer_mode"]);
    const mt = d.benchmarkItems["mini-module_type"]!;
    expect(mt.columns).toEqual([
      "item_id", "split", "label", "field_tag", "unit_operation", "prev_unit_operation", "next_unit_operation", "uncertain",
    ]);
    expect(mt.rows).toHaveLength(5);
    expect(mt.rows[0]).toEqual(["PaperA2024/P1/S1", "train", "fluidics", "chem", "dispense_liquid", "START", "analyze_data", 0]);
    expect(mt.rows.map((r) => r[7])).toEqual([0, 1, 0, 0, 0]);
    const tm = d.benchmarkItems["mini-transfer_mode"]!;
    expect(tm.columns).toEqual([
      "item_id", "split", "label", "field_tag", "from_unit_operation", "to_unit_operation", "from_family", "to_family", "uncertain",
    ]);
    expect(tm.rows).toEqual([
      ["PaperA2024/P2/E1", "train", "fixed_tubing", "chem", "dispense_liquid", "measure_optical", "prepare", "measure", 0],
      ["PaperA2024/P2/E2", "train", "fixed_tubing", "chem", "measure_optical", "dispense_liquid", "measure", "prepare", 1],
    ]);
  });

  it("writeDerived writes benchmark-items.json as parsed", () => {
    const out = join(tempDir(), "data");
    writeDerived(d, out);
    expect(JSON.parse(readFileSync(join(out, "benchmark-items.json"), "utf8"))).toEqual(d.benchmarkItems);
    expect(JSON.parse(readFileSync(join(out, "benchmark.json"), "utf8"))).toEqual(b);
  });
});

// SPEC-BENCH-001 AC-3: each disagreement of REQ-003 (a) to (i) makes deriveAll throw, naming the file and the row,
// task or field concerned.
describe("deriveAll benchmark checks (SPEC-BENCH-001 AC-3)", () => {
  const TASK_MT = "modes/benchmark/tasks/mini-module_type.json";
  const TASK_TM = "modes/benchmark/tasks/mini-transfer_mode.json";
  const REF = "modes/benchmark/reference_results.json";
  const SPLIT = "modes/benchmark/split.csv";
  const ITEMS_MT = "modes/benchmark/items_module_type.csv";
  const ITEMS_TM = "modes/benchmark/items_transfer_mode.csv";

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

  it("control: the fixture passes", () => {
    expect(() => deriveAll(MINI)).not.toThrow();
  });

  it("(a) fails on a task file renamed", () => {
    const dir = edited();
    renameSync(join(dir, TASK_TM), join(dir, "modes/benchmark/tasks/mini-transfer.json"));
    expect(() => deriveAll(dir)).toThrow(/tasks\/mini-transfer\.json: task_id "mini-transfer_mode" is not the file name/);
  });

  it("(a) fails on a task benchmark_id that is not the split's", () => {
    expect(() => deriveAll(edited([TASK_MT, '"benchmark_id": "mini"', '"benchmark_id": "other"']))).toThrow(
      /mini-module_type\.json: benchmark_id "other" is not the benchmark_id "mini" of modes\/benchmark\/split\.csv/,
    );
  });

  it("(a) fails on a reference entry whose task_id differs from its key", () => {
    expect(() => deriveAll(edited([REF, '{"task_id": "mini-transfer_mode"', '{"task_id": "mini-x"']))).toThrow(
      /reference_results\.json entry mini-transfer_mode: task_id "mini-x" is not its key/,
    );
  });

  it("(a) fails when the task ids and the reference keys differ, and on a shared target", () => {
    expect(() => deriveAll(edited([REF, '"mini-transfer_mode": {', '"mini-other": {']))).toThrow(
      /reference_results\.json: keys mini-module_type, mini-other differ from the task ids mini-module_type, mini-transfer_mode/,
    );
    expect(() => deriveAll(edited([TASK_TM, '"target": "transfer_mode"', '"target": "module_type"']))).toThrow(
      /mini-transfer_mode\.json: target module_type is also the target of mini-module_type/,
    );
    expect(() => deriveAll(edited([TASK_TM, '"target": "transfer_mode"', '"target": "unit_operation"']))).toThrow(
      /mini-transfer_mode\.json: target "unit_operation" is not module_type or transfer_mode/,
    );
  });

  it("(b) fails on a task file without metric and on baseline_top1 given as a string", () => {
    expect(() => deriveAll(edited([TASK_MT, '"metric": "top-1 accuracy over the test items", ', ""]))).toThrow(
      /mini-module_type\.json: field "metric" is missing/,
    );
    expect(() => deriveAll(edited([TASK_MT, '"baseline_top1": 1.0', '"baseline_top1": "1.0"']))).toThrow(
      /mini-module_type\.json: field "baseline_top1" must be a number/,
    );
    expect(() => deriveAll(edited([REF, '"replicates": 10', '"replicates": "10"']))).toThrow(
      /reference_results\.json entry mini-module_type: field "replicates" must be a number/,
    );
  });

  it("(c) fails on n_test_items changed in reference_results.json only", () => {
    expect(() => deriveAll(edited([REF, '"n_test_items": 1', '"n_test_items": 2']))).toThrow(
      /reference_results\.json entry mini-module_type: n_test_items 2 differs from 1 in modes\/benchmark\/tasks\/mini-module_type\.json/,
    );
  });

  it("(d) fails on a paper listed twice and on a paper missing from split.csv", () => {
    expect(() => deriveAll(edited([SPLIT, "mini,PaperB2025,test,\n", "mini,PaperB2025,test,\nmini,PaperB2025,test,\n"]))).toThrow(
      /split\.csv row 4: paper PaperB2025 is listed twice/,
    );
    expect(() => deriveAll(edited([SPLIT, "mini,PaperB2025,test,\n", ""]))).toThrow(
      /split\.csv: paper PaperB2025 of index\.json is missing/,
    );
    expect(() => deriveAll(edited([SPLIT, "mini,PaperB2025,test,", "mini,PaperB2025,dev,"]))).toThrow(
      /split\.csv row 3: split "dev" is not train, test or excluded/,
    );
    expect(() => deriveAll(edited([SPLIT, "mini,PaperB2025,test,", "mini,PaperB2025,test,too new"]))).toThrow(
      /split\.csv row 3: exclusion_reason on a row whose split is test/,
    );
    expect(() => deriveAll(edited([SPLIT, "mini,PaperB2025,test,", "mini2,PaperB2025,test,"]))).toThrow(
      /split\.csv: more than one benchmark_id: mini, mini2/,
    );
  });

  it("(e) fails on an item whose split differs from its paper's", () => {
    expect(() => deriveAll(edited([ITEMS_MT, "PaperB2025/P1,test,software", "PaperB2025/P1,train,software"]))).toThrow(
      /items_module_type\.csv row 6 \(PaperB2025\/P1\/S1\): split "train" differs from the split "test" of paper PaperB2025 in modes\/benchmark\/split\.csv/,
    );
    expect(() => deriveAll(edited([ITEMS_MT, "PaperB2025,PaperB2025/P1,test,software,chem,analyze_data,START,END,,,,,0", "PaperB2025,PaperB2025/P1,test,software,chem,analyze_data,START,END,,,,,2"]))).toThrow(
      /items_module_type\.csv row 6 \(PaperB2025\/P1\/S1\): uncertain "2" is not 0 or 1/,
    );
    expect(() => deriveAll(edited([ITEMS_TM, "mini-transfer_mode,PaperA2024/P2/E1", "mini-module_type,PaperA2024/P2/E1"]))).toThrow(
      /items_transfer_mode\.csv row 2 \(PaperA2024\/P2\/E1\): task_id "mini-module_type" is not the task mini-transfer_mode/,
    );
  });

  it("(f) fails on a module_type label that is not the first module's type and on a non-material connection", () => {
    expect(() => deriveAll(edited([ITEMS_MT, "PaperA2024/P2/S1,PaperA2024,PaperA2024/P2,train,fluidics", "PaperA2024/P2/S1,PaperA2024,PaperA2024/P2,train,robot_arm"]))).toThrow(
      /items_module_type\.csv row 4 \(PaperA2024\/P2\/S1\): label "robot_arm" is not the module type "fluidics" of the step's first module/,
    );
    expect(() => deriveAll(edited([ITEMS_TM, "PaperA2024/P2/E2", "PaperA2024/P2/E3"]))).toThrow(
      /items_transfer_mode\.csv row 3 \(PaperA2024\/P2\/E3\): the connection is not material/,
    );
  });

  it("(g) fails on a label that is not a class and on a from_family that is not the unit operation's family", () => {
    expect(() => deriveAll(edited([ITEMS_MT, "train,fluidics,chem,dispense_liquid,START,analyze_data", "train,pump,chem,dispense_liquid,START,analyze_data"]))).toThrow(
      /items_module_type\.csv row 2 \(PaperA2024\/P1\/S1\): label "pump" is not a module_type class/,
    );
    expect(() => deriveAll(edited([ITEMS_TM, "dispense_liquid,measure_optical,prepare,measure,0", "dispense_liquid,measure_optical,react,measure,0"]))).toThrow(
      /items_transfer_mode\.csv row 2 \(PaperA2024\/P2\/E1\): from_family "react" is not the family "prepare" of dispense_liquid/,
    );
  });

  it("(h) fails when the test items disagree with n_test_items in both the task and the reference", () => {
    expect(() => deriveAll(edited([TASK_MT, '"n_test_items": 1', '"n_test_items": 2'], [REF, '"n_test_items": 1', '"n_test_items": 2']))).toThrow(
      /items_module_type\.csv: 1 test items, but n_test_items is 2 in modes\/benchmark\/tasks\/mini-module_type\.json/,
    );
  });

  it("(i) fails when the data-dictionary row of the split rule or an item file is missing", () => {
    expect(() => deriveAll(edited(["data_dictionary.csv", "benchmark_split,table,benchmark_id,", "benchmark_split,table,benchmark_key,"]))).toThrow(
      /data_dictionary\.csv: the row of object benchmark_split, column benchmark_id is missing/,
    );
    const dir = edited();
    rmSync(join(dir, ITEMS_TM));
    expect(() => deriveAll(dir)).toThrow(/items_transfer_mode\.csv: the item file of task mini-transfer_mode is missing/);
  });
});
