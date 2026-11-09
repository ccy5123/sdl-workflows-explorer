# sdl-visitors: the explorer's visitor count

A Cloudflare Worker with one SQLite-backed Durable Object that counts visitors of
`https://ccy5123.github.io/sdl-workflows-explorer/` (SPEC-VISIT-001). The site's footer checks in once on load and
once a minute while the tab is visible, and shows the two numbers the Worker returns.

| Route | Does | Returns |
|---|---|---|
| `POST /hit` | records one check-in from the site's origin | `{"online", "visitors", "since"}` |
| `GET /` | records nothing | the same counts |

- `online`: distinct visitors with a check-in in the last 5 minutes.
- `visitors`: distinct visitors per UTC day, summed since `since` (the first counted day).

A visitor is SHA-256 of a per-day random salt, the IP address and the User-Agent. Neither the address nor the
User-Agent is stored; the day's salt, hashes and online rows are deleted at midnight UTC by a Durable Object alarm.
Check-ins from other origins and from User-Agents that look like bots are not counted. No cookies, no request logs
(`[observability] enabled = false`).

The counting logic is `src/counter.ts`; its tests run with the site's Vitest suite (`tests/visitorCounter.test.ts`).

## Cost

Workers Free plan: 100,000 requests a day; SQLite Durable Objects 100,000 rows written and 5 million read a day,
5 GB stored. One visitor writes about three rows per check-in. Past a limit the Worker answers with an error until
00:00 UTC and the footer shows no count.

## Deploy

Wrangler 4 needs Node.js 22.12 or later.

```bash
cd worker
npm ci
npx wrangler login     # once, in the browser, with the Cloudflare account
npx wrangler deploy
```

The account's `workers.dev` subdomain is `sdl-visitors` (registered by the first deploy on 2026-11-09), so the
Worker is at `https://sdl-visitors.sdl-visitors.workers.dev`. `VISITOR_API` in `src/lib/visitors.ts` points at its
`/hit` route; after changing it, run the Pages workflow to rebuild the site.

Check the live counts:

```bash
curl -s https://sdl-visitors.sdl-visitors.workers.dev/
```
