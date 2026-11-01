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
  "identity_id", "n_modules", "n_steps", "module_types", "material_transfer_modes",
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
      modules: 5,
      steps: 6,
      connections: 3,
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
    });
    expect(d.index.platforms[0]!.material_transfer_modes).toEqual([]);
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
      "module_type:fluidics": 2,
      "module_type:robot_arm": 1,
      "module_type:software": 2,
      "transfer_mode:data_transfer": 1,
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
    });
    expect(d.taxonomy.classes.find((c) => c.class === "analyze_data")!.family).toBe("analyze");
    expect(d.taxonomy.correspondence).toHaveLength(2);
    expect(d.taxonomy.correspondence[0]).toEqual({
      class_kind: "module_type",
      class: "fluidics",
      XDL: "Pump (exact)",
      XDL_source: "Mehr2020",
      Gottstein2026: "none",
      Gottstein2026_source: "Gottstein2026 ; pdf p.3",
    });
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
