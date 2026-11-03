---
id: SPEC-UI-001
title: "Explorer UI redesign, phases 0 to 3: design tokens and shell, readable labels, Home, platform viewer"
version: "0.8.0"
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
- 2026-11-03 0.2.0 REQ-016: below 800 px the tabs collapse into a menu instead of a sideways-scrolling row, as the
  redesign plan's shell section says; the researcher approved the change after seeing the tab row cut off at 375 px.
- 2026-11-03 0.3.0 REQ-017 to REQ-020: phase 3 of the plan (platform viewer), approved by the researcher. This
  supersedes SPEC-VIEW-001's evidence panel that showed the platform's evidence while nothing was selected.
- 2026-11-03 0.4.0 REQ-021 to REQ-023: follow-up to phase 3, approved by the researcher before phase 4. Graph labels
  and the legend use readable names (the phase-3 result still printed codes there); the evidence sheet docks beside
  the content from 1024 px instead of floating over the header buttons; the selection resets on entering a platform
  route. REQ-019's bottom sheet now applies below 1024 px instead of 800 px.
- 2026-11-03 0.4.1 REQ-024: with the sheet docked, the rightmost module of `Aand2024/P1` was cut off at 1440 px until
  "Fit to view" was pressed; the researcher approved the refit fix.
- 2026-11-03 0.5.0 REQ-025 to REQ-027: phase 4 of the plan (Browse and Trends filters), approved by the researcher.
  This supersedes the checkbox column and the "Filters (N active)" toggle of SPEC-BROWSE-001 and SPEC-TRENDS-001.
- 2026-11-03 0.5.1 REQ-028: phase 4 leftovers approved by the researcher (Trends labels, a Columns popover, popover
  options that were clipped and named with the code twice). Supersedes SPEC-TRENDS-001's "value as stored" labels.
- 2026-11-03 0.6.0 REQ-029 to REQ-034: phase 5 of the plan (Taxonomy, Benchmark, Workflow builder, About) with the
  Workflow chart restyle, approved by the researcher. Presentation only.
- 2026-11-03 0.7.0 REQ-035 to REQ-038: platform viewer graph improvements approved by the researcher (labels and
  captions, top-to-bottom layout on phones, minimap, step preview).
- 2026-11-03 0.8.0 REQ-039: workflow graph preview approved by the researcher. Design check: `WorkflowState` holds
  modules, ordered steps and per-boundary transfers, which is enough for a graph without a model change.

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
  REQ-010), a chip with the release version linking to the release DOI, and a theme toggle. Below 800 px the tabs
  give way to a menu (REQ-016). The footer is a compact block of two groups: the site name,
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

### Follow-up: menu below 800 px

- **REQ-016** (state, event-driven) While the viewport is narrower than 800 px, the top bar shall show a menu button
  (named "Menu", with `aria-expanded` and `aria-controls`) beside the theme toggle instead of the tabs. When pressed,
  it shall open a panel over the page, without moving the page, listing every view with the current one marked
  `aria-current="page"`, and move focus to the first link. The panel shall close on Escape and on choosing a view
  (focus back on the button), on a route change, on a click outside it and when focus leaves it. Its entry animation
  is off under `prefers-reduced-motion: reduce`. From 800 px up the tabs stay, all in one row.

### Phase 3: platform viewer

- **REQ-017** (ubiquitous) The platform header shall be a card with the platform id, the title, chips for the first
  public year, each field tag (readable label, code in `title`) and a commercial integrated system, the paper and
  campaigns, a "DOI" link button to the paper and a "Show platform evidence" button, and the correction link.
- **REQ-018** (ubiquitous) The graph shall take the full content width with a floating toolbar: "Fit to view", "Zoom
  in", "Zoom out" and a "Legend" toggle (`aria-expanded`) that shows the legend over the graph. Node labels are 13 px
  in the UI font and wrap at 150 px; dagre spaces node-and-label boxes (`nodeDimensionsIncludeLabels`, nodeSep 36,
  rankSep 70, edgeSep 16), so no two module labels overlap. The Okabe–Ito data colours are unchanged.
