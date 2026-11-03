# Acceptance: SPEC-UI-001

AC-1 to AC-5 are Vitest tests (real-data cases read `public/data/` after `npm run build-data` and skip with a message
when it is absent). AC-6 to AC-11 are Playwright tests against `dist-e2e/`. AC-13 is a browser check recorded in
progress.md.

### AC-1 Tokens and contrast (REQ-001, REQ-002)
- `SITE_TOKENS.light` and `.dark` equal the variant-B values listed in design.md §1, have the same keys, and equal the
  hex declarations of `:root` and `:root[data-theme="dark"]` in `styles.css`; dark `--unmapped` equals dark `--text`.
- Every pair of REQ-002 reaches its minimum in both sets. No hex colour outside the two token blocks.

### AC-2 Fonts (REQ-003)
- `public/fonts/` holds `lmroman10-regular.woff2`, `lmroman10-italic.woff2`, `GUST-FONT-LICENSE.txt`,
  `jetbrains-mono-latin-400.woff2`, `jetbrains-mono-latin-500.woff2` and `OFL.txt`; each woff2 starts with the
  `wOF2` signature; every `@font-face` in `styles.css` names one of them.
- `.math` sets the Latin Modern family and `font-size: 1.1em`.

### AC-3 Labels (REQ-007, REQ-009)
- `displayLabel("field_tag", "chemistry_synthesis")` = "Chemistry synthesis";
  `displayLabel("module_type", "instrument_separation_ms")` = "Separation / MS instrument";
  `displayLabel("field_tag", "biology_biochem")` = "Biology and biochemistry"; an unknown code `foo_bar_baz` gives
  "Foo bar baz".
- With built data: every class of `taxonomy.json` has a non-empty label different from its code, and the labels of
  all classes are distinct. `labels.ts` passes the UI-free module check of `tests/libBoundary.test.ts`.

### AC-4 Home text is sourced (REQ-011)
- Every number in the fixed Home text of `src/lib/siteText.ts` (hero, view descriptions, stat notes, captions, sample
  card), with placeholders filled from the built data, is a filled value or a whole number of `DATA_CARD.md`.
- The example search queries each match at least one platform of `index.json`.

### AC-5 Home derivations (REQ-010, REQ-011)
- `src/lib/home.ts` pure functions, on the built data: stat values equal `index.counts`; "first public in <latest
  year>" counts platforms of the latest year; field-tag top 5 counts papers per tag; papers per year group years
  before 2015; taxonomy counts per kind equal the class counts of `taxonomy.json`; the featured layout of
  `Aand2024/P1` has the software module in the control row and the material chain fluidics → flow reactor → optical
  instrument → sample handling station with the last link inferred; the platform list sorts newest first.

### AC-6 Shell (REQ-004)
- On every route of `e2e/routes.ts`: the top bar stays at the top of the viewport after scrolling; the nav holds the
  site-name link and the seven view links; the current link has `aria-current="page"` (existing AC-9 test); the version
  chip links to `https://doi.org/<release DOI>`.
- At 375 px the tabs sit below the site name and the page does not scroll sideways (existing AC-12 test).

### AC-7 Theme toggle (REQ-005)
- With a light system scheme, pressing the toggle sets `data-theme="dark"` and the dark body colours; after a reload the
  dark theme stays; pressing again returns to light. Without a stored choice, the existing system-scheme tests pass.

### AC-8 Home structure (REQ-010)
- Home shows, in document order: hero heading, search, the two buttons, the featured card, the stat tiles, the six view
  cards, the platform list, the citation card, the sample card. "Download data" links to the release DOI; the
  citation equals `formatCitation`; `CITATION.cff` sits in a closed `details`; the licence chip reads "CC BY 4.0".
- The featured card names `Aand2024/P1`, lists its 6 steps in order with readable labels, and links to
  `#/platform/Aand2024/P1`. The six view cards link to their routes. No link points into `data/`.

### AC-9 Search and list (REQ-012)
- Typing "Aand2024" in the hero search lists one suggestion linking to the platform; Enter opens it. "Show all
  matches" fills the list filter and focuses it. "/" focuses the hero search.
- The list shows 20 rows, then all `index.counts.platforms` after "Show all"; filtering "Aand2024" leaves one row
  whose link opens the platform viewer, and Back returns to Home.

### AC-10 Copy (REQ-006, REQ-010)
- The citation copy button writes the citation text to the clipboard and announces "Copied".

