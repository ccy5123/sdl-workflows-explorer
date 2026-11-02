# Plan: SPEC-TAXO-001

## A. Context

Step 5 of `docs/plan.md`. Depends on SPEC-DATA-001, SPEC-BROWSE-001 and SPEC-TRENDS-001 (all completed). Development
mode: TDD. Extends `scripts/lib/derive.ts`, the filter modules shared by the browser and the dashboard, and the hash
router; adds one lazily loaded view. The release under `~/research/sdl-db/` is read-only; the build reads the verified
cache in `.cache/release/`.

## B. Tasks (TDD per unit), most likely to change first

1. `taxonomy.json` shape (AC-2, AC-3): new types in `src/data/types.ts` (`TaxonomyClass` gains `n_platforms`,
   `n_papers`, `examples`, `correspondence`; `TaxonomyJson` gains `vocabularies`, `sources`, `relations` and loses the
   raw rows). The field names and the nesting are what a reviewer is most likely to revise; settle them first, since
   the view and every derive test depend on them.
2. Correspondence parsing and cross-checks (AC-3, AC-4) in `scripts/lib/derive.ts`: long table → entries; wide table
   parse; README table parse; data-dictionary parse (parenthesis-aware split); the checks (a) to (i) of REQ-004, each
   throwing from `deriveAll` with the class, vocabulary, key or row (`scripts/build-data.ts` is not changed: it
   already calls `writeDerived` only after `deriveAll` returns). Extend `tests/fixtures/release-mini/` first (long
   table, `README.md` with the source table, `data_dictionary.csv` with the `match` row, wide table rewritten with
   valid relations and one- or three-part sources instead of `Gottstein2026 ; pdf p.3`, `data_transfer` connections so
   it is on all three platforms, `platforms.csv` columns agreeing with the graphs for check (h)) and update the
   fixture-derived expected values in `tests/derive.test.ts` (and any other fixture test) in the same commit, listing
   each changed value in `progress.md` §E.2.
3. Per-class counts and examples (AC-2) in `buildTaxonomy`; `unit_operations` on platform rows (AC-1) in
   `readPlatformRows` joined with the graphs; real-release tests in a new `tests/taxonomy-derive.test.ts` (or inside
   `tests/release.test.ts`) with the skip message.
4. Link rule (AC-10) in `src/lib/taxonomy.ts`: `classLinks(cls, offered, totals)` returning both links and the note
   kind, plus texts (caption, unit nouns with singular, kind labels, not-covered text, family grouping). The
   count-consistency test runs over all 69 classes of the real `taxonomy.json`.
5. Filter state `uo`/`uoMatch` (AC-6, AC-7): `filterState.ts` (state, default, `Offered.uo`, `offeredValues`,
   `activeFilterCount`, `clearFilters`), `filterUrl.ts` (encode order after `tmMatch`, decode), `filterApply.ts`
   (`platformLevelOk` and the paper-level activity check include `uo`). Existing tests unchanged except group
   enumerations.
6. Trends caption phrase (AC-8) in `src/lib/trends.ts`; update the two expected captions in `tests/trends.test.ts`.
7. Route (AC-9): kinds `taxonomy` and `taxonomyClass` in `src/lib/route.ts`, `taxonomyHash`; new cases only in
   `tests/route.test.ts`.
8. `FilterPanel` (AC-14): "Unit operations" group and "Unit operations match" radio group after "Transfer modes
   match".
9. Views: `src/views/Taxonomy.tsx` (overview, class page, not found, loading and error states; module-level cached
   fetch of `data/taxonomy.json`); CSS for stacked rows below 800 px with `data-label` cell labels; no new colour
   unless needed (then `--taxo-*` tokens, AC-16).
10. `src/App.tsx`: `React.lazy(() => import("./views/Taxonomy"))`, both route kinds, nav link "Taxonomy" after
    "Trends".
11. Playwright: `e2e/taxonomy.spec.ts` (AC-11 to AC-13, AC-15, AC-16) and the `uo` cases of AC-14 (in
    `e2e/browse.spec.ts` / `e2e/trends.spec.ts` as new tests); existing e2e tests pass.
12. Tests for AC-5 (sizes after `build-data`, `src/` text scan) and `tests/libBoundary.test.ts` covering
    `src/lib/taxonomy.ts`.

## C. Risks

