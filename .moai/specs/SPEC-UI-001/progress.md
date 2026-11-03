# Progress: SPEC-UI-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-03
- Tier L (about 25 files); artifacts: spec.md, plan.md, acceptance.md, design.md (research is the redesign plan in
  the sdl-db workspace and the mock file; no separate research.md).
- Size: 15 REQs, 13 ACs.
- plan-auditor: not run. Gap: the plan and mock were approved by the researcher in the planning session that
  started this run; the SPEC restates that approved scope.
- Baseline before any change (worktree at 1c3788d, after `npm run fetch-release && npm run build-data` for 1.1.0):
  `npx vitest run` 40 files / 646 passed; `npx tsc --noEmit` exit 0; `npm run e2e` 187 passed.

## §F Phase 4 Mode Selection

- Inputs: Tier L, about 25 files, one domain (front end) plus tests, coding-heavy.
- Decision: serial (orchestrator-direct, milestone by milestone); coding-heavy work in one tree, no fan-out.

## §E.2 Run-phase Evidence

- M1 tokens, typefaces, shell (ca41ef6). Tests first: `tests/siteTokens.test.ts` (variant-B values, new contrast pairs,
  `resolveTheme`), `tests/fonts.test.ts`, `e2e/shell.spec.ts`. Fonts: Latin Modern Roman 10 regular and italic
  converted from TeX Live 2025 OTF with fontTools 4.60.1 (woff2, 48 KB and 51 KB); JetBrains Mono latin 400/500 woff2
  from `@fontsource/jetbrains-mono` 5.2.8 (21 KB each); licences and a README in `public/fonts/`. `lucide-react` 1.54.0
  added (icons). Vite rewrites the font URLs to `/sdl-workflows-explorer/fonts/…` (production) and `../fonts/…` (e2e).
  Changed existing tests: graph stylesheet colours, `.counts` dropped from the table kinds. Gap: the first RED run of
  the token test was not captured separately (the values were written together with the test).
- M2 labels (8004481). RED: `npx vitest run tests/labels.test.ts` — "Failed to load url ../src/lib/labels". GREEN after
  `src/lib/labels.ts` and `components/Label.tsx`: labels 13 passed; every one of the 69 classes has a distinct label.
- M3 Home. RED: `tests/home.test.ts` — "Failed to load url ../src/lib/home". GREEN after `src/lib/home.ts`, the Home text
  in `siteText.ts`, `views/Home.tsx`, `FeaturedPlatform.tsx`, `ViewCards.tsx`, `useJson.ts` and the Home styles.
  First full e2e run: 11 failed / 197 passed. Fixes: other specs that waited for the removed counts table now wait for
  the stat tiles; Home and the taxonomy and benchmark views share one loader, so taxonomy.json is still requested once
  per page load; a range such as "FW1–FW3" in the taxonomy sources table keeps its words together (word joiners;
  Arial is wider than the old system font and the line broke after the en dash); the copy test locates the button by
  class because its name changes; the order test compares the cards beside each other by position.
- Final, worktree at the M3 commit: `npm test` 43 files / 682 passed; `npm run typecheck` exit 0; `npm run e2e`
  208 passed (2.2 min).
- Wording: the hero heading reads "self-driving lab platforms" instead of the mock's "self-driving labs", because
  279 counts coded platforms (some share an identity across papers), not distinct laboratories.

- Follow-up REQ-016, menu below 800 px. RED: `npx playwright test e2e/shell.spec.ts -g "AC-14"` — 3 failed (tabs
  visible at 375 px, no "Menu" button). GREEN after `components/SiteMenu.tsx` (own component; Radix not needed for one
  list of links), `NAV_ITEMS` in `App.tsx` shared by tabs and menu, and the menu styles: shell spec 21 passed. The
  test replaced the earlier "tabs in their own row at 375 px" check. The browser check at 800 px then showed the tabs
  wrapping under the site name: an older `.site-nav { flex-wrap: wrap }` rule from SPEC-BROWSE-001 overrode the new
  one. It was removed; from 800 to 1023 px the version chip hides, "Explorer" is hidden from view (kept for screen
  readers) and the gaps tighten, so all seven tabs fit; the width test now checks that at 800 and 1440 px.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 210 passed. Screens checked: 375 px light
  and dark (menu closed and open, no sideways scroll), 800 px, 1440 px light and dark.

