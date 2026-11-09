// The visitor Worker (SPEC-VISIT-001 REQ-001 to REQ-005): POST /hit records one check-in and returns the counts,
// GET / returns the counts. One SQLite-backed Durable Object holds the counter; src/counter.ts holds the logic.
import { DurableObject } from "cloudflare:workers";
import { checkIn, corsHeaders, endDay, readCounts, type CounterStore, type Counts } from "./counter";

interface Env {
  COUNTER: DurableObjectNamespace<VisitorCounter>;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS seen (hash TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS live (hash TEXT PRIMARY KEY, last_seen INTEGER NOT NULL);
`;

function sqlStore(sql: SqlStorage): CounterStore {
  return {
    get: (key) => {
      const rows = sql.exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key).toArray();
      return rows[0]?.value ?? null;
    },
    set: (key, value) => {
      sql.exec("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
    },
    remove: (key) => {
      sql.exec("DELETE FROM meta WHERE key = ?", key);
    },
    clearDay: () => {
      sql.exec("DELETE FROM seen");
      sql.exec("DELETE FROM live");
    },
    addSeen: (hash) => sql.exec("INSERT INTO seen (hash) VALUES (?) ON CONFLICT(hash) DO NOTHING RETURNING hash", hash).toArray().length === 1,
    touch: (hash, at) => {
      sql.exec("INSERT INTO live (hash, last_seen) VALUES (?, ?) ON CONFLICT(hash) DO UPDATE SET last_seen = excluded.last_seen", hash, at);
    },
    pruneLive: (before) => {
      sql.exec("DELETE FROM live WHERE last_seen < ?", before);
    },
    countLive: (since) => sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM live WHERE last_seen >= ?", since).one().n,
  };
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class VisitorCounter extends DurableObject<Env> {
  private readonly store: CounterStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(SCHEMA);
    this.store = sqlStore(ctx.storage.sql);
  }

  async hit(ip: string | null, ua: string | null, origin: string | null): Promise<Counts> {
    const { counts, alarmAt } = await checkIn(this.store, { ip, ua, origin, now: Date.now() }, randomSalt);
    if (alarmAt !== null) await this.ctx.storage.setAlarm(alarmAt);
    return counts;
  }

  async counts(): Promise<Counts> {
    return readCounts(this.store, Date.now());
  }

  /** Midnight UTC: forget the day's salt, hashes and online rows. */
  async alarm(): Promise<void> {
    endDay(this.store);
  }
}

function json(body: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const { pathname } = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    const counter = env.COUNTER.get(env.COUNTER.idFromName("site"));
    try {
      if (request.method === "POST" && pathname === "/hit") {
        const ip = request.headers.get("CF-Connecting-IP");
        const ua = request.headers.get("User-Agent");
        return json(await counter.hit(ip, ua, origin), origin);
      }
      if (request.method === "GET" && pathname === "/") return json(await counter.counts(), origin);
      return json({ error: "not found" }, origin, 404);
    } catch {
      return json({ error: "unavailable" }, origin, 503);
    }
  },
} satisfies ExportedHandler<Env>;
