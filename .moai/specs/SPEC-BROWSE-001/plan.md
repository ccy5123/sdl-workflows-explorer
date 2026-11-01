# Plan: SPEC-BROWSE-001

## A. Context

Step 3 of `docs/plan.md`. Depends on SPEC-DATA-001 and SPEC-VIEW-001 (both completed; last commit ad9742d). The
private remote is `github.com/ccy5123/sdl-workflows-explorer`. Development mode: TDD.

## B. Tasks (TDD per unit), most likely to change first

1. Filter state and URL format (AC-2, AC-3): `src/lib/filterState.ts` (state type, defaults, offered values from an
   `IndexJson`) and `src/lib/filterUrl.ts` (encode/decode per spec §3). The parameter names and the list format are
   the decision a reviewer is most likely to revise; settle them before any UI depends on them.
2. Row predicates (AC-4, AC-5): `src/lib/filterApply.ts` with the own-row, match-mode and paper/platform rules of
   REQ-005 to REQ-007, tested on a fixture that includes the "two platforms each with one value" case and on the real
   index counts in `acceptance.md`.
3. Comparison data (AC-6, AC-7): `src/lib/compare.ts` (id check in the order count, duplicates, unknown ids,
   first failure reported; assembly of the union rows and step lists from `PlatformGraph` objects). Then
   `tests/libBoundary.test.ts` (AC-8) over the four `src/lib/` filter and compare files.
4. Routes (AC-1): `browse` and `compare` kinds and `compareHash` in `src/lib/route.ts`; the existing route tests stay
   as they are and must pass unchanged.
5. Dependency: `@tanstack/react-table` 9.3.1 exact in `package.json` and `package-lock.json`.
6. Browser view: `src/views/Browse.tsx`, `src/components/FilterPanel.tsx`, `src/components/DataTable.tsx` (the one
   TanStack wrapper used by both tables: sort header buttons with `aria-sort`, column chooser),
   `src/components/ColumnChooser.tsx`; URL writes with `history.replaceState` and a `hashchange` listener.
7. Comparison view: `src/views/Compare.tsx` (fetch per distinct paper; a rejected request, a status that is not ok,
   a body that is not JSON and a file without the platform each give the REQ-015 message).
8. `src/App.tsx`: route the two kinds, add the Home and Browse navigation links; `src/styles.css`: table containers
   that scroll horizontally, filter layout at 375 px.
9. Playwright: `e2e/browse.spec.ts` (AC-9 to AC-16); `e2e/viewer.spec.ts` stays unchanged and must pass.

## C. Risks

| Risk | Mitigation |
|---|---|
| TanStack Table 9 API differs from the version 8 examples most guides show | Read the 9.3.1 docs and types first; keep all TanStack use inside `DataTable.tsx` so a change of API touches one file |
| `replaceState` does not fire `hashchange`, so the router's stored hash goes stale; a click on "Browse" from a filtered URL could then leave filters shown with an unfiltered URL | The browser reads the state from `window.location.hash` on mount and on every `hashchange`; AC-10 tests the "Browse" link from a filtered state |
| Paper ids that are substrings of other ids (`Clayton2020` in `Clayton2020a`, 10 such ids) | Paper rows link to each platform directly instead of to a text search on the paper id |
| A paper's platforms passing different platform-level filters could wrongly count the paper | The rule "one platform passes all platform-level filters together" (REQ-007) is tested on `Zhang2025b` (flow_reactor on P2, liquid_handler on P1): excluded under "all" |
| Repeated platform files fetched for two platforms of one paper | Fetch once per distinct paper id (REQ-014), tested through the assembly input |
| Bundle size grows (already 651 kB with Cytoscape) | Accept for now; code splitting is a step 7 concern |
| Long platform lists in one cell (`Bedard2018` has 11 platforms) | Cell wraps; table scrolls inside its container at 375 px |

## D. Files

New: `src/lib/{filterState,filterUrl,filterApply,compare}.ts`, `src/views/{Browse,Compare}.tsx`,
`src/components/{FilterPanel,DataTable,ColumnChooser}.tsx`, `tests/{filterUrl,filterApply,compare,libBoundary}.test.ts`,
`e2e/browse.spec.ts`.
Edited: `src/lib/route.ts`, `tests/route.test.ts` (new cases only), `src/App.tsx`, `src/styles.css`,
`package.json`, `package-lock.json`.
Not edited: `src/views/Home.tsx`, `src/lib/platformFilter.ts`, `scripts/`, `e2e/viewer.spec.ts`.