- Phase 3, platform viewer (REQ-017 to REQ-020). RED: `npx playwright test e2e/viewer.spec.ts e2e/contribute.spec.ts`
  — 13 failed, 8 passed (new header, sheet, legend, overlap and timeline tests; the label-overlap test already failed
  on `Aand2024/P1` with the old spacing). GREEN after `Header.tsx`, `Graph.tsx` (toolbar, legend overlay, dagre
  spacing with `nodeDimensionsIncludeLabels`), `graphElements.ts` (13 px labels in the UI font, wrap at 150 px),
  `EvidencePanel.tsx` (sheet), `StepList.tsx` (timeline with lucide performer icons), `PlatformView.tsx` and the viewer
  styles. Browser check: the first spacing (rankSep 110, wrap 170 px) pushed the five-module chain of `Aand2024/P1` past
  the right edge at 1440 px; rankSep 70 and wrap 150 px fit it at zoom 1.12. `Kim2026/P1` (largest, 16 modules) lays
  out 2350 px wide at the readable zoom of 1 and is panned, as before. Screens: `Aand2024/P1` and `Kim2026/P1` at
  1440 px and 375 px in light and dark, sheet and legend open; no sideways scroll at 375 px.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 218 passed (2.5 min).

- Phase 3 follow-up (REQ-021 to REQ-023). RED: `npx vitest run tests/evidence.test.ts tests/graphElements.test.ts`
  — 5 failed (codes as labels, no `type` field); `npx playwright test e2e/viewer.spec.ts -g "UI AC-19|UI AC-20|UI AC-21"`
  against the a29d6d7 build — AC-19 failed (node label `flow_reactor…`), AC-20 failed (the sheet covered the "Paper DOI"
  link), AC-21 passed: the selection already reset on all three paths tried (history back from Trends, hash to About
  and back, straight to `Kim2026/P1`), so the reported carry-over was not reproduced. The test stays as a guard, and
  `Platform` is now keyed by the platform id. GREEN after `graphElements.ts` (readable labels, `code` field),
  `evidence.ts` and `EvidencePanel.tsx` (type row with the code), `Legend.tsx` (each module type under its group and
  each transfer mode with its code), the sheet CSS (a sticky column beside the content from 1024 px; bottom sheet
  below) and `Graph.tsx` (on a width change the view is fitted again if it was at its fit, otherwise keeps its centre,
  and the selection is brought into view). One mid-run e2e pass timed out in three tests while a dev server ran beside
  it; a headless script against the same build showed no hang, and the reruns passed.
  Browser check: `Aand2024/P1` 1440 px light (sheet and legend), `Kim2026/P1` 1440 px dark (sheet and legend),
  `Aand2024/P1` 375 px dark (bottom sheet), `Kim2026/P1` 375 px light (legend), 1024 px light; no sideways scroll.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 221 passed (2.5 min).

