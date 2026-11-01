# Acceptance: SPEC-TRENDS-001

Unit tests (AC-1 to AC-8) run in Vitest without a browser and without Observable Plot; AC-3 to AC-6 read the real
`public/data/` after `npm run build-data` and skip with a message when it is absent. The inverted-input row of AC-3
has a Playwright part. AC-9 to AC-16 are Playwright tests (`npm run e2e`) against the `dist-e2e/` build. "Page
error" means an uncaught exception (`pageerror`). "Count line" means the text of SPEC-BROWSE-001 REQ-008 on the page
shown. "Segment link", "bin-total link" and "cell link" are the links of spec REQ-010 and REQ-011, found by their
accessible names.

Every number below was printed by `expected-counts.mjs` in this folder (`node .moai/specs/SPEC-TRENDS-001/expected-counts.mjs`
from the repository root), which re-implements the filter rules of SPEC-BROWSE-001 and the bin, offered-value and
link-state rules of spec §2 on release 1.0.0 `public/data/index.json`.

The palette validator criteria of spec REQ-012 (a) were run by the orchestrator on 2026-11-02 on the hex values of
REQ-012; the output is recorded in `progress.md` §E.1, and AC-7 guards those values against drift. The screenshot
check at 1280 px and 375 px (including the 2 px segment gap and the colours on screen) is done by the orchestrator in
the run phase and recorded in `progress.md`; it is not an acceptance criterion.

## Scenarios

### AC-1 Route parsing (REQ-001)
- `#/trends` and `#/trends?` → trends, query `""`; `#/trends?split=mt&view=platforms` → trends, query
  `split=mt&view=platforms`.
- `#/trends/`, `#/trends/x` and `#/trendsx` → not found carrying the hash; none of the inputs above throws.
- Every existing case in `tests/route.test.ts` passes without edits to those cases (new cases are added, not changed).

### AC-2 Trends URL encoding and decoding (REQ-002)
- Default state with split `im` encodes to `""` and the hash `#/trends`; split `hw` alone gives `#/trends?split=hw`.
- State {view platforms, years 2018–2024, field catalysis} with split `mt` gives
  `#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt`; with split `im` it gives
  `#/trends?view=platforms&years=2018-2024&field=catalysis`.
- Decoding: `split=mt` → mt; `split=xx` → im; `split=` → im; `split=mt&split=bad` → im; `split=bad&split=tm` → tm;
  `split=im&view=platforms` → split im, view platforms, and re-encodes to `view=platforms`.
- `decodeFilters("split=mt&im=mixed", offered)` equals `decodeFilters("im=mixed", offered)` (the browser ignores
  `split`).
- For each of the six splits combined with each of the 11 single-parameter states of SPEC-BROWSE-001 AC-2, decoding
  the encoding returns the same state and split.

### AC-3 Bins and labels (REQ-004, REQ-006, REQ-013)
With earliest 1974, latest 2026, partial year 2026 (labels, then years for counting as `from-to`, empty side = no
limit):

| Applied year range | Bins |
|---|---|
| none | `before 2015` (-2014), `2015` … `2025` (each `y-y`), `2026*` (2026-2026): 13 bins |
| from 2010 | `2010–2014` (2010-2014), `2015` … `2025`, `2026*` |
| to 2012 | `before 2013` (-2012) only |
| 2016–2020 | `2016`, `2017`, `2018`, `2019`, `2020` |
| from 2026 | `2026*` only |
| 2014–2014 | `2014` (2014-2014) only |
| from 1990 to 2018 | `1990–2014` (1990-2014), `2015`, `2016`, `2017`, `2018` |
| to 2014 | `before 2015` (-2014) only |
| to 1970 | no bin |
| from 2030 | no bin |
| inputs From 2020, To 2018 (inverted) | no applied range: the same 13 bins as "none" |

- The partial year is read from the one search-date constant (20 October 2026); a unit test asserts that the label
  function, given that constant, marks only 2026.
- Inverted inputs: `yearsFromInputs("2020", "2018")` gives no applied range and `inverted` true, and the bins of that
  range are the 13 bins of "none". In Playwright, typing From 2020 and To 2018 on `#/trends` shows "From year is after
  To year", the 13 x-axis labels of "none", the count line "238 of 238 papers", and a hash without `years`.

