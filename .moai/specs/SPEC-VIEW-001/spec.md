---
id: SPEC-VIEW-001
title: "Platform viewer: module graph, cycle steps, evidence panel and per-platform links"
version: "0.2.0"
status: draft
created: 2026-11-01
updated: 2026-11-01
author: cyjoe
priority: P1
phase: "v0.2.0 target"
module: "src/"
lifecycle: spec-anchored
tags: "viewer, cytoscape, graph, evidence, routing"
tier: M
depends_on: [SPEC-DATA-001]
---

## HISTORY

- 2026-11-01 0.1.0 draft. Step 2 of `docs/plan.md` ("Platform viewer"). Builds on the JSON from SPEC-DATA-001
  (`public/data/index.json`, `public/data/platforms/<paper_id>.json`); no change to the data pipeline.
- 2026-11-01 0.2.0 revised after plan audit (FAIL 0.76): e2e build mode for the test hook, one link per matching
  platform for shared identities, keyboard and table acceptance, exact routing outcomes, fetch failure handling,
  selection-clear behaviour, Okabe-Ito palette named, Cytoscape pitfalls, null display, REQ-017 narrowed. After
  re-audit (PASS 0.88): REQs merged to 16 (Tier M ceiling), separate `dist-e2e/` output, module-table row in AC-11.

## 1. Why

The platform viewer is the core view of the site: a reader opens one platform and sees how its modules are
connected, which steps one cycle runs, and the page of the paper each item was coded from. Every platform needs a
stable link so the README, the paper and reviewers can point to it.

## 2. Requirements (EARS)

### Routing and navigation

- **REQ-001** (event) When the URL hash is `#/platform/<paper_id>/<platform_suffix>` (for example
  `#/platform/Aand2024/P1`), the site shall load `data/platforms/<paper_id>.json` and show that platform.
- **REQ-002** (unwanted) The site shall not throw or show a blank page for a route it cannot serve: an empty hash,
  `#` or `#/` shows home; any other hash that is not a complete platform route (`#/platform/`,
  `#/platform/Aand2024`, `#/nonsense`), a paper file that fails to load (HTTP status not ok, or a body that is not
  valid JSON), or a paper file without that platform id shows a "not found" message naming the hash and linking home.
- **REQ-003** (ubiquitous) The home page shall keep the counts table and add a platform list (platform id, name,
  paper id, year) with a text filter that matches id, name and paper id case-insensitively; each row links to its
  platform hash URL.
- **REQ-004** (state) While the reader moves between views, the site shall use hash routing so that browser back and
  forward return to the previous platform or home without a full page reload.

### Header

- **REQ-005** (ubiquitous) The platform header shall show the platform name (or the platform id when the name is
  null), the platform id, the paper title and venue (from `index.json`), first public year, field tags, the
  campaigns text when present, a "commercial integrated system" label when `commercial_integrated` is true, and the
  DOI as a link to `https://doi.org/<doi>`. When `shared_with` is not empty, it shall list, for each paper in
  `shared_with`, one link per platform of that paper whose `identity_id` equals this platform's `identity_id`; a paper
  with no such platform is listed without a link.

### Graph

- **REQ-006** (ubiquitous) The graph (Cytoscape.js with the dagre layout, left to right) shall draw one node per
  module labelled with its module type and its name in the paper, and one directed edge per connection, including
  parallel edges between the same pair of modules.
- **REQ-007** (ubiquitous) Node colour shall follow the display group of the module type (§3), using the Okabe-Ito
  colours given there; the module type name stays in the node label and in a legend.
- **REQ-008** (ubiquitous) Modules with `on_platform` true shall be children of a labelled platform boundary node
  (a compound parent); modules with `on_platform` false shall have no parent.
- **REQ-009** (ubiquitous) Edge colour and a short text label shall follow `transfer_mode` (§3); `data_transfer`
  edges are thinner.
- **REQ-010** (ubiquitous) Connections with `stated` false (inferred) shall be drawn dashed; connections and steps
  with `uncertain` true shall carry a visible "?" marker.
