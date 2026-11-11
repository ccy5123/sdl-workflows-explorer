// The index with each platform's module names from search.json, so the Home, Browse and Trends searches can match
// instruments. Until search.json has loaded (or if it fails) the plain index comes back and the searches read ids,
// titles and names only.
import { useMemo } from "react";
import type { IndexJson, SearchJson } from "../data/types";
import type { SearchablePlatform } from "../lib/filterApply";
import { useJson } from "./useJson";

export type SearchIndex = Omit<IndexJson, "platforms"> & { platforms: SearchablePlatform[] };

export function useSearchIndex(index: IndexJson): SearchIndex {
  const search = useJson<SearchJson>("data/search.json");
  return useMemo(() => {
    const names = search.data?.module_names;
    return names ? { ...index, platforms: index.platforms.map((p) => ({ ...p, module_names: names[p.platform_id] ?? [] })) } : index;
  }, [index, search.data]);
}
