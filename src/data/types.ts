// Types of the JSON written to public/data/ by scripts/build-data.ts and read by the site.

export const COUNT_NAMES = [
  "papers",
  "platforms",
  "modules",
  "steps",
  "connections",
  "material_connections",
  "candidates",
] as const;

export type CountName = (typeof COUNT_NAMES)[number];
export type Counts = Record<CountName, number>;

export interface ReleaseInfo {
  version: string;
  released_on: string;
  doi: string;
  taxonomy_version: string;
  license: string;
}

export interface PaperRow {
  paper_id: string;
  doi: string;
  title: string;
  venue: string;
  first_public_year: number;
  field_tags: string[];
  integration_mode: string;
  sw_autonomy: number;
  hw_autonomy: number;
  hardware_location: string;
  n_platforms: number;
}

export interface PlatformRow {
  platform_id: string;
  paper_id: string;
  platform_name: string | null;
  first_public_year: number;
  field_tags: string[];
  commercial_integrated: boolean;
  identity_id: string;
  n_modules: number;
  n_steps: number;
  module_types: string[];
  material_transfer_modes: string[];
  /** Distinct unit operations of the platform's steps, sorted (SPEC-TAXO-001 REQ-001). */
  unit_operations: string[];
}

/**
 * public/data/search.json: what the Home search reads beyond index.json, kept out of index.json so that file stays at
 * its release baseline. `module_names`: per platform id, the distinct module names as the paper states them, in module
 * order.
 */
export interface SearchJson {
  module_names: Record<string, string[]>;
}

/** One author of the release's CITATION.cff (SPEC-SITE-001 REQ-001). */
export interface CitationAuthor {
  family: string;
  given: string | null;
  orcid: string | null;
}

/** Citation fields parsed from the release's CITATION.cff (SPEC-SITE-001 REQ-001). */
export interface Citation {
  title: string;
  version: string;
  date_released: string;
  doi: string;
  license: string;
  authors: CitationAuthor[];
}

/** public/data/release-docs.json: the release's citation and data card (SPEC-SITE-001 REQ-001). */
export interface ReleaseDocs {
  citation: Citation;
  /** CITATION.cff verbatim. */
  citation_cff: string;
  /** DATA_CARD.md verbatim. */
  data_card: string;
}

export interface IndexJson {
  release: ReleaseInfo;
  counts: Counts;
  papers: PaperRow[];
  platforms: PlatformRow[];
}

export interface Evidence {
  doc: string;
  page: number | null;
  locator: string | null;
}

export interface Module {
  module_id: string;
  module_type: string;
  name_in_paper: string | null;
  on_platform: boolean;
  unmapped_note: string | null;
  evidence: Evidence;
}

export interface Step {
  step_id: string;
  step_order: number;
  unit_operation: string;
  family: string | null;
  performed_by: string | null;
  modules: string[];
  uncertain: boolean;
  unmapped_note: string | null;
  evidence: Evidence;
}

export interface Connection {
  edge_id: string;
  from_module: string;
  to_module: string;
  transfer_mode: string;
  is_material: boolean;
  stated: boolean;
  uncertain: boolean;
  unmapped_note: string | null;
  evidence: Evidence;
}

export interface PlatformGraph {
  platform_id: string;
  paper_id: string;
  doi: string;
  first_public_year: number;
  field_tags: string[];
  name: string | null;
  commercial_integrated: boolean;
  identity_id: string;
  evidence: Evidence;
  modules: Module[];
  steps: Step[];
  connections: Connection[];
  /** Coder's summary of the campaigns run on the platform (modes/builder/platforms.csv). */
  campaigns: string | null;
  /** Other paper ids whose platforms carry the same identity_id. */
  shared_with: string[];
}

export interface PlatformFile {
  paper_id: string;
  platforms: PlatformGraph[];
}

/** A platform using a class (SPEC-TAXO-001 REQ-002); n is null for field tags. */
export interface TaxonomyExample {
  platform_id: string;
  platform_name: string | null;
  n: number | null;
}

export interface CorrespondenceTarget {
  target: string;
  /** Relation as recorded: exact, broader, narrower or none. */
  match: string;
}

/** One source of a correspondence cell: the key alone, or key, page and locator. */
export interface CorrespondenceSource {
  key: string;
  page: string | null;
  locator: string | null;
}

/** The mapping of one class into one vocabulary (one cell of the correspondence table). */
export interface CorrespondenceEntry {
  vocabulary: string;
  targets: CorrespondenceTarget[];
  sources: CorrespondenceSource[];
}

export interface TaxonomyClass {
  class_kind: string;
  class: string;
  family: string | null;
  definition: string;
  /** Items using the class: modules, connections, steps or papers depending on class_kind. */
  n_items: number;
  n_platforms: number;
  n_papers: number;
  examples: TaxonomyExample[];
  /** Null when the correspondence table has no row for the class. */
  correspondence: CorrespondenceEntry[] | null;
}

export interface TaxonomyVocabulary {
  vocabulary: string;
  /** Class kinds with at least one correspondence row for the vocabulary. */
  kinds: string[];
  source_keys: string[];
}

/** One row of the release README's table of correspondence sources. */
export interface TaxonomySource {
  keys: string[];
  vocabulary: string;
  reference: string;
  doi: string;
}

export interface TaxonomyRelation {
  match: string;
  meaning: string | null;
}

export interface TaxonomyJson {
  classes: TaxonomyClass[];
  vocabularies: TaxonomyVocabulary[];
  sources: TaxonomySource[];
  relations: TaxonomyRelation[];
}

