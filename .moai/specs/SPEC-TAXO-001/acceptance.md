# Acceptance: SPEC-TAXO-001

Unit tests (AC-1 to AC-10) run in Vitest without a browser. Tests on the real derived data read `public/data/` after
`npm run build-data` and skip with a message when it is absent; tests that run `deriveAll` on the real release use the
verified cache (or `SDL_RELEASE_ZIP`) and skip with a message when neither is available, as `tests/release.test.ts`
does. AC-11 to AC-16 are Playwright tests (`npm run e2e`) against the `dist-e2e/` build. "Page error" means an
uncaught exception (`pageerror`). "Count line" means the text of SPEC-BROWSE-001 REQ-008 on the page shown.

Every number below was printed by `expected-counts.mjs` in this folder (`node .moai/specs/SPEC-TAXO-001/expected-counts.mjs`
from the repository root; output in `progress.md` §E.1). The script re-implements the rules of spec §2 without
importing project code: it reads `public/data/index.json` and `public/data/platforms/*.json` (release 1.0.0 as derived
before this SPEC) and the verified release files `modes/taxonomy/classes.csv`, `modes/taxonomy/correspondence.csv`,
`core/taxonomy_correspondence.csv`, `README.md` and `data_dictionary.csv`. The screenshot check at 1280 px and 375 px
is done by the orchestrator in the run phase and recorded in `progress.md`; it is not an acceptance criterion.

## Scenarios

### AC-1 unit_operations on platform rows (REQ-001)
- Given the real release, when `deriveAll` runs, then each of the 280 platform rows has `unit_operations`, none is
  empty, the lists hold 4 to 15 values (2155 in total), and `Aand2024/P1` has `analyze_data, dispense_liquid,
  handle_sample, measure_optical, plan_next_experiment, react_photo_electro`. The union of all lists is the 31 unit
  operations of `classes.csv` (from `analyze_data` to `wash_extract`, `unmapped` included).
- Given the fixture release (steps unchanged), the rows hold `PaperA2024/P1` → `analyze_data, dispense_liquid`;
  `PaperA2024/P2` → `analyze_data, dispense_liquid, measure_optical`; `PaperB2025/P1` → `analyze_data`. The field
  list of a platform row in `tests/derive.test.ts` gains `unit_operations` and nothing else.

### AC-2 Per-class counts and examples (REQ-002)
- Given the real release, then `classes` has 69 entries (10 field_tag, 22 module_type, 6 transfer_mode,
  31 unit_operation) in `classes.csv` order, and the sums of `n_items` per kind are unchanged: 270, 1603, 1687, 2621.
- Counts (`n_items` / `n_platforms` / `n_papers`):

| Class | n_items | n_platforms | n_papers |
|---|---|---|---|
| field_tag/catalysis | 23 | 23 | 23 |
| field_tag/chemistry_synthesis | 85 | 123 | 85 |
| field_tag/unmapped | 0 | 0 | 0 |
| module_type/flow_reactor | 139 | 127 | 99 |
| module_type/software | 358 | 280 | 238 |
| module_type/assembly_unit | 4 | 4 | 4 |
| transfer_mode/data_transfer | 611 | 280 | 238 |
| transfer_mode/mobile_robot | 42 | 9 | 9 |
| transfer_mode/unmapped | 7 | 6 | 6 |
| unit_operation/sonicate | 11 | 5 | 5 |
| unit_operation/dispense_liquid | 427 | 248 | 209 |
| unit_operation/unmapped | 45 | 39 | 37 |

- Examples (`platform_id` with `n`):
  - module_type/flow_reactor: Bedard2018/P11 3, Nambiar2022/P2 3, AbdelLatif2021/P1 2, Bedard2018/P10 2,
    Bedard2018/P6 2 (ties in platform id order: `Bedard2018/P11` before `Nambiar2022/P2`, `Bedard2018/P10` before
    `Bedard2018/P6`);
  - module_type/assembly_unit: Dai2025/P1 1, Gao2026/P1 1, Toyama2025/P1 1, Yik2025/P1 1 (four entries);
  - unit_operation/sonicate: Zhao2026/P1 6, Pilz2023/P1 2, Dave2022/P1 1, Kim2026/P1 1, Yang2026a/P1 1;
  - transfer_mode/mobile_robot: Song2025/P1 7, Wang2026a/P1 7, Zhu2024/P1 7, Burger2020/P1 6, Yang2026a/P1 5;
  - field_tag/catalysis (n null): Amara2015/P1, Bai2023a/P1, Baumgartner2019/P1, Bennett2024/P1, Brody2026/P1;
  - field_tag/unmapped: no example. The classes with fewer than 5 examples are field_tag/unmapped (0),
    module_type/assembly_unit (4) and module_type/commercial_integrated (4).
