---
id: SPEC-TRENDS-001
title: "Trends dashboard: counts by first public year, split by one category, with filters shared with the browser"
version: "0.3.0"
status: in-progress
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.4.0 target"
module: "src/"
lifecycle: spec-anchored
tags: "trends, charts, observable-plot, filters, routing"
tier: M
depends_on: [SPEC-DATA-001, SPEC-BROWSE-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Step 4 of `docs/plan.md` ("Trends dashboard"). Reads `public/data/index.json` from
  SPEC-DATA-001 and reuses, unchanged, the filter state, URL format and row predicates of SPEC-BROWSE-001
  (`src/lib/filterState.ts`, `filterUrl.ts`, `filterApply.ts`) and its `FilterPanel` component. Extends the hash
  router with one route kind. The expected numbers in `acceptance.md` come from `expected-counts.mjs` in this folder.
- 2026-11-02 0.2.0 revised after plan audit iteration 1 (FAIL 0.78): colour rule made measurable (palette-validator
  thresholds for adjacent pairs, values never shown by colour alone, validator results recorded in `progress.md`);
  the total above each bar is a link; REQ-008 limited to bin totals and value counts; REQ-007 reworded; run-phase
  checks instead of unverified statements about Plot and SVG; AC-15 checks that Plot is not in the entry files; the
  sample note names DATA_CARD.md and links the release files; captions say "matching the filters"; negative rules
  written as "shall not"; ACs added for the filter toggle, the unit group label, rendered cell shading, autonomy
  labels in accessible names and inverted year inputs.
- 2026-11-02 0.3.0 revised after plan audit iteration 2 (FAIL 0.86): REQ-012 (a) names the validator (tool and
  version), the simulated deficiencies and the checks per palette kind, and exempts the shading ramp; a cell link
  takes the cell's text colour; `progress.md` records the validator commands and verbatim output; AC-12 checks the
  stack order and AC-13 measures the link text colour.

## 1. Why

`docs/plan.md` asks for counts of the 238 papers (280 platforms) by first public year, split by integration mode,
field tag, software and hardware autonomy, and by the module types and transfer modes present, with the browser's
filters. A reader who sees a number on the dashboard must be able to open the rows it counts. The dashboard
therefore defines every bin total and value count as the count line of one browser URL (REQ-008), so chart and
browser agree by construction rather than by a second implementation of the filter rules.

The release covers papers first public from 1974 to 2026. Before 2015 there are at most three papers per year
(27 papers, 28 platforms in all), so those years form one group. The search behind the release ran on 20 October
2026, so 2026 is a partial year. The 238 papers are those that passed the screening in the release's data card; the
dashboard says so and draws no conclusions from the counts.

## 2. Requirements (EARS)

Terms used below. The **unit** is what is counted: papers or platforms, chosen by the `view` parameter. A **split**
is one of six categories: integration mode (`im`), field tag (`field`), software autonomy (`sw`), hardware autonomy
(`hw`), module types (`mt`), transfer modes (`tm`); each is also a filter group of SPEC-BROWSE-001 §3. A split is
**exclusive** when every row has exactly one value (`im`, `sw`, `hw`) and **multi-valued** when a row can have
several (`field`, `mt`, `tm`). A **bin** is one column of the x axis: the grouped bin of years up to 2014, or one year
from 2015 on. The **count line** is the line "N of T papers" or "N of T platforms" of SPEC-BROWSE-001 REQ-008. The
**applied year range** is the year range of the filter state (a side is empty when no limit applies).

### Routing and navigation

- **REQ-001** (event) When the URL hash is `#/trends` or `#/trends?<query>`, the site shall show the trends
  dashboard. `parseRoute` gains the kind `trends` carrying the raw query text (`""` when there is no `?`, and for
  `#/trends?`). `#/trends/`, `#/trends/x` and `#/trendsx` give not found carrying the hash. Every outcome of the
  existing route tests stays unchanged, and `parseRoute` never throws. The site navigation shall show the link
  "Trends" (`#/trends`) directly after "Browse".

### URL

- **REQ-002** (ubiquitous) The trends query shall be `encodeFilters(state)` of SPEC-BROWSE-001, followed by
  `split=<x>` when the split is not `im`, the two parts joined with `&` (an empty part is left out); `#/trends` with
  no `?` is the hash for the default state with split `im`. Decoding shall read the filter state with the existing
  `decodeFilters` (which ignores `split`) and the split from the last occurrence of `split`, whose valid values are
  `im`, `field`, `sw`, `hw`, `mt`, `tm`; a missing, empty or invalid last occurrence gives `im`. For every filter state
  and split produced by decoding, decoding its encoding returns the same state and split. The browser keeps ignoring
  `split`.
- **REQ-003** (event) When the reader changes a filter, the unit or the split, the dashboard shall replace the hash
  with the encoded state using `history.replaceState`. On opening the dashboard and when the hash changes by
  navigation while it is shown, the dashboard shall decode the hash and replace it with its encoding when the two
  differ, so the controls and the URL show the same state, apart from year inputs that SPEC-BROWSE-001 REQ-004 leaves
  out of the URL.

### Controls

- **REQ-004** (ubiquitous) The dashboard shall have the heading "Trends"; a radio group "Split by" with, in this
  order, the choices "Integration mode", "Field tag", "SW autonomy", "HW autonomy", "Module types" and "Transfer
  modes"; a group "Unit counted" of two buttons "Papers" and "Platforms" with `aria-pressed` on the active one; the
  `FilterPanel` of SPEC-BROWSE-001 with its rules and labels, in the same layout as the browser (sidebar from 1000 px,
  toggle button "Filters (n active)"); and the count line for the unit in an element with `aria-live="polite"`.
  "Clear filters" resets the filters as in the browser and keeps the unit and the split. While the unit is
  platforms, a line below the count line reads "Platforms carry the first public year, field tags, integration mode
  and autonomy of their paper."
- **REQ-005** (ubiquitous) The dashboard shall show the link "Show these in Browse" pointing to `browseHash(state)`;
  the browser shall show the link "Show these in Trends" pointing to the trends hash (REQ-002) of its current state
  with split `im`. This link is the only change to `src/views/Browse.tsx`. For the same filter state and unit, the
  count line of the dashboard and of the browser show the same N.

### Counting

- **REQ-006** (ubiquitous) The bins shall be computed by a pure function of the applied year range, the earliest and
  the latest `first_public_year` in `index.json` (1974 and 2026 in release 1.0.0) and the partial year (REQ-013):
  - The grouped bin covers the years from the earliest year to 2014 that lie in the applied range; it is present when
    that intersection is not empty. Its years for counting are From = the applied From (empty when none) and
    To = the smaller of the applied To and 2014 (2014 when no To is applied).
  - Its label is "before 2015" when no From is applied and To is empty or at least 2014; "before <To+1>" when no
    From is applied and To is at most 2013; "<From>–<min(To, 2014)>" (en dash) when a From is applied, or the single
    year when From equals min(To, 2014).
  - Then one bin per year from 2015 to the latest year, each present when the year lies in the applied range,
    labelled with the year, or the year followed by "*" when it is the partial year.
  - A bin inside the applied range is present even when it counts 0; no bin outside it is present.
- **REQ-007** (ubiquitous) The values offered for a split shall be the offered values of that group
  (`offeredValues(index)`, in its order). When the group has a selection and either the split is `im`, `sw`, `hw` or
  `field`, or the split is `mt` or `tm` and that group's match mode is "any", the selected values of the group, in
  offered order, shall be offered instead. With no selection in the group, and for `mt` and `tm` in match mode "all",
  every offered value stays offered.
- **REQ-008** (ubiquitous) Every bin total and every value count on the dashboard (bar segments, the totals above
  bars, count-table cells) shall be the number of rows of the unit that `matchingPapers` or `matchingPlatforms`
  returns for a **link state**, and each shall be a link to `browseHash(link state)`:
  - For a bin, the link state is the filter state with `years` set to the bin's years for counting and `view` set to
    the unit; its count is the bin total n.
  - For a bin and an offered value v, the link state is the bin's link state with the split's group changed: for
    `im`, `sw`, `hw`, `field` the group becomes `[v]`; for `mt` and `tm` it becomes `[v]` when the group has no
    selection or its match mode is "any", and the selection with v added (sorted, without duplicates) when its match
    mode is "all".
  - The count table of a split is, for each present bin, n and one count per offered value.
- **REQ-009** (ubiquitous) The bins, the offered split values, the link state, the count table, the trends query
  encoding and decoding, the partial-year constant and the colour tokens shall be pure functions or constants in
  `src/lib/trends.ts` and `src/lib/chartTokens.ts` that import neither React, nor `react-dom`, nor
  `@observablehq/plot`, nor any `d3` package, nor read `window` or `document`.

### Charts

- **REQ-010** (ubiquitous) For an exclusive split, the dashboard shall draw a stacked bar chart with Observable Plot
  (`@observablehq/plot`, exact version 0.6.17): one bar per present bin in bin order, one segment per offered value
  with a count above 0, stacked from the baseline up in offered order, segment height equal to the count, segments
  separated by a 2 px gap in the surface colour, x axis "First public year" labelled with the bin labels, y axis
  "Papers" or "Platforms" with integer ticks only. Each segment is a link (REQ-008) reachable with Tab whose
  accessible name, and whose native SVG `<title>` tooltip text, is "<bin label>, <value label>: <count> of <n>
  <unit>", for example "2021, fixed_tubing: 9 of 17 papers". The bin total n is written above each bar as a link
  (REQ-008) to the bin's link state, reachable with Tab, with the accessible name "<bin label>: <n> <unit>", for
  example "2021: 17 papers". A legend in HTML lists every offered value in stack order (the value at the baseline
  first) with its colour swatch and value label. Value labels are the value as stored for `im`, and
  "<level> — <category text of SPEC-BROWSE-001 §3>" for `sw` and `hw`. Below the chart, a `<details>` element with
  the summary "Counts as a table" holds the count table (REQ-011 layout, without shading).
- **REQ-011** (ubiquitous) For a multi-valued split, the dashboard shall show the count table as the chart: an
  HTML `<table>` with a header row of bin labels, a first body row "n" holding the bin totals, then one row per
  offered value; each cell writes its count (0 written as "0") as a link (REQ-008). A value cell's accessible name is
  "<bin label>, <value>: <count> of <n> <unit>" and an n cell's is "<bin label>: <n> <unit>". Value cells are
  shaded with the sequential ramp of REQ-012: a cell with count c > 0 takes step min(12, ⌈13·c / m⌉ − 1) (steps
  numbered 0 to 12), m being the largest value-cell count in the table. A cell with count 0 and the cells of the n
  row have no background of their own and ink text. Text in a shaded cell is `#000000` or `#ffffff`, whichever has
  the higher contrast with its step, and that contrast is at least 4.5:1. The link inside a cell takes the cell's
  text colour, not the site's link accent colour. The table scrolls horizontally inside its own container.
- **REQ-012** (ubiquitous) Chart colours shall be CSS custom properties with a light set under `:root` and a dark
  set under `:root[data-theme="dark"]`, equal to an exported token map in `src/lib/chartTokens.ts`:
  - Integration mode: categorical slots 1 to 7 in the offered order of `im` (light / dark): `#2a78d6`/`#3987e5`,
    `#eb6834`/`#d95926`, `#1baf7a`/`#199e70`, `#eda100`/`#c98500`, `#e87ba4`/`#d55181`, `#008300`/`#008300`,
    `#6250d6`/`#9085e9`. A value keeps its colour when a filter hides other values.
  - Software and hardware autonomy: ordinal ramp, level 1 `#86b6ef`, level 2 `#3987e5`, level 3 `#1c5cab`, the same
    in both sets (`sw` uses levels 2 and 3).
  - Count table shading: the 13 steps `#cde2fb #b7d3f6 #9ec5f4 #86b6ef #6da7ec #5598e7 #3987e5 #2a78d6 #256abf
    #1c5cab #184f95 #104281 #0d366b`, the same in both sets.
  - Surface `#ffffff` / `#1a1a19`; ink `#0b0b0b` / `#f0efec`; secondary ink (axis and tick labels) `#52514e` /
    `#c3c2b7`; gridline `#e1e0d9` / `#2c2c2a`; axis line `#c3c2b7` / `#383835`.

  These values shall satisfy, and be read in the way described by, the following colour-vision rules:
  - (a) The checker is `scripts/validate_palette.js` of the data-visualization skill bundled with Claude Code
    2.1.309 (not in this repository; the orchestrator runs it and records the commands and output in `progress.md`
    §E.1). Distances are OKLab ΔE ×100. Each set is checked against its surface: light against `#ffffff`, dark
    against `#1a1a19`. The validator gates, per palette kind:
    - Integration-mode palette (categorical, 7 slots in slot order): every colour inside the validator's lightness
      band and above its chroma floor; adjacent-pair separation of at least 8 under protanopia and deuteranopia
      simulation; adjacent normal-vision difference of at least 15. Tritanopia separation is reported, not gated
      (worst adjacent: light 5.8, dark 8.7). Contrast below 3:1 against the surface is a warning that requires
      visible labels or a table view (light: `#1baf7a` 2.82, `#eda100` 2.17, `#e87ba4` 2.69), which (b) provides.
      With 7 categories no palette clears a floor over all pairs (the validated palette passes all pairs for 3 slots
      only), so the rule is adjacent-pair separation plus (b).
    - Autonomy ramp (ordinal, 3 steps): lightness monotone, adjacent lightness step of at least 0.06 (OKLCH L),
      a single hue, and a contrast of at least 2:1 between the step nearest the surface and that surface (the
      validator's "light end"). These are the validator's ordinal checks; the normal-vision floor of 15 does not
      apply to the ramp.
    - The 13-step shading ramp of the count table is not validated as a categorical or ordinal palette, because every
      cell writes its number; its requirement is the text contrast of at least 4.5:1 in REQ-011.
  - (b) No value is identified by colour alone: each bar segment carries its native SVG `<title>` and accessible name
    (REQ-010), the legend lists the values in stack order with swatch and label, and the count table is available
    below every bar chart. Light-mode slots below 3:1 against the surface (`#1baf7a`, `#eda100`, `#e87ba4`) are
    therefore always accompanied by visible labels and the table.
  - (c) A value with count 0 has no segment, so two slots that are not adjacent in the slot order can touch in one
    bar; the 2 px surface gap between segments and (b) cover that case.

### Display rules

- **REQ-013** (ubiquitous) The dashboard shall show:
  - the bin total n on every chart (above each bar; the "n" row of every table);
  - when the 2026 bin is present, the label "2026*" for it in the axis, the table headers and the accessible names,
    and below the chart the note "* 2026 is partial: the search ran on 20 October 2026." The partial year and the
    date text come from one constant (the search date of release 1.0.0); the partial year is that date's year;
  - when the unit has no matching row, "No papers match these filters." or "No platforms match these filters." in
    place of the chart, legend and table, without a page error.

  The dashboard shall not show a share, a percentage or a percentage axis, nor the character "%" in its text.
- **REQ-014** (ubiquitous) The dashboard shall show one caption above the chart, exactly the text of §3 for the
  split and unit, and below everything the note "The counts cover the <P> papers (<L> platforms) that passed the
  screening described in the data card (DATA_CARD.md in the release files on Zenodo), not every paper on
  self-driving laboratories.", where P and L are the numbers of paper and platform rows in `index.json` (238 and
  280) and "release files on Zenodo" is a link to `https://doi.org/<release doi of index.json>`
  (10.5281/zenodo.23857126). No caption, note, empty-result message or the platforms line of REQ-004 shall contain,
  case-insensitively, any of: rise, rose, rising, grow, grew, growth, increas, decreas, declin, surge, boom, drive,
  driven, popular, dominat, shift, trend. The page heading "Trends", the navigation link and the cross links are not
  captions.
- **REQ-015** (ubiquitous) The trends view and Observable Plot shall be loaded with a dynamic import in a chunk whose
  file name starts with `Trends`; opening `#/` or `#/browse` shall request no such file, and opening `#/trends` shall
  request it.
- **REQ-016** (ubiquitous) At a viewport width of 375 px the dashboard shall have no page-level horizontal scroll;
  the bar chart takes its width from its container and fits it; count tables scroll inside their container. The split
  control, the unit buttons, the filter controls, the cross link, segment links, bin-total links above the bars and
  table cell links shall be
  reachable with Tab and operable with Enter or Space as their element type allows. All interface text written by the
  site shall be in English (checked by review).

## 3. Captions

`<Unit>` is "Papers" or "Platforms" and `<unit>` "papers" or "platforms", as chosen by the unit; `<u>` is "paper" or
"platform".

| Split | Caption |
|---|---|
| `im` | "`<Unit>` by first public year, split by integration mode. Each bar is the number of `<unit>` matching the filters that were first public in that year; n above the bar is the total." |
| `sw` | as `im` with "software autonomy" in place of "integration mode" |
| `hw` | as `im` with "hardware autonomy" in place of "integration mode" |
| `field` | "`<Unit>` by first public year and field tag. Each cell is the number of `<unit>` matching the filters that were first public in that year and have the field tag; n is the number of matching `<unit>` first public in that year. A `<u>` can have several field tags, so a column does not add up to n." |
| `mt`, papers | "Papers by first public year and module type. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the module type and meets the module type and transfer mode filters; n is the number of matching papers first public in that year. A paper can have several module types, so a column does not add up to n." |
| `mt`, platforms | "Platforms by first public year and module type. Each cell is the number of platforms matching the filters that were first public in that year and have the module type; n is the number of matching platforms first public in that year. A platform can have several module types, so a column does not add up to n." |
| `tm` | as `mt` with "transfer mode" and "transfer modes" in place of "module type" and "module types" (the phrase "meets the module type and transfer mode filters" stays) |

The 17 resulting texts (12 captions, 2 empty-result messages, the platforms line, the partial-year note and the
sample note) are printed by `expected-counts.mjs`, which finds none of the excluded substrings of REQ-014 in them.

## 4. How

- New dependency: `@observablehq/plot` 0.6.17 (exact; depends on `d3` ^7.9.0). Plot renders the bar chart only;
  the count tables, legend and notes are plain React and HTML.
- Pure functions in `src/lib/trends.ts` and constants in `src/lib/chartTokens.ts` carry the logic and are
  unit-tested without a browser and without Plot; rendering is covered by Playwright.
- `src/App.tsx` loads `src/views/Trends.tsx` with `React.lazy` and `Suspense`, so Plot is in the lazily loaded chunk.
- The dashboard owns its state like the browser: `history.replaceState` for writes and a `hashchange` listener for
  navigation, because `replaceState` fires no `hashchange` (same reason as in SPEC-BROWSE-001 §4).
- Run-phase checks on Plot 0.6.17 (not settled in the plan phase): whether a `var(--token)` colour given to Plot
  resolves in the SVG it renders; if not, colours come from CSS rules on class names or from computed custom-property
  values read at render time (`plan.md` §C). Plot's `ariaLabel` channel sets `aria-label` on the mark inside the
  `<a>`, not on the `<a>`; by default the run phase names each `<a>` after rendering, or verifies that the accessible
  name lands on the link. AC-12 measures the computed fill and finds links by exact name, so either choice is tested.
- A value with count 0 removes its segment from a bar, so slots that are not adjacent in the slot order can touch;
  REQ-012 (c) records how the gap and the labels cover that case.
- Unit tests that read the real `public/data/` run after `npm run build-data` and skip with a message when it is
  absent. Playwright tests run against the existing `dist-e2e/` build (`npm run e2e`).

## 5. Out of scope

### Out of Scope — other views and site-wide work

- The site-wide dark theme and a theme switch (step 7); this SPEC defines the dark token set only.
- Taxonomy explorer, benchmark view, about page; changes to the platform viewer and the comparison.
- Changes to the browser other than the "Show these in Trends" link.

### Out of Scope — charts

- Shares, percentages, rates, cumulative counts, smoothing or any fitted line.
- More than one chart at a time, small multiples, and a split by two categories at once.
- Hover tooltips other than the native SVG `<title>` of each segment (REQ-010); chart export (PNG, SVG, CSV).
- Colours per module type, field tag or transfer mode (multi-valued splits use the count table).

### Out of Scope — data and filters

- Changes to the filter rules, the URL parameters of SPEC-BROWSE-001 §3, `scripts/` or the JSON format of
  SPEC-DATA-001.
- Keeping the split or the unit anywhere other than the URL.

## 6. Acceptance

See `acceptance.md`.
