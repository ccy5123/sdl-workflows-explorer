---
id: SPEC-SITE-001
title: "Home and about pages, design and accessibility pass, GitHub Pages readiness"
version: "0.3.0"
status: draft
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.8.0 target"
module: "src/, scripts/, .github/workflows/, docs/"
lifecycle: spec-anchored
tags: "home, about, data card, citation, theme, accessibility, github pages"
tier: L
depends_on: [SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001, SPEC-TAXO-001, SPEC-BENCH-001, SPEC-CONTRIB-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. Step 7 of `docs/plan.md`: home and about pages, a design and accessibility pass over every
  view, and GitHub Pages readiness without deploying. The site stays on data release 1.0.0 and the repository stays
  private; the switch to release 1.1.0 and the deployment are the researcher's later steps (`docs/deploy.md`).
- 2026-11-02 0.2.0 after plan audit 1 (FAIL 0.75; all must-pass criteria PASS; nine blocking defects): REQ-012 gets
  a check (AC-19); the existing tests that must change are named (REQ-018, AC-15); both preview servers are pinned to
  a mode (design §6, AC-14); the focus test counts the page's own tab stops instead of a fixed cap (AC-10); numbers
  are matched as whole tokens (AC-4); the about draft restores the card's preprint, abstracts and manual-steps limits;
  the platform-viewer entry is a button throughout; every route's title is listed (REQ-010); the citation follows
  APA 7 author joining (AC-3). Optional findings D10 to D16 applied.
- 2026-11-02 0.3.0 after plan audit 2 (FAIL 0.92, two minor blocking defects): AC-19 allows `1px`/`0` border widths
  and exempts `td` emphasis, and checks one shared numeric-alignment rule (REQ-012 reworded to match); REQ-004 says
  "APA 7 author formatting, no publisher", since `CITATION.cff` records no publisher. Optional O1 to O6 applied.

## 1. Why

A reader arriving from the Zenodo record or a manuscript needs, on the first page, what the dataset records, its
size, how to cite it and where to download it, and a way into each view; and, one click away, how the papers were
found and coded and how far the labels can be trusted, in the data card's own terms. Every view must stay usable in
a dark system theme, with a keyboard, and on a phone. The manuscript assumes the site will live at
`https://ccy5123.github.io/sdl-workflows-explorer/`, so the build must work under that path before anyone turns
Pages on.

## 2. Requirements (EARS)

Routes named "every route" below are the route list of AC-12: home, about, platform viewer, browse (papers and
platforms), comparison, trends, taxonomy overview and class page, benchmark and its item explorer, not found.

### Release documents (build time)

- **REQ-001** (ubiquitous) `npm run build-data` shall write `public/data/release-docs.json` with: `citation` (title,
  version, date released, DOI, licence and the authors' family names, given names and ORCID URLs, parsed from the
  release's `CITATION.cff`), `citation_cff` (that file's text verbatim) and `data_card` (the text of `DATA_CARD.md`
  verbatim). Both files are read from the release extracted and checked against `MANIFEST.sha256` by
  `fetch-release`. No other file in `public/data/` shall change.
- **REQ-002** (event-driven) When `CITATION.cff` is missing or contains a line outside the supported subset, when its
  `version` or `doi` differ from `core/release.csv`, or when `DATA_CARD.md` is missing, `build-data` shall stop with
  an error naming the file and, where one applies, the field.

### Home page (`#/`)

- **REQ-003** (ubiquitous) The home page shall show, in this order: a heading and one paragraph on what the dataset
  records (with the version and the paper and platform counts of the loaded release); a table of the five views
  (platform viewer, browse and compare, trends, taxonomy, benchmark), one row each with one line on what the view
  shows, where the browse, trends, taxonomy and benchmark rows link to their routes and the platform-viewer row has a
  button that moves focus to the platform filter on the same page; a data section with the counts table, the DOI as a
  link, a "Download the data" link to `https://doi.org/<release DOI>` (the Zenodo record; no data file is served for
  download from the site), the citation and the licence; and the existing filterable platform list, which remains
  the way into the platform viewer.
- **REQ-004** (ubiquitous) The citation shall be built only from `release-docs.json` `citation`, with APA 7 author
  formatting and no publisher (the release's `CITATION.cff` records none): authors as "Family, G. G.", separated by commas with ", &" before the last (two authors: "A, B., & C, D."), then
  the year of the release date in parentheses, the title, "(Version <version>) [Data set].", and
  `https://doi.org/<doi>`. The verbatim `CITATION.cff` shall be available below it in a collapsed block.

### About page (`#/about`)

- **REQ-005** (ubiquitous) A new route `#/about` and a nav link "About" shall show a summary of the data card in four
  sections: how the papers were found, how they were coded, how far the labels can be trusted, and limits; and the
  data card's full text verbatim in a collapsed block at the end of the page, together with a link to the release on
  Zenodo. The version named on the page shall come from the loaded `index.json`.
- **REQ-006** (ubiquitous) The summary shall keep the data card's own limits: the agreement figures are stated as
  agreement between two language models and not accuracy against human coding (the release has no human coding);
  the 238 papers are stated as what one search on one date found, not every paper in the field; the share of
  screening decisions made by a language model is stated; isolated manual steps are stated as allowed by the
  eligibility criteria; page numbers of preprint main texts are stated as possibly differing from the journal
  version; abstracts, the coders' notes, process conditions, paper text and the second coding are stated as not
  included. Captions and summaries on the home and about pages shall describe the release and draw no conclusion
  about the field.
- **REQ-007** (ubiquitous) Every number in the home intro and the about summary shall either come from the loaded
  `index.json` or appear as a whole number token in the `DATA_CARD.md` of the pinned release; a test shall fail when
  a number is in neither (so the switch to a later release cannot leave a stale figure).

### Theme

- **REQ-008** (state) While the system colour scheme is dark (`prefers-color-scheme: dark`), every route shall use
  the dark set of site colour tokens and the existing dark chart tokens, and the platform graph shall use dark
  label, border, boundary and edge-label colours; while it is light, the light sets. When the system scheme changes
  while a page is open, the page shall follow without a reload. No theme switch is added to the page.
- **REQ-009** (ubiquitous) In both sets, body text, muted text and links shall reach a WCAG 2 contrast ratio of at
  least 4.5 against the page background, and the focus outline at least 3. The categorical palettes stay the
  colour-blind-safe ones already used (Okabe–Ito module groups and transfer modes, the trends tokens); in the dark
  set the black "unmapped" transfer-mode colour is drawn in the dark set's text colour in the graph and its legend.

### Keyboard and focus

- **REQ-010** (ubiquitous) Each page shall start with a "Skip to main content" link as the first focus stop, which
  moves focus to the main region. The nav link of the current view shall carry `aria-current="page"` (Home, About,
  Browse, Trends, Taxonomy for the overview and class pages, Benchmark for the benchmark page and item explorer); no
  nav link is current on the platform viewer, comparison and not-found pages. The document title shall be
  "<name> · SDL Workflows Explorer" with name: "Home", "About", "Platform <platform id>", "Browse", "Compare",
  "Trends", "Taxonomy", "Taxonomy: <class>", "Benchmark", "Benchmark items", "Not found".
- **REQ-011** (ubiquitous) On every route, in both themes, every element that receives focus from the Tab key shall
  show a focus outline at least 2 px wide, and Tab shall move from the skip link through the page to the footer's
  last link without a trap.

### Layout

- **REQ-012** (ubiquitous) Table border colour, cell padding and header weight, and the spacing between page
  sections, shall come from shared custom properties declared once on `:root`, so every table kind (`table.data`,
  `.counts`, `.taxo-table`, `.bench-table`, the comparison and trends tables) uses the same values; numeric cells
  shall be right-aligned with tabular figures by one shared rule.
- **REQ-013** (unwanted) At a 375 px wide viewport, in both themes, no route shall scroll horizontally.
- **REQ-014** (unwanted) Table header and cell words shall not break inside a word at 1280, 1024, 801 or 800 px on
  the routes that show tables (home, browse, comparison, taxonomy overview and class page, benchmark); in particular
  the "Relation" header and values such as "narrower" in the taxonomy class page's correspondence table. Identifiers
  keep breaking only at the existing `<wbr>` points.

### GitHub Pages readiness

- **REQ-015** (ubiquitous) `vite build` shall use the base `/sdl-workflows-explorer/`; the e2e build and its preview
  server (`--mode e2e`) keep the relative base `./` so the existing Playwright suite runs at the origin root. The
  production build served under `/sdl-workflows-explorer/` shall load every route and its data without a failed
  request.
- **REQ-016** (ubiquitous) `.github/workflows/pages.yml` shall build the data from Zenodo (`fetch-release`, which
  checks the pinned SHA-256, then `build-data`), run the typecheck and the Vitest suite, build the site and deploy it
  to GitHub Pages. Its only trigger shall be `workflow_dispatch`, so it does not run on push.
- **REQ-017** (ubiquitous) `docs/deploy.md` shall state the steps the researcher will take later: publish release
  1.1.0, update `release.config.json`, re-run the tests (including REQ-007's), make the repository public, choose
  "GitHub Actions" as the Pages source, run the workflow, check the live site, then step 8 of `docs/plan.md`.

### No regression and hard limits

- **REQ-018** (unwanted) The change shall not remove or rename the platform viewer, browse/compare, trends, taxonomy
  or benchmark views or their routes; shall keep the issue-form links of SPEC-CONTRIB-001; shall leave
  `release.config.json` pinned to 1.0.0; shall not enable Pages, deploy, run the new workflow or change the
  repository's visibility; and shall leave all existing Vitest (459) and Playwright (68) tests passing, except these
  edits, which the new behaviour requires and nothing else: the nav-link lists in `e2e/taxonomy.spec.ts` (AC-11) and
  `e2e/trends.spec.ts` (AC-9) gain "About"; `tests/derive.test.ts` "writeDerived" expects `release-docs.json`, and its
  "no abstract" check is applied to the derived view data (`index`, platform files, taxonomy, benchmark), not to the
  release documents, which quote the data card's word "abstracts" (the sentinel paper abstract of the fixture must
  still appear nowhere). All site text shall be in English.

## 3. How

- `scripts/lib/citation.ts` parses the subset of CFF the release uses (top-level `key: value` and an `authors` list of
  maps) and throws on anything else; `deriveAll` gains `releaseDocs`, written by `writeDerived`. The fixture
  `tests/fixtures/release-mini` gains a `CITATION.cff` and a `DATA_CARD.md`.
- `src/lib/siteText.ts` holds the home intro, the view table and the about summary as plain strings (UI-free, in the
  libBoundary list); `src/lib/citation.ts` formats the citation. `src/views/About.tsx` is new; `Home.tsx` is
  rearranged; `route.ts` gains `about`.
- `src/lib/siteTokens.ts` holds the light and dark site tokens (as `chartTokens.ts` does for charts) and a test keeps
  `styles.css` equal to it. The theme is set as `data-theme` on `<html>` by an inline script in `index.html` before
  the first paint and kept in step by a `matchMedia` listener in `main.tsx`; `graphElements.buildStylesheet(theme =
  "light")` takes the theme and `Graph` re-styles on change.
- Playwright gains a second web server: `vite build --outDir dist-pages` served by `vite preview --mode production`
  on port 4319 under `/sdl-workflows-explorer/`, used only by `e2e/pages.spec.ts`; the existing server gains
  `--mode e2e`.

## 4. Out of scope

### Out of Scope — release and deployment

Fetching, building or shipping release 1.1.0; editing `release.config.json`; enabling Pages; running the workflow;
making the repository public; step 8 of `docs/plan.md` (README and Zenodo links). Nothing in `~/research/sdl-db` is
edited.

### Out of Scope — views

No new data in any existing view, no change to the data the views read, no theme toggle, no focus move on route
change, no custom domain, no offline support.

## 5. Acceptance

See `acceptance.md`.
