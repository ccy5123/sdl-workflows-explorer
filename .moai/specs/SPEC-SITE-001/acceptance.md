# Acceptance: SPEC-SITE-001

AC-1 to AC-5, AC-11 and AC-19 are Vitest tests; the real-data cases read `public/data/` after `npm run build-data`
and skip with a message when it is absent, as in earlier SPECs. AC-6 to AC-10, AC-12, AC-13 and AC-15 are Playwright
tests (`npm run e2e`) against the `dist-e2e/` build; AC-14 uses the `dist-pages/` production build. AC-16 to AC-18
are checks of the repository and the browser, recorded in `progress.md`. "The route list" is the list in AC-12.

## Scenarios

### AC-1 Release documents are derived (REQ-001)
- `deriveAll` on `tests/fixtures/release-mini` returns `releaseDocs` with `citation` equal to the fixture's parsed
  CFF (title, version, date_released, doi, license, authors with family, given and orcid), and `citation_cff` and
  `data_card` byte-equal to the fixture files.
- With built data: `public/data/release-docs.json` `citation.version` = `index.json` `release.version` = "1.0.0",
  `citation.doi` = `index.json` `release.doi`, `citation.authors[0].family` = "Joe", and `data_card` starts with
  `# Data card: sdl-workflows 1.0.0`.
- With built data, the SHA-256 of `index.json`, `taxonomy.json`, `benchmark.json`, `benchmark-items.json` and the
  concatenated platform files (sorted by name) equal the values measured at 69d2dc7 and recorded in progress.md §E.1;
  the existing hash checks in `tests/benchmark-derive.test.ts` keep passing.

### AC-2 Bad release documents stop the build (REQ-002)
- A fixture copy without `CITATION.cff`, without `DATA_CARD.md`, with `version: "9.9.9"`, with a different `doi`, or
  with an unsupported CFF line (for example a nested map under a top-level key other than `authors`) makes
  `deriveAll` throw an error whose message names the file and, where one applies, the field (`version`, `doi`, or the
  offending line number).

### AC-3 Citation text (REQ-004)
- `formatCitation` of the 1.0.0 citation equals `Joe, C. Y. (2026). sdl-workflows: hardware workflows of closed-loop
  self-driving laboratories (Version 1.0.0) [Data set]. https://doi.org/10.5281/zenodo.23857126`.
- No publisher is added (none is recorded in `CITATION.cff`). Two authors give "A, B., & C, D."; three give "A, B., C, D., & E, F."; a hyphenated given name "Jean-Luc" gives
  "J.-L."; a missing given name gives the family name alone.

### AC-4 Numbers are sourced (REQ-007)
- The numbers of a text are its maximal tokens matching `\d+(?:[.,]\d+)*`. Every number in the home intro and the
  about summary of `src/lib/siteText.ts`, with the placeholders filled from `index.json`, is either one of the filled
  `index.json` values or a member of the set of numbers of `release-docs.json` `data_card` (whole-token equality, not
  substring).
- A test copy of the summary with "30 papers" changed to "31 papers", and one with an added "999", are each reported
  with the offending number.
- `src/lib/siteText.ts`, `src/lib/citation.ts` and `src/lib/siteTokens.ts` pass the UI-free module check of
  `tests/libBoundary.test.ts`; `src/` still contains no "doi:10." string (`tests/taxonomy.test.ts`).

### AC-5 Colour tokens (REQ-008, REQ-009)
- `styles.css` declares under `:root` exactly the light values of `SITE_TOKENS` and under `:root[data-theme="dark"]`
  exactly the dark values (parsed from the stylesheet, as `tests/chartTokens.test.ts` does for chart tokens).
- In both sets, `contrastRatio(text, bg)`, `(muted, bg)`, `(accent, bg)` and `(muted, panel)` are at least 4.5, and
  `(accent, bg)` as focus colour at least 3.
- `buildStylesheet("dark")` uses the dark text colour for node and edge labels and the dark background for edge-label
  backgrounds; `buildStylesheet()` and `buildStylesheet("light")` equal the stylesheet of 69d2dc7 (existing tests
  unchanged); in dark the `unmapped` transfer-mode colour given to graph and legend is the dark text colour.

