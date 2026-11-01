---
id: SPEC-BROWSE-001
title: "Browser and comparison: filtered paper and platform tables, shareable filter URLs, side-by-side platforms"
version: "0.2.0"
status: in-progress
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.3.0 target"
module: "src/"
lifecycle: spec-anchored
tags: "browser, comparison, filters, tanstack-table, routing"
tier: M
depends_on: [SPEC-DATA-001, SPEC-VIEW-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Step 3 of `docs/plan.md` ("Browser and comparison"). Reads `public/data/index.json` and
  `public/data/platforms/<paper_id>.json` from SPEC-DATA-001 (filter options come from `index.json`, so
  `taxonomy.json` is not read); extends the hash router of SPEC-VIEW-001. Step 4 (trends) will reuse the filter functions defined here.
- 2026-11-02 0.2.0 revised after plan audit (FAIL 0.84): decoded lists sorted and de-duplicated, an invalid last
  occurrence of a parameter falls back to its default; a year input that is not a four-digit year counts as empty;
  "Clear filters" keeps the shown table and the comparison selection; id and Select chooser checkboxes present,
  checked and disabled; comparison load failures include a failed request, with tests for invalid JSON, a missing
  platform and an aborted request; the count script now prints the comparison rows. Also: totals taken from
  `index.json`, check order of comparison errors, match controls as radio groups, numeric order of per-platform
  links, unchecking and history behaviour of the comparison selection, more route, option, label and 375 px checks.

## 1. Why

Readers need to find the papers and platforms that match a question ("flow reactors with a robot arm, 2018 to
2024") and to see two or three platforms next to each other. A filtered view must have a URL, so a reviewer or the
paper can link to exactly that selection. The trends dashboard (step 4) applies the same filters, so the filter
logic must not depend on the table library or on React.

The release has 238 papers and 280 platforms (years 1974 to 2026). Filters on the paper row (integration mode,
autonomy) and filters on the platform row (module types, transfer modes) both apply to both tables; §2 fixes how.

## 2. Requirements (EARS)

Terms used below. A **paper-level filter** is one whose value is stored on the paper row of `index.json`:
integration mode, software autonomy, hardware autonomy. A **platform-level filter** is one whose value is stored on
the platform row: module types present (`module_types`) and transfer modes present (`material_transfer_modes`).
Year range, field tag and text search apply to each row's own values.

### Routing and navigation

- **REQ-001** (event) When the URL hash is `#/browse` or `#/browse?<query>`, the site shall show the browser with
  the filter state decoded from `<query>` (§3); when it is `#/compare/<id>,<id>[,<id>]`, the site shall show the
  comparison, each id written as in `platformHash` (each `/`-separated segment percent-encoded with
  `encodeURIComponent`, so a literal comma inside an id is `%2C`). `parseRoute` gains the kinds `browse` (carrying the
  raw query text, empty when there is no `?`) and `compare` (carrying the decoded ids in URL order, `[]` for
  `#/compare/`); an id item that is not two non-empty decodable segments is kept as its raw text. `#/browse/x`,
  `#/browsex` and `#/compare` give not found. Every outcome of the existing route tests stays unchanged, and
  `parseRoute` never throws. The site navigation shall show the links "Home" (`#/`) and "Browse" (`#/browse`); the
  home page (counts table and platform list) is not changed.

### Filter state and URL

- **REQ-002** (ubiquitous) The filter state shall be encoded in the hash query with the parameters of §3 and decoded
  back: encoding writes only parameters that differ from their default, in §3 order, list values sorted and without
  duplicates, and gives `#/browse` with no `?` for the default state. Decoding ignores unknown parameters and drops
  without throwing any value that is malformed or not offered (§3 "valid values"); it returns list values sorted
  (alphabetically; autonomy numerically) and without duplicates; for a list parameter, invalid items are dropped and
  the valid ones kept. For a repeated parameter only the last occurrence is read; when that occurrence yields no valid
  value, the parameter takes its default (earlier occurrences are not used). For every
  state produced by decoding, decoding its encoding returns the same state.
- **REQ-003** (event) When the reader changes a filter or switches between the two tables, the site shall replace the
  current hash with the encoded state using `history.replaceState` (no new history entry, so typing in the search box
  does not fill the back history). When the hash changes by navigation while the browser is shown (a link such as
  "Browse", back or forward, an edited URL), the site shall decode the new hash, so the controls and the URL always
  show the same state, apart from the year inputs that REQ-004 leaves out of the URL.
- **REQ-004** (ubiquitous) The filter controls shall be: a year range (two number inputs "From" and "To", empty means
  no limit), checkbox groups for field tag, integration mode, software autonomy, hardware autonomy, module types and
  transfer modes, a text search box, a match control for module types and one for transfer modes (each a group of two
  radio buttons labelled "all" and "any", default "all", with the group labels "Module types match" and "Transfer
  modes match"), and a "Clear filters" button. "Clear filters" resets the year range, every checkbox group, both match
  controls (to "all") and the search box; it keeps the table shown (`view`) and the comparison selection. Options are
  the values present in `index.json`, in alphabetical order; autonomy options are in numeric order and labelled with
  the number and the category text of §3. A "From" or "To" value that is not a four-digit year is treated as empty: it
  is not applied and not written to the URL. While both are four-digit years and "From" is after "To", the year range
  is not applied, is left out of the URL, and the inputs show the message "From year is after To year". Every control
  has a visible label.

### Filter rules

- **REQ-005** (ubiquitous) A row shall match when it passes every active filter (AND across filters); a filter with
  no selected value, an empty year input or an empty search does not restrict. Within one checkbox group, a row
  passes when it has any of the selected values (OR), except for the two groups governed by REQ-006. The year range
  is inclusive on both ends and applies to the row's `first_public_year`. The field-tag filter applies to the row's
  own `field_tags`. The text search trims the input and matches, case-insensitively as a substring, the paper id or
  the title on a paper row, and the platform id or the platform name (a null name never matches) on a platform row.
- **REQ-006** (ubiquitous) For module types and for transfer modes, each with its own switch, match mode "all" shall
  pass a platform whose `module_types` (or `material_transfer_modes`) contains every selected value, and match mode
  "any" shall pass a platform that contains at least one selected value.
- **REQ-007** (ubiquitous) A platform row shall be tested against the paper-level filters using the row of its paper
  (`paper_id`). A paper row shall pass the platform-level filters when at least one of its platforms passes all
  active platform-level filters together (both match modes applied to that same platform); when no platform-level
  filter is active, a paper is not restricted by them. Two different platforms of one paper that each pass only one
  of the selected values do not make the paper pass under match mode "all".
- **REQ-008** (ubiquitous) Above each table the site shall show the number of matching rows of the total, as
  "N of T papers" and "N of T platforms", T being the number of paper or platform rows in `index.json` (238 and 280
  in release 1.0.0), in a live region with `aria-live="polite"`.
- **REQ-009** (ubiquitous) The filter state type, its defaults, the offered values derived from an `IndexJson`, the
  URL encode and decode functions, the row predicates over `PaperRow` and `PlatformRow`, the compare id check and the
  comparison data assembly shall be pure functions in `src/lib/` that import neither React, nor
  `@tanstack/react-table`, nor read `window` or `document`, so the trends dashboard can import them.

### Tables

- **REQ-010** (ubiquitous) Both tables shall use TanStack Table (`@tanstack/react-table`, exact version 9.3.1) and
  a switch of two buttons ("Papers", "Platforms"; `aria-pressed` on the active one) chooses which table is shown;
  default "Papers". The paper table shall have the columns Paper (id), Year, Title, Venue, Field tags, Integration
  mode, SW autonomy, HW autonomy and Platforms; the Platforms cell shows the number of platforms followed by one link
  per platform of the paper, labelled with its suffix and pointing to `platformHash`, ordered by the number in the
  suffix (`P1`, `P2`, …, `P10`, `P11`). The platform
  table shall have the columns Select, Platform (id, a link to `platformHash`), Name, Paper, Year, Field tags,
  Modules (`n_modules`), Steps (`n_steps`), Module types and Transfer modes. List cells are joined with ", "; an empty
  list or a null name is shown as an em dash ("—").
- **REQ-011** (event) When the reader activates a column header button (click, or Enter/Space when focused), the site
  shall sort that table by the column: first ascending, then descending, then back to the order of `index.json`.
  The header cell carries `aria-sort` (`ascending`, `descending` or `none`). Numbers sort numerically (the Platforms
  column by the number of platforms), text case-insensitively with English collation, list cells by their joined
  text; rows with a null name come last in both directions; ties keep `index.json` order. The Select column is not
  sortable.
- **REQ-012** (ubiquitous) Each table shall have a column chooser: a labelled group of checkboxes, one per column,
  that shows or hides the column. The id column (Paper, Platform) and the Select column cannot be hidden: their
  checkboxes are present, checked and disabled.

### Comparison

- **REQ-013** (event) When the reader checks the Select checkbox of a platform row (labelled "Select <platform id>
  for comparison"), the site shall add the platform to the comparison selection; unchecking removes it. A "Compare (n)"
  button above the platform table is enabled only for 2 or 3 selected platforms, and while 3 are selected the
  unchecked boxes are disabled. The selection stays when filters change, "Clear filters" is used or the table switch
  is used. Activating "Compare (n)" opens `#/compare/<ids in the order they were selected>` as a normal navigation
  that adds a history entry, so Back returns to the browser.
- **REQ-014** (event) When the comparison route names 2 or 3 known platforms, the site shall load
  `data/platforms/<paper_id>.json` once per distinct paper and show, as text, one column per platform in URL order:
  the platform name (em dash when null), the platform id as a link to its viewer, the paper id and the year; a module
  type table whose rows are the union of the module types of all modules (on and off the platform) of the compared
  platforms, in alphabetical order, each cell holding the number of that platform's modules of that type or an em
  dash when there is none; a material transfer mode table built the same way from the connections with `is_material`
  true (cell: number of such connections); and each platform's steps in `step_order`, showing order, unit operation
  and performer (em dash when null).
- **REQ-015** (unwanted) The comparison shall not throw or show a blank page: fewer than 2 ids, more than 3 ids, an
  id listed twice, an id that is not a platform in `index.json`, a paper file that fails to load (the request fails,
  the HTTP status is not ok, or the body is not valid JSON), or a paper file without the platform each show a message
  that names the problem and the ids or file concerned, with links to Browse and Home. The checks run in this order:
  number of ids, then duplicates, then unknown ids, then loading the paper files; only the first failing check is
  reported, and when it is the file loading, the message names every file that failed.

### Display and accessibility

- **REQ-016** (ubiquitous) At a viewport width of 375 px the browser and comparison pages shall have no page-level
  horizontal scroll; wide tables scroll horizontally inside their own container. Filter controls, the table switch,
  sort buttons, column chooser checkboxes, Select checkboxes, links and the Compare button shall be reachable with
  Tab and operable with Enter or Space as their element type allows. All interface text written by the site shall be
  in English (checked by review).

## 3. URL parameters and labels

| Parameter | Meaning | Value format | Valid values | Default (omitted) |
|---|---|---|---|---|
| `view` | table shown | `papers` or `platforms` | these two | `papers` |
| `years` | year range | `<from>-<to>`, `<from>-` or `-<to>` | four-digit years, from ≤ to | no limit |
| `field` | field tags | comma-separated | tags present on paper rows | none |
| `im` | integration modes | comma-separated | values present on paper rows | none |
| `sw` | software autonomy | comma-separated integers | values present on paper rows | none |
| `hw` | hardware autonomy | comma-separated integers | values present on paper rows | none |
| `mt` | module types present | comma-separated | values present on platform rows | none |
| `mtMatch` | match mode for `mt` | `all` or `any` | these two | `all` |
| `tm` | transfer modes present | comma-separated | values present on platform rows | none |
| `tmMatch` | match mode for `tm` | `all` or `any` | these two | `all` |
| `q` | text search | `encodeURIComponent` of the trimmed text (decoded with `decodeURIComponent`; `+` is not a space) | any non-empty text | empty |

Example: `#/browse?view=platforms&years=2018-2024&field=catalysis&mt=flow_reactor` (6 of 280 platforms).

Autonomy labels are the category texts of Tom et al. 2024 as given in the release's `data_dictionary.csv`:

| Value | Software autonomy (`sw`) | Hardware autonomy (`hw`) |
|---|---|---|
| 1 | one experiment from a data-driven design | a device doing one kind of task |
| 2 | closed-loop iteration in which results choose the next experiment | a workflow joining several tasks |
| 3 | closed-loop iteration over an algorithm-generated search space | a fully automated laboratory running varied experiments without human intervention |

In release 1.0.0 the offered values are: 9 field tags, 7 integration modes (`fixed_tubing`, `human_transfer`,
`mixed`, `mobile_robot`, `none`, `robot_arm_gantry`, `unmapped`), software autonomy 2 and 3, hardware autonomy 1 to
3, 22 module types and 5 transfer modes (`fixed_tubing`, `human_transfer`, `mobile_robot`, `robot_arm_gantry`,
`unmapped`; `data_transfer` is not a material mode and never appears in `material_transfer_modes`).

## 4. How

- New dependency: `@tanstack/react-table` 9.3.1 (exact; peer `react >=18`). Version 9 changed the API from the
  widely published version 8 examples; the run phase follows the 9.3.1 documentation.
- Pure functions in `src/lib/` (filter state, URL encode/decode, row predicates, compare id check, comparison
  assembly) carry the logic and are unit-tested without a browser; `src/lib/route.ts` gains the two route kinds and a
  `compareHash` helper.
- The browser owns its filter state, writes it with `history.replaceState` and also listens to `hashchange`, because
  `replaceState` does not fire `hashchange` and the router's hash value can lag behind the real one.
- Views in `src/views/`, components in `src/components/`, plain CSS; no styling pass (step 7).
- Unit tests that read the real `public/data/` run after `npm run build-data` and skip with a message when it is
  absent, as in SPEC-DATA-001. Playwright tests run against the existing `dist-e2e/` build (`npm run e2e`).

## 5. Out of scope

### Out of Scope — other views

- Trends dashboard (step 4), taxonomy explorer, benchmark view, about page.
- Changes to the platform viewer of SPEC-VIEW-001, other than the shared navigation links.

### Out of Scope — design and data

- Styling and the design system (step 7); charts or graphs in the comparison.
- Changes to `scripts/` or to the JSON format of SPEC-DATA-001.

### Out of Scope — persistence

- Sort order, column visibility and the comparison selection are not kept in the URL or in browser storage.
- No export of table rows (CSV or other).

## 6. Acceptance

See `acceptance.md`.
