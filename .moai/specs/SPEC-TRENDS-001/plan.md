# Plan: SPEC-TRENDS-001

## A. Context

Step 4 of `docs/plan.md`. Depends on SPEC-DATA-001 and SPEC-BROWSE-001 (both completed). Reuses
`src/lib/filterState.ts`, `filterUrl.ts`, `filterApply.ts` and `src/components/FilterPanel.tsx` unchanged.
Development mode: TDD. The private remote is `github.com/ccy5123/sdl-workflows-explorer`.

## B. Tasks (TDD per unit), most likely to change first

1. Trends URL and split parameter (AC-2): in `src/lib/trends.ts`, the split type, `encodeTrends(state, split)`,
   `trendsHash`, `decodeTrends(query, offered)` (wraps `decodeFilters`, reads the last `split`). The parameter name,
   its values and the default are the decision a reviewer is most likely to revise; settle them first.
2. Count rule (AC-4, AC-5): `offeredSplitValues(split, state, offered)` and `linkState(state, bin, split, value?)`
   in `src/lib/trends.ts`, tested on the fixture cases of AC-4 and the URL table of AC-5. This is the rule that makes
   chart and browser agree; a change to it changes every number.
3. Bins and labels (AC-3): `yearBins(applied, earliest, latest, partialYear)` and the search-date constant
   (`RELEASE_SEARCH_DATE` = 20 October 2026, partial year derived from it) in `src/lib/trends.ts`.
4. Count table (AC-6): `countTable(state, split, index)` built from items 2 and 3 with `matchingPapers` /
   `matchingPlatforms`; tested against every number of AC-6 on the real index.
5. Caption and note texts (AC-8): caption builder in `src/lib/trends.ts` (pure, no React); banned-substring test.
6. Colour tokens (AC-7): `src/lib/chartTokens.ts` (token map, ramp-step function, text colour per step, WCAG
   contrast function) and the matching custom properties in `src/styles.css`; `tests/chartTokens.test.ts`.
7. Library boundary (AC-8): extend `tests/libBoundary.test.ts` with the two new files and the Plot/d3 pattern.
8. Route (AC-1): `trends` kind in `src/lib/route.ts`; new cases in `tests/route.test.ts`, existing cases unedited.
9. Dependency: `@observablehq/plot` 0.6.17 exact in `package.json` and `package-lock.json`.
10. Views: `src/views/Trends.tsx` (state, replaceState and `hashchange` as in `Browse.tsx`, filter sidebar and
    toggle, split radio group, unit switch, count line, cross link, caption, notes, empty result),
    `src/components/TrendsChart.tsx` (the only file importing Plot; width from the container via a resize observer;
    segment links with native `<title>`, bin totals above the bars as links),
    `src/components/CountTable.tsx` (used as the chart for multi-valued splits and inside `<details>` for exclusive
    splits).
11. `src/App.tsx`: `React.lazy(() => import("./views/Trends"))` with `Suspense`, route `trends`, nav link "Trends"
    after "Browse". `src/views/Browse.tsx`: the one link "Show these in Trends".
12. Playwright: `e2e/trends.spec.ts` (AC-9 to AC-16); `e2e/viewer.spec.ts` and `e2e/browse.spec.ts` unchanged and
    passing.

## C. Risks

| Risk | Mitigation |
|---|---|
| Plot needs a DOM; importing it in unit tests is slow and couples tests to rendering | Keep Plot out of `src/lib/` (enforced by AC-8); unit tests cover numbers and texts; Playwright covers rendering |
| Not verified in the plan phase: whether a `var(--token)` colour passed to Plot 0.6.17 resolves in the rendered SVG | Run-phase check first (render one mark with a `var()` fill, read its computed fill). If it does not resolve: one mark per value with a `className` and CSS rules on that class, or computed custom-property values (`getComputedStyle`) read at render time; AC-12 checks the computed fill either way |
| Accessible names of Plot links: the `href` channel wraps each mark in `<a>`, while Plot's `ariaLabel` channel sets `aria-label` on the mark inside it, not on the `<a>` | Default: after rendering, set `aria-label` on each `<a>` (segments and bin totals) from the count table; otherwise verify in the browser that the accessible name lands on the link. The `title` channel supplies the native `<title>` tooltip. AC-12 and AC-16 find links by exact name |
| Main bundle grows by Plot and d3 (bundle already about 711 kB) | Lazy route chunk named after `Trends.tsx`; AC-15 checks the network requests and that a string unique to Plot (picked from the built chunk and recorded in `progress.md`) is absent from every file loaded on `#/` |
| With 7 integration modes, a zero count removes a segment, so non-adjacent slots touch; light slots `#1baf7a`, `#eda100`, `#e87ba4` are below 3:1 on white | REQ-012 (b), (c): 2 px surface gap, native `<title>` per segment, legend in stack order, count table under every bar chart; the validator results are recorded in `progress.md` §E.1 and AC-7 guards the token values |
| `replaceState` fires no `hashchange`; the router's stored hash goes stale | Same pattern as `Browse.tsx`: read `window.location.hash` on mount and on every `hashchange`; AC-9 tests the "Trends" link from a non-default split |
| Field tags, module types and transfer modes are multi-valued; stacking them would draw columns taller than n | Multi-valued splits use the count table, never stacked bars (REQ-011); captions say a column does not add up to n |
| Offering every value of a group that already has a selection would show counts outside the filtered set | REQ-007 offers only the selected values except for `mt`/`tm` in match mode "all", where S ∪ {v} stays inside the filtered set |
| The partial year and its date written in several places drift apart at the next release | One constant in `src/lib/trends.ts`; the label function and the note read it (AC-3) |
| `src/styles.css` colours every `a` with `var(--accent)`, so a cell link could show accent blue on a dark step while the `td` has the right colour | Cell links inherit the cell's text colour (REQ-011); AC-13 measures the `a` element |
| Ramp step 7 (`#2a78d6`) reaches only 4.46:1 with `#0b0b0b` and 4.42:1 with white | Grid text colours are `#000000` and `#ffffff` (4.76:1 on step 7); AC-7 asserts every step |
| Bar chart too narrow at 375 px for 13 bars plus labels | Plot width from the container; tick labels allowed to rotate; screenshot check by the orchestrator |

## D. Files

New: `src/lib/{trends,chartTokens}.ts`, `src/views/Trends.tsx`, `src/components/{TrendsChart,CountTable}.tsx`,
`tests/{trends,chartTokens}.test.ts` (the URL cases may sit in a separate `tests/trendsUrl.test.ts`),
`e2e/trends.spec.ts`.
Edited: `src/lib/route.ts`, `tests/route.test.ts` (new cases only), `tests/libBoundary.test.ts`, `src/App.tsx`,
`src/views/Browse.tsx` (one link), `src/styles.css`, `package.json`, `package-lock.json`.
Not edited: `src/lib/{filterState,filterUrl,filterApply,compare}.ts`, `src/components/FilterPanel.tsx`, `scripts/`,
`e2e/{viewer,browse}.spec.ts`.
