# Plan: sdl-workflows explorer (public companion site)

Status: approved by the researcher on 2026-11-01, to be built with MoAI-ADK. The stack and the open questions at
the end are still to be settled in the first SPEC. The release files are at
`~/research/sdl-db/release/out/sdl-workflows-1.0.0/` locally (read-only reference; the build fetches from Zenodo).

## Decisions taken

| Question | Decision |
|---|---|
| Audience | Public companion site, linked from the Zenodo record (10.5281/zenodo.23857126) and from ccy5123/sdl-workflows |
| Data | Public release 1.0.0 only (CC BY 4.0). No internal DB, no paper text |
| Technology | Static web app, no server; deployable to GitHub Pages |
| Code location | New public repository (working name `ccy5123/sdl-workflows-explorer`) |
| Views | Platform graph viewer, record browser and comparison, trends dashboard, taxonomy explorer |

The site shows counts from the release; captions describe them and draw no conclusions about the field.

## Proposed stack (to confirm)

- Vite + TypeScript + React, client-side routing with hash URLs so every platform has a stable link
  (`#/platform/Aand2024/P1`) that works on GitHub Pages.
- Graphs: Cytoscape.js (with the dagre layout) for module/connection networks.
- Charts: Observable Plot.
- Tables: TanStack Table (sorting, filtering, column choice).
- Tests: Vitest for the data build and helpers, Playwright for a smoke test of each view.

## Data pipeline (build time, not in the browser)

1. `scripts/fetch-release.ts` downloads `sdl-workflows-1.0.0.zip` from Zenodo, checks its SHA-256 against
   `MANIFEST.sha256`, and refuses to continue on a mismatch. The release version is pinned in one config file.
2. `scripts/build-data.ts` reads `modes/builder/platform_graphs.jsonl`, `modes/trends/papers.csv`,
   `modes/builder/*.csv`, `modes/taxonomy/*.csv` and writes compact JSON to `public/data/`:
   - `index.json`: one row per platform and per paper (for search, the browser and trends; about 520 rows),
   - `platforms/<paper_id>.json`: the graphs of one paper's platforms, loaded on demand,
   - `taxonomy.json`: classes, definitions, families, correspondence, and usage counts per class.
3. A build test checks the derived data against the release's own counts: 238 papers, 280 platforms, 1603 modules,
   2621 steps, 1687 connections (1076 material), 2172 candidates. The build fails if any differs.

Shipping derived JSON instead of `sdl-workflows.sqlite` (3.2 MB, needs a WASM SQLite) keeps the first load small
and the code typed. A "Download the data" link points to the Zenodo record, not to a copy on the site.

## Views

### 1. Platform viewer (core view)
- Graph: modules as nodes coloured by `module_type`; connections as edges styled by `transfer_mode`
  (fixed tubing, robot arm/gantry, mobile robot, human, data). Inferred connections (`stated` = 0) dashed;
  `uncertain` = 1 items marked. Off-platform modules (`on_platform` = 0) drawn outside the platform boundary.
- Cycle: the steps of one cycle in `step_order`, with unit operation, family, performer (robot, person,
  software) and module; selecting a step highlights its modules in the graph.
- Evidence panel: for any selected item, its document (`main`, `SI<k>`), page and locator, plus the paper's DOI link.
- Platform header: name, paper, year, field tags, campaigns, whether it is a commercial integrated system, and the
  other papers that share its `identity_id`.

### 2. Browser and comparison
- Filterable tables of papers and platforms: year range, field tag, integration mode, autonomy categories,
  module types present, transfer modes present, free-text search over names.
- Pick two or three platforms to see their module types, transfer modes and step sequences side by side.

### 3. Trends dashboard
- Counts by first public year, split by integration mode, field tag, software and hardware autonomy, and presence
  of each module type or transfer mode. Filters shared with the browser.
- Every chart shows n per year. 2026 is marked as partial (search run on 20 October 2026). Years before 2015 hold
  one to four papers each and are grouped or shown as counts, not shares.
- A short note under the dashboard states what the sample is (papers that passed the screening in `DATA_CARD.md`)
  and links to the data card, so the counts are not read as the whole field.

### 4. Taxonomy explorer
- The 69 classes (10 field tags, 22 module types, 6 transfer modes, 31 unit operations) with definitions and
  families.
- Correspondence to XDL, WCSO, Leong2022 (MAP), OntoLab/SAREF and Gottstein2026, with the source and page of each
  mapping.
- For each class: how many items use it, and links to example platforms.

### Shared
- Home page: what the dataset records, the counts table, the DOI and the citation (from `CITATION.cff`).
- About page: how the papers were found and coded and how far the labels can be trusted, summarised from
  `DATA_CARD.md` with a link to the full text.
- Footer on every page: data version (1.0.0) and DOI.
- Light and dark themes, usable at phone width, keyboard navigation, colour palettes that remain distinguishable
  for colour-blind readers (22 module types need grouping by family for colour, with the class name on hover and in
  the legend).
- All site text in English.

## Order of work

1. Repository scaffold, data pipeline and the count test.
2. Platform viewer.
3. Browser and comparison.
4. Trends dashboard.
5. Taxonomy explorer.
6. Benchmark view (the chrono2023 tasks, their split and the reference results as published).
7. Home and about pages, accessibility pass, GitHub Pages deployment.
8. Link the site from the README of ccy5123/sdl-workflows and from the Zenodo record's related identifiers
   (a metadata edit; asks for approval before publishing).

Each step ends with its tests passing and a screenshot check in the browser.

## Open questions (settled 2026-11-01, recorded in SPEC-DATA-001)

- Stack: React, as proposed.
- Repository `ccy5123/sdl-workflows-explorer` on the default `ccy5123.github.io/sdl-workflows-explorer`; no custom
  domain.
- Benchmark: a view is added (step 6 below); its data is derived in step 1.
- Later releases: one site showing the latest release, version in every page footer, older versions through Zenodo.
- Verification: `MANIFEST.sha256` sits inside the zip, so the build pins the zip's SHA-256 in
  `release.config.json`, checks the zip first, then checks every extracted file against `MANIFEST.sha256`.
- Derived JSON in `public/data/` is not committed; it is rebuilt from Zenodo on every build.