### AC-4 Offered split values (REQ-007)
- Unfiltered: `im` → `fixed_tubing, human_transfer, mixed, mobile_robot, none, robot_arm_gantry, unmapped`;
  `sw` → `2, 3`; `hw` → `1, 2, 3`; `field` → the 9 field tags of SPEC-BROWSE-001 AC-3; `mt` → the 22 module types
  from `assembly_unit` to `unmapped`; `tm` → `fixed_tubing, human_transfer, mobile_robot, robot_arm_gantry, unmapped`.
- im [robot_arm_gantry, mixed] selected, split `im` → `mixed, robot_arm_gantry`. field [nanomaterials] selected,
  split `field` → `nanomaterials`.
- mt [flow_reactor, liquid_handler], match all, split `mt` → all 22 module types; same selection, match any →
  `flow_reactor, liquid_handler`. A selection in `mt` does not change the values offered for split `tm`.

### AC-5 Link state (REQ-008)
Link URLs (`browseHash(link state)`) and counts:

| Dashboard state (trends hash) | Bin, value | Count of n | Link |
|---|---|---|---|
| `#/trends` | 2021, fixed_tubing | 9 of 17 | `#/browse?years=2021-2021&im=fixed_tubing` |
| `#/trends` | before 2015, fixed_tubing | 15 of 27 | `#/browse?years=-2014&im=fixed_tubing` |
| `#/trends?view=platforms` | 2024, robot_arm_gantry | 3 of 37 | `#/browse?view=platforms&years=2024-2024&im=robot_arm_gantry` |
| `#/trends?split=sw` | 2021, 2 | 17 of 17 | `#/browse?years=2021-2021&sw=2` |
| `#/trends?split=field` | 2021, catalysis | 1 of 17 | `#/browse?years=2021-2021&field=catalysis` |
| `#/trends?split=field` | 2025, nanomaterials | 16 of 39 | `#/browse?years=2025-2025&field=nanomaterials` |
| `#/trends?split=mt` | 2025, flow_reactor | 10 of 39 | `#/browse?years=2025-2025&mt=flow_reactor` |
| `#/trends?view=platforms&split=mt` | 2025, flow_reactor | 10 of 41 | `#/browse?view=platforms&years=2025-2025&mt=flow_reactor` |
| `#/trends?mt=flow_reactor,liquid_handler&split=mt` | 2024, instrument_optical | 1 of 4 | `#/browse?years=2024-2024&mt=flow_reactor,instrument_optical,liquid_handler` |
| `#/trends?mt=flow_reactor,liquid_handler&split=mt` | 2024, flow_reactor | 4 of 4 | `#/browse?years=2024-2024&mt=flow_reactor,liquid_handler` |
| `#/trends?mt=flow_reactor,liquid_handler&mtMatch=any&split=mt` | 2024, flow_reactor | 15 of 23 | `#/browse?years=2024-2024&mt=flow_reactor&mtMatch=any` |
| `#/trends?mt=flow_reactor,liquid_handler&mtMatch=any&split=mt` | 2024, liquid_handler | 12 of 23 | `#/browse?years=2024-2024&mt=liquid_handler&mtMatch=any` |

- The bin link state of a bin of `#/trends?years=2010-&split=tm` labelled `2010–2014` has years 2010–2014 and n 11.

### AC-6 Count tables on the real index (REQ-006, REQ-008)
Bin totals n, unfiltered (bins `before 2015`, 2015 … 2025, `2026*`):
- papers: 27, 4, 5, 3, 12, 7, 16, 17, 18, 26, 28, 39, 36 (sum 238);
- platforms: 28, 4, 6, 4, 24, 8, 22, 17, 20, 27, 37, 41, 42 (sum 280).

Split `im`, papers, unfiltered (`#/trends`), in full:

| | before 2015 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n | 27 | 4 | 5 | 3 | 12 | 7 | 16 | 17 | 18 | 26 | 28 | 39 | 36 |
| fixed_tubing | 15 | 2 | 4 | 1 | 11 | 4 | 8 | 9 | 9 | 10 | 9 | 9 | 8 |
| human_transfer | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 0 | 2 | 1 |
| mixed | 2 | 2 | 1 | 2 | 1 | 2 | 3 | 3 | 5 | 7 | 14 | 13 | 10 |
| mobile_robot | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 3 |
| none | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 2 |
| robot_arm_gantry | 7 | 0 | 0 | 0 | 0 | 1 | 4 | 4 | 1 | 7 | 3 | 12 | 11 |
| unmapped | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |

