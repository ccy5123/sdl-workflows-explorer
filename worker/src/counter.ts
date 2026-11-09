// Counting logic of the visitor Worker (SPEC-VISIT-001 REQ-001 to REQ-005). It runs over a small store interface so the
// same code runs on the Durable Object's SQLite tables (src/index.ts) and on an in-memory store in Vitest.
//
// A visitor is SHA-256(salt | IP | User-Agent) with a salt drawn anew each UTC day; the IP and User-Agent are never
// stored. The day's salt, hashes and online rows are deleted when the day ends, so a hash cannot be linked across
// days. `visitors` is the sum of daily distinct hashes since the first check-in.

/** A check-in within this many minutes counts as online; the About page states the same number. */
export const ONLINE_WINDOW_MINUTES = 5;
const ONLINE_WINDOW_MS = ONLINE_WINDOW_MINUTES * 60_000;

/** Origins whose check-ins are counted and which get CORS headers. */
export const ALLOWED_ORIGINS: readonly string[] = ["https://ccy5123.github.io"];

const BOT_PATTERN = /bot|crawler|spider|crawling|headless|slurp|facebookexternalhit|preview/i;

export interface Counts {
  online: number;
  visitors: number;
  since: string;
}

/** Storage of one counter: a key-value table, the day's hashes and the online rows (hash, last check-in). */
export interface CounterStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Deletes every hash and online row of the day. */
  clearDay(): void;
  /** Adds a hash to the day's set; true when it was not there yet. */
  addSeen(hash: string): boolean;
  touch(hash: string, at: number): void;
  pruneLive(before: number): void;
  countLive(since: number): number;
}

export interface CheckIn {
  ip: string | null;
  ua: string | null;
  origin: string | null;
  now: number;
}

export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function nextUtcMidnight(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export const isBot = (ua: string): boolean => BOT_PATTERN.test(ua);

export const isAllowedOrigin = (origin: string | null): boolean => origin !== null && ALLOWED_ORIGINS.includes(origin);

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function visitorHash(salt: string, ip: string, ua: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Forgets the day's salt, hashes and online rows; the running total and start date stay. */
export function endDay(store: CounterStore): void {
  store.clearDay();
  store.remove("salt");
  store.remove("day");
}

/** Opens the current UTC day if it is not open yet; returns the next midnight when it opened one, for the alarm. */
function openDay(store: CounterStore, now: number, newSalt: () => string): number | null {
  const day = utcDay(now);
  if (store.get("since") === null) {
    store.set("since", day);
    store.set("visitors", "0");
  }
  if (store.get("day") === day) return null;
  endDay(store);
  store.set("day", day);
  store.set("salt", newSalt());
  return nextUtcMidnight(now);
}

/** The counts at `now`, without writing. */
export function readCounts(store: CounterStore, now: number): Counts {
  return {
    online: store.countLive(now - ONLINE_WINDOW_MS),
    visitors: Number(store.get("visitors") ?? "0"),
    since: store.get("since") ?? utcDay(now),
  };
}

/** Records one check-in when it comes from an allowed origin and not from a bot; returns the counts either way. */
export async function checkIn(
  store: CounterStore,
  request: CheckIn,
  newSalt: () => string,
): Promise<{ counts: Counts; alarmAt: number | null }> {
  const { ip, ua, origin, now } = request;
  if (!ip || !ua || isBot(ua) || !isAllowedOrigin(origin)) return { counts: readCounts(store, now), alarmAt: null };
  const alarmAt = openDay(store, now, newSalt);
  const hash = await visitorHash(store.get("salt") as string, ip, ua);
  if (store.addSeen(hash)) store.set("visitors", String(Number(store.get("visitors") ?? "0") + 1));
  store.touch(hash, now);
  store.pruneLive(now - ONLINE_WINDOW_MS);
  return { counts: readCounts(store, now), alarmAt };
}
