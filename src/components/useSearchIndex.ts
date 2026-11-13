// The index with each platform's module names and module refs from search.json and its techniques from
// techniques.json, so the Home, Browse and Trends searches can match instruments in any spelling (SPEC-TECH-001).
// Until a file has loaded (or if it fails) the plain index comes back and the searches read ids, titles and names only.
import { useMemo } from "react";
import type { IndexJson, SearchJson, TechniquesJson } from "../data/types";
import type { SearchablePlatform } from "../lib/filterApply";
import { platformTechniques, techniqueData, type TechniqueData } from "../lib/techniqueMatch";
import { useJson } from "./useJson";

export type SearchIndex = Omit<IndexJson, "platforms"> & {
  platforms: SearchablePlatform[];
  /** The technique tags, or null until techniques.json has loaded. */
  tech: TechniqueData | null;
  /** Techniques that tag at least one module, sorted; undefined until techniques.json has loaded. */
  techOffered: string[] | undefined;
};

export function useSearchIndex(index: IndexJson): SearchIndex {
  const search = useJson<SearchJson>("data/search.json");
  const techniques = useJson<TechniquesJson>("data/techniques.json");
  const tech = useMemo(() => (techniques.data ? techniqueData(techniques.data) : null), [techniques.data]);
  return useMemo(() => {
    const names = search.data?.module_names;
    const refs = search.data?.modules;
    const platforms: SearchablePlatform[] = index.platforms.map((p) => ({
      ...p,
      ...(names ? { module_names: names[p.platform_id] ?? [] } : {}),
      ...(refs ? { module_refs: (refs[p.platform_id] ?? []).map(([id, name, evidence]) => ({ id, name, evidence })) } : {}),
      ...(tech ? { techniques: platformTechniques(tech, p.platform_id) } : {}),
    }));
    const techOffered = tech ? [...new Set(platforms.flatMap((p) => p.techniques ?? []))].sort() : undefined;
    return { ...index, platforms, tech, techOffered };
  }, [index, search.data, tech]);
}
