// Hash routes of the site (REQ-001, REQ-002, REQ-004; SPEC-BROWSE-001 REQ-001; SPEC-TRENDS-001 REQ-001; SPEC-TAXO-001
// REQ-009; SPEC-BENCH-001 REQ-005; SPEC-SITE-001 REQ-005; SPEC-SIM-001 REQ-005). Pure: never throws.
import { displayLabel } from "./labels";

export type Route =
  | { kind: "home" }
  | { kind: "about" }
  | { kind: "platform"; paperId: string; platformId: string }
  | { kind: "browse"; query: string }
  | { kind: "trends"; query: string }
  | { kind: "compare"; ids: string[] }
  | { kind: "taxonomy"; source?: string }
  | { kind: "taxonomyClass"; classKind: string; cls: string }
  | { kind: "benchmark" }
  | { kind: "benchmarkItems"; query: string }
  | { kind: "workflow"; query: string }
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
 * compare; `#/taxonomy` → taxonomy; `#/taxonomy?source=<key>` → taxonomy with a target source;
 * `#/taxonomy/<kind>/<class>` → taxonomy class; `#/benchmark` → benchmark; `#/benchmark/items[?<query>]` → benchmark
 * items; `#/workflow[?<query>]` → workflow builder; `#/about` → about; empty, `#` or `#/` → home; anything else → not found.
 */
export function parseRoute(hash: string): Route {
  if (hash === "" || hash === "#" || hash === "#/") return { kind: "home" };
  const notFound: Route = { kind: "notFound", hash };
  if (!hash.startsWith("#/")) return notFound;
  const rest = hash.slice(2);
  if (rest === "about") return { kind: "about" };
  if (rest === "browse") return { kind: "browse", query: "" };
  if (rest.startsWith("browse?")) return { kind: "browse", query: rest.slice("browse?".length) };
  if (rest === "trends") return { kind: "trends", query: "" };
  if (rest.startsWith("trends?")) return { kind: "trends", query: rest.slice("trends?".length) };
  if (rest.startsWith("compare/")) {
    const list = rest.slice("compare/".length);
    return { kind: "compare", ids: list === "" ? [] : list.split(",").map(compareId) };
  }
  if (rest === "taxonomy") return { kind: "taxonomy" };
  if (rest.startsWith("taxonomy?")) {
    const query = rest.slice("taxonomy?".length);
    if (query.includes("&") || !query.startsWith("source=")) return notFound;
    const source = decode(query.slice("source=".length));
    return source ? { kind: "taxonomy", source } : notFound;
  }
  if (rest.startsWith("taxonomy/")) {
    const segments = rest.slice("taxonomy/".length).split("/");
    if (segments.length !== 2) return notFound;
    const classKind = decode(segments[0]!);
    const cls = decode(segments[1]!);
    return classKind && cls ? { kind: "taxonomyClass", classKind, cls } : notFound;
  }
  if (rest === "benchmark") return { kind: "benchmark" };
  if (rest === "benchmark/items") return { kind: "benchmarkItems", query: "" };
  if (rest.startsWith("benchmark/items?")) return { kind: "benchmarkItems", query: rest.slice("benchmark/items?".length) };
  if (rest === "workflow") return { kind: "workflow", query: "" };
  if (rest.startsWith("workflow?")) return { kind: "workflow", query: rest.slice("workflow?".length) };
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

/** Hash URL of a taxonomy class page, each segment percent-encoded. */
export function taxonomyHash(kind: string, cls: string): string {
  return `#/taxonomy/${encodeURIComponent(kind)}/${encodeURIComponent(cls)}`;
}

/** Hash URL of the taxonomy overview targeting the sources row with this key. */
export function taxonomySourceHash(key: string): string {
  return `#/taxonomy?source=${encodeURIComponent(key)}`;
}

/** Hash URL of the workflow builder with an encoded state query (SPEC-SIM-001 REQ-007). */
export function workflowHash(query: string): string {
  return query === "" ? "#/workflow" : `#/workflow?${query}`;
}

/** Name of a route in the document title, "<name> · SDL Workflows Explorer" (SPEC-SITE-001 REQ-010). */
export function routeTitle(route: Route): string {
  switch (route.kind) {
    case "home":
      return "Home";
    case "about":
      return "About";
    case "platform":
      return `Platform ${route.platformId}`;
    case "browse":
      return "Browse";
    case "compare":
      return "Compare";
    case "trends":
      return "Trends";
    case "taxonomy":
      return "Taxonomy";
    case "taxonomyClass":
      // The readable name of the class (SPEC-UI-001 phase 5); the hash keeps the code.
      return `Taxonomy: ${displayLabel(route.classKind, route.cls)}`;
    case "benchmark":
      return "Benchmark";
    case "benchmarkItems":
      return "Benchmark items";
    case "workflow":
      return "Workflow builder";
    case "notFound":
      return "Not found";
  }
}

/** Nav link text marked as the current page for a route; null where no nav link is current (SPEC-SITE-001 REQ-010). */
export function navCurrent(route: Route): string | null {
  switch (route.kind) {
    case "home":
      return "Home";
    case "about":
      return "About";
    case "browse":
      return "Browse";
    case "trends":
      return "Trends";
    case "taxonomy":
    case "taxonomyClass":
      return "Taxonomy";
    case "benchmark":
    case "benchmarkItems":
      return "Benchmark";
    case "workflow":
      return "Workflow";
    default:
      return null;
  }
}