| Risk | Mitigation |
|---|---|
| The fixture release lacks the long table, README and dictionary and uses relation `broad`; REQ-004 makes every fixture-based derive test fail until it is extended | Task 2 extends the fixture before the checks land; the changed fixture values are listed in `progress.md`; real-release expected values stay as they are |
| Adding `data_transfer` connections to the fixture changes its connection counts used by other fixture tests (`counts.test.ts`, derive AC-9) | Grep the tests for the fixture counts first and update them in the same commit; the real-release count check of SPEC-DATA-001 is untouched |
| The wide-table parse splits targets at "; " and reads the relation from the last "( … )"; a future release could put "; " or parentheses inside a target | REQ-004 (a) makes any such disagreement with the long table fail the build instead of showing a wrong mapping; release 1.0.0 parses with 0 disagreements and 0 order differences (script section 6) |
| The README is prose; its source table could move or change format | The parse anchors on the exact heading and the first table after it; a missing heading, table or doi fails the build (REQ-004 e) |
| `index.json` grows by about 43 kB (204,900 → about 247,729 bytes) and is loaded on every page | Ceiling 260,000 bytes in REQ-005; the size is recorded; unit operations are needed in the index because platform graphs load per paper |
| A class that is not offered but would get a filtered link opens an unfiltered table (`decodeFilters` drops unknown values) and shows a wrong count | The link rule links a filtered URL only for offered classes; the unfiltered case requires counts equal to the totals, and REQ-004 (g) fails the build when the non-material transfer mode is not on every platform; AC-10 checks all 69 classes |
| Class counts come from the graphs while the browser filters on the `platforms.csv` columns; they agree on 1.0.0 (280/280 rows) but a later release could part them, breaking REQ-015 silently | REQ-004 (h) compares every class's `n_platforms` and `n_papers` with the platform-row columns at build time; script section 4 prints 0 differences on 1.0.0; AC-4 (h) edits one fixture row |
| `PlatformRow` gains a field, so every existing row literal in the tests fails the typecheck | REQ-008 allows adding `unit_operations` to those literals and builders only; AC-8 checks by `git diff` that nothing else changed |
| `uo` as a third platform-level filter changes paper counts only when selected; a regression could change existing counts | Existing filter and trends tests keep their expected values (REQ-008); AC-7 adds the Roch2020 case that separates "one platform passes all" from "any platforms" |
| The trends caption texts are asserted verbatim in SPEC-TRENDS-001 tests | Only the two `mt`/`tm` paper captions change, by one phrase; the banned-substring test still runs on them |
| `taxonomy.json` grows from 35,742 to about 94,799 bytes | Loaded only on taxonomy routes, once per page load (AC-15); ceiling 120,000 bytes |
| 31 unit-operation checkboxes lengthen the filter panel, especially at 375 px | The panel is collapsed behind the toggle below 1000 px (SPEC-BROWSE-001 layout); screenshot check by the orchestrator |
| Wide tables (definition column, correspondence) overflow at 375 px | Stacked rows with cell labels below 800 px; AC-16 measures `scrollWidth` on four pages |

## D. Files

New: `src/lib/taxonomy.ts`, `src/views/Taxonomy.tsx`, `tests/taxonomy.test.ts` (link rule, texts, consistency on real
data), a real-release derive test file or new cases in `tests/release.test.ts`, `e2e/taxonomy.spec.ts`, fixture files
`tests/fixtures/release-mini/{core/taxonomy_correspondence.csv,README.md,data_dictionary.csv}`.
Edited: `scripts/lib/derive.ts`, `src/data/types.ts`, `src/lib/{filterState,filterUrl,filterApply,trends,route}.ts`,
`src/components/FilterPanel.tsx`, `src/App.tsx`, `src/styles.css`, `tests/{derive,route,filterUrl,filterApply,
filterState,trends,libBoundary}.test.ts` (new cases; existing cases changed only as REQ-008 and spec §3 allow),
`tests/{compare,identity,platformFilter}.test.ts` (platform-row literals gain `unit_operations` only), fixture files
`modes/taxonomy/correspondence.csv`, `modes/builder/platform_graphs.jsonl` and `modes/builder/platforms.csv` (plus
any fixture core table that must agree with them), `e2e/{browse,trends}.spec.ts` (new tests only).
Not edited: `scripts/build-data.ts`, `scripts/fetch-release.ts`, `scripts/lib/{checksum,config,counts,csv,extract}.ts` (unless the fixture
counts require it), `src/views/{Browse,Trends,PlatformView,Compare,Home}.tsx`, `release.config.json`, anything under
`~/research/sdl-db/`.

## E. Amendment 0.4.0

Changes REQ-005, REQ-009, REQ-011, REQ-013, REQ-015, REQ-016 and AC-5, AC-9, AC-10, AC-11, AC-13, AC-16 (spec.md
§ Amendments). No change to the derived data, the filters or the class page counts, links and examples. TDD per unit.

### E.1 Tasks, most likely to change first

1. Source route (AC-9): in `src/lib/route.ts`, `#/taxonomy?source=<v>` parses to the taxonomy route with a `source`
   field holding the decoded value; the query must contain no "&", start with `source=`, and have a non-empty value
   that decodes with `decodeURIComponent`; every other `#/taxonomy?…` stays not found. Add `taxonomySourceHash(key)`.
   New cases in `tests/route.test.ts`; existing cases unedited.