### AC-11 Typefaces in the browser (REQ-003)
- The benchmark preview's statistics render with the Latin Modern font face loaded (`document.fonts.check`), and ids
  render in JetBrains Mono.

### AC-12 No regression (REQ-013, REQ-014)
- `npm test`, `npm run typecheck`, `npm run e2e` exit 0. Changed existing tests, each replaced by AC-8/AC-9 checks:
  `e2e/site.spec.ts` AC-6 (home order and links), its platform-viewer-button focus test and the 375 px views-table
  check; the home-list part of `e2e/viewer.spec.ts` AC-12; `"#/"` leaves the table routes of `e2e/a11y.spec.ts` AC-13
  (Home has no table); `tests/siteTokens.test.ts` expected values; `tests/siteText.test.ts` (`homeIntro` replaced by
  the Home text, VIEWS gains the workflow builder); `tests/graphElements.test.ts` stylesheet colours (the graph takes
  the new token values); `tests/tableStyles.test.ts` no longer expects a `.counts` table rule (the counts table became
  stat tiles); the release-1.1.0 home check in `e2e/site.spec.ts` reads "batch sizes" and "human intervention" from
  the sample card instead of the removed intro paragraph; `e2e/browse.spec.ts` AC-9/AC-10 and `e2e/trends.spec.ts`
  AC-15 wait for Home's stat tiles instead of the removed counts table (browse AC-9 counts 20 list rows instead of 279
  table rows); `e2e/taxonomy.spec.ts` AC-15 expects the one taxonomy.json request Home now makes, shared with the
  taxonomy view (still one request in all); `e2e/viewer.spec.ts` names the "Platforms" heading exactly (the hero
  heading also contains the word) and expects the platform id in the JetBrains Mono stack.

### AC-14 Menu below 800 px (REQ-016)
- At 375 px: the tabs are hidden; the "Menu" button (`aria-expanded="false"`) sits in the top bar's one row; the page
  does not scroll sideways. Opening it shows a panel (the element `aria-controls` names) with the seven view links,
  "Home" marked current and focused; the main region does not move. Choosing "Trends" opens `#/trends`, closes the
  panel and focuses the button; Escape closes it and focuses the button; a click outside closes it; a route change
  while open closes it.
- At 799 px the menu button shows and the tabs are hidden; at 800 and 1440 px the tabs show in one row (the tab list
  does not scroll, the bar is under 72 px high) and the menu button is hidden.

### AC-15 to AC-18 Platform viewer (REQ-017 to REQ-020), `e2e/viewer.spec.ts` "UI AC-…"
- AC-15: the header card shows the year chip "2024", the "Chemistry synthesis" chip with title `chemistry_synthesis`,
  a "Paper DOI" link to the paper's DOI and the "Show platform evidence" button.
- AC-16: on load the empty state shows and no sheet exists; tapping module M4 opens the "Evidence" sheet with kind
  Module and id `Aand2024/P1/M4`, focus on "Close evidence"; Escape removes it and the empty state returns. Enter on
  step 3 opens the sheet; the close button removes it and focus returns to step 3. At 375 px the sheet touches the
  bottom of the screen, stays inside 375 px and under 70% of the height, with no sideways scroll.
- AC-17: "Legend" toggles `aria-expanded` and the legend's visibility; on `Aand2024/P1` and on the largest graph,
  `Kim2026/P1` (16 modules, 21 connections), no two module node-and-label boxes overlap and labels are 13 px; "Zoom
  in" twice raises the zoom by more than 30%, "Zoom out" lowers it, and "Fit to view" returns to the readable fit.
- AC-18: six steps, each with a performer icon whose title is robot, software, human or "performer not stated"; step 1
  reads "Dispense liquid".
- Changed existing tests: viewer AC-9, AC-10 and contribute AC-5 expected the platform's evidence while nothing was
  selected; they now expect no sheet (and AC-9 opens it with "Show platform evidence"); viewer AC-13 opens the legend
  before reading it; the fit test also zooms first.

### AC-19 to AC-21 Phase 3 follow-up (REQ-021 to REQ-023), `e2e/viewer.spec.ts` "UI AC-…"
- AC-19: on `Aand2024/P1` the node labels start with "Flow reactor", "Optical instrument" and "Sample handling station";
  edge labels read "Fixed tubing" and "Data transfer". Tapping M2 shows the type row "Flow reactor" with the code
  `flow_reactor`; tapping E1 shows "Fixed tubing" with `fixed_tubing`. In the legend, the row whose code is
  `flow_reactor` reads "Flow reactor", `instrument_optical` "Optical instrument", `fixed_tubing` "Fixed tubing" and
  `data_transfer` "Data transfer". Unit tests: `buildElements` labels and `code` fields; `formatEvidence` type fields.