- **REQ-019** (state, event-driven) While nothing is selected, the evidence sheet shall not be shown and an empty
  state under the graph says how to select an item. When a module, connection, step, table row or the platform is
  selected, an evidence sheet (named "Evidence") shall open beside the content (REQ-022), or at the bottom of the
  screen below 1024 px, with the selected item's evidence, and focus moves to its "Close evidence" button. Escape or the close
  button closes it and returns focus to the element that opened it. The page shall not scroll sideways at 375 px.
- **REQ-020** (ubiquitous) The cycle steps shall be a vertical timeline: a numbered marker on a line, the unit
  operation as a readable label, the performer with an icon (robot, software, human, or not stated), the family and
  the modules. The step buttons keep `.steps .step`, `data-step-order` and `aria-pressed`.

### Phase 3 follow-up

- **REQ-021** (ubiquitous) Graph node labels shall show the module type through `displayLabel` (then the name in the
  paper), and edge labels the transfer mode through `displayLabel`. The vocabulary code stays readable beside the
  name in the legend (each module type under its group, each transfer mode) and in the evidence sheet's type row
  ("Type", "Transfer mode" or "Operation") of a selected module, connection or step.
- **REQ-022** (state) While the viewport is 1024 px or wider and the sheet is open, the sheet shall take its own column
  beside the header, graph and tables, sticking below the top bar while the page scrolls, so it covers none of the
  header or graph controls; the graph follows its narrower box and keeps its centre.
- **REQ-023** (event-driven) When a platform route is entered, from another route or another platform, nothing shall
  be selected and the sheet shall be closed.
- **REQ-024** (event-driven) When the graph's box changes size (the sheet opens or closes, the window resizes), the
  graph shall resize and, unless the reader has zoomed or panned since the last fit, fit again by the readable rule
  of REQ-018 (a graph too long for zoom 1, such as `Kim2026/P1`, keeps zoom 1 and is panned), without animation. The
  open sheet shall take the page's side margin first (the page widens by the sheet's 320 px column, up to the
  window), so at 1440 px the whole graph of `Aand2024/P1` stays in view with the sheet open and after it closes.

### Phase 4: Browse and Trends filters

- **REQ-025** (ubiquitous, event-driven) Browse and Trends shall show one filter bar above the results: the search
  field, the year range ("From", "To"), and a popover button per checkbox group (field tag, integration mode,
  software and hardware autonomy, module types, transfer modes, unit operations) labelled with the group and, when
  values are chosen, their number ("Field tag · 2"). A popover lists the options by readable name with the code beside
  it (autonomy levels by their texts) and, for module types, transfer modes and unit operations, the all/any control.
  One popover is open at a time; it closes on Escape (focus back on its button), on a click outside and when focus
  leaves it, and stays inside the window. Below the bar, each active filter shows as a pill with a remove button, then
  "Clear all". The bar wraps on narrow screens without sideways scroll. The filter state, its URL format and the
  `.filter-panel` class stay as they were.
