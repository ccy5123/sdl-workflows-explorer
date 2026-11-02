# Plan: SPEC-SITE-001

## A. Context

Follows SPEC-CONTRIB-001 (closed at 69d2dc7). Step 7 of `docs/plan.md`. Release 1.0.0 stays pinned; 1.1.0 (timing
data, human-intervention reporting) is not public and is not fetched. The manuscript assumes
`https://ccy5123.github.io/sdl-workflows-explorer`; the researcher will deploy later together with release 1.1.0.
Design detail in `design.md`, codebase facts in `research.md`.

### A.5 Preserve

- `release.config.json` (pinned 1.0.0), `scripts/fetch-release.ts`, `scripts/lib/{checksum,extract,config,counts}.ts`.
- Routes and view names of the platform viewer, browse/compare, trends, taxonomy and benchmark.
- `src/lib/contribute.ts`, `src/components/IssueLink.tsx` and their links.
- Derived files other than the new `release-docs.json` (byte-identical).
- `~/research/sdl-db` (read-only).

## B. Milestones (TDD per unit; each commit carries its tests, RED runs recorded in progress.md §E.2)

| M | Unit | Test first | Then |
|---|---|---|---|
| M1 | Release documents | `tests/citation.test.ts`, `tests/release-docs.test.ts` (AC-1 to AC-3); `tests/derive.test.ts` "writeDerived" list and "no abstract" scope (REQ-018) | `scripts/lib/citation.ts`, `deriveAll`/`writeDerived`, types, fixture `CITATION.cff` and `DATA_CARD.md`, `src/lib/citation.ts` (formatter) |
| M2 | Home and about | `tests/siteText.test.ts` (AC-4), `e2e/site.spec.ts` (AC-6, AC-7); nav lists in `e2e/taxonomy.spec.ts` and `e2e/trends.spec.ts` gain "About" | `src/lib/siteText.ts`, `route.ts` `about`, `Home.tsx`, `About.tsx`, nav link, styles |
| M3 | Theme | `tests/siteTokens.test.ts`, graph stylesheet cases (AC-5), `e2e/theme.spec.ts` (AC-8) | `src/lib/siteTokens.ts`, CSS dark set, `index.html` script, `main.tsx` listener, `useTheme`, `graphElements` (`theme = "light"` default), `Graph`, `Legend` |
| M4 | Keyboard, layout | `e2e/a11y.spec.ts` (AC-9, AC-10, AC-12, AC-13), `tests/tableStyles.test.ts` (AC-19) | skip link, `aria-current`, titles, focus styles, shared table and spacing properties, taxonomy word-break fix |
| M5 | Pages readiness | `tests/pages.test.ts` (AC-11, AC-14 config part), `e2e/pages.spec.ts` (AC-14) | `vite.config.ts`, `playwright.config.ts` (`--mode e2e` on 4317, new 4319 server), `package.json` e2e script, `.github/workflows/pages.yml`, `docs/deploy.md` |
| M6 | Verification | full suites, `npm run build`, AC-16, browser check at 1280/375/800 px in light and dark (AC-18) | fixes found by the screen check, each with a test |

Sync: `.moai/project/tech.md` (base, deploy), `.moai/project/structure.md` if it lists views, `docs/plan.md` step 7
status line, progress.md §E.4, status completed.

## C. Risks

| Risk | Mitigation |
|---|---|
| Changing the e2e base breaks all 68 specs (`goto("/#/…")`) | e2e mode keeps `./` for the build and the preview server (`--mode e2e`, checked by AC-14's `GET /` 200); the production base is tested by a separate server and spec |
| Existing tests need edits | Only those REQ-018 names; AC-15 checks the diff of `e2e/` and `tests/` against 69d2dc7 |
| Dark theme leaves hard-coded light colours (graph, inline styles, count-table cells) | Tokens test; dark e2e on every route; screen check of every view in dark |
| The theme flashes light before React mounts | Inline script in `index.html` sets `data-theme` before the bundle |
| A stale number in the about text after the switch to 1.1.0 | AC-4 test against the pinned data card; named in `docs/deploy.md` |
| Summary drifts into claims about the field | REQ-006 wording from the data card; AC-7 phrase checks; draft text in design.md for the researcher to approve |
| The workflow runs on push or against the live site | `workflow_dispatch` only (AC-11); Pages not enabled (AC-16); repository private, and Pages on a private repository is not available on the free plan anyway |
| Focus test is slow on long pages (280-row list on home, a link per row in browse) | Press count derived from the page's own tabbable elements (N + 5); focus styles recorded by one `focusin` listener in the page instead of an evaluate per press |
| Shared table rules shift existing layouts and break pinned e2e layout checks | Consolidate values, not selectors; run full e2e after M4 |
| Pre-commit hook runs full Vitest; RED tests cannot be committed alone | Commit test and implementation of a unit together; record the RED run |
| Subagent worktree isolation fails on the UNC path | The orchestrating session implements directly, as in SPEC-CONTRIB-001 |

## D. Files

New: `scripts/lib/citation.ts`, `src/lib/citation.ts`, `src/lib/siteText.ts`, `src/lib/siteTokens.ts`,
`src/views/About.tsx`, `src/components/useTheme.ts`, `tests/citation.test.ts`, `tests/release-docs.test.ts`,
`tests/siteText.test.ts`, `tests/siteTokens.test.ts`, `tests/tableStyles.test.ts`, `tests/pages.test.ts`, `e2e/site.spec.ts`,
`e2e/theme.spec.ts`, `e2e/a11y.spec.ts`, `e2e/pages.spec.ts`, `tests/fixtures/release-mini/CITATION.cff`,
`tests/fixtures/release-mini/DATA_CARD.md`, `.github/workflows/pages.yml`, `docs/deploy.md`.

Edited: `scripts/lib/derive.ts`, `src/data/types.ts`, `src/lib/route.ts`, `src/lib/graphElements.ts`,
`src/App.tsx`, `src/main.tsx`, `src/views/Home.tsx`, `src/components/Graph.tsx`, `src/components/Legend.tsx`,
`src/styles.css`, `index.html`, `vite.config.ts`, `playwright.config.ts`, `package.json`, `.gitignore`
(`dist-pages/`), `tests/libBoundary.test.ts`, `tests/route.test.ts`, `tests/graphElements.test.ts` (cases added
only), and the three existing tests REQ-018 names (`e2e/taxonomy.spec.ts`, `e2e/trends.spec.ts`,
`tests/derive.test.ts`); possibly other views for focus or spacing fixes.
