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

export interface BenchmarkJson {
  tasks: unknown[];
  split_counts: Record<string, number>;
  reference_results: unknown;
}