- Refit fix (REQ-024). Measured on the e2e build at 1440 px: the graph of `Aand2024/P1` is 988 layout px wide, so it
  needs a 1036 px box at zoom 1; with the sheet docked the box was 774 px, so the readable rule could not fit it.
  RED: `npx playwright test e2e/viewer.spec.ts -g "UI AC-24"` — the in-view test failed (modules outside the box).
  GREEN after the page widens into its side margin while the sheet is open (sheet column 320 px; graph box 1039 px at
  1440 px with a scrollbar) and `Graph.tsx` refits after a 60 ms debounced resize unless the reader zoomed or panned
  (Cytoscape's `dragpan`, `scrollzoom`, `pinchzoom` events and the toolbar zoom buttons; "Fit to view" clears it).
  The intermittent e2e timeouts of the follow-up were traced: ten pages at once crash when a node is selected by a
  scripted `emit("tap")`, and do not when the same module is selected by its table row or by a real mouse click, so
  the tests now click (`tapElement`); viewer and contribute specs 27 passed in 9 s (41 s with failures before).
  Browser check: `Aand2024/P1` 1440 px light with the sheet open (whole chain in view), dark after closing (refit).
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 224 passed (2.3 min).

- Phase 4, Browse and Trends filters (REQ-025 to REQ-027). RED: `tests/filterLabels.test.ts` — "Failed to load url
  ../src/lib/filterLabels"; `npx playwright test e2e/filters.spec.ts` — 8 failed. GREEN after `lib/filterLabels.ts`
  (groups, option labels, pills), `FilterPanel.tsx` rewritten as the bar (own popover on the site menu's pattern; Radix
  not added), `Browse.tsx` and `Trends.tsx` (bar above the results, no sidebar or toggle, "Show codes"), `DataTable.tsx`
  (toolbar slot, `Truncated`, sticky-header box) and the filter, segmented and table styles. Found on the way: at
  375 px Browse scrolled sideways (964 px) because the visually hidden codes of `<Label>` in table cells are absolutely
  placed and escaped the table box's clipping; the box is now `position: relative`. The segmented radios first had
  `pointer-events: none`, which Playwright's `check()` could not reach; they now cover their segment, transparent.
  Ten existing Browse and Trends tests changed (listed in acceptance.md AC-25 to AC-27).
  Browser check: Browse at 1440 px light (Module types popover open) and dark (pills, segments, sticky table), Trends
  at 1440 px light (Split by segments) and 375 px dark (bar wraps), Browse at 375 px light (Unit operations popover
  8–367 px); no sideways scroll. After the check, codes in popovers were kept on one line (max width 440 px).
  Final: `npm test` 689 passed; `npm run typecheck` exit 0; `npm run e2e` 232 passed (3.1 min); after the last CSS
  change, filters, browse, trends and a11y specs 115 passed and the table and token unit tests 12 passed.

- Phase 4 leftovers (REQ-028). RED: `npx playwright test e2e/filters.spec.ts -g "AC-28"` — 4 failed (codes in the
  Trends rows and legend, no Columns button, clipped codes); `tests/trends.test.ts` failed on the new labels. GREEN after
  `valueLabel`/`valueCode` in `lib/trends.ts` and `ValueName` in `CountTable.tsx` (the lazy chart imports it from there,
  so Plot stays out of the main bundle), `components/Popover.tsx` (the filter popover moved out of `FilterPanel.tsx`),
  `ColumnChooser.tsx` as a "Columns · N" popover, and options that wrap their code under the name. First try at
  "Name (code)" with visually hidden brackets gave "( analytical_chemistry )" in Chromium's accessible name (it pads
  absolutely placed spans with spaces); each checkbox now carries `aria-label` "Name (code)" and shows the code once.
  Final: `npm test` 689 passed; `npm run typecheck` exit 0; `npm run e2e` 236 passed (2.9 min).

- Phase 5 with the Workflow chart restyle (REQ-029 to REQ-034). Implemented by a delegated general-purpose agent on a
  written brief (the manager-develop agent type tried to make its own worktree, which fails inside this worktree; the
  `moai` CLI is not installed, so no per-spawn model was injected). Agent's RED: `npx playwright test e2e/phase5.spec.ts`
  — AC-29 to AC-33 failed (h1 "flow_reactor", no How this works, no `.math`, no step cards); AC-34 failed on tick
  strokes. Orchestrator review: `src/lib` diff limited to `route.ts` (readable class title) and `taxonomy.ts`
  (`overviewCaptionParts`, whose joined text equals the old caption); no result text changed. Added after review: the
  builder's selects read "Name (code)" instead of codes (values unchanged; tests select by value).
  Verified independently: `npm test` 689 passed; `npm run typecheck` exit 0; `npm run e2e` 242 passed (2.8 min); after
  the select change, workflow, phase5, a11y and site specs 99 passed and unit tests 689 passed. Sideways overflow 0 on
  Trends, Browse (both tables), Taxonomy overview and class page, Benchmark, Workflow and About at 1440 and 375 px in
  both themes (script). Screens: Browse Columns popover 1440 light; Taxonomy class page and Trends field split 1440
  dark; Benchmark and Workflow step cards 1440 light; Workflow Gantt 1440 dark; About 375 light.
  Still codes: the builder's utilization and waiting tables, cycle-time step table, events table and bottleneck
  sentence; taxonomy family names; benchmark task ids and unit-operation families.

