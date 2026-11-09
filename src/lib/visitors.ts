// Visitor count in the footer (SPEC-VISIT-001 REQ-006, REQ-008, REQ-009): which counting service to call, the check
// of its answer, and the footer and About text. The service is the Worker in worker/. Pure.

/** The origin GitHub Pages serves the site from; only there does the page check in with the real service. */
export const SITE_ORIGIN = "https://ccy5123.github.io";

/** The Worker's check-in route (worker/README.md). */
export const VISITOR_API = "https://sdl-visitors.sdl-visitors.workers.dev/hit";

/** The e2e build calls a reserved host that never resolves; e2e/visitors.spec.ts answers it with page.route. */
export const E2E_VISITOR_API = "https://visitors.invalid/hit";

/** Milliseconds between check-ins of an open, visible page. */
export const HEARTBEAT_MS = 60_000;

/** The online window of the Worker (ONLINE_WINDOW_MINUTES in worker/src/counter.ts; a unit test keeps them equal). */
export const ONLINE_MINUTES = 5;

export interface VisitorCounts {
  online: number;
  visitors: number;
  since: string;
}

/** The URL to check in with, or null when the page should not count (local preview, dev server). */
export function visitorEndpoint(mode: string, origin: string): string | null {
  if (mode === "e2e") return E2E_VISITOR_API;
  return origin === SITE_ORIGIN ? VISITOR_API : null;
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

function isIsoDay(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

/** The counts from the service's JSON, or null for anything else. */
export function parseCounts(json: unknown): VisitorCounts | null {
  if (typeof json !== "object" || json === null) return null;
  const { online, visitors, since } = json as Record<string, unknown>;
  if (!isCount(online) || !isCount(visitors) || !isIsoDay(since)) return null;
  return { online, visitors, since };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Footer line, for example "3 online · 1,204 visitors since 10 Nov 2026". */
export function visitorText({ online, visitors, since }: VisitorCounts): string {
  const noun = visitors === 1 ? "visitor" : "visitors";
  return `${online.toLocaleString("en")} online · ${visitors.toLocaleString("en")} ${noun} since ${formatDay(since)}`;
}

/** The About page section on the count. */
export const VISITOR_ABOUT = {
  heading: "Visitor count",
  paragraphs: [
    `The footer shows how many people had the site open in the last ${ONLINE_MINUTES} minutes and how many have ` +
      "visited since the count started. An open page checks in once a minute while it is in view, and each person " +
      "is counted once per day (UTC); a person who visits on two days counts twice.",
    "The count sets no cookies and stores nothing in your browser. The counting service, a Cloudflare Worker run by " +
      "the author, turns the IP address and browser name of a check-in into a one-way hash with a key drawn anew " +
      "each day. It stores the hash, not the address or browser name, and deletes the day's key and hashes at " +
      "midnight UTC.",
  ],
} as const;
