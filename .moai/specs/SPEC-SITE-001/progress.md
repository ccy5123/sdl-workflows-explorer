# Progress: SPEC-SITE-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- Tier L (about 35 files touched, over 15); artifacts: spec.md, plan.md, acceptance.md, design.md, research.md (plus
  this file).
- Size: 18 REQs, 19 ACs (Tier L ceiling 25 each).
- plan-auditor: iteration 1 FAIL 0.75 (all must-pass PASS; blocking D1 to D9, optional D10 to D16), all applied in
  version 0.2.0. Report: `.moai/reports/plan-audit/SPEC-SITE-001-review-1.md`.
- plan-auditor: iteration 2 FAIL 0.92 (two minor blocking defects N1, N2; optional O1 to O6), applied in 0.3.0;
  iteration 3 PASS 0.96 (all must-pass PASS, no blocking defect; optional R1 applied — number cells defined by their
  text — and R2 left as cosmetic). Reports: `SPEC-SITE-001-review-2.md`, `SPEC-SITE-001-review-3.md`.
- Implementation Kickoff Approval: the researcher approved version 0.3.0 through AskUserQuestion on 2026-11-02 and
  chose autonomous progression (run, browser check, sync and push without intermediate stops). Citation: as in
  `CITATION.cff`, no publisher added (researcher's choice).

## §E.2 Run-phase Evidence

- M1 release documents: `tests/citation.test.ts`, `tests/release-docs.test.ts` written first and the `tests/derive.test.ts`
  edits named in REQ-018 applied. RED: `npx vitest run tests/citation.test.ts tests/release-docs.test.ts
  tests/derive.test.ts` — citation.test.ts "Failed to load url ../scripts/lib/citation ... Does the file exist?";
  9 failed (releaseDocs undefined, deriveAll did not throw, writeDerived lacked release-docs.json). GREEN after
  `scripts/lib/citation.ts`, `src/lib/citation.ts`, `deriveAll`/`writeDerived`, the types and the fixture files: full
  suite 30 files / 479 passed, with `npm run build-data` run first, so the real-data cases (release-docs.json against
  index.json; the five derived-file hashes equal to §E.1) ran and passed. Typecheck exit 0. Two test expectations were
  corrected during GREEN: the unsupported-line case is line 3 of the CFF, not line 4.
- M2 home and about: `e2e/site.spec.ts` (AC-6, AC-7) written first; the nav lists of `e2e/taxonomy.spec.ts` and
  `e2e/trends.spec.ts` gain "About" (REQ-018). RED against `vite build --mode e2e`: 4 failed (h1 text, missing About
  link, missing button — timeout, missing `main h1`). `src/lib/siteText.ts` was written from design.md §3 together with
  `tests/siteText.test.ts` (the strings are the approved draft; the number checker `unsourcedNumbers` had no separate
  RED run — recorded as a gap). GREEN after `route.ts` `about`, `useReleaseDocs`, `Home.tsx`, `About.tsx`, the nav
  link and styles: site.spec 4 passed; full Vitest 31 files / 490 passed; full Playwright 72 passed (68 + 4);
  typecheck exit 0.
- M3 theme: `tests/siteTokens.test.ts`, the `buildStylesheet` theme cases in `tests/graphElements.test.ts`,
  `e2e/routes.ts` (AC-12 route list) and `e2e/theme.spec.ts` written first. RED: siteTokens.test.ts could not load
  `src/lib/siteTokens`; graphElements 2 failed (dark stylesheet); Playwright "Cannot find module .../src/lib/siteTokens".
  GREEN after `siteTokens.ts`, the CSS token blocks (the hard-coded `#ffffff`, `#ddf4ff`, `#b35900`, `#cf222e` replaced
  by `--bg`, `--highlight`, `--warn`, `--danger`), the `index.html` pre-paint script, the `main.tsx` listener,
  `useTheme`, `buildStylesheet(theme = "light")`, `Graph` re-style and the legend's `var(--unmapped)`. One test fix:
  Cytoscape reports `rgb(r,g,b)` without spaces, normalised in the spec. Full Vitest 32 files / 499 passed; full
  Playwright 86 passed (72 + 14); typecheck exit 0.
- M4 keyboard and layout: `e2e/a11y.spec.ts` (AC-9, AC-10, AC-12, AC-13), `tests/tableStyles.test.ts` (AC-19) and the
  `routeTitle`/`navCurrent` cases in `tests/route.test.ts` written first. Screen check before the fix (built-in
  browser, e2e build): at 800 px the taxonomy tables are stacked and nothing breaks; at 820 px (table layout, just
  above the 800 px breakpoint) "Relation", "narrower" and "OntoVapourtec:VapourtecR4Reactor" broke mid-word, caused by
  `.taxonomy { overflow-wrap: anywhere }` reaching the table cells. AC-13 therefore also runs at 820 px.
  RED: tableStyles 5 failed (no shared properties, literal borders/padding, `font-weight: 400` on `.counts th`, no
  `.num` rule, `h2` margin); route.test 11 failed (no `routeTitle`); a11y 18 failed of 66 — AC-9 on all 12 routes (no
  skip link) and AC-13 at every width (mid-word breaks; number cells without `num`). AC-10 (visible focus, no trap)
  and AC-12 (375 px) already passed on every route in both themes. One test-definition fix during RED: a line break
  after a hyphen ("self-|optimizing") is a normal break opportunity, so a word runs up to and including a hyphen.
  GREEN after: shared `--table-border`, `--cell-pad-y/x`, `--th-weight`, `--section-gap`; one `td.num, th.num` rule
  and `num` on numeric cells (Browse via `Col.num`, Compare, CountTable, Home); `overflow-wrap: normal` in taxonomy
  and benchmark table cells; skip link, `main#main`, `aria-current`, `document.title` via `routeTitle`. Full Vitest
  33 files / 516 passed; full Playwright 152 passed (86 + 66); typecheck exit 0.
- M5 Pages readiness: `tests/pages.test.ts` (AC-11, AC-14 configuration) and `e2e/pages.spec.ts` (AC-14) written first.
  RED: pages.test 6 failed (base was `./` in every mode, no second preview server, no `pages.yml`). `e2e/pages.spec.ts`
  had no separate RED run (its server and `dist-pages/` did not exist until the configuration was written) — gap.
  GREEN after `vite.config.ts` (base per mode), `playwright.config.ts` (two preview servers, each pinned with
  `--mode`), the `e2e` script, `.gitignore` `dist-pages/`, `.github/workflows/pages.yml` (`workflow_dispatch` only) and
  `docs/deploy.md`: pages.test 6 passed; `dist-pages/index.html` loads `/sdl-workflows-explorer/assets/index-*.js`;
  `npm run e2e` exit 0, 161 passed (152 + 9); full Vitest 34 files / 522 passed; typecheck exit 0. Also removed a JSX
  comment left in `Benchmark.tsx` by M4.
- M6 verification: `npm run build` exit 0 (zip and MANIFEST verified, 79 files; counts match; `dist/index.html` loads
  `/sdl-workflows-explorer/assets/index-*.js`; `dist/data/` holds release-docs.json beside the other files). The
  production build served by `vite preview --mode production` under `/sdl-workflows-explorer/` was opened in the
  built-in browser (AC-18):
  - Scripted pass over the 12 routes at 1280 px light, 1280 px dark, 375 px light and 375 px dark: every route shows
    its `h1` and the REQ-010 title, `data-theme` and the body background follow the scheme, `scrollWidth` equals
    `clientWidth`, no page error; in dark, no element in `main` has a white background.
  - Seen in screenshots: home (1280 light: intro, views table, counts, DOI, download link, citation, collapsed
    CITATION.cff, platform list; 375 dark), about (1280 dark), platform viewer (1280 dark: light labels, dark edge-label
    backgrounds; 375 dark: the graph is cut at the right edge at its readable zoom, as since SPEC-VIEW-001 — pan or
    "Fit to view"), trends (1280 dark: dark chart tokens, dark form controls), taxonomy overview (1280 dark), class page
    (820 px light: "Relation" and "narrower" whole; 375 px light: stacked cells), comparison (1280 dark), benchmark
    (375 dark), browse (375 dark: wide table scrolls inside its container).
  - Three findings fixed, each test first: (1) at 375 px the views table kept a nowrap name column, leaving the
    descriptions in a narrow column — RED in `e2e/site.spec.ts` "screen check" (description top 754 < name bottom
    915), GREEN after stacking the table below 600 px; (2) `.num` cells inside `table.data` stayed left-aligned
    because `table.data td { text-align: left }` is more specific — RED in AC-13 ("not right-aligned: 2024" …), GREEN
    with `table td.num, table th.num`; numeric column headers (Browse, comparison counts and step order) carry `num`
    too, and the comparison's identity table (name, paper, year in one column) is a record card, so its year is not a
    number column and AC-13 exempts it; (3) comparison headings sat directly under the previous table — `.compare h2`
    takes `--section-gap`.
  - After the fixes: full Vitest 34 files / 522 passed; `npm run e2e` exit 0, 162 passed; typecheck exit 0.
- Baseline re-measured 2026-11-02 at 69d2dc7: `npx tsc --noEmit` exit 0; `npx vitest run` 28 files, 459 passed;
  `npm run e2e` 68 passed.
- Derived-file hashes at 69d2dc7 (`sha256sum` of `public/data/` after build-data; AC-1):
  index.json 6b644e3cba4bdbd007e85d5fdfc10494329e0aaa4337d2c37c4cb6c15ca5db4d;
  taxonomy.json e33f52e3398e1d411f1522c1e3953c41165828a7693e9582c90c6fd9880acdc9;
  benchmark.json 4ca73f0e6d4674debc39dadfdcc6749a5c79709824d2bd7f7b38416ba95ad80d;
  benchmark-items.json 7a709c166912e849597d17302fb4fc09c3befc98b01f3265a8365deb19bb9aeb;
  238 platform files concatenated in name order 9001ca64126b7bb996076a0b8b172d5c3d5b293171529dcf9aca08d8599889a8.
- Dependencies: SPEC-DATA-001, SPEC-VIEW-001, SPEC-BROWSE-001, SPEC-TRENDS-001, SPEC-TAXO-001, SPEC-BENCH-001 and
  SPEC-CONTRIB-001 have status completed.
- Baseline (2026-11-02, HEAD 69d2dc7): typecheck 0, Vitest 459/459, Playwright 68/68 (from the SPEC-CONTRIB-001
  hand-over; re-measured before run).
- Source of the brief: the orchestrating session of 2026-11-02 relayed step 7 of `docs/plan.md` with the scope (home,
  about, design and accessibility pass, Pages readiness without deploying), the hard limits (repository private, no
  Pages, release 1.0.0 pinned, view names and routes kept, contribution links kept, English site text) and the known
  "Relation" column break at 800 px.
