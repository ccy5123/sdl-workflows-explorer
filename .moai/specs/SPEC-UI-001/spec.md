---
id: SPEC-UI-001
title: "Explorer UI redesign, phases 0 to 2: design tokens and shell, readable labels, Home"
version: "0.1.0"
status: in-progress
created: 2026-11-03
updated: 2026-11-03
author: cyjoe
priority: P1
phase: "v1.1.x target"
module: "src/, public/fonts/, tests/, e2e/"
lifecycle: spec-anchored
tags: "design tokens, typefaces, top bar, theme toggle, labels, home, stat tiles, view cards"
tier: L
depends_on: [SPEC-SITE-001, SPEC-SIM-001]
---

## HISTORY

- 2026-11-03 0.1.0 draft and run. Phases 0 to 2 of the redesign plan written in the sdl-db research workspace
  (`~/research/sdl-db/drafts/explorer-ui-redesign-plan.md`, read-only from here). The researcher approved the plan and,
  on 2026-11-03, variant B of the Design canvas mock (https://claude.ai/artifact/KLi8BLk78MbhAchCk8y6iX, boards
  `ArialLight`, `ArialDark`, `ArialPhone`, file `project/Main.dc.html` with `fontset="arial"`, accent `indigo`).
  Phases 3 to 6 (platform viewer, Browse and Trends filters, other views, accessibility pass) each need their own
  approval and are out of scope. Not deployed: Pages waits for the researcher's approval of a preview build.

## 1. Why

The deployed explorer reads as stiff: GitHub-default colours, the system font, underlined text navigation, prose and
tables where a reader expects scannable units, and raw snake_case codes where a reader expects names. The first
screen a visitor sees is Home. This SPEC gives the site its own design tokens, typefaces and shell, a single way to
turn vocabulary codes into readable names, and a Home page built to the approved mock, with every number on it
taken from the built release data.

## 2. Requirements (EARS)

### Phase 0: tokens, typefaces, shell, components

- **REQ-001** (ubiquitous) `src/styles.css` shall declare the site colour tokens of mock variant B (indigo accent) in a
  light set under `:root` and a dark set under `:root[data-theme="dark"]`, equal to `SITE_TOKENS` in
  `src/lib/siteTokens.ts`. The existing names (`--bg`, `--text`, `--muted`, `--line`, `--panel`, `--accent`,
  `--highlight`, `--warn`, `--danger`, `--unmapped`) keep their roles; new names are `--card`, `--line-strong`,
  `--accent-ink` and `--accent-text`. Radii, shadows, spacing and type sizes are custom properties on `:root`. No
  hex colour appears in a site rule outside the two token blocks. Chart tokens (`--chart-*`) and the Okabe–Ito data
  colours are unchanged and are not used as UI colours.
- **REQ-002** (ubiquitous) In both sets, body text, muted text, link text (`--accent-text`) and `--accent` shall reach a
  WCAG 2 contrast of at least 4.5 against `--bg`, `--card` and `--panel`; text on `--highlight` at least 4.5;
  `--accent-ink` on `--accent` at least 4.5; the focus outline (`--accent`) at least 3 against `--bg`.
- **REQ-003** (ubiquitous) UI text shall use the Arial stack (Arial, "Helvetica Neue", Helvetica, "Liberation Sans",
  sans-serif; not shipped). Identifiers and codes (`code`, `.mono`, `kbd`) shall use JetBrains Mono, self-hosted as
  woff2 with its SIL Open Font License. Statistics and formulas (`.math`) shall use Latin Modern Roman, self-hosted as
  woff2 converted from TeX Live's `lmroman10-regular.otf` and `lmroman10-italic.otf`, with the GUST Font License
  shipped beside them, set 10% larger than the surrounding text; variables are italic, numbers and intervals upright.
- **REQ-004** (ubiquitous) Every page shall have a sticky top bar with a logo mark and the site name as a link to Home,
  the view links as tabs with a pill on the current one (`aria-current="page"`, same names and rules as SPEC-SITE-001
  REQ-010), a chip with the release version linking to the release DOI, and a theme toggle. Below 800 px the tabs move
  to a second row that scrolls sideways inside itself. The footer is a compact block of two groups: the site name,
  data version and DOI; the author link and the issue-form link. The skip link stays the first focus stop.