- **REQ-026** (ubiquitous) Trends "Split by" shall be a segmented control over the same radio buttons (group "Split
  by", arrow keys move the choice); the table and unit switches take the same segmented look.
- **REQ-027** (ubiquitous, event-driven) The browser tables shall scroll inside their box with the header row kept in
  view, highlight the row under the pointer, and cut titles, venues and platform names to one line with the full text
  in `title`. Coded columns (field tags, integration mode, module types, transfer modes) show readable names (code in
  `title`); a "Show codes" button (`aria-pressed`) beside the column chooser switches them to the codes.
- **REQ-028** (ubiquitous) Trends shall name coded split values by `displayLabel` in the count-table rows, the chart
  legend and the bars' and cells' accessible names, with the code in `title`; links and the URL keep the codes. The
  browser's column chooser shall be a "Columns · N" popover (N columns shown) beside "Show codes", built as the filter
  popovers. A popover grows to fit its options up to the window's width less 16 px (at most 560 px); an option whose
  name and code do not fit on one line puts the whole code under the name. Each option shows its code once and its
  checkbox is named "Name (code)".

### Phase 5: Taxonomy, Benchmark, Workflow builder, About (presentation only)

- **REQ-029** (ubiquitous) The four pages shall show the skeleton of REQ-006 while their data loads, and each shall put
  its long method prose in one closed "How this works" disclosure: the overview caption's note on counts (Taxonomy),
  the metric definition and "Run the evaluation yourself" (Benchmark), the builder's introduction (Workflow), and the
  builder's method paragraphs (About). Results, counts, captions that state a result, messages and the correction
  links stay visible; no wording changes.
- **REQ-030** (ubiquitous) A taxonomy class page shall be headed by the readable name with the code as a chip under
  it, and its document title shall be "Taxonomy: <readable name>"; overview and example links read readable names with
  the code beside the link; benchmark label rows read readable names. Hrefs, URLs and commands keep codes.
- **REQ-031** (ubiquitous) Statistics, counts inside statistics and intervals on Benchmark and Workflow shall use the
  Latin Modern `.math` face (variables italic, numbers upright); the values are unchanged.
- **REQ-032** (ubiquitous) The pages' sections and facts lists shall be cards with the site's buttons and chips.
- **REQ-033** (ubiquitous, event-driven) The builder's steps shall be cards in an ordered list, each with its three
  fields and the buttons "Move step i up", "Move step i down" and "Remove step i"; after a move, focus stays on the
  moved step's button.
- **REQ-034** (ubiquitous) The Workflow charts (simulation timeline, cycle-time and throughput strips) shall draw axis
  text, ticks and gridlines in the chart tokens of the current theme, name rows and strips by readable names with the
  code in `title`, and keep their data colours, limits and computed values.

### Platform viewer graph improvements

- **REQ-035** (ubiquitous) A module node shall show its readable type on one bold line and, below it (beside it in the
  phone layout), the equipment name on at most two lighter, smaller lines ending in an ellipsis when longer; the name
  layer is decorative (`aria-hidden`) and the full name shows as "Name in paper" in the evidence sheet of a selected
  module. Labels and captions do not overlap, and dagre spaces the room each caption needs.
- **REQ-036** (state, event-driven) While the viewport is narrower than 800 px the graph shall be laid out top to
  bottom (labels beside the dots) so `Aand2024/P1` fits the graph's width at zoom 1; from 800 px left to right. On
  crossing the breakpoint the graph lays out again and fits.
- **REQ-037** (state, event-driven) While the whole graph does not fit the view, a minimap (`aria-hidden`; the toolbar
  and tables stay the accessible path) shall show the modules and the viewport rectangle; clicking or dragging on it
  centres the view there. It is hidden while everything fits.
- **REQ-038** (event-driven) Hovering or focusing a cycle step shall preview its highlight (its modules and the
  connections between them; the rest dimmed) without opening the evidence sheet; leaving removes the preview;
  clicking keeps the highlight until it is cleared or something else is selected. Fades are off under
  `prefers-reduced-motion: reduce`.

### Workflow graph preview

- **REQ-039** (ubiquitous, event-driven) The Workflow builder page shall show, after the builder, a read-only
  "Workflow graph" card drawn from the builder state only: one node per module (readable type, caption "Module k ·
  n devices"; modules no step uses stay as unconnected nodes) and one solid edge per transfer boundary (consecutive
  steps on different modules), coloured and named by its transfer mode, or grey "not specified" when none is set; no
  other link and no dashed (inferred) line. It updates on every edit, fits its column at 375 and 1440 px (top to
  bottom below 800 px), has an empty state when there are no steps, and an image label "N modules, M transfers"
  (the builder's fields stay the text alternative).
