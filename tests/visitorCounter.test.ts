// SPEC-VISIT-001 AC-1 to AC-3: the counting logic of the visitor Worker, run against an in-memory store that stands in
// for the Durable Object's SQLite tables.
import { describe, expect, it } from "vitest";
import {
  ALLOWED_ORIGINS,
  checkIn,
  corsHeaders,
  endDay,
  isBot,
  nextUtcMidnight,
  readCounts,
  utcDay,
  type CounterStore,
} from "../worker/src/counter";

class MemoryStore implements CounterStore {
  meta = new Map<string, string>();
  seen = new Set<string>();
  live = new Map<string, number>();
  get(key: string) {
    return this.meta.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.meta.set(key, value);
  }
  remove(key: string) {
    this.meta.delete(key);
  }
  clearDay() {
    this.seen.clear();
    this.live.clear();
  }
  addSeen(hash: string) {
    if (this.seen.has(hash)) return false;
    this.seen.add(hash);
    return true;
  }
  touch(hash: string, at: number) {
    this.live.set(hash, at);
  }
  pruneLive(before: number) {
    for (const [hash, at] of this.live) if (at < before) this.live.delete(hash);
  }
  countLive(since: number) {
    return [...this.live.values()].filter((at) => at >= since).length;
  }
  /** Every stored string: keys and values of all three tables. */
  dump(): string[] {
    return [...this.meta.keys(), ...this.meta.values(), ...this.seen, ...this.live.keys()];
  }
}

const SITE = ALLOWED_ORIGINS[0]!;
const UA = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";
const DAY1 = Date.UTC(2026, 10, 10, 9, 0, 0);
const MIN = 60_000;
let saltCount = 0;
const newSalt = () => `salt-${++saltCount}`;
const hit = (store: CounterStore, now: number, ip = "203.0.113.7", extra: { ua?: string; origin?: string | null } = {}) =>
  checkIn(store, { ip, ua: extra.ua ?? UA, origin: extra.origin === undefined ? SITE : extra.origin, now }, newSalt);

describe("UTC days", () => {
  it("names the UTC day and finds the next midnight", () => {
    expect(utcDay(Date.UTC(2026, 10, 10, 23, 59))).toBe("2026-11-10");
    expect(nextUtcMidnight(Date.UTC(2026, 10, 10, 23, 59))).toBe(Date.UTC(2026, 10, 11));
    expect(nextUtcMidnight(Date.UTC(2026, 11, 31, 0, 0))).toBe(Date.UTC(2027, 0, 1));
  });
});

describe("AC-1 counting", () => {
  it("counts a person once per UTC day", async () => {
    const store = new MemoryStore();
    expect((await hit(store, DAY1)).counts).toEqual({ online: 1, visitors: 1, since: "2026-11-10" });
    expect((await hit(store, DAY1 + MIN)).counts).toEqual({ online: 1, visitors: 1, since: "2026-11-10" });
    expect((await hit(store, DAY1 + 2 * MIN, "198.51.100.4")).counts).toEqual({ online: 2, visitors: 2, since: "2026-11-10" });
  });

  it("counts the same person again on the next UTC day and keeps the start date", async () => {
    const store = new MemoryStore();
    await hit(store, DAY1);
    const next = await hit(store, DAY1 + 24 * 60 * MIN);
    expect(next.counts).toEqual({ online: 1, visitors: 2, since: "2026-11-10" });
  });

  it("keeps a check-in from 4 minutes ago online and drops one from 6 minutes ago", async () => {
    const store = new MemoryStore();
    await hit(store, DAY1, "198.51.100.1");
    await hit(store, DAY1 + 2 * MIN, "198.51.100.2");
    expect(readCounts(store, DAY1 + 6 * MIN)).toEqual({ online: 1, visitors: 2, since: "2026-11-10" });
    expect(readCounts(store, DAY1 + 8 * MIN).online).toBe(0);
  });

  it("reads zero counts from an empty store without writing", () => {
    const store = new MemoryStore();
    expect(readCounts(store, DAY1)).toEqual({ online: 0, visitors: 0, since: "2026-11-10" });
    expect(store.dump()).toEqual([]);
  });
});

describe("AC-2 what is kept", () => {
  it("stores neither the IP address nor the User-Agent", async () => {
    const store = new MemoryStore();
    await hit(store, DAY1, "203.0.113.77");
    const stored = store.dump().join("\n");
    expect(stored).not.toContain("203.0.113.77");
    expect(stored).not.toContain("Firefox");
    expect(store.seen.size).toBe(1);
    expect([...store.seen][0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("starts each UTC day with a new salt, an empty hash table and the next midnight as alarm", async () => {
    const store = new MemoryStore();
    const first = await hit(store, DAY1);
    expect(first.alarmAt).toBe(Date.UTC(2026, 10, 11));
    const salt1 = store.get("salt");
    expect((await hit(store, DAY1 + MIN)).alarmAt).toBeNull();
    const hash1 = [...store.seen][0];
    await hit(store, DAY1 + 24 * 60 * MIN);
    expect(store.get("salt")).not.toBe(salt1);
    expect(store.seen.size).toBe(1);
    expect([...store.seen][0]).not.toBe(hash1);
  });

  it("forgets the day's salt, hashes and online rows when the alarm ends the day", async () => {
    const store = new MemoryStore();
    await hit(store, DAY1);
    endDay(store);
    expect(store.get("salt")).toBeNull();
    expect(store.get("day")).toBeNull();
    expect(store.seen.size).toBe(0);
    expect(store.live.size).toBe(0);
    expect(store.get("visitors")).toBe("1");
    expect(store.get("since")).toBe("2026-11-10");
  });
});

describe("AC-3 origins and bots", () => {
  it("does not count a check-in from another origin or without one, but returns the counts", async () => {
    const store = new MemoryStore();
    await hit(store, DAY1);
    expect((await hit(store, DAY1, "198.51.100.9", { origin: "https://example.org" })).counts.visitors).toBe(1);
    expect((await hit(store, DAY1, "198.51.100.9", { origin: null })).counts.visitors).toBe(1);
  });

  it.each(["Googlebot/2.1", "SomeCrawler 1.0", "a spider", "Mozilla/5.0 HeadlessChrome/140.0"])("does not count %s", async (ua) => {
    const store = new MemoryStore();
    expect(isBot(ua)).toBe(true);
    expect((await hit(store, DAY1, "198.51.100.9", { ua })).counts).toEqual({ online: 0, visitors: 0, since: "2026-11-10" });
  });

  it("does not take an ordinary browser for a bot", () => {
    expect(isBot(UA)).toBe(false);
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36")).toBe(false);
  });

  it("allows CORS for the site origin only", () => {
    expect(corsHeaders(SITE)["Access-Control-Allow-Origin"]).toBe(SITE);
    expect(corsHeaders("https://example.org")["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(corsHeaders(null)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
