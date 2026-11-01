// Links to platforms of other papers that share this platform's identity_id (REQ-005).
import type { PlatformGraph, PlatformRow } from "../data/types";

export interface SharedLink {
  paperId: string;
  /** Empty when the paper has no platform with this identity_id: the paper is listed without a link. */
  platforms: { platformId: string; label: string }[];
}

export function sharedIdentityLinks(
  platform: Pick<PlatformGraph, "identity_id" | "shared_with">,
  rows: readonly PlatformRow[],
): SharedLink[] {
  return platform.shared_with.map((paperId) => ({
    paperId,
    platforms: rows
      .filter((r) => r.paper_id === paperId && r.identity_id === platform.identity_id)
      .map((r) => ({
        platformId: r.platform_id,
        label: r.platform_name ? `${r.platform_id} (${r.platform_name})` : r.platform_id,
      })),
  }));
}
