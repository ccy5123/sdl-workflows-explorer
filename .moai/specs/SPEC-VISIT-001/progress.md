# Progress: SPEC-VISIT-001

## §E.1 Plan

- Options compared on 2026-11-09 (prices from each service's own page that day) and put to the researcher through
  AskUserQuestion:
  - Cloudflare Worker + SQLite Durable Object: $0 on Workers Free (100,000 requests a day; 100,000 rows written,
    5 million read a day; 5 GB); no cookies; `online` from check-ins of the last 5 minutes. Needs a Cloudflare account.
  - GoatCounter: $0 for reasonable public use; no cookies; public `TOTAL` counter cached up to 4 hours; no current
    count, so "now" would have been "today".
  - Abacus hit counter: $0, no account; cumulative only, anyone can raise it, no privacy statement.
  - Plausible: from about $9 a month; realtime visitors, but its API key needs a proxy Worker anyway.
- Chosen: the Worker; visitors counted once per UTC day by a salted hash (IP + User-Agent, salt redrawn daily);
  footer on every page.
- The researcher's standing rules for the explorer apply: work on `main`, no extra branches; deploying (push to
  `main`, running the Pages workflow, deploying the Worker) needs the researcher's approval; `release.config.json` is
  left alone (another session is changing it).

## §E.2 Run-phase Evidence

- RED: `npx vitest run tests/visitors.test.ts tests/visitorCounter.test.ts` failed with "Failed to load url
  ../worker/src/counter ... Does the file exist?".
- GREEN: the same two files, 30 tests passed. Full suite: 48 files / 740 tests passed; `npx tsc --noEmit` exit 0;
  `worker/`: `npm run typecheck` exit 0.
- Wrangler 4.153.0 needs Node 22.12+; WSL has Node 20.19, so the dry run and local run used Windows Node 24.12 on a
  copy of `worker/`. `wrangler deploy --dry-run`: 6.28 KiB bundle, binding `COUNTER (VisitorCounter)`.
- `wrangler dev` (local), curl: empty `GET /` → `{online 0, visitors 0}`; first check-in → 1/1; the same IP and UA
  again → 1/1; another UA → 2/2; Googlebot and Origin `https://example.org` → not counted (2/2). The allowed origin
  gets `Access-Control-Allow-Origin` and `Cache-Control: no-store`; `https://example.org` gets no CORS header; no
  `Set-Cookie`. The local Durable Object SQLite file holds no `127.0.0.1`, `Firefox` or `Googlebot`.
- `npm run e2e`: 316 passed, 1 failed (`site.spec.ts` About heading list, which now ends with "Visitor count"; the
  list was extended). Rerun of site, visitors, pages and a11y specs: 102 passed.

## §E.3 Deployment (approved by the researcher through AskUserQuestion, 2026-11-10)

- The researcher signed in through `wrangler login` (scopes account:read, user:read, workers:write,
  workers_scripts:write). The first `wrangler deploy` registered the `workers.dev` subdomain `sdl-visitors`; the
  Worker is at `https://sdl-visitors.sdl-visitors.workers.dev` (version 836d5472, preview URLs off). Its TLS
  certificate came up some minutes after the first deploy.
- `main` pushed (2cca4e5..cb1908a); Pages workflow run 42647033483 passed (typecheck, Vitest, build, deploy).
- Live check (built-in browser, `https://ccy5123.github.io/sdl-workflows-explorer/`): footer "1 online · 1 visitor
  since 9 Nov 2026" on `#/` and `#/about`, which has the "Visitor count" section; `document.cookie` empty,
  `localStorage` empty. `GET /` on the Worker returned `{"online":1,"visitors":1,"since":"2026-11-09"}`. That first
  visitor is this check.