- AC-20: at 1440 × 900 with module M4 selected, `elementFromPoint` at the centre of "Paper DOI", "Show platform
  evidence", "Fit to view", "Zoom in", "Zoom out" and "Legend" hits that control; the header card, the graph and the
  steps-and-tables grid end left of the sheet; Cytoscape's width equals the graph box; selecting the first connection
  row opens the sheet within the screen, and after scrolling back up the DOI link is still uncovered.
- AC-21: with a step selected, going to Trends and back by the history, to About and back by setting the hash, and
  straight to `Kim2026/P1` each show no sheet, the empty state and no pressed step.
- Changed existing tests: `tests/graphElements.test.ts` expected the codes as node and edge labels; `tests/evidence.test.ts`
  views gain the `type` field.

### AC-24 Refit (REQ-024), `e2e/viewer.spec.ts` "UI AC-24"
- At 1440 × 900 on `Aand2024/P1`, every module node's rendered box (labels included) lies inside the graph's box, and
  Cytoscape's size equals the box, before the sheet opens, while it is open and after Escape closes it.
- After "Zoom in", opening the sheet keeps the reader's zoom. On `Kim2026/P1` the zoom stays 1 with the sheet open.
- Test change: graph elements are now selected by a real mouse click where they are drawn (`tapElement`) instead of
  a scripted `emit("tap")`, which crashed renderers when several tests ran at once (viewer UI AC-16, AC-19, AC-20).

### AC-25 to AC-27 Browse and Trends filters (REQ-025 to REQ-027), `e2e/filters.spec.ts`, `tests/filterLabels.test.ts`
- AC-25 (unit): `FILTER_GROUPS` lists the seven groups in bar order; `optionLabel` gives readable names with codes
  ("Chemistry synthesis", `chemistry_synthesis`) and the autonomy texts without a code; `filterPills` lists the year
  range, the values in group order and the search, and each pill's `remove` clears only its own filter.
- AC-25 (e2e): at 1440 px Browse shows the seven popover buttons closed, no visible checkbox, the search and year
  fields, no "Clear all", a bar under 140 px high and no sideways scroll. Checking "Catalysis (catalysis)" in the Field
  tag popover (inside the window) makes the button "Field tag · 1" and the hash `#/browse?field=catalysis`; Escape
  closes it with focus on the button; the pill's "Remove Field tag: Catalysis" removes the filter. With four filters
  in the URL there are four pills; opening a second popover closes the first; a click outside closes it; "Clear all"
  returns `#/browse?view=platforms` with empty fields. At 375 px no sideways scroll, and the Field tag, Unit operations
  and Transfer modes popovers stay inside the window. Trends writes `#/trends?field=catalysis` the same way.
- AC-26: "Split by" has six radios on one row in a flex box; clicking a segment checks its radio and marks the segment;
  ArrowRight moves the choice and focus.
- AC-27: scrolling the papers table box by 600 px keeps the header row at its top; the row under the pointer changes
  colour; every cut title has its full text in `title`; on `Aand2024/P1`'s row the field tag reads "Chemistry
  synthesis" (code in `title`) and "chemistry_synthesis" after "Show codes".
- Changed existing tests (filters now sit in popovers; "Clear filters" is "Clear all"; the toggle is gone):
  `e2e/browse.spec.ts` AC-9, AC-10 (Clear all), AC-11, the two layout follow-ups (now: bar above results at 1280 px,
  bar wraps at 375 px) and SPEC-TAXO-001 AC-14 (button order and popover contents instead of legend order);
  `e2e/trends.spec.ts` AC-10 (bar above the chart, pills, no toggle) and SPEC-TAXO-001 AC-8/AC-14. They open a
  popover before reading or checking an option, and press Escape before clicking outside it.

### AC-28 Phase 4 leftovers (REQ-028), `e2e/filters.spec.ts` "UI AC-28", `tests/trends.test.ts`
- At 1440 and 375 px, in the Field tag, Module types and Unit operations popovers (inside the window) every option has
  one code element that ends inside the panel, and its text is exactly the name, a space and the code; the Field tag
  checkbox "Battery and electrochemistry (battery_electrochem)" exists.
