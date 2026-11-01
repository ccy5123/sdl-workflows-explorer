// Hash routes of the site (REQ-001, REQ-002, REQ-004; SPEC-BROWSE-001 REQ-001). Pure: never throws.

export type Route =
  | { kind: "home" }
  | { kind: "platform"; paperId: string; platformId: string }
  | { kind: "browse"; query: string }
  | { kind: "compare"; ids: string[] }
  | { kind: "notFound"; hash: string };

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** One id of a compare route: two non-empty decodable segments, else the raw item text. */
function compareId(item: string): string {
  const parts = item.split("/");
  if (parts.length !== 2) return item;
  const paperId = decode(parts[0]!);
  const suffix = decode(parts[1]!);
  return paperId && suffix ? `${paperId}/${suffix}` : item;
}

/**
 * `#/platform/<paper_id>/<platform_suffix>` → platform; `#/browse[?<query>]` → browse; `#/compare/<id>,<id>…` →
 * compare; empty, `#` or `#/` → home; anything else → not found.
 */
export function parseRoute(hash: string): Route {
  if (hash === "" || hash === "#" || hash === "#/") return { kind: "home" };
  const notFound: Route = { kind: "notFound", hash };
  if (!hash.startsWith("#/")) return notFound;
  const rest = hash.slice(2);
  if (rest === "browse") return { kind: "browse", query: "" };
  if (rest.startsWith("browse?")) return { kind: "browse", query: rest.slice("browse?".length) };
  if (rest.startsWith("compare/")) {
    const list = rest.slice("compare/".length);
    return { kind: "compare", ids: list === "" ? [] : list.split(",").map(compareId) };
  }
  const parts = rest.split("/");
  if (parts.length !== 3 || parts[0] !== "platform") return notFound;
  const paperId = decode(parts[1]!);
  const suffix = decode(parts[2]!);
  if (!paperId || !suffix) return notFound;
  return { kind: "platform", paperId, platformId: `${paperId}/${suffix}` };
}

const encodeId = (platformId: string) => platformId.split("/").map(encodeURIComponent).join("/");

/** Hash URL of a platform id such as `Aand2024/P1`. */
export function platformHash(platformId: string): string {
  return `#/platform/${encodeId(platformId)}`;
}

/** Hash URL of the comparison of the given platform ids, in that order. */
export function compareHash(platformIds: readonly string[]): string {
  return `#/compare/${platformIds.map(encodeId).join(",")}`;
}