// ---- Benchmark (SPEC-BENCH-001 REQ-001, REQ-002) ----

export const SPLITS = ["train", "test", "excluded"] as const;
export type Split = (typeof SPLITS)[number];
export type BenchmarkTarget = "module_type" | "transfer_mode";

/** Papers or items per split. */
export interface SplitCounts {
  train: number;
  test: number;
  excluded: number;
}

/** One task file of modes/benchmark/tasks/, field by field as recorded. */
export interface BenchmarkTask {
  task_id: string;
  benchmark_id: string;
  target: BenchmarkTarget;
  item_rule: string;
  inputs: string;
  metric: string;
  baseline_rule: string;
  baseline_top1: number;
  reference_model: string;
  reference_model_top1: number;
  diff_ci95_low: number;
  diff_ci95_high: number;
  n_test_items: number;
  n_test_papers: number;
  recorded_in: string;
}

export interface BenchmarkLabelCount extends SplitCounts {
  label: string;
}

/** Items, uncertain items and per-label counts of one task by split. */
export interface BenchmarkSummary {
  task_id: string;
  items: SplitCounts;
  uncertain: SplitCounts;
  /** Labels occurring among the task's items, by total count descending, then label. */
  labels: BenchmarkLabelCount[];
}

/** Items per task (in task order) of one platform, and the split of its paper. */
export interface BenchmarkPlatform {
  platform_id: string;
  split: Split;
  n: number[];
}

/** One entry of reference_results.json, field by field as recorded. */
export interface ReferenceResult {
  task_id: string;
  n_test_items: number;
  n_test_papers: number;
  baseline_top1: number;
  reference_model_top1: number;
  diff_ci95_low: number;
  diff_ci95_high: number;
  replicates: number;
}

export interface BenchmarkJson {
  benchmark_id: string;
  split_rule: string;
  split_counts: SplitCounts;
  exclusion_reasons: { reason: string; n: number }[];
  tasks: BenchmarkTask[];
  summaries: BenchmarkSummary[];
  platforms: BenchmarkPlatform[];
  reference_results: Record<string, ReferenceResult>;
  /** reference_results.json byte for byte. */
  reference_results_text: string;
}

/** The rows of one item file, in file order; `uncertain` is the number 0 or 1, every other value a string. */
export interface BenchmarkItems {
  columns: string[];
  rows: (string | number)[][];
}

/** benchmark-items.json: one entry per task id. */
export type BenchmarkItemsJson = Record<string, BenchmarkItems>;

// ---- simulation.json (SPEC-SIM-001 REQ-001 to REQ-003) -----------------------------------------

export type DurationUnit = "s" | "min" | "h" | "d";
export type Bound = "lower" | "upper" | null;

/** One `duration` row of modes/simulation/step_timing.csv, in seconds with its markers (REQ-002). */
export interface DurationRow {
  step_id: string;
  platform_id: string;
  paper_id: string;
  doi: string;
  unit_operation: string;
  seconds: number;
  value: number;
  unit: DurationUnit;
  bound: Bound;
  approximate: boolean;
  range_midpoint: boolean;
  range_low_s: number | null;
  range_high_s: number | null;
  /** `duration_batch_size` of the same step: samples handled in one run of the step. */
  samples_per_run: number | null;
  /** A time stated for several consecutive steps; null for a single-step duration. */
  joint: { step_ids: string[]; unit_operations: string[] } | null;
  evidence: Evidence;
}

export type ThroughputBasis = "experiments" | "samples × experiments per sample" | "batches × batch size";

/** One platform `throughput` row of modes/simulation/process_values.csv with its per-day value (REQ-003). */
export interface ThroughputRow {
  platform_id: string;
  paper_id: string;
  doi: string;
  kind: "measured" | "nominal";
  value: number;
  unit: string;
  per_working_day: boolean;
  bound: Bound;
  approximate: boolean;
  range_midpoint: boolean;
  range_low: number | null;
  range_high: number | null;
  n_experiments: number | null;
  elapsed_time: number | null;
  elapsed_time_unit: string | null;
  per_day: number | null;
  basis: ThroughputBasis | null;
  not_converted: string | null;
  evidence: Evidence;
}

export interface TransferTimeRow {
  edge_id: string;
  platform_id: string;
  seconds: number;
  value: number;
  unit: string;
  evidence: Evidence;
}

export type TransferAgent = "robot_arm_gantry" | "mobile_robot" | "human";

/** What "Start from a coded platform" and the similarity list need of one platform. */
export interface PlatformLayout {
  platform_id: string;
  name: string | null;
  paper_id: string;
  year: number;
  /** Steps in step_order; module_id is the primary module (null when the step names none). */
  steps: { step_id: string; unit_operation: string; module_id: string | null }[];
  /** Only the modules some step uses as its primary module. */
  modules: { module_id: string; module_type: string; name: string | null; units: number | null }[];
  /** Connections between those modules, in edge-number order. */
  connections: { from: string; to: string; transfer_mode: string; is_material: boolean; transfer_time_s: number | null }[];
  batch_size: number | null;
  parallel_units: number | null;
  transfer_agents: { agent: TransferAgent; count: number }[];
}

export interface SimulationJson {
  unit_operations: { id: string; family: string; definition: string }[];
  module_types: { id: string; definition: string }[];
  transfer_modes: { id: string; is_material: boolean; definition: string }[];
  durations: DurationRow[];
  throughputs: ThroughputRow[];
  transfer_times: TransferTimeRow[];
  platforms: PlatformLayout[];
}
