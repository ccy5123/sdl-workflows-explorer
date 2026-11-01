---
id: SPEC-TAXO-001
title: "Taxonomy explorer: class overview and detail pages with counts, browse links, examples and vocabulary correspondence; unit-operation filter in the browser"
version: "0.3.0"
status: draft
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.5.0 target"
module: "scripts/, src/"
lifecycle: spec-anchored
tags: "taxonomy, correspondence, filters, routing, data-pipeline"
tier: M
depends_on: [SPEC-DATA-001, SPEC-BROWSE-001, SPEC-TRENDS-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Step 5 of `docs/plan.md` ("Taxonomy explorer"). Extends the derive step of SPEC-DATA-001
  (`taxonomy.json` gains per-class platform and paper counts, example platforms and a structured correspondence that
  replaces the raw correspondence rows; `index.json` platform rows gain `unit_operations`), adds a unit-operation
  filter to the browser of SPEC-BROWSE-001 (shared with the trends dashboard of SPEC-TRENDS-001), and extends the hash
  router with two route kinds. Researcher decisions of 2026-11-02 (unit-operation filter, the `data_transfer` link,
  page layout, example platforms) are recorded in §2 and `progress.md` §E.1. The expected numbers in `acceptance.md`
  come from `expected-counts.mjs` in this folder.
- 2026-11-02 0.2.0 revised after plan audit iteration 1 (FAIL 0.82): AC-3 counts sources once per entry, as stored
  (294: 192 with page and locator, 102 key only); REQ-012's no-link branch is limited to `n_platforms` = 0, and
  REQ-004 gains (h), tying each class's counts to the platform-row columns the browser filters on, and (i), a source
  with other than one or three parts; REQ-004 (g) applies only to a transfer mode with at least one connection;
  REQ-004 (a) fails on an empty cell in a kind the vocabulary covers, so the "Not covered" text (REQ-013) is only
  reached for kinds it does not cover; REQ-008 allows adding `unit_operations` to row literals of existing tests;
  AC-4 tests `deriveAll` instead of the build-data entry point; AC-16 names the six class pages of AC-12; AC-15 checks
  the platform page and the loading state; AC-10 checks the taxonomy texts against `BANNED_SUBSTRINGS`; counts of 1
  use the singular; `module` names `scripts/` as well.
- 2026-11-02 0.3.0 plan audit iteration 2 PASS (0.92); its optional findings N1 to N3 applied: REQ-004 (h) applies to
  every class except those of (g), including classes with no item; REQ-010 states that a taxonomy route requests no
  file under `data/platforms/`; AC-15 checks the taxonomy view's own "Loading…" after `index.json` has loaded.
  Approved by the researcher through AskUserQuestion on 2026-11-02.

## 1. Why

`docs/plan.md` asks for the 69 classes of the release taxonomy (10 field tags, 22 module types, 6 transfer modes,
31 unit operations) with definitions and families, their correspondence to five other vocabularies with the source
and page of each mapping, and, per class, how many items use it and links to example platforms. A reader who sees a
count on a class page must be able to open the rows it counts: every platform or paper count that has a browser
link is defined to equal the count line of that link (REQ-015), the principle SPEC-TRENDS-001 applies to its
charts. Unit operations had no browser filter, so this SPEC adds one; without it the unit-operation counts could not
be opened.

The correspondence is recorded twice in the release: one row per class in `modes/taxonomy/correspondence.csv` and
one row per target in `core/taxonomy_correspondence.csv` (280 rows). The build reads the long table and refuses to
continue when the two disagree, so the site shows one reading of the correspondence that both release files support.
The reference texts and the meaning of each relation come from the release (`README.md`, `data_dictionary.csv`), not
from the site's code.

## 2. Requirements (EARS)

Terms used below. A class is identified by its **kind** (`class_kind`: `field_tag`, `module_type`, `transfer_mode`,
`unit_operation`) and its **name** (`class`); each kind has a class named `unmapped`. The **items** of a class are the
papers carrying a field tag, the modules (on and off the platform) of a module type, the connections (material or
not) of a transfer mode, and the steps of a unit operation; the **unit noun** of a kind is "papers", "modules",
"connections" or "steps" ("paper", "module", "connection", "step" for one). The **browse group** of a kind is `field`,
`mt`, `tm` or `uo` (SPEC-BROWSE-001 §3 and REQ-006 below). A class is **offered** when its name is among the offered
values of its browse group (`offeredValues(index)`). The **long table** is `core/taxonomy_correspondence.csv`, the
**wide table** `modes/taxonomy/correspondence.csv`; a **cell** is one (class, vocabulary) pair of the wide table. The
**count line** is "N of T papers" or "N of T platforms" of SPEC-BROWSE-001 REQ-008.

### Derived data

- **REQ-001** (event) When `npm run build-data` runs, each platform row of `index.json` shall gain the field
  `unit_operations`: the distinct `unit_operation` values of that platform's steps in
  `modes/builder/platform_graphs.jsonl`, sorted, without duplicates. No other field of `index.json` changes.
- **REQ-002** (event) When `npm run build-data` runs, each entry of `taxonomy.json` `classes` (69, in the order of
  `modes/taxonomy/classes.csv`) shall hold `class_kind`, `class`, `family`, `definition`, `n_items` (unchanged from
  SPEC-DATA-001) and:
  - `n_platforms`: for a field tag, the platform rows whose `field_tags` contain it; for the other kinds, the
    platforms with at least one item of the class;
  - `n_papers`: for a field tag, `n_items`; for the other kinds, the distinct papers of those platforms;
  - `examples`: at most 5 objects `{platform_id, platform_name, n}`, where `platform_name` is the platform row's name
    (null when it has none). For a field tag: platforms whose `field_tags` contain it, in ascending `platform_id`
    order, `n` null. For the other kinds: platforms with at least one item of the class, `n` the number of those
    items on the platform, ordered by `n` descending, then `platform_id` ascending. `platform_id` order is plain
    string comparison (UTF-16 code units, as JavaScript `<`);
  - `correspondence`: null when the class has no row in the wide table; otherwise one entry per vocabulary that has
    long-table rows for the class, in the column order of the wide table, each `{vocabulary, targets, sources}`:
    `targets` the long-table rows of that cell in long-table order as `{target, match}` as recorded, and `sources`
    the cell's `source_ref` split at " · " into `{key, page, locator}`, each source split at " ; " into either one
    part (the key; `page` and `locator` null) or three parts (key, page, locator). The sources are stored once per
    entry, not once per target.
- **REQ-003** (event) When `npm run build-data` runs, `taxonomy.json` shall also hold, and shall no longer hold the
  raw correspondence rows of SPEC-DATA-001:
  - `vocabularies`: one entry per vocabulary column of the wide table, in column order, `{vocabulary, kinds,
    source_keys}`: the kinds (in `classes.csv` order) with at least one long-table row for the vocabulary, and the
    distinct source keys its rows name;
  - `sources`: the rows of the first table under the heading "## Sources of the correspondence table" in the
    release's `README.md`, in order, `{keys, vocabulary, reference, doi}`: `keys` the Key cell split at ", ",
    `vocabulary` and `reference` the cells as written, `doi` the text after "doi:" in the reference up to the next
    whitespace, without a trailing "." or ",";
  - `relations`: the `description` of the `data_dictionary.csv` row with object `taxonomy_correspondence` and column
    `match`, split at "; " outside parentheses into `{match, meaning}`: `match` the leading word, `meaning` the text
    inside its parentheses, or null when it has none.
- **REQ-004** (event) When the release data contradicts itself or the rules of REQ-002 and REQ-003, `deriveAll`
  shall throw an error naming the class, vocabulary, key or row concerned, so that `build-data` exits non-zero before
  it writes any file. It shall throw when:
  - (a) for a cell, the targets and relations parsed from the wide table (`term (relation); term (relation)`, or
    `none` for one target `none` with relation `none`) differ from the long-table rows in content or order, the
    wide source cell differs from the `source_ref` of any of those rows, the wide cell is empty while long-table
    rows exist, or the reverse, or the wide cell is empty for a class whose kind the vocabulary covers (a kind with at
    least one long-table row for that vocabulary);
  - (b) a source key in the long table is not a key of the README source table;
  - (c) a long-table class is not in `classes.csv` or not in the wide table;
  - (d) the number of structured targets differs from the number of long-table rows;
  - (e) the README heading or its table is missing, a README row has no doi, the data-dictionary row is missing, or a
    long-table `match` value is not a `match` of `relations`;
  - (f) the source keys of one vocabulary are not all keys of one and the same README row;
  - (g) a transfer mode that has at least one connection, none of them material, has `n_platforms` different from
    the number of platform rows or `n_papers` different from the number of paper rows;
  - (h) any other class (also one with no item) has `n_platforms` different from the number of platform rows whose
    browse column (`field_tags`, `module_types`, `material_transfer_modes` or `unit_operations`) contains it, or
    `n_papers` different from, for a field tag, the number of paper rows whose `field_tags` contain it and, for the
    other kinds, the number of distinct papers of those platform rows (so a class with no item appears in no browse
    column);
  - (i) a source in `source_ref` splits at " ; " into a number of parts other than one or three.
- **REQ-005** (ubiquitous) `taxonomy.json` shall be at most 120,000 bytes and `index.json` at most 260,000 bytes as
  written by `build-data` on release 1.0.0 (measured sizes recorded in `progress.md`). No file under `src/` shall
  contain a reference text, a doi or a relation meaning of the release; the site reads them from `taxonomy.json`.

### Unit-operation filter

- **REQ-006** (ubiquitous) The filter state of SPEC-BROWSE-001 shall gain `uo` (unit operations, a list) and
  `uoMatch` (`all` or `any`, default `all`), with the URL parameters `uo` and `uoMatch` placed after `tmMatch` and
  before `q`, encoded and decoded by the rules of SPEC-BROWSE-001 REQ-002 (valid `uo` values: those present in
  `unit_operations` of the platform rows; for a repeated parameter the last occurrence; list sorted, without
  duplicates). `offeredValues` shall return `uo` as well. The round-trip property of SPEC-BROWSE-001 REQ-002 holds
  for states with `uo`.
- **REQ-007** (ubiquitous) `uo` shall be a platform-level filter with its own match switch, exactly as `mt` and `tm`
  (SPEC-BROWSE-001 REQ-006, REQ-007): a platform passes when its `unit_operations` contain every selected value
  (`all`) or at least one (`any`); a paper passes when one of its platforms passes `mt`, `tm` and `uo` together. The
  `FilterPanel` shall show, after "Transfer modes match", a checkbox group "Unit operations" (offered values in
  alphabetical order) and a radio group "Unit operations match" ("all", "any"). "Clear filters" resets both;
  `activeFilterCount` counts a non-empty `uo` as one filter. The browser tables keep their columns.
- **REQ-008** (ubiquitous) The trends dashboard of SPEC-TRENDS-001 shall apply `uo` as a filter through the shared
  filter state, URL and `FilterPanel`; `uo` shall not be a split, and the split values, bins and link-state rules of
  SPEC-TRENDS-001 stay unchanged. In the two paper captions of SPEC-TRENDS-001 §3 for `mt` and `tm`, the phrase "meets
  the module type and transfer mode filters" shall read "meets the module type, transfer mode and unit operation
  filters". Every other existing test of SPEC-BROWSE-001 and SPEC-TRENDS-001 keeps its expected values; only tests
  that enumerate the filter groups, the filter state fields, the offered-value groups or these two captions change.
  Existing tests whose platform-row literals or row builders must type-check against the new `PlatformRow`
  (`tests/compare.test.ts`, `tests/identity.test.ts`, `tests/platformFilter.test.ts`, the row helper of
  `tests/filterApply.test.ts`, the `offeredValues` input of `tests/filterUrl.test.ts`) gain the field
  `unit_operations` and nothing else; their expected values stay unchanged.

### Routing and loading

- **REQ-009** (event) When the URL hash is `#/taxonomy`, the site shall show the taxonomy overview; when it is
  `#/taxonomy/<kind>/<class>` with exactly two non-empty segments that decode with `decodeURIComponent`, the site shall
  show the class page for the decoded kind and class. Any other hash beginning `#/taxonomy` (for example
  `#/taxonomy/`, `#/taxonomy/x`, `#/taxonomy/a/b/c`, `#/taxonomy/a/%E0`, `#/taxonomy?x`, `#/taxonomyx`) gives not
  found carrying the hash. `parseRoute` never throws, and every existing route test keeps its outcome. A helper
  `taxonomyHash(kind, cls)` returns `#/taxonomy/<encodeURIComponent(kind)>/<encodeURIComponent(cls)>`. The site
  navigation shall show the link "Taxonomy" (`#/taxonomy`) directly after "Trends".
- **REQ-010** (ubiquitous) The taxonomy views shall be loaded with a dynamic import in a chunk whose file name starts
  with `Taxonomy`, and `data/taxonomy.json` shall be requested only when a taxonomy route is opened, at most once per
  page load. Opening `#/`, `#/browse`, `#/trends` or a platform page shall request neither, and a taxonomy route shall
  request no file under `data/platforms/`. While `taxonomy.json` loads, the taxonomy view shows "Loading…"; when it fails, it shows "Could not load the taxonomy: <reason>" in an element
  with `role="alert"`, without a page error.

### Overview and class pages

- **REQ-011** (ubiquitous) The overview shall show, in this order: the heading "Taxonomy"; a caption "The <C> classes
  of the release taxonomy: <n> field tags, <n> module types, <n> transfer modes and <n> unit operations. Item counts
  are papers for field tags, modules for module types, connections for transfer modes and steps for unit
  operations." with the numbers from `taxonomy.json`; a section "Sources of the correspondence" holding the
  `sources` as a table with the columns Key, Vocabulary and Reference, the doi in each reference a link to
  `https://doi.org/<doi>`; a section "Relations" holding the `relations` as a table with the columns Relation and
  Meaning (an em dash "—" where the meaning is null); and one section per kind in `classes.csv` order, headed
  "Field tags", "Module types", "Transfer modes", "Unit operations", each holding a table of its classes in
  `classes.csv` order with the columns Class (the name, a link to `taxonomyHash`), Definition and Items
  ("<n_items> <unit noun>"). Unit operations are grouped under one sub-heading per family, "Family: <family>", in
  alphabetical order of family.
- **REQ-012** (ubiquitous) A class page shall show the heading `<class>`; the kind ("Field tag", "Module type",
  "Transfer mode", "Unit operation"), and for a unit operation its family; the definition; a section "Counts"; a
  section "Example platforms"; and a section "Correspondence" (REQ-013). "Counts" lists "<n_items> <unit noun>"
  (left out for field tags, whose items are the papers), "<n_platforms> platforms" and "<n_papers> papers" (every
  count text uses the singular noun for 1: "1 platform", "1 paper", "1 step"); the platform and paper counts are
  links given by one pure function of the class, the offered values and the totals:
  - when the class is offered, the browse URL of the default filter state with its browse group set to `[class]`
    and `view` platforms or papers;
  - when it is not offered and its `n_platforms` and `n_papers` equal the numbers of platform and paper rows, the
    unfiltered lists `#/browse?view=platforms` and `#/browse`, with the note "<class> is not offered by the
    browser's filters. It is recorded on all <T> platforms, so these links open the full lists.";
  - when `n_platforms` is 0, no link, with the note "No platform uses this class, so the browser has no filter for
    it.".

  REQ-004 (g) and (h) leave no other case: a class with at least one item is either offered or a transfer mode on
  every platform.

  "Example platforms" lists the `examples` in order, each the platform id as a link to `platformHash`, its name (an em
  dash when null) and, except for field tags, "(<n> <unit noun>)", under the caption "Up to five platforms with the
  most <unit noun> of this class; ties in platform id order." or, for field tags, "The first five platforms with this
  field tag, in platform id order."; with no example it shows "No platform uses this class.".
- **REQ-013** (ubiquitous) The section "Correspondence" shall show, for a class whose kind has no class in the wide
  table, "The correspondence table does not map field tags." (the kind's plural name), and for another class whose
  `correspondence` is null, "The correspondence table has no row for this class.". Otherwise it shows one
  sub-section per vocabulary of `vocabularies`, in that order, headed by the vocabulary name as recorded, with the
  README reference of the row its source keys belong to (REQ-004 f) and, below:
  - for an entry whose single target has relation `none`: "No counterpart in this vocabulary." followed by "Source
    searched:" and its sources;
  - for another entry: each target with its relation as text ("Heater/chiller — exact"), then "Sources:" and each
    source as recorded, "<key> ; <page> ; <locator>" (only the key when page and locator are null);
  - for a vocabulary with no entry for the class (by REQ-004 a, only when the vocabulary does not cover the class's
    kind): "Not covered: <vocabulary> maps <kinds> only." with the kinds of that vocabulary in plural words joined
    with ", " and "and" (for OntoLab_SAREF in release 1.0.0: "Not covered: OntoLab_SAREF maps module types only.").
- **REQ-014** (event) When the class route names a kind and class that are not in `taxonomy.json`, the taxonomy view
  shall show the heading "Class not found", the text "The taxonomy has no class <class> of kind <kind>." and a link
  "Back to the taxonomy" (`#/taxonomy`), without a page error.

### Consistency, boundaries and presentation

- **REQ-015** (ubiquitous) For every class with links (REQ-012), `n_platforms` shall equal the N of the count line
  of its platforms link and `n_papers` the N of the count line of its papers link, as computed by `matchingPlatforms`
  and `matchingPapers` of SPEC-BROWSE-001 on the decoded URL. The link function, the count and caption texts, the
  kind labels and unit nouns, the "not covered" text and the family grouping shall be pure functions or constants in
  `src/lib/taxonomy.ts`, which imports neither React nor `react-dom` and reads neither `window` nor `document`.
- **REQ-016** (ubiquitous) The taxonomy views shall show relations and statuses as text, never by colour alone; any
  colour token they add is named `--taxo-*`, declared with a light value under `:root` and a dark value under
  `:root[data-theme="dark"]`, and reaches a WCAG contrast of at least 4.5:1 for text and 3:1 otherwise against the
  surface of its set. Headings run h1, h2, h3 without skipping a level. Every link is reachable with Tab and
  operable with Enter. At a viewport width of 375 px no taxonomy page scrolls horizontally at page level; tables
  either fit or show each row as a stacked block of labelled cells. Captions and notes describe counts and draw no
  conclusions: none of the texts built in `src/lib/taxonomy.ts` contains, case-insensitively, any of the
  `BANNED_SUBSTRINGS` of `src/lib/trends.ts` (SPEC-TRENDS-001 REQ-014). All site text is English (checked by review).

## 3. Relation to earlier SPECs

- SPEC-DATA-001 REQ-009: the `taxonomy.json` description is replaced by REQ-002 and REQ-003 here; the platform row
  of `index.json` gains `unit_operations` (REQ-001). The count check of SPEC-DATA-001 and its real-release expected
  values are unchanged. The fixture release `tests/fixtures/release-mini/` does not satisfy REQ-004 as it stands (it
  has no long table, README source table or data dictionary, its wide table uses the relation `broad` and two-part
  sources such as `Gottstein2026 ; pdf p.3`, and `data_transfer` is on one of its three platforms), so it is extended
  until it passes every check; fixture-derived
  expected values in `tests/derive.test.ts` and other fixture tests change with it, and the change is listed in
  `progress.md`.
- SPEC-BROWSE-001 §3: the parameter table gains `uo` and `uoMatch` (REQ-006); filter rules REQ-005 to REQ-007 gain
  `uo` as a third platform-level filter (REQ-007).
- SPEC-TRENDS-001 §3: two caption texts change by one phrase (REQ-008). The completed SPEC documents are not edited;
  this section records where they are superseded.

## 4. How

- Build: `scripts/lib/derive.ts` `buildTaxonomy` reads the long table, the wide table, `README.md` and
  `data_dictionary.csv`, field by field as in SPEC-DATA-001; the cross-checks of REQ-004 run before anything is
  written. The fixture release in `tests/fixtures/release-mini/` gains the three files it needs.
- Site: `src/lib/taxonomy.ts` (pure) carries the link rule, texts and grouping; `src/views/Taxonomy.tsx` renders the
  overview and class pages; `src/App.tsx` loads it with `React.lazy`, like Trends. `taxonomy.json` is fetched by the
  lazily loaded module and cached in it.
- Filters: `src/lib/filterState.ts`, `filterUrl.ts`, `filterApply.ts` and `src/components/FilterPanel.tsx` gain `uo`;
  `src/lib/trends.ts` changes one caption phrase.
- Unit tests that read the real `public/data/` run after `npm run build-data` and skip with a message when it is
  absent; derive tests on the real release skip when the verified cache is absent, as `tests/release.test.ts` does.
  Playwright tests run against the `dist-e2e/` build (`npm run e2e`).

## 5. Out of scope

### Out of Scope — other views and site-wide work

- Linking class names from the platform viewer, its legend or the step list to the class pages.
- The site-wide dark theme and a theme switch (step 7); the benchmark view (step 6); deployment.
- A unit-operation split in the trends dashboard; a unit-operation column in the browser tables.

### Out of Scope — taxonomy content

- Family definitions from `core/uo_family.csv`, the target-column description of the data dictionary, and any text
  about the vocabularies other than the README source table and the relation meanings.
- Editing, extending or re-deriving the correspondence; mapping field tags or `unmapped` classes.
- Charts of the class counts; search within the taxonomy.

## 6. Acceptance

See `acceptance.md`.