- "Columns · 9" sits on the row of "Show codes", closed; its popover stays inside the window; unchecking Venue makes
  it "Columns · 8" and removes the column; Escape returns focus to the button.
- Trends `split=field`: the first value row's header has a code-only `title` and no underscore in its text; the
  default legend's first entry reads "Fixed tubing" with `title` `fixed_tubing`.
- Changed existing tests: `tests/trends.test.ts` (`valueLabel` gives readable names); `e2e/trends.spec.ts` AC-12, AC-13
  and the keyboard test name bars and cells by readable names ("2021, Fixed tubing: 9 of 17 papers") and the legend by
  readable names; `e2e/browse.spec.ts` AC-12 opens the Columns popover before using the chooser.

### AC-29 to AC-34 Phase 5 (REQ-029 to REQ-034), `e2e/phase5.spec.ts` "UI AC-29" to "UI AC-34"
- AC-29: after load no element's only text is "Loading…" on Taxonomy, Benchmark, Workflow and About, and each has one
  closed `details.how-it-works` ("How this works") holding a moved paragraph.
- AC-30: `#/taxonomy/module_type/flow_reactor` has the h1 "Flow reactor", the chip `flow_reactor` and the title
  "Taxonomy: Flow reactor"; the overview link reads "Flow reactor" with the code beside it.
- AC-31: benchmark statistics sit in `.math` elements in the Latin Modern face; the variable "n" is italic.
- AC-32: three steps are `[data-list="wf-steps"] > li` cards; "Move step 3 up" by keyboard moves it and keeps focus on
  its button at position 2; "Remove step 1" removes it.
- AC-33: at 375 px the taxonomy overview and class page, Benchmark, Workflow and About do not scroll sideways.
- AC-34: after a simulation, chart axis text, ticks and gridlines equal the chart tokens in light and in dark; a
  readable unit-operation name appears with its code in `title`; a statistic sits in `.math`.
- Changed existing tests: `tests/route.test.ts` and `e2e/routes.ts` (class title); `e2e/taxonomy.spec.ts` (caption
  split, readable link and h1 names, the one allowed disclosure); `e2e/benchmark.spec.ts` (label rows by `data-code`,
  readable names, How this works opened first); `e2e/workflow.spec.ts` (step cards); `e2e/contribute.spec.ts` (h1).

### AC-35 to AC-38 Viewer graph (REQ-035 to REQ-038), `e2e/viewer-graph.spec.ts`, `tests/graphOverlay.test.ts`
- AC-35: on `Aand2024/P1` and `Kim2026/P1` canvas labels hold only the bold readable type; each named module has one
  caption of at most two lines with ellipsis styling; captions overlap neither each other nor any node label box;
  a selected module's sheet shows "Name in paper" with the full name.
- AC-36: at 375 px `Aand2024/P1` is ranked top to bottom and fits the graph width at zoom ≥ 1; at 1440 px left to right;
  resizing from 1440 to 375 px fits again.
- AC-37: on `Kim2026/P1` at 1440 px the minimap is visible, `aria-hidden`, with a viewport rectangle, and a click on its
  right half moves the view right; on `Aand2024/P1` there is none.
- AC-38: hovering step 3 highlights its modules and dims others with no sheet; leaving removes it; keyboard focus
  previews; a click keeps it after the pointer leaves; Escape clears it.
- Changed existing tests: `tests/graphElements.test.ts` (the canvas label no longer carries the name);
  `tests/evidence.test.ts` (views gain `name`).

### AC-39 to AC-41 Workflow graph preview (REQ-039), `e2e/workflow-graph.spec.ts`, `tests/workflowGraph.test.ts`
- AC-39: no steps → the empty sentence, no graph; a step on a new module → one node "Module 1 · 1 device"; a second
  step on a new module → two nodes and one solid edge "not specified"; robot_arm_gantry on that boundary → "Robot arm
  / gantry" in its colour; removing step 2 → no edge, two nodes; removing step 1 → the empty state; the image label
  reads "N modules, M transfers".
- AC-40: filled from `Aand2024/P1`, one node per module and edges equal to the transfer boundaries decoded from the
  URL; all solid.
- AC-41: at 375 and 1440 px the graph stays inside the main column without sideways scroll; top to bottom at 375 px,
  left to right at 1440 px.

### AC-13 Browser check (REQ-010)
- Home at 1440 px and 375 px, light and dark, compared with the mock boards `ArialLight`, `ArialDark`, `ArialPhone`;
  findings and fixes recorded in progress.md.
