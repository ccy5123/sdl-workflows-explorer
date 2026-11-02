// Loads data/release-docs.json (the citation and the data card) for the home and about pages (SPEC-SITE-001 REQ-001).
import { useEffect, useState } from "react";
import type { ReleaseDocs } from "../data/types";

export function useReleaseDocs(): { docs: ReleaseDocs | null; error: string | null } {
  const [docs, setDocs] = useState<ReleaseDocs | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("data/release-docs.json")
      .then((response) => {
        if (!response.ok) throw new Error(`data/release-docs.json: HTTP ${response.status}`);
        return response.json() as Promise<ReleaseDocs>;
      })
      .then((d) => live && setDocs(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);
  return { docs, error };
}
