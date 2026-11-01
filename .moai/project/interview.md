# Project Interview

Source: the approved plan in `docs/plan.md` (researcher, 2026-11-01) plus the decisions taken on 2026-11-01 in the
session that wrote the first SPEC. The Stage A fields below were answered by the plan; the open questions were
settled with AskUserQuestion.

## Stage A Round 1: Vision and Domain
Question: What does this project do, who is it for?
Answer: A public, static companion website for the sdl-workflows 1.0.0 dataset (hardware workflows of 280
self-driving-lab platforms from 238 papers; Zenodo DOI 10.5281/zenodo.23857126). Readers browse platform graphs
with evidence locations, compare platforms, see counts by year, and read the taxonomy.
Domain: web-data-explorer
Goal: Every platform in the release has a stable link that shows its modules, connections, steps and the page
each item was coded from; every count shown matches the release.

## Stage A Round 2: Technology and Constraints
Question: Primary stack and hard constraints?
Answer: Vite + TypeScript + React (confirmed 2026-11-01).
Constraints: static site with no server, deployable to GitHub Pages; public release data only (CC BY 4.0), no
internal database and no paper text; the release is downloaded from Zenodo at build time and verified (pinned
SHA-256 of the zip, then every file against the release's MANIFEST.sha256); derived JSON is not committed; all
site text in English; captions describe counts and draw no conclusions about the field.

## Stage A Round 3: Scope and Boundaries
Question: Key features and boundary?
Answer: Five views: platform viewer, record browser and comparison, trends dashboard, taxonomy explorer, and a
benchmark view (added 2026-11-01). Home and about pages.
Scope: In: the five views, home/about, accessibility, GitHub Pages deployment, one site showing the latest
release. Out: editing data, user accounts, a server or API, hosting a copy of the data files (downloads point to
Zenodo), older releases (reachable through Zenodo).

## Stage B Round 4: Verification, Surfaces, and Sharing
Verification: `npm test` (Vitest) for the data build and helpers; Playwright smoke test per view from step 2 on.
UI surface: has-ui
External systems: Zenodo (record 23857126, file download at build time only)
Team sharing: solo