- The first example of module_type/flow_reactor has `platform_name` "Reconfigurable continuous-flow system, ketene
  generation and [2+2] cycloaddition configuration".

### AC-3 Structured correspondence, vocabularies, sources, relations (REQ-002, REQ-003)
- Given the real release, then 56 classes have a non-null `correspondence` (0 field tags, 21 module types,
  5 transfer modes, 30 unit operations) and 13 have null (the 10 field tags and `unmapped` of module_type,
  transfer_mode and unit_operation). The raw rows key `correspondence` is absent from the top level of `taxonomy.json`.
- `vocabularies` is, in order: XDL, WCSO, Leong2022, OntoLab_SAREF, Gottstein2026; `kinds` is
  `module_type, transfer_mode, unit_operation` for each except OntoLab_SAREF (`module_type`); `source_keys` are
  Mehr2020, Schilling2026, Leong2022, Bai2024, Gottstein2026 respectively.
- Across all classes there are 245 entries (280 cells minus 35 vocabularies with no entry: OntoLab_SAREF for the
  5 transfer modes and the 30 unit operations), 106 entries whose single target is `none`, 21 entries with more than
  one target, and 280 targets in total: 74 XDL, 61 WCSO, 68 Leong2022, 21 OntoLab_SAREF, 56 Gottstein2026; by relation
  92 exact, 33 broader, 49 narrower, 106 none. The entries' `sources` lists (one list per entry, not per target)
  hold 294 sources: 192 with page and locator, 102 with only a key; key-only sources occur only in `none` entries.
  (Summed over the 280 long-table rows the figures would be 373, 271 and 102; that is not what `taxonomy.json`
  stores.)
- module_type/thermal_unit, XDL: targets Heater/chiller, Low temperature, circulation chiller, heater chiller,
  stirrer hotplate (all exact), sources `Mehr2020 ; p.10 ; Fig. 5`, `Mehr2020 ; p.4 ; Fig. 2`,
  `Mehr2020 ; p.11 ; main text`. transfer_mode/mobile_robot has no OntoLab_SAREF entry and a Leong2022 entry
  `transportation task` (broader) with source `Leong2022 ; p.9 ; Limitations`. module_type/human, Gottstein2026: one
  target `none` with source `Gottstein2026 ; pdf p.3 ; Fig. 1` (a `none` entry with page and locator).
- `sources` has 5 rows with keys and dois: Mehr2020 (10.1126/science.abc2986); Schilling2026, Schilling2026_SI
  (10.1039/d6dd00058d); Leong2022 (10.1016/j.matt.2022.08.017); Bai2024 (10.1038/s41467-023-44599-9); Gottstein2026
  (10.1016/j.device.2026.101202); vocabularies XDL, "WeChemSynOntology (WCSO)", "MAP workflow framework",
  "OntoLab / SAREF (module types only)", "Orchestration levels".
