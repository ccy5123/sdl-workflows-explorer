// Home-page platform list filter (REQ-003): case-insensitive match on the platform id, name and paper id.
import type { PlatformRow } from "../data/types";

export function filterPlatforms<T extends Pick<PlatformRow, "platform_id" | "platform_name" | "paper_id">>(
  rows: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter(
    (r) =>
      r.platform_id.toLowerCase().includes(q) ||
      r.paper_id.toLowerCase().includes(q) ||
      (r.platform_name ?? "").toLowerCase().includes(q),
  );
}
