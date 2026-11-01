// Hash routes of the site (REQ-001, REQ-002, REQ-004). Pure: never throws.

export type Route =
  | { kind: "home" }
  | { kind: "platform"; paperId: string; platformId: string }
  | { kind: "notFound"; hash: string };

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** `#/platform/<paper_id>/<platform_suffix>` → platform; empty, `#` or `#/` → home; anything else → not found. */
export function parseRoute(hash: string): Route {
  if (hash === "" || hash === "#" || hash === "#/") return { kind: "home" };
  const notFound: Route = { kind: "notFound", hash };
  if (!hash.startsWith("#/")) return notFound;
  const parts = hash.slice(2).split("/");
  if (parts.length !== 3 || parts[0] !== "platform") return notFound;
  const paperId = decode(parts[1]!);
  const suffix = decode(parts[2]!);
  if (!paperId || !suffix) return notFound;
  return { kind: "platform", paperId, platformId: `${paperId}/${suffix}` };
}

/** Hash URL of a platform id such as `Aand2024/P1`. */
export function platformHash(platformId: string): string {
  return `#/platform/${platformId.split("/").map(encodeURIComponent).join("/")}`;
}