For every exclusive split (`im`, `sw`, `hw`) and both units, unfiltered, each column of value counts sums to its n.

Filtered: years 2018–2024 + field catalysis (`#/trends?years=2018-2024&field=catalysis`): bins 2018 … 2024 only, n =
1, 2, 1, 1, 1, 2, 3 for papers and the same for platforms; count line 11 for both units. Split `im` papers rows:
fixed_tubing 1, 2, 0, 1, 0, 0, 1; mixed 0, 0, 0, 0, 0, 2, 1; mobile_robot 0, 0, 1, 0, 1, 0, 1; the other four
values 0 in every bin (all seven rows offered, no im selection).

`mt` with a selection:
- mt [flow_reactor, liquid_handler], match all: count line 19; n = 1, 1, 1, 0, 4, 3, 1, 0, 1, 1, 4, 0, 2; 22 rows;
  the flow_reactor and liquid_handler rows equal n in every bin.
- Same, match any: count line 176; n = 23, 3, 4, 2, 11, 6, 10, 12, 12, 18, 23, 31, 21; rows flow_reactor 13, 3, 4,
  2, 11, 4, 6, 7, 7, 9, 15, 10, 8 and liquid_handler 11, 1, 1, 0, 4, 5, 5, 5, 6, 10, 12, 22, 15.

`im` with a selection: im [mixed, robot_arm_gantry]: count line 115; rows mixed and robot_arm_gantry only; n of
`before 2015` is 9.

In every case above, the sum of n equals the count line.

### AC-7 Colour tokens and contrast (REQ-011, REQ-012)
- The exported token map equals the hex values of spec REQ-012, light and dark: the values the palette validator
  passed on 2026-11-02 (`progress.md` §E.1), so a changed token fails this test until the validator is re-run and
  the expected values are updated with it (drift guard).
- A test reads `src/styles.css` and finds each token declared with its light value under `:root` and its dark value
  under `:root[data-theme="dark"]`.
- A WCAG relative-luminance contrast function (in the test or in `src/lib`) gives, for each of the 13 ramp steps in
  order, the text colour `#000000` for steps 0 to 7 and `#ffffff` for steps 8 to 12, with contrasts 15.87, 13.66,
  11.75, 9.95, 8.39, 7.03, 5.77, 4.76, 5.39, 6.63, 8.1, 9.91, 11.95 (rounded to two decimals); every one is at least
  4.5. (`#0b0b0b` on step 7, `#2a78d6`, would give 4.46, which is why the text colours are `#000000` and `#ffffff`.)
- Ramp step of a cell (count, largest value count) → step: (1, 39) → 0; (3, 39) → 0; (20, 39) → 6; (38, 39) → 12;
  (39, 39) → 12; (1, 1) → 12; (0, 39) → not shaded.

### AC-8 Caption texts and library boundary (REQ-009, REQ-014)
- A unit test builds the 12 captions of spec §3, both empty-result messages, the platforms line, the partial-year
  note and the sample note (with 238 and 280 from the real index), compares each with the exact text of the spec,
  and finds none of the 17 excluded substrings (case-insensitive) and no "%" in any of them.
- `tests/libBoundary.test.ts` also checks `src/lib/trends.ts` and `src/lib/chartTokens.ts`, and its package pattern
  also covers `@observablehq/…` and `d3`/`d3-…`; the existing self-test cases pass, and a new case flags
  `import * as Plot from "@observablehq/plot";`.

### AC-9 Route, navigation and split control (REQ-001, REQ-003, REQ-004)
- The site navigation shows the links Home, Browse, Trends in this order; following "Trends" shows the heading
  "Trends", the radio "Integration mode" checked in the group "Split by", the "Papers" button with
  `aria-pressed="true"`, the count line "238 of 238 papers" in an element with `aria-live="polite"`, and hash
  `#/trends`.
- Choosing "Module types" gives hash `#/trends?split=mt` and a count table; choosing "Integration mode" again gives
  `#/trends`. `history.length` stays at its value right after "Trends" was followed.
- Given `#/trends?split=im&view=papers`, the hash becomes `#/trends`. Given `#/trends?split=hw`, then following the
  "Trends" link gives split Integration mode and hash `#/trends`. No page error.

