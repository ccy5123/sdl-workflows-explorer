---
id: SPEC-VISIT-001
title: "Visitor count in the site footer"
version: "0.1.0"
status: completed
created: 2026-11-10
updated: 2026-11-10
author: cyjoe
priority: P3
phase: "post-release"
module: "src/, worker/"
lifecycle: spec-anchored
tags: "visitors, footer, cloudflare worker, privacy"
tier: M
depends_on: [SPEC-UI-001]
---

## HISTORY

- 2026-11-10 0.1.0 draft. The researcher asked for two numbers on the site: people on it now, and visitors in total.
  Of four options compared on 2026-11-09 (a Cloudflare Worker with a Durable Object, GoatCounter, the Abacus hit
  counter, Plausible behind a proxy) the researcher chose the Worker, counting each person once per UTC day by a
  salted hash, with the numbers in the footer of every page.

## 1. Why

The site is cited from a manuscript and a Zenodo record. A visitor count tells the maintainer and readers that the
site is in use, without accounts, cookies or an analytics script, and without making the site itself dynamic.

## 2. Requirements (EARS)

### Counting service (`worker/`)

- **REQ-001** (ubiquitous) A Cloudflare Worker `sdl-visitors` with one SQLite-backed Durable Object shall answer
  `POST /hit` (record one check-in, return the counts) and `GET /` (return the counts, record nothing) with JSON
  `{"online": n, "visitors": n, "since": "YYYY-MM-DD"}` and `Cache-Control: no-store`.
- **REQ-002** (ubiquitous) A visitor shall be identified only by SHA-256 of a random salt, the IP address and the
  User-Agent. The salt shall be drawn anew for each UTC day; the day's salt, hashes and online rows shall be deleted at
  the next UTC midnight (a Durable Object alarm) or at the first check-in of a later day, whichever comes first. The IP
  address and User-Agent shall not be stored.
- **REQ-003** (event) When a check-in carries a hash not yet seen that UTC day, `visitors` shall grow by one.
  `online` shall be the number of hashes with a check-in in the last 5 minutes.
- **REQ-004** (unwanted) A check-in shall not be counted when its `Origin` is not an allowed site origin or its
  User-Agent matches a bot pattern; the counts are still returned.
- **REQ-005** (ubiquitous) Responses shall carry `Access-Control-Allow-Origin` only for the allowed origins
  (`https://ccy5123.github.io`). The Worker sets no cookie and keeps no request log.

### Footer (`src/`)

- **REQ-006** (ubiquitous) A UI-free module `src/lib/visitors.ts` shall choose the endpoint (the Worker on the
  GitHub Pages origin, a reserved `.invalid` host in the e2e build, none elsewhere), validate the response, and build
  the footer text "N online · N visitors since D Mon YYYY".
- **REQ-007** (state) While the site is open in a visible tab, the page shall check in on load and every 60 seconds,
  with `credentials: "omit"`, and shall store nothing in the browser.
- **REQ-008** (unwanted) When the service cannot be reached, answers with an error status or answers malformed
  JSON, the footer shall show no count and the page shall raise no error.
- **REQ-009** (ubiquitous) The About page shall state what is counted and what is kept, in a section of its own.

### No regression

- **REQ-010** (unwanted) The change shall not alter `release.config.json`, the data files or `scripts/`, shall add no
  UI library and no font, and shall leave all existing Vitest and Playwright tests passing.

## 3. How

- `worker/src/counter.ts` holds the counting logic over a small store interface, so Vitest runs it against an
  in-memory store; `worker/src/index.ts` binds it to the Durable Object's SQLite storage and the HTTP routes.
- `src/components/VisitorCount.tsx` runs the check-ins and renders one `<span>` in the footer's left column.
- Deploying the Worker needs the researcher's Cloudflare account (`npx wrangler login`, then `npx wrangler deploy` in
  `worker/`); the site then needs the Pages workflow run. See `worker/README.md`.

## 4. Out of scope

No page-view analytics, referrers, paths or per-country figures. No change to the data release or its pin.

## 5. Acceptance

See `acceptance.md`.