- **REQ-005** (event-driven) When the visitor presses the theme toggle, the site shall switch between the light and
  dark sets and remember the choice in this browser; without a remembered choice the theme follows the system colour
  scheme as before, including changes while the page is open. This supersedes the "No theme switch is added to the
  page" sentence of SPEC-SITE-001 REQ-008. A browser that refuses storage still switches for the open page.
- **REQ-006** (ubiquitous) `styles.css` shall hold one section each for Button (primary, secondary, ghost, icon), Chip,
  Card, StatTile, Skeleton and CopyButton. The app-level loading state shows a skeleton with the accessible text
  "Loading…". Hover, press and panel transitions take 120 to 200 ms and are switched off under
  `prefers-reduced-motion: reduce`.

### Phase 1: readable labels

- **REQ-007** (ubiquitous) `src/lib/labels.ts` shall export `displayLabel(kind, code)`, which returns a sentence-case
  name derived from the code (`chemistry_synthesis` → "Chemistry synthesis") unless an override map gives one
  (acronyms, `instrument_*`, `measure_*`, `react_*`, `unmapped`). It is pure and UI-free.
- **REQ-008** (ubiquitous) A `<Label kind code>` component shall show the name, with the code in its `title` and in an
  accessible description, so a reader matching against the CSV can still find it.
- **REQ-009** (ubiquitous) Every class of the pinned release's `taxonomy.json` shall have a label, and no two classes
  (across all kinds) shall share one.

### Phase 2: Home

- **REQ-010** (ubiquitous) Home (`#/`) shall show, top to bottom: a hero with a release chip and a licence chip, the
  heading, one sentence on what the dataset records, a search field over the platforms with live suggestions and
  example queries, and two buttons, "Explore platforms" (primary, to Browse's platform table) and "Download data"
  (secondary, to the release DOI); beside it, a featured-platform card for the fixed id `Aand2024/P1` drawn from its
  platform file (control row, material chain with transfer modes and stated/inferred lines, the steps of one cycle,
  the platform's evidence, "Open in viewer"); a row of stat tiles with the release, date and DOI as a caption; six
  view cards (platform viewer, browse and compare, trends, taxonomy, benchmark, workflow builder), each a single link
  with a live preview from the release data; the platform list as compact rows (name, id, field chips, module and
  step counts, year), newest first, filtered by a search field, 20 rows with a "Show all" button and a link to Browse;
  a citation card with a copy button, licence chips and `CITATION.cff` in a collapsed block; and an "About the
  sample" card linking to the About page and the missing-paper issue form.
- **REQ-011** (ubiquitous) Every number on Home shall come from the built data (`index.json`, `taxonomy.json`,
  `benchmark.json`, `release-docs.json`, the featured platform's file) or, in fixed text, appear as a whole number in
  the pinned release's `DATA_CARD.md` (the SPEC-SITE-001 REQ-007 check, extended to the Home text).
- **REQ-012** (event-driven) When the visitor types in the hero search, Home shall list up to six matching platforms as
  links and the number of matches; Enter opens the first match; a "Show all matches" button fills the platform-list
  filter with the query and moves focus to it. Pressing "/" outside a text field focuses the hero search.

### No regression and limits

- **REQ-013** (ubiquitous) React, Cytoscape, Observable Plot and TanStack Table stay; no CSS framework or component
  library is added. The class names other e2e specs locate by (`.benchmark`, `.trends-chart`, `.filter-panel`,
  `.wf-*`, `.taxo-facts`, `.trends-table-details`) and all routes keep working.
- **REQ-014** (ubiquitous) `npm test`, `npm run typecheck` and `npm run e2e` pass. The existing tests that change are
  named in acceptance.md AC-12; no other existing assertion is weakened.
- **REQ-015** (unwanted) The sdl-db workspace shall not be modified, and nothing is pushed or deployed.
