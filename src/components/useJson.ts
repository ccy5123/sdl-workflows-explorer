// Loads JSON files of public/data/ at most once per page load, shared by every view that needs them: Home shows
// counts from taxonomy.json and benchmark.json (SPEC-UI-001 REQ-011), and the taxonomy and benchmark views reuse the
// same request (SPEC-TAXO-001 AC-15, SPEC-BENCH-001 AC-13: one request per file).
import { useEffect, useState } from "react";

const requests = new Map<string, Promise<unknown>>();

/** The parsed file at `path`; the first call fetches it, later calls get the same promise. */
export function loadJsonOnce<T>(path: string): Promise<T> {
  let request = requests.get(path);
  if (!request) {
    request = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    });
    requests.set(path, request);
  }
  return request as Promise<T>;
}

export function useJson<T>(path: string): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadJsonOnce<T>(path)
      .then((d) => live && setData(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [path]);
  return { data, error };
}