- `relations` is exact (null), broader ("the target is wider than our class"), narrower ("the target is narrower; for
  Gottstein2026, one of our items may span several of its objects"), none (null).

### AC-4 Build failures (REQ-004)
Given a copy of the extended fixture release (which `deriveAll` accepts unmodified), each of the following edits makes
`deriveAll` throw with a message naming the class, vocabulary, key or row (the message is matched by the test).
`scripts/build-data.ts` calls `writeDerived` only after `deriveAll` returns, so a throw means nothing is written; the
entry point itself is not exercised by these tests and is not changed.
- (a) a target renamed in the wide table; a relation changed in the wide table; two targets of one cell swapped in
  the wide table; a source text changed in the long table; a wide cell emptied while its long rows stay; a wide cell
  emptied and its long rows removed for a class of a kind the vocabulary still covers through another class;
- (b) a long-table source key replaced by `Nobody2020`;
- (c) a long-table row for a class absent from `classes.csv`;
- (d) a long-table row duplicated;
- (e) the README heading "## Sources of the correspondence table" removed; the doi removed from one README row; the
  data-dictionary `match` row removed; a long-table `match` value `partial`;
- (f) a vocabulary whose rows name keys of two different README rows;
- (g) the `data_transfer` connection removed from one fixture platform (the mode keeps connections on the others);
- (h) one module type removed from the `module_types` column of one fixture `platforms.csv` row while the graph
  keeps the module;
- (i) a long-table source written with two parts (`Gottstein2026 ; pdf p.3`), the wide source cell changed to match.
- Control: a transfer mode with no connection at all in the fixture (for example an `unmapped` transfer mode in
  `classes.csv` and nowhere else) does not make `deriveAll` throw, and its `n_platforms` and `n_papers` are 0.

### AC-5 File sizes and no reference text in src (REQ-005)
- `public/data/taxonomy.json` written by `build-data` is at most 120,000 bytes (the script's estimate of the same
  shape: 94,799 bytes; the current file with raw rows: 35,742) and `public/data/index.json` at most 260,000 bytes
  (estimate 247,729; currently 204,900). The run phase records the measured sizes in `progress.md` §E.2.
- A test scanning every file under `src/` finds none of: `doi:10.`, `10.1126/science.abc2986`, `Mehr et al`,
  `the target is wider`, `Orchestration levels`.

### AC-6 uo in the URL (REQ-006)
- Decoding: `uo=sonicate,mix` → [mix, sonicate]; `uo=mix,xx,mix` → [mix]; `uo=xx` → []; `uo=mix&uo=xx` → [];
  `uo=xx&uo=mix` → [mix]; `uo=` → []; `uo=%E0,mix` → [mix]; `uoMatch=any` → any; `uoMatch=some` → all.
- Encoding {view platforms, mt [flow_reactor], tmMatch any, uo [sonicate, mix], uoMatch any, q "pump"} gives
  `view=platforms&mt=flow_reactor&tmMatch=any&uo=mix,sonicate&uoMatch=any&q=pump`.
- `offeredValues(index).uo` on the real index is the 31 unit operations in alphabetical order. For each of the
  11 single-parameter states of SPEC-BROWSE-001 AC-2 plus {uo [sonicate]}, {uo [mix, sonicate], uoMatch any} and
  {uoMatch any}, decoding the encoding returns the same state.

### AC-7 uo filter rules on the real index (REQ-007)

| Browse URL | Count line |
|---|---|
| `#/browse?view=platforms&uo=sonicate` | 5 of 280 platforms |
| `#/browse?uo=sonicate` | 5 of 238 papers |
| `#/browse?view=platforms&uo=mix,sonicate` | 0 of 280 platforms |
| `#/browse?view=platforms&uo=mix,sonicate&uoMatch=any` | 111 of 280 platforms |
| `#/browse?uo=mix,sonicate&uoMatch=any` | 98 of 238 papers |
| `#/browse?view=platforms&mt=liquid_handler&uo=dispense_solid` | 18 of 280 platforms |
| `#/browse?mt=liquid_handler&uo=dispense_solid` | 16 of 238 papers |
| `#/browse?view=platforms&tm=mobile_robot&uo=handle_sample` | 4 of 280 platforms |
| `#/browse?years=2018-2024&field=catalysis&uo=react_thermal` | 3 of 238 papers |
| `#/browse?view=platforms&uo=clean_equipment,dispense_liquid` | 74 of 280 platforms |
| `#/browse?uo=clean_equipment,dispense_liquid` | 61 of 238 papers |

- One platform must pass every selected unit operation: Roch2020 has dispense_liquid on P1 to P4 and clean_equipment
  on P5 only, so `#/browse?uo=clean_equipment,dispense_liquid&q=Roch2020` gives "0 of 238 papers" (62 papers would
  pass if the two values could sit on different platforms).
- `activeFilterCount` of {uo [sonicate]} is 1; `clearFilters` of {view platforms, uo [mix], uoMatch any} gives the
  default state with view platforms.

### AC-8 Trends with the uo filter (REQ-008)
- The paper captions for split `mt` and `tm` equal the two texts printed in section 10 of the script ("… and meets
  the module type, transfer mode and unit operation filters; …"); they contain none of the excluded substrings of
  SPEC-TRENDS-001 REQ-014. All other caption texts are unchanged.
- `decodeTrends("uo=sonicate&split=mt", offered)` gives uo [sonicate] and split mt, and encodes back to
  `uo=sonicate&split=mt`. On `#/trends?uo=sonicate` (Playwright), the count line reads "5 of 238 papers" and the link
  "Show these in Browse" points to `#/browse?uo=sonicate`.
- `tests/trends.test.ts`, `tests/filterApply.test.ts`, `tests/filterUrl.test.ts`, `tests/filterState.test.ts`,
  `e2e/browse.spec.ts` and `e2e/trends.spec.ts` pass with every expected value unchanged except the two captions and
  assertions that list the filter groups, filter state fields or offered-value groups.
- `tests/compare.test.ts`, `tests/identity.test.ts` and `tests/platformFilter.test.ts` pass with their platform-row
  literals extended by `unit_operations` and no other edit; `git diff` of these three files and of the row helper in
  `tests/filterApply.test.ts` and the `offeredValues` input in `tests/filterUrl.test.ts` shows only added
  `unit_operations` entries. `npm run typecheck` passes.

### AC-9 Routes (REQ-009)
- `#/taxonomy` → taxonomy; `#/taxonomy/module_type/flow_reactor` → class page {kind module_type, class flow_reactor};
  `#/taxonomy/a%20b/c` → {kind "a b", class "c"}; `#/taxonomy/x/y` → class page {x, y} (well-formed, unknown).
- `#/taxonomy/`, `#/taxonomy/x`, `#/taxonomy/a/b/c`, `#/taxonomy/a/`, `#/taxonomy//b`, `#/taxonomy/a/%E0`,
  `#/taxonomy?x`, `#/taxonomyx` → not found carrying the hash; none throws.
- `taxonomyHash("unit_operation", "sonicate")` is `#/taxonomy/unit_operation/sonicate`; `taxonomyHash("a b", "c/d")`
  is `#/taxonomy/a%20b/c%2Fd`, and parsing it returns {kind "a b", class "c/d"}.
- Every existing case in `tests/route.test.ts` passes without edits to those cases.

### AC-10 Link rule, count consistency and texts (REQ-012, REQ-015, REQ-016)
- Link function on the real data: module_type/flow_reactor → `#/browse?view=platforms&mt=flow_reactor` and
  `#/browse?mt=flow_reactor`; field_tag/catalysis → `#/browse?view=platforms&field=catalysis` and
  `#/browse?field=catalysis`; unit_operation/sonicate → `#/browse?view=platforms&uo=sonicate` and
  `#/browse?uo=sonicate`; transfer_mode/data_transfer → `#/browse?view=platforms` and `#/browse` with the
  unfiltered note; field_tag/unmapped → no links with the "no platform" note.
- For all 69 classes of the real `taxonomy.json`: 68 have links (one of them, transfer_mode/data_transfer,
  unfiltered) and 1 has none (field_tag/unmapped, with `n_platforms` and `n_papers` 0); for every linked class,
  `matchingPlatforms` on the decoded platforms link returns exactly `n_platforms` rows and `matchingPapers` on the
  decoded papers link exactly `n_papers` rows (0 mismatches).
- Texts: the overview caption on the real data reads "The 69 classes of the release taxonomy: 10 field tags,
  22 module types, 6 transfer modes and 31 unit operations. Item counts are papers for field tags, modules for module
  types, connections for transfer modes and steps for unit operations."; the not-covered text for OntoLab_SAREF is
  "Not covered: OntoLab_SAREF maps module types only."; the count texts for 1 are "1 step", "1 platform" and "1 paper"
  and for 0 "0 platforms" and "0 papers". The family grouping of unit operations is: analyze 1, form 2, handle 2,
  measure 6, mix 2, plan 2, prepare 4, react 6, separate 5, unmapped 1.
- Every text built in `src/lib/taxonomy.ts` (the overview caption, the two example captions, the unfiltered and
  no-platform notes, "No platform uses this class.", the two correspondence messages, the not-covered text, "No
  counterpart in this vocabulary.", the not-found texts), with the real-data values filled in, contains none of the
  `BANNED_SUBSTRINGS` of `src/lib/trends.ts`, compared case-insensitively.
- `tests/libBoundary.test.ts` also checks `src/lib/taxonomy.ts`.

### AC-11 Overview (REQ-009, REQ-011)
- The site navigation shows the links Home, Browse, Trends, Taxonomy in this order; following "Taxonomy" gives hash
  `#/taxonomy`, the h1 "Taxonomy" and the caption of AC-10.
- The table under "Sources of the correspondence" has 5 rows; the Mehr2020 row has a link to
  `https://doi.org/10.1126/science.abc2986`. The table under "Relations" lists exact, broader, narrower, none, with
  "—" as the meaning of exact and none.
- The sections "Field tags", "Module types", "Transfer modes", "Unit operations" hold 10, 22, 6 and 31 class rows; the
  row flow_reactor shows "139 modules" and links to `#/taxonomy/module_type/flow_reactor`; the row catalysis shows
  "23 papers". Under "Unit operations" the sub-headings are "Family: analyze" … "Family: unmapped" in the order of
  AC-10, and "Family: mix" holds mix and sonicate.

### AC-12 Class pages, one per kind, with matching count lines (REQ-012, REQ-015)
- `#/taxonomy/module_type/flow_reactor`: h1 "flow_reactor", the kind "Module type", "139 modules"; the link
  "127 platforms" leads to count line "127 of 280 platforms" and "99 papers" to "99 of 238 papers". The first example
  is the link "Bedard2018/P11" with "(3 modules)"; following it gives hash `#/platform/Bedard2018/P11` and the viewer
  h1 "Reconfigurable continuous-flow system, ketene generation and [2+2] cycloaddition configuration".
- `#/taxonomy/field_tag/catalysis`: no item line; "23 platforms" → "23 of 280 platforms"; "23 papers" →
  "23 of 238 papers"; examples Amara2015/P1 … Brody2026/P1 without "( … )" and the field-tag caption.
- `#/taxonomy/transfer_mode/data_transfer`: "611 connections"; "280 platforms" links to `#/browse?view=platforms`
  (count line "280 of 280 platforms"), "238 papers" to `#/browse` ("238 of 238 papers"), with the note
  "data_transfer is not offered by the browser's filters. It is recorded on all 280 platforms, so these links open
  the full lists."
- `#/taxonomy/unit_operation/sonicate`: the kind "Unit operation" and family mix; "11 steps"; "5 platforms" →
  "5 of 280 platforms"; "5 papers" → "5 of 238 papers"; first example "Zhao2026/P1" with "(6 steps)".
- `#/taxonomy/field_tag/unmapped`: "0 platforms" and "0 papers" as text without links, the note "No platform uses
  this class, so the browser has no filter for it." and "No platform uses this class." under "Example platforms".
- `#/taxonomy/module_type/assembly_unit` lists four examples, Dai2025/P1, Gao2026/P1, Toyama2025/P1, Yik2025/P1, each
  "(1 module)".

### AC-13 Correspondence on class pages (REQ-013)
- `#/taxonomy/module_type/thermal_unit`: sub-headings XDL, WCSO, Leong2022, OntoLab_SAREF, Gottstein2026 in this
  order; under XDL the five targets each with "— exact" and the three sources of AC-3; under OntoLab_SAREF "No
  counterpart in this vocabulary." and "Source searched:" with `Bai2024`; the XDL sub-section shows the Mehr2020
  reference with a link to `https://doi.org/10.1126/science.abc2986`.
- `#/taxonomy/transfer_mode/mobile_robot`: under Leong2022 "transportation task — broader" and
  `Leong2022 ; p.9 ; Limitations`; under OntoLab_SAREF "Not covered: OntoLab_SAREF maps module types only.".
- `#/taxonomy/module_type/human`: under Leong2022 "Manual task — broader" and "manual tool — narrower"; under
  Gottstein2026 "No counterpart in this vocabulary." with source `Gottstein2026 ; pdf p.3 ; Fig. 1`.
- `#/taxonomy/field_tag/catalysis`: "The correspondence table does not map field tags." and no vocabulary
  sub-section. `#/taxonomy/unit_operation/unmapped`: "The correspondence table has no row for this class.".
- The relation of every target is visible text (the word exact, broader or narrower).

### AC-14 Unit-operation filter in the browser and the dashboard (REQ-006, REQ-007, REQ-008)
- On `#/browse?view=platforms`, the filter panel has a group "Unit operations" with 31 checkboxes, after it a radio
  group "Unit operations match" with "all" checked. Checking sonicate gives hash `#/browse?view=platforms&uo=sonicate`
  and count line "5 of 280 platforms"; checking mix as well gives "0 of 280 platforms"; choosing "any" gives hash
  `#/browse?view=platforms&uo=mix,sonicate&uoMatch=any` and "111 of 280 platforms"; the filter toggle reads
  "Filters (1 active)". "Clear filters" gives `#/browse?view=platforms` and "280 of 280 platforms".
- Given `#/trends?uo=sonicate`, the sonicate box is checked in the dashboard's filter panel and the count line reads
  "5 of 238 papers"; the "Split by" group offers the same six choices as before.

### AC-15 Lazy chunk, single fetch, not found, load failure (REQ-010, REQ-014)
- Loading `#/`, then `#/browse`, then `#/trends`, then `#/platform/Aand2024/P1` requests no JavaScript file whose
  name starts with `Taxonomy` and no `data/taxonomy.json`; opening `#/taxonomy` then requests one such chunk and
  `data/taxonomy.json` once; following a class link and then "Taxonomy" again makes no second request for
  `data/taxonomy.json`. Opening `#/taxonomy` and `#/taxonomy/module_type/flow_reactor` in a fresh page requests no
  file under `data/platforms/`.
- With only the response to `data/taxonomy.json` held back (a Playwright route on that URL alone; `data/index.json`
  and the chunks are served normally), open `#/taxonomy` and wait until the route handler has received the
  `data/taxonomy.json` request, which the taxonomy view issues only after its chunk and `index.json` have loaded.
  Then the footer "Data version 1.0.0" is visible (so the App's own "Loading…" for `index.json` is gone) and `main`
  shows "Loading…" with no h1 "Taxonomy"; after the held response is fulfilled, the h1 "Taxonomy" appears and
  "Loading…" is gone.
- Given `#/taxonomy/module_type/nonexistent`, the page shows the h1 "Class not found", "The taxonomy has no class
  nonexistent of kind module_type." and a link "Back to the taxonomy" to `#/taxonomy`; given
  `#/taxonomy/x/flow_reactor` the same with kind x. Given `#/taxonomy/a/b/c`, the site's "Not found" page. No page
  error.
- With the request for `data/taxonomy.json` answered by HTTP 500 (Playwright route), `#/taxonomy` shows an alert
  starting "Could not load the taxonomy:" and no page error.

### AC-16 Narrow screen, keyboard, headings, colours, gates (REQ-016, all)
- At 375 × 800, on `#/taxonomy`, `#/taxonomy/module_type/thermal_unit` and `#/taxonomy/unit_operation/sonicate`,
  `document.documentElement.scrollWidth` is at most 375.
- On `#/taxonomy`, pressing Tab from the page start reaches the link "Taxonomy" in the navigation, the doi link of
  Mehr2020 and the class link flow_reactor; pressing Enter on flow_reactor opens its class page, where Tab reaches the
  link "127 platforms" and the example link "Bedard2018/P11".
- On the overview and on the six class pages of AC-12 (module_type/flow_reactor, field_tag/catalysis,
  transfer_mode/data_transfer, unit_operation/sonicate, field_tag/unmapped, module_type/assembly_unit), the heading levels in document order never increase by more
  than one and start at h1.
- A test reads `src/styles.css`: every custom property whose name starts with `--taxo-` is declared under `:root` and
  under `:root[data-theme="dark"]`, and the WCAG contrast of each against its set's surface (`#ffffff` light,
  `#1a1a19` dark) is at least 3:1, and at least 4.5:1 for those used as text colour (the test passes trivially when
  no such property exists).
- `npm test`, `npm run typecheck`, `npm run build` and `npm run e2e` (new tests and the existing `e2e/viewer.spec.ts`,
  `e2e/browse.spec.ts`, `e2e/trends.spec.ts`) pass; `src/lib/` coverage is at least 85%.
