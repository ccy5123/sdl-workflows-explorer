// What Home shows, derived from the built release data (SPEC-UI-001 REQ-010, REQ-011): stat tiles, the view-card
// previews, the featured platform's layout and the platform list order. No number here is written by hand. Pure.
import type { IndexJson, Module, PaperRow, PlatformGraph, PlatformRow, TaxonomyJson } from "../data/types";

/** The platform featured on Home: a fixed id, not a judgement shown on the page. */
export const FEATURED_PLATFORM = "Aand2024/P1";

/** Example queries under the hero search; tests/home.test.ts checks that each matches a platform. */
/** Example searches under the hero search: three instruments and one platform name, each matching a platform. */
export const SEARCH_EXAMPLES = ["FT-IR", "XRD", "spin coater", "RAINBOT"] as const;

/** Papers before this year share one bar in the papers-per-year preview. */
export const FIRST_YEAR_BAR = 2015;

const fmt = (n: number) => n.toLocaleString("en");

/** Classes of the taxonomy per kind. */
export function taxonomyCounts(taxonomy: TaxonomyJson): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of taxonomy.classes) out[c.class_kind] = (out[c.class_kind] ?? 0) + 1;
  return out;
}

/** The latest first-public year among the platforms and how many platforms have it. */
export function latestYear(platforms: readonly Pick<PlatformRow, "first_public_year">[]): { year: number; n: number } {
  const year = Math.max(...platforms.map((p) => p.first_public_year));
  return { year, n: platforms.filter((p) => p.first_public_year === year).length };
}

export interface StatTile {
  value: number;
  label: string;
  note: string | null;
}

/** The six stat tiles; notes that need the taxonomy are null until it has loaded. */
export function statTiles(index: IndexJson, taxonomy: TaxonomyJson | null): StatTile[] {
  const c = index.counts;
  const kinds = taxonomy ? taxonomyCounts(taxonomy) : null;
  const latest = latestYear(index.platforms);
  return [
    { value: c.papers, label: "Papers", note: `from ${fmt(c.candidates)} screened` },
    { value: c.platforms, label: "Platforms", note: `${latest.n} first public in ${latest.year}` },
    { value: c.modules, label: "Modules", note: kinds ? `${kinds.module_type ?? 0} module types` : null },
    { value: c.steps, label: "Cycle steps", note: kinds ? `${kinds.unit_operation ?? 0} unit operations` : null },
    { value: c.connections, label: "Connections", note: `${fmt(c.material_connections)} move material` },
    {
      value: taxonomy?.classes.length ?? 0,
      label: "Taxonomy classes",
      note: taxonomy ? `mapped to ${taxonomy.vocabularies.length} vocabularies` : null,
    },
  ];
}

export interface YearBar {
  label: string;
  n: number;
  /** The last year of the search, which the search covers only in part. */
  partial: boolean;
}

/** Papers per first public year: one bar before FIRST_YEAR_BAR, then every year to the latest. */
export function papersPerYear(papers: readonly Pick<PaperRow, "first_public_year">[]): YearBar[] {
  const last = Math.max(...papers.map((p) => p.first_public_year));
  const bars: YearBar[] = [
    { label: `before ${FIRST_YEAR_BAR}`, n: papers.filter((p) => p.first_public_year < FIRST_YEAR_BAR).length, partial: false },
  ];
  for (let y = FIRST_YEAR_BAR; y <= last; y++) {
    bars.push({ label: String(y), n: papers.filter((p) => p.first_public_year === y).length, partial: y === last });
  }
  return bars;
}

/** Papers per field tag, most first, then by code. */
export function fieldTagCounts(papers: readonly Pick<PaperRow, "field_tags">[]): { code: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const p of papers) for (const t of p.field_tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));
}

/** Platforms newest first, then by id. */
export function newestFirst<T extends Pick<PlatformRow, "platform_id" | "first_public_year">>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) => b.first_public_year - a.first_public_year || (a.platform_id < b.platform_id ? -1 : a.platform_id > b.platform_id ? 1 : 0),
  );
}

/** "data: CC-BY-4.0; code: MIT" → ["Data CC BY 4.0", "Code MIT"]; text without "part: id" pairs is kept whole. */
export function licenceChips(license: string): string[] {
  return license
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\w+):\s*(.+)$/);
      if (!m) return part;
      const id = m[2]!.trim() === "CC-BY-4.0" ? "CC BY 4.0" : m[2]!.trim();
      return `${m[1]!.charAt(0).toUpperCase()}${m[1]!.slice(1)} ${id}`;
    });
}

/** "SI1 · p. 10 · §2.2.4 ¶1": where in the paper an item was read. */
export function evidenceText(e: { doc: string; page: number | null; locator: string | null }): string {
  return [e.doc, e.page === null ? null : `p. ${e.page}`, e.locator].filter(Boolean).join(" · ");
}

export interface FeaturedLayout {
  /** Modules in no material connection (software, people): drawn above the material chain. */
  control: Module[];
  /** Modules along the material connections, in transfer order. */
  chain: Module[];
  /** The connection between chain[i] and chain[i + 1]; empty when the material links are not one path. */
  links: { mode: string; stated: boolean }[];
  /** Connections that move no material (data links). */
  dataLinks: number;
}

/**
 * Layout of the featured-platform card (design.md §4). When the material connections form one simple path, the
 * chain walks it from the module with no incoming material link; otherwise the chain lists the material modules in
 * the order the cycle's steps first use them, without links.
 */
export function featuredLayout(p: Pick<PlatformGraph, "modules" | "connections" | "steps">): FeaturedLayout {
  const byId = new Map(p.modules.map((m) => [m.module_id, m]));
  const material = p.connections.filter((c) => c.is_material);
  const inChain = new Set(material.flatMap((c) => [c.from_module, c.to_module]));
  const control = p.modules.filter((m) => !inChain.has(m.module_id));
  const dataLinks = p.connections.length - material.length;

  const outgoing = new Map<string, typeof material>();
  const incoming = new Map<string, number>();
  for (const c of material) {
    outgoing.set(c.from_module, [...(outgoing.get(c.from_module) ?? []), c]);
    incoming.set(c.to_module, (incoming.get(c.to_module) ?? 0) + 1);
  }
  const starts = [...inChain].filter((id) => !incoming.has(id));
  const isPath =
    starts.length === 1 &&
    [...outgoing.values()].every((cs) => cs.length === 1) &&
    [...incoming.values()].every((n) => n === 1) &&
    material.length === inChain.size - 1;

  if (isPath) {
    const chain: Module[] = [];
    const links: FeaturedLayout["links"] = [];
    for (let id: string | undefined = starts[0]; id; ) {
      chain.push(byId.get(id)!);
      const next = outgoing.get(id)?.[0];
      if (next) links.push({ mode: next.transfer_mode, stated: next.stated });
      id = next?.to_module;
    }
    return { control, chain, links, dataLinks };
  }

  const firstUse = (id: string) => {
    const s = p.steps.find((st) => st.modules.includes(id));
    return s ? s.step_order : Number.POSITIVE_INFINITY;
  };
  const chain = p.modules.filter((m) => inChain.has(m.module_id)).sort((a, b) => firstUse(a.module_id) - firstUse(b.module_id));
  return { control, chain, links: [], dataLinks };
}