- **REQ-011** (ubiquitous) A legend shall list the 5 display groups with their module types (stating that the groups
  are a display choice of the site, not part of the dataset), the 6 transfer modes, and the meaning of dashed edges
  and "?" markers.

### Cycle steps

- **REQ-012** (ubiquitous) The cycle panel shall list the platform's steps sorted by `step_order`, each showing the
  order, unit operation, family, performer and the names of its modules.
- **REQ-013** (event) When the reader selects a step (click, or Enter/Space on a focused step), the site shall
  highlight that step's modules and dim the other nodes; selecting the same step again or pressing Escape shall clear
  the highlight and return the evidence panel to the platform evidence.

### Evidence

- **REQ-014** (event) When the reader selects a module (graph node or table row), a connection (graph edge or table
  row), a step, or the platform header, the evidence panel shall show the item's kind and identifier, its document
  (`main` or `SI<k>`), page and locator, its `unmapped_note` when present, and the paper DOI link; when nothing is
  selected, it shall show the platform's own evidence.
- **REQ-015** (ubiquitous) A null page, locator, family or performer shall be shown as an em dash ("—"), never as
  "null" or an empty cell.

### Accessibility and text

- **REQ-016** (ubiquitous) Below the graph, a module table (one row per module: id, type, name, on platform) and a
  connection table (one row per connection: from, to, transfer mode, stated, uncertain) shall give a text alternative
  to the graph. The platform list filter and rows, the steps, and the table rows shall be reachable with Tab and
  operable with Enter/Space; Escape clears a selection. All interface text written by the site shall be in English
  (checked by review).

## 3. Display groups and colours

The release's taxonomy has no family for module types (the `family` column is empty for all 22), so the site defines
display groups for colour only. Colours are from the Okabe-Ito palette.

| Group | Module types | Colour |
|---|---|---|
| Reactors and conditioning | batch_reactor, flow_reactor, thermal_unit, mixer | vermillion #D55E00 |
| Material handling | fluidics, liquid_handler, solid_dispenser, sample_handling_station, storage | blue #0072B2 |
| Instruments | instrument_electrochemical, instrument_imaging, instrument_optical, instrument_physical, instrument_separation_ms, instrument_structural | bluish green #009E73 |
| Processing | separation_unit, coating_printing_unit, assembly_unit | orange #E69F00 |
| Control and other | software, human, commercial_integrated, unmapped | reddish purple #CC79A7 |

| Transfer mode | Edge label | Colour |
|---|---|---|
| fixed_tubing | tubing | blue #0072B2 |
| robot_arm_gantry | arm/gantry | orange #E69F00 |
| mobile_robot | mobile robot | bluish green #009E73 |
| human_transfer | human | reddish purple #CC79A7 |
| data_transfer | data | grey #999999 (thin) |
| unmapped | unmapped | black #000000 |

## 4. How

- New dependencies: `cytoscape`, `cytoscape-dagre` (exact versions) and their types; `@playwright/test` (dev).
- Pure functions in `src/lib/` (route parsing, display groups, Cytoscape elements and style, step sorting, evidence
  formatting, identity links, list filter) carry the logic and are unit-tested without a browser.
- Cytoscape: look elements up with `cy.getElementById()` (ids contain "/"), use `curve-style: bezier` so arrows and
  parallel edges render.
- Views in `src/views/` and components in `src/components/`; plain CSS.
- Playwright tests run against `vite preview --outDir dist-e2e` of `vite build --mode e2e --outDir dist-e2e`
  (`npm run e2e`); only that mode exposes the Cytoscape instance as `window.__cy`. The production build in `dist/`
  does not. `dist-e2e/` is git-ignored.
- Unit tests that read the real `public/data/` run after `npm run build-data` and skip with a message when it is
  absent, as in SPEC-DATA-001.

## 5. Out of scope

### Out of Scope — other views

Browser and comparison, trends, taxonomy, benchmark, about page, theme switching, GitHub Pages deployment.

### Out of Scope — data

No change to `scripts/` or the JSON format (SPEC-DATA-001); display groups and colours live in the site code.

## 6. Acceptance

See `acceptance.md`.