### AC-10 Unit switch and filters (REQ-003, REQ-004)
- Given `#/trends`, when "Platforms" is activated, then the count line reads "280 of 280 platforms", the hash is
  `#/trends?view=platforms` and the line "Platforms carry the first public year, field tags, integration mode and
  autonomy of their paper." is shown; after "Papers" it is not shown.
- Given `#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt`, then From shows 2018, To shows 2024, the
  catalysis box is checked, "Module types" is checked and the count line reads "11 of 280 platforms". When "Clear
  filters" is activated, the count line reads "280 of 280 platforms", the hash is `#/trends?view=platforms&split=mt`
  and "Module types" stays checked.
- The "Papers" and "Platforms" buttons are inside the group named "Unit counted".
- At 1280 × 800 on `#/trends?years=2018-2024&field=catalysis`, the toggle button reads "Filters (2 active)" with
  `aria-expanded="true"`, and the filter panel is visible to the left of the chart (its bounding box ends before the
  chart's begins). At 375 × 800 on `#/trends`, the toggle reads "Filters (0 active)" with `aria-expanded="false"` and
  the panel is hidden; activating the toggle shows the panel and sets `aria-expanded="true"`.

### AC-11 Cross links with equal count lines (REQ-005)
- Given `#/browse?years=2018-2024&field=catalysis` (count line "11 of 238 papers"), the link "Show these in Trends"
  points to `#/trends?years=2018-2024&field=catalysis`; following it, the count line reads "11 of 238 papers".
- There, choosing "Module types" and "Platforms" gives hash `#/trends?view=platforms&years=2018-2024&field=catalysis&split=mt`
  and count line "11 of 280 platforms"; the link "Show these in Browse" points to
  `#/browse?view=platforms&years=2018-2024&field=catalysis`; following it, the count line reads "11 of 280 platforms".
- Given `#/browse?view=platforms&im=mixed&mt=flow_reactor` (count line "27 of 280 platforms"), following "Show these
  in Trends" shows "27 of 280 platforms"; given `#/trends?im=mixed&mt=flow_reactor`, following "Show these in Browse"
  shows "18 of 238 papers" on both pages.

### AC-12 Bar chart, segment and bin-total links, legend (REQ-008, REQ-010, REQ-012)
- Given `#/trends`, there is a link named "2021, fixed_tubing: 9 of 17 papers"; following it gives hash
  `#/browse?years=2021-2021&im=fixed_tubing` and count line "9 of 238 papers".
- Given `#/trends?view=platforms`, the link named "2024, robot_arm_gantry: 3 of 37 platforms" leads to count line
  "3 of 280 platforms".
- The segment link "2021, fixed_tubing: 9 of 17 papers" contains an SVG `<title>` element with exactly that text.
- The texts above the bars are, in order, 27, 4, 5, 3, 12, 7, 16, 17, 18, 26, 28, 39, 36, each a link; the link named
  "2021: 17 papers" points to `#/browse?years=2021-2021`, and following it gives count line "17 of 238 papers". Given
  `#/trends?view=platforms`, the link named "2024: 37 platforms" points to `#/browse?view=platforms&years=2024-2024`.
- Stack order: in the 2021 bar (split im, papers; fixed_tubing 9, human_transfer 1 in AC-6), the mark of the
  fixed_tubing segment lies below the mark of the human_transfer segment (the top edge of its bounding box has the
  greater y, i.e. it is lower on screen).
- The y-axis title is "Papers" and every y tick label is an integer; the x-axis tick labels are the 13 bin labels.
- The legend lists, in this order (stack order, baseline first), fixed_tubing, human_transfer, mixed, mobile_robot,
  none, robot_arm_gantry, unmapped, each with a swatch. Given `#/trends?split=hw` it lists "1 — a device doing one
  kind of task", "2 — a workflow joining several tasks", "3 — a fully automated laboratory running varied experiments
  without human intervention".
- Given `#/trends?split=sw`, the segment link named "2021, 2 — closed-loop iteration in which results choose the next
  experiment: 17 of 17 papers" points to `#/browse?years=2021-2021&sw=2`. Given `#/trends?split=hw`, the segment link
  named "2022, 3 — a fully automated laboratory running varied experiments without human intervention: 1 of 18
  papers" points to `#/browse?years=2022-2022&hw=3`, where the count line reads "1 of 238 papers".
- The `<details>` "Counts as a table", when opened, holds a table whose "n" row and fixed_tubing row match AC-6.
- The mark of the segment link "2021, fixed_tubing: 9 of 17 papers" has the computed fill `rgb(42, 120, 214)`
  (`#2a78d6`, slot 1). Given `#/trends?im=mixed`, the legend lists only mixed and the mark of a mixed segment has the
  computed fill `rgb(27, 175, 122)` (`#1baf7a`, slot 3), the same as unfiltered: colour follows the value.

### AC-13 Count table as chart, cell links, shading (REQ-008, REQ-011, REQ-012)
- Given `#/trends?split=field`, the table has a header of 13 bin labels, a first body row "n" (27 … 36 as in AC-6),
  9 field-tag rows, and the caption of spec §3 for field and papers. The cell link named
  "2025, nanomaterials: 16 of 39 papers" shows "16"; following it gives hash
  `#/browse?years=2025-2025&field=nanomaterials` and count line "16 of 238 papers".
- Given `#/trends?view=platforms&split=mt`, the cell link named "2025, flow_reactor: 10 of 41 platforms" leads to
  count line "10 of 280 platforms". A cell with count 0 shows "0" and is a link.
- The n cell named "2025: 39 papers" (split field) links to `#/browse?years=2025-2025`.
- Rendered shading (split field, papers; the largest value count in this table is 16): the cell "2025, nanomaterials:
  16 of 39 papers" takes step 12: its `td` has the computed background `rgb(13, 54, 107)` (`#0d366b`) and the `a`
  element inside it has the computed `color` `rgb(255, 255, 255)`; the zero cell "2015, analytical_chemistry: 0 of 4
  papers": its `td` has the computed background `rgba(0, 0, 0, 0)` (no background of its own) and its `a` element has
  the computed `color` `rgb(11, 11, 11)` (ink `#0b0b0b`), not the site's link accent colour.
- The table sits in a container whose `overflow-x` is `auto`.

### AC-14 Partial year, notes, data card link, no percentages (REQ-013, REQ-014)
- Given `#/trends`, the last x tick label is "2026*", the note "* 2026 is partial: the search ran on 20 October 2026."
  is shown, and the sample note reads "The counts cover the 238 papers (280 platforms) that passed the screening
  described in the data card (DATA_CARD.md in the release files on Zenodo), not every paper on self-driving
  laboratories." with "release files on Zenodo" a link to `https://doi.org/10.5281/zenodo.23857126`.
- Given `#/trends?years=2016-2020`, there is no "2026*" and no partial-year note.
- On `#/trends`, `#/trends?split=field` and `#/trends?view=platforms&split=mt`, the dashboard's text contains no "%".

### AC-15 Lazy chunk (REQ-015)
- Loading `#/` and then `#/browse` makes no request for a JavaScript file whose name starts with `Trends`; opening
  `#/trends` afterwards makes one, and the chart appears.
- No JavaScript file requested while loading `#/` contains a string unique to Plot's code. The run phase picks the
  string from the built `Trends` chunk (for example the class-name prefix Plot generates for its SVG), confirms it
  occurs in that chunk, and records it in `progress.md` §E.2; the test asserts it is absent from every JavaScript
  response body on `#/` and present in the `Trends` chunk.

### AC-16 Narrow screen, keyboard, empty result, gates (REQ-010, REQ-013, REQ-016, all)
- At 375 × 800, on `#/trends` and on `#/trends?split=mt`, `document.documentElement.scrollWidth` is at most 375, and
  the chart's SVG (split im) is not wider than its container.
- On `#/trends`, pressing Tab from the page start reaches the "Split by" radio group, the "Papers" button, the link
  "Show these in Browse", the segment link named "2021, fixed_tubing: 9 of 17 papers" and the bin-total link
  "2021: 17 papers"; pressing Enter on the segment link opens its browse URL. On `#/trends?split=field`, Tab reaches
  the cell link "2025, nanomaterials: 16 of 39 papers".
- Given `#/trends?q=zzzz`, the count line reads "0 of 238 papers" and "No papers match these filters." is shown with
  no chart, legend or table; with `view=platforms&split=mt` added, "No platforms match these filters."; no page error.
- `npm test`, `npm run typecheck`, `npm run build` and `npm run e2e` (new tests and the existing `e2e/viewer.spec.ts`
  and `e2e/browse.spec.ts`) pass; `src/lib/` coverage is at least 85%; `package.json` lists
  `"@observablehq/plot": "0.6.17"`.