### AC-6 Home page (REQ-003, REQ-004)
- On `#/`, in document order: `h1`; the intro paragraph containing "1.0.0", "238 papers" and "280 platforms"; a table
  with five rows (Platform viewer, Browse and compare, Trends, Taxonomy, Benchmark) in which the last four rows link
  to `#/browse`, `#/trends`, `#/taxonomy` and `#/benchmark` and the first has a button; the counts table
  (`table.counts`); a link "Download the data" with `href` `https://doi.org/10.5281/zenodo.23857126`; the citation
  text of AC-3; "CC BY 4.0"; a closed `<details>` whose text contains the verbatim `CITATION.cff`; the platform list
  with 280 rows.
- Activating the platform-viewer button (click, and Enter from the keyboard) makes the platform filter input the
  active element.
- No link on the page has an `href` under `data/`.

### AC-7 About page (REQ-005, REQ-006)
- The nav has a link "About" to `#/about`; on `#/about` there are the `h2` headings "How the papers were found", "How
  the papers were coded", "How far the labels can be trusted" and "Limits", the text "release 1.0.0" taken from
  `index.json`, a closed `<details>` whose text equals `data_card`, and a link to `https://doi.org/<release DOI>`.
- The page text outside the `<details>` contains "agreement between two language models", "not accuracy against
  human coding", "no human coding", "not every", "3240 of the 3298", "isolated manual steps", "preprint",
  "Paper text and abstracts" and "notes".
- The home and about text outside the verbatim blocks contains none of: "increasingly", "trend toward", "the field
  is", "shows that", "demonstrates", "growing", "most SDLs" (case-insensitive).

### AC-8 Dark theme (REQ-008)
- With `colorScheme: "dark"` emulated before load, on every route of the route list: `html[data-theme="dark"]`, the
  body background equals the dark `--bg` token and the body text colour the dark `--text` token. On the platform
  viewer, `window.__cy` node label colour equals the dark text token; on trends, the chart surface variable resolves
  to the dark chart surface.
- Switching the emulated scheme from light to dark and back on an open platform viewer changes `data-theme` and the
  graph label colour without a reload.

### AC-9 Skip link, current view, title (REQ-010)
- On every route of the route list, the first Tab focuses "Skip to main content"; Enter then makes `main` the active
  element.
- `aria-current="page"` is on exactly the nav link REQ-010 names for that route, and on none for the platform
  viewer, comparison and not found.