- Viewer graph improvements (REQ-035 to REQ-038). Implemented by a delegated general-purpose agent on a written brief.
  Agent's RED: `npx playwright test e2e/viewer-graph.spec.ts` — 7 failed, 2 passed (the left-to-right check at 1440 px
  and "no minimap when it fits" held before any change); the new `tests/graphOverlay.test.ts` failed to load. Design:
  the canvas label is the bold type plus two reserved lines (so dagre spaces for the caption); an `aria-hidden` HTML
  caption layer draws the equipment names; below 800 px dagre runs top to bottom (nodeSep 24, rankSep 36) with labels
  beside the dots; each label box is centred on dagre's position; an own SVG minimap (no new dependency) shows while
  the graph's box at the current zoom exceeds the view. Orchestrator review on screen: on a phone the 420 px box was
  shorter than `Aand2024/P1`'s top-to-bottom layout, so the minimap appeared over a module, and the toolbar covered the
  platform title; the phone graph box is now `min(70vh, 600px)` tall (the graph fits, no minimap) and the toolbar sits
  at the bottom corner below 800 px.
  Verified independently: `npm test` 700 passed; `npm run typecheck` exit 0; `npm run e2e` 251 passed (3.3 min); after
  the two CSS changes, viewer, viewer-graph, contribute and shell specs 57 passed and the style unit tests 12 passed.
  Screens: `Aand2024/P1` 1440 px light (bold types, two-line captions), 375 px dark (top to bottom, whole graph in
  view), `Kim2026/P1` 1440 px dark (minimap with the viewport rectangle).