2. Correspondence table rows (AC-10, AC-13) in `src/lib/taxonomy.ts`: one pure function of the class, `vocabularies`
   and `sources` returning, per row, the four cell texts, the vocabulary link (`taxonomySourceHash` of the first key of
   the vocabulary's README row) and whether the row starts a Vocabulary/Source span and over how many rows; the source
   format "<key>, <page>, <locator>" joined with "; "; the "searched: …" and "not covered" rows; the vocabulary
   display labels (constants keyed by column name, column name as fallback); the not-covered text with the label.
   Unit tests on thermal_unit, mobile_robot, human and the 315-row total.
3. Relation meanings (AC-10, AC-11): glosses for `exact` and `none` as constants in `src/lib/taxonomy.ts` and one
   function choosing release meaning, then gloss, then "—". The caption gains its second sentence; the jump-list name
   "On this page" becomes a constant.
4. Overview (AC-11) in `src/views/Taxonomy.tsx`: order h1, caption, "On this page" with four buttons, the four kind
   sections, "Sources of the correspondence", "Relations". A button scrolls its kind's h2 into view and focuses it
   (the h2 gets `tabIndex={-1}`); it must not set `location.hash`. Sources rows get `aria-current="true"` when one of
   their keys equals the route's `source`, and the view scrolls that row into view after `taxonomy.json` has loaded
   and again whenever `source` changes while the overview stays mounted.
5. Class page (AC-13) in `src/views/Taxonomy.tsx`: replace the h3 sub-sections with one table built from task 2,
   `rowSpan` on the Vocabulary and Source cells, `data-label` on every cell for the stacked layout; remove the
   reference and doi from class pages. `src/App.tsx` passes the route's `source` through.
6. Line breaks (AC-16): class-name links in the overview tables and vocabulary labels in the correspondence table get
   a break opportunity after each "_" by markup (`<wbr>` after each underscore) and a CSS rule that sets
   `overflow-wrap: normal` (and `word-break: normal`) on those elements only, overriding
   `.taxonomy { overflow-wrap: anywhere }`; other text keeps `anywhere` so 375 px keeps no horizontal scroll.
7. Tests: rewrite the AC-13 case of `e2e/taxonomy.spec.ts` (it uses the h3 sub-sections and the `.taxo-targets`,
   `.taxo-sources`, `.taxo-ref` classes); update the AC-11 and AC-16 cases (heading order, jump list, `?source=`
   targeting including a move from `?source=Bai2024` to `?source=Mehr2020`, the per-character line-break check at
   800 px and 375 px, four pages for `scrollWidth`); in `tests/taxonomy.test.ts` replace the cases for "No
   counterpart in this vocabulary." and the old not-covered text, add the AC-5 bullet for glosses and labels, and
   extend the banned-substring list of AC-10.

### E.2 Files

Edited: `src/lib/route.ts`, `src/lib/taxonomy.ts`, `src/views/Taxonomy.tsx`, `src/App.tsx` (passes `source` only),
`src/styles.css`, `tests/route.test.ts` (new cases only), `tests/taxonomy.test.ts`, `e2e/taxonomy.spec.ts`.
Not edited: `scripts/`, `public/data/`, `src/data/types.ts` (no data change), the filter modules, the other views and
their tests.

### E.3 Risks

| Risk | Mitigation |
|---|---|
| `tests/route.test.ts` asserts `toEqual({ kind: "taxonomy" })` for `#/taxonomy`; a `source: null` field would break it | The no-source route stays exactly `{ kind: "taxonomy" }`: no `source` key (or `undefined`), never `null` |
| A zero-width space inserted after "_" is itself a character of the link text, so the per-character check of AC-16 would see it, and copy-paste or find-in-page would include it | Break opportunities come from markup (`<wbr>`) or CSS, not from an inserted character; the link text stays the class name |
| "OntoLab/SAREF" could break after "/" (browsers allow breaks after a slash), which AC-16 forbids | The `overflow-wrap: normal` rule on vocabulary labels plus no `<wbr>` after "/"; AC-16 checks mobile_robot and thermal_unit, both showing the label; if a browser still breaks there, keep the label on one line (`white-space: nowrap` on the label) |
| Scrolling to the targeted row runs before the table exists, or not at all when only `source` changes | Scroll in an effect that depends on the loaded data and on `source`; AC-11 tests a fresh load, a class-page link and a move between two `?source=` hashes |
| The buttons' scroll and focus could change the hash or trigger the router | Buttons use `scrollIntoView` and `focus()`, no `href`; AC-11 checks the hash stays `#/taxonomy` |
| Rowspan cells in the stacked layout below 800 px | A rowspan cell belongs to its first row's block; AC-16 checks `scrollWidth` and the labelled cells on thermal_unit |