- `document.title` equals the REQ-010 title on every route of the route list (for example "Platform Aand2024/P1 ·
  SDL Workflows Explorer", "Taxonomy: flow_reactor · SDL Workflows Explorer").

### AC-10 Visible focus and no trap (REQ-011)
- On every route of the route list, in light and in dark: a `focusin` listener records every focused element; the
  test presses Tab N + 5 times, where N is the number of tabbable elements in the document when the test starts, and
  stops when the footer's last link is focused. The listener reads the computed outline at the moment of focus. The
  footer's last link is reached, and every recorded element had a computed `outline-style` other than `none` and
  `outline-width` of at least 2px. The test reports the first element that fails, by tag, text and class. One test
  per route and theme, each with an explicit timeout.

### AC-11 Workflow file (REQ-016)
- `.github/workflows/pages.yml` exists; its `on:` block contains `workflow_dispatch` and no `push`, `pull_request`,
  `schedule` or `workflow_run`; it contains the steps `npm ci`, `npm run fetch-release`, `npm run build-data`,
  `npm run typecheck`, `npm test`, a `vite build`, `actions/upload-pages-artifact` with path `dist` and
  `actions/deploy-pages`; and permissions `pages: write` and `id-token: write`.

### AC-12 No horizontal scroll at 375 px (REQ-013)
- Route list: `#/`, `#/about`, `#/platform/Aand2024/P1`, `#/browse`, `#/browse?view=platforms`,
  `#/compare/Aand2024/P1,Li2020/P1`, `#/trends`, `#/taxonomy`, `#/taxonomy/module_type/flow_reactor`, `#/benchmark`,
  `#/benchmark/items`, `#/no-such-page`.
- At 375 × 812, in light and in dark, `document.documentElement.scrollWidth <= clientWidth` on each.

### AC-13 No mid-word breaks (REQ-014)
- At 1280, 1024, 801 and 800 px wide, on `#/`, `#/browse`, `#/compare/Aand2024/P1,Li2020/P1`, `#/taxonomy`,
  `#/taxonomy/module_type/flow_reactor` and `#/benchmark`: for every text node in a visible table `th` or `td`
  (stacked cells and their "Label: " included), every whitespace-separated word has client rects with a single top.
  The failure message names the route, width and word. "Relation" and "narrower" are checked by name on the class
  page.

### AC-14 Pages build works under the base path (REQ-015)
- `vite.config.ts` resolves `base` to `/sdl-workflows-explorer/` for mode `production` and to `./` for mode `e2e`.
- The port-4317 preview server runs with `--mode e2e`: `GET http://localhost:4317/` returns 200 with no redirect.
- Against `vite preview --mode production` of `dist-pages/` on port 4319:
  `http://localhost:4319/sdl-workflows-explorer/` with `#/`, `#/about`, `#/platform/Aand2024/P1`, `#/browse`,
  `#/trends`, `#/taxonomy`, `#/benchmark` each shows its `h1`; no response from the preview origin has a status of
  400 or more; the built `index.html` references its scripts under `/sdl-workflows-explorer/assets/`.

### AC-15 Regressions (REQ-018)
- `git diff 69d2dc7 --stat -- e2e tests` lists, among existing files, only `e2e/taxonomy.spec.ts`,
  `e2e/trends.spec.ts`, `tests/derive.test.ts`, `tests/libBoundary.test.ts`, `tests/route.test.ts` and
  `tests/graphElements.test.ts`; in the first three the changes are exactly those REQ-018 names; in the last three
  only additions are made (new cases, and new module-list entries in `libBoundary`), no existing case is changed. Every other existing test file is unchanged and passes, including the SPEC-CONTRIB-001 tests.

### AC-16 Repository state (REQ-016, REQ-017, REQ-018)
- `git diff 69d2dc7 -- release.config.json` is empty; `gh repo view ccy5123/sdl-workflows-explorer --json visibility`
  says PRIVATE before and after the push; `gh api repos/ccy5123/sdl-workflows-explorer/pages` returns 404 (Pages not
  enabled); `gh run list --workflow pages.yml` lists no run.
- `docs/deploy.md` exists and names each step of REQ-017 in order.

### AC-17 Full suites and build (REQ-015, REQ-018)
- `npm run typecheck` exits 0; the full Vitest suite (459 before) and Playwright suite (68 before) pass with the new
  tests added; `npm run build` exits 0 and writes `dist/index.html` referencing `/sdl-workflows-explorer/assets/`.

### AC-18 Screen check (REQ-008, REQ-013, REQ-014)
- Every route of the route list opened in a browser at 1280 px and 375 px, in light and dark, from the production
  build served under `/sdl-workflows-explorer/`; what was seen is recorded in `progress.md`; the "Relation" column of
  the taxonomy class page is checked at 800 px.

### AC-19 Shared table and spacing values (REQ-012)
- Parsed from `styles.css`: `:root` declares `--table-border`, `--cell-pad-y`, `--cell-pad-x`, `--th-weight` and
  `--section-gap`. In every rule whose selector targets `th` or `td` of `table.data`, `.counts`, `.taxo-table`,
  `.bench-table`, the comparison or the trends tables: a border colour, where set, is `var(--table-border)` (border
  widths may be `1px` or `0`, and `border: 0` is allowed); padding values are `var(--cell-pad-y)`,
  `var(--cell-pad-x)` or `0`; a `font-weight` in a rule whose selector targets `th` is `var(--th-weight)` (emphasis
  rules on `td`, such as the selected sources row, are not header weight and are exempt).
- Exactly one rule sets `text-align: right` for numeric cells, with selector `.num` (possibly combined with
  `td`/`th`), and it also sets `font-variant-numeric: tabular-nums`; in the rendered home counts table, browse
  number columns and taxonomy count cells, every `td` whose trimmed text consists only of digits, commas and dots
  carries the class `num` (checked in the e2e run of AC-13).
- The rules for `section` and `h2` set their vertical margins only from `var(--section-gap)` (directly or in a
  `calc`) or `0`.

## Definition of done

AC-1 to AC-19 pass; SPEC-SITE-001 is completed in sync and the commits are pushed to the private `origin` `main`.
Nothing is deployed and Pages stays off.