- Workflow graph preview (REQ-039). Design check first: `WorkflowState` records modules (type, devices), ordered steps
  (unit operation, module index) and transfers per boundary between consecutive steps on different modules (mode and
  seconds; absent = not specified), so the graph needs no model change and draws only those links. Implemented by the
  same delegated agent: `lib/workflowGraph.ts` (pure builder), `components/WorkflowGraph.tsx`, and
  `components/graphCanvas.tsx` holding the parts shared with the viewer graph (moved out of `Graph.tsx`, behaviour
  unchanged; the viewer e2e suite passes). Agent's RED: `npx playwright test e2e/workflow-graph.spec.ts` — 4 failed;
  `tests/workflowGraph.test.ts` failed to load. Unused modules are drawn unconnected; edge labels name the mode only
  (step pairs ran into each other on `Kim2026/P1`), and in this graph they stay horizontal in the phone layout.
  Verified independently: `npm test` 707 passed; `npm run typecheck` exit 0; `npm run e2e` 255 passed (3.4 min).
  Screens: empty state; filled from `Aand2024/P1` at 1440 px light (four transfers: three fixed tubing, one not
  specified; none between the two Software steps, as the state holds); 375 px dark (top to bottom, no sideways scroll;
  the toolbar covers the last caption's end).

- Phase 6, final pass and leftovers (REQ-040 to REQ-044). Commits: f9ca65b (readable names: platform tables, builder
  results and bottleneck sentence, taxonomy families, benchmark tasks), fd3261f (a selected step brings the graph into
  view), e19fd29 (phone toolbar inset in the fit; wider rank gaps for parallel edges), 6acdb74 (axe pass), 47bbf4b
  (keyboard: legend Escape, Columns focus), 38ed324 (Compare names, found in the screenshot review), and the commit
  that adds this record (favicon, two layout-shift fixes, SPEC files).
  - Leftovers. Benchmark tasks are named from `target` through the page's existing task titles ("Primary module type
    of a step"; count columns "Module type items"); the id stays beside or under the name. In running text the code of
    a name inside brackets sits in `title` only (`Label inText`), so a sentence does not read "(name (code))". The step
    list's "family" and the Compare tables were also still codes and now read as names. Still codes on purpose: URLs,
    select values, downloads, the builder's workflow-inputs list (`steps 1 and 2: robot_arm_gantry, 30 s`, pinned by
    SPEC-SIM-001 AC-15) and the "Name (code)" select options.
  - Step highlight: chosen fix is to scroll the graph into view on selection (click, Enter, Space) when less than
    half of it shows; hover and focus never move the page; reduced motion jumps. A sticky graph was rejected: at 900 px
    tall a 560 px sticky graph would leave about 280 px for the steps and tables.
  - Phone preview: the readable fit keeps the bottom-corner toolbar clear (`readableViewport` bottom inset, measured
    from the toolbar), and the phone preview box is `min(70vh, 600px)` like the viewer graph. Kim2026/P1: graphs with
    parallel edges (72 of 279 platforms, Kim2026/P1 among them, Aand2024/P1 not) get rankSep 150 / nodeSep 56 left to
    right and rankSep 120 top to bottom; in the top-to-bottom preview those labels follow their edge. The readable
    zoom (1) is unchanged; Kim2026/P1 still pans with the minimap.
  - RED evidence: `tests/viewport.test.ts` inset case failed before the change; with the layout and inset reverted in
    the source, `e2e/phase6.spec.ts` AC-47 and AC-48 failed (AC-48: "Robot arm / gantry" labels over Liquid handler,
    Batch reactor and Sample handling station). Gap: AC-42 to AC-46 and AC-50 were written with their fixes; no
    separate RED run was captured.
  - axe (`e2e/axe.spec.ts`, @axe-core/playwright 4.14.0, tags wcag2a/aa, wcag21a/aa, wcag22aa, best-practice; 21
    states x 2 themes). First run: 18 of 42 failed on serious findings: aria-prohibited-attr (Observable Plot puts
    aria-label on role-less mark groups; moved to `data-mark`), label-content-name-mismatch (Home view cards; the
    link is now the view name, stretched over the card), scrollable-region-focusable (graph legend, featured chain;
    now focusable) and target-size (Browse platform numbers, throughput summaries; now 24 px). After: 42 passed, no
    serious or critical. Remaining: moderate `region` on every page (the skip link sits outside the landmarks).
  - Keyboard: a tab walk over 15 routes at 1440 and 375 px reached the footer everywhere with no invisible stop
    (Trends' segmented radios are transparent; the focus ring shows on the segment); the reported upward jumps were
    Browse's inner scroll box and the two-column layouts. Escape: site menu, filter and Columns popovers and the
    evidence sheet closed and handed focus back; the legend did not close (fixed); the Columns popover left focus on
    its button because its first boxes are disabled (fixed).
  - Screenshots: 15 routes (every route of `e2e/routes.ts`, Kim2026/P1, a filled workflow) x 375 and 1440 px x light
    and dark = 60 full-page PNGs of the production build in `screenshots/phase6/` (git-ignored), contact sheets in
    `screenshots/phase6/sheets/`. scrollWidth equalled clientWidth on all 60. Seen and left as they were (earlier
    phases, not regressions): the Browse papers table's last column is cut at the box edge until scrolled; on a phone
    the builder's module-type selects run past their table box (it scrolls); the builder's sticky "Filled from …"
    message covers the content under it while it shows.
  - Lighthouse 13.5.0 (Playwright Chromium 1248, headless, `vite preview` of each production build; mobile is the
    default throttled run, median of 3; desktop preset, 1 run). Performance / accessibility / best practices, main ->
    this branch: Home mobile 95/100/96 -> 93/100/100, desktop 100/100/96 -> 100/100/100; Browse mobile
    95/96/96 -> 94/100/100, desktop 100/96/96 -> 100/100/100; Aand2024/P1 mobile 91/100/96 -> 91/100/100, desktop
    76/100/96 -> 100/100/100 (main's CLS there was 0.912). LCP mobile 2.41-2.56 s -> 2.56-2.87 s; transfer 269-275 KiB
    -> 290-432 KiB (fonts). The first branch run showed CLS 0.140 on the platform page (footer moved while the view
    loaded), 0.129 on Home desktop (featured card's loading state shorter than the card) and a console 404 for
    favicon.ico on both builds; fixed with `.page-main` min-height, a 540 px loading state and `public/favicon.svg`,
    then re-run (the numbers above).
  - Bundle (production builds, gzip level 9 by Python): JS 1,085,654 -> 1,150,026 bytes raw (+64,372; gzip 355,441
    -> 374,333, +18,892), of which the entry +56,903 raw (lucide icons, Home, labels, popovers); CSS 14,853 -> 42,505
    (+27,652; gzip 3,754 -> 8,873); fonts 0 -> 141,616 (four woff2: Latin Modern 48 KB and 51 KB, JetBrains Mono 21 KB
    and 22 KB). The shared Observable Plot chunk is unchanged (+205); rollup now names it after `plotMarks.ts`.
  - Final: `npm test` 46 files / 708 passed; `npm run typecheck` exit 0; `npm run e2e` 306 passed (4.0 min).

- Phase 6 follow-up: the three older layout issues (REQ-045 to REQ-047), approved by the researcher before any merge.
  - Browse: measured box 1150 px against tables of 1206 px (papers) and 1158 px (platforms) at 1440 px. Cut text
    (`.truncate`) is now 26ch instead of 32ch, so both tables are exactly 1150 px wide there. While columns are out of
    view the box shows a fade at that edge and the toolbar the note "Scroll sideways for more columns" (DataTable
    watches the box's scroll position and size).
  - Builder at 375 px: the module table was 750 px and the transfer table 488 px in a 305 px box. Below 800 px both
    tables now show one block per row, the column names above the fields (the stacked-table pattern of the taxonomy
    and benchmark tables). The result tables (cycle time, simulation) still scroll inside their boxes.
  - Builder messages: no longer sticky. A message shows in the first slot after the control that made the edit (the
    fill controls, modules, steps, transfers, the end of the builder, the cycle-time bounds and each cycle-time step,
    the simulation inputs); a visually hidden live region announces it once. Making it plain static after the builder
    was not enough: the fill button is at the top and the message would show a screen or more below it.
  - RED: the three new tests (AC-52 to AC-54) first ran against the previous e2e build (the build step had been
    skipped by a type error in the test file) and failed: last column at 1351 px against a box edge of 1296 px;
    builder tables scrolling 445 and 183 px with 45 and 46 fields outside; no message in the fill slot. After the
    rebuild they passed.
  - Final: `npm test` 46 files / 708 passed; `npm run typecheck` exit 0; `npm run e2e` 309 passed (3.6 min).
  - Screenshots (git-ignored): `screenshots/followup/` (Browse 1440 and 375 px, builder modules 375 and 1440 px,
    builder message 375 and 1440 px, light and dark).

## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready (phases 0 to 2); browser check of AC-13 recorded below.
- Browser check (Vite dev server of the worktree, built-in browser): Home at 1440 px light and dark matches the
  `ArialLight` and `ArialDark` boards in structure (hero with featured card, six stat tiles, three-column view
  cards, row list, two cards). At 375 px dark the page first scrolled sideways (452 px): a long single-line preview
  widened the view-card grid, and the visually hidden link text of the featured chain escaped its scroll box. Fixed
  with `min-width: 0` on the cards and `position: relative` on the chain's scroll box; afterwards scrollWidth = 375 in
  both themes. The "/" key hint is hidden below 600 px so the search placeholder fits.
- Not done here (later phases): platform viewer, Browse and Trends filters, Taxonomy, Benchmark, Workflow builder
  and About keep their layouts and only inherit tokens and typefaces; vocabulary codes outside Home still print as
  codes; chart tokens were not re-validated against the new dark surfaces.
