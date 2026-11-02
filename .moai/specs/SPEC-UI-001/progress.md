# Progress: SPEC-UI-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-03
- Tier L (about 25 files); artifacts: spec.md, plan.md, acceptance.md, design.md (research is the redesign plan in
  the sdl-db workspace and the mock file; no separate research.md).
- Size: 15 REQs, 13 ACs.
- plan-auditor: not run. Gap: the plan and mock were approved by the researcher in the planning session that
  started this run; the SPEC restates that approved scope.
- Baseline before any change (worktree at 1c3788d, after `npm run fetch-release && npm run build-data` for 1.1.0):
  `npx vitest run` 40 files / 646 passed; `npx tsc --noEmit` exit 0; `npm run e2e` 187 passed.

## §F Phase 4 Mode Selection

- Inputs: Tier L, about 25 files, one domain (front end) plus tests, coding-heavy.
- Decision: serial (orchestrator-direct, milestone by milestone); coding-heavy work in one tree, no fan-out.

## §E.2 Run-phase Evidence

- M1 tokens, typefaces, shell (ca41ef6). Tests first: `tests/siteTokens.test.ts` (variant-B values, new contrast pairs,
  `resolveTheme`), `tests/fonts.test.ts`, `e2e/shell.spec.ts`. Fonts: Latin Modern Roman 10 regular and italic
  converted from TeX Live 2025 OTF with fontTools 4.60.1 (woff2, 48 KB and 51 KB); JetBrains Mono latin 400/500 woff2
  from `@fontsource/jetbrains-mono` 5.2.8 (21 KB each); licences and a README in `public/fonts/`. `lucide-react` 1.54.0
  added (icons). Vite rewrites the font URLs to `/sdl-workflows-explorer/fonts/…` (production) and `../fonts/…` (e2e).
  Changed existing tests: graph stylesheet colours, `.counts` dropped from the table kinds. Gap: the first RED run of
  the token test was not captured separately (the values were written together with the test).
- M2 labels (8004481). RED: `npx vitest run tests/labels.test.ts` — "Failed to load url ../src/lib/labels". GREEN after
  `src/lib/labels.ts` and `components/Label.tsx`: labels 13 passed; every one of the 69 classes has a distinct label.
- M3 Home. RED: `tests/home.test.ts` — "Failed to load url ../src/lib/home". GREEN after `src/lib/home.ts`, the Home text
  in `siteText.ts`, `views/Home.tsx`, `FeaturedPlatform.tsx`, `ViewCards.tsx`, `useJson.ts` and the Home styles.
  First full e2e run: 11 failed / 197 passed. Fixes: other specs that waited for the removed counts table now wait for
  the stat tiles; Home and the taxonomy and benchmark views share one loader, so taxonomy.json is still requested once
  per page load; a range such as "FW1–FW3" in the taxonomy sources table keeps its words together (word joiners;
  Arial is wider than the old system font and the line broke after the en dash); the copy test locates the button by
  class because its name changes; the order test compares the cards beside each other by position.
- Final, worktree at the M3 commit: `npm test` 43 files / 682 passed; `npm run typecheck` exit 0; `npm run e2e`
  208 passed (2.2 min).
- Wording: the hero heading reads "self-driving lab platforms" instead of the mock's "self-driving labs", because
  279 counts coded platforms (some share an identity across papers), not distinct laboratories.

- Follow-up REQ-016, menu below 800 px. RED: `npx playwright test e2e/shell.spec.ts -g "AC-14"` — 3 failed (tabs
  visible at 375 px, no "Menu" button). GREEN after `components/SiteMenu.tsx` (own component; Radix not needed for one
  list of links), `NAV_ITEMS` in `App.tsx` shared by tabs and menu, and the menu styles: shell spec 21 passed. The
  test replaced the earlier "tabs in their own row at 375 px" check. The browser check at 800 px then showed the tabs
  wrapping under the site name: an older `.site-nav { flex-wrap: wrap }` rule from SPEC-BROWSE-001 overrode the new
  one. It was removed; from 800 to 1023 px the version chip hides, "Explorer" is hidden from view (kept for screen
  readers) and the gaps tighten, so all seven tabs fit; the width test now checks that at 800 and 1440 px.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 210 passed. Screens checked: 375 px light
  and dark (menu closed and open, no sideways scroll), 800 px, 1440 px light and dark.

- Phase 3, platform viewer (REQ-017 to REQ-020). RED: `npx playwright test e2e/viewer.spec.ts e2e/contribute.spec.ts`
  — 13 failed, 8 passed (new header, sheet, legend, overlap and timeline tests; the label-overlap test already failed
  on `Aand2024/P1` with the old spacing). GREEN after `Header.tsx`, `Graph.tsx` (toolbar, legend overlay, dagre
  spacing with `nodeDimensionsIncludeLabels`), `graphElements.ts` (13 px labels in the UI font, wrap at 150 px),
  `EvidencePanel.tsx` (sheet), `StepList.tsx` (timeline with lucide performer icons), `PlatformView.tsx` and the viewer
  styles. Browser check: the first spacing (rankSep 110, wrap 170 px) pushed the five-module chain of `Aand2024/P1` past
  the right edge at 1440 px; rankSep 70 and wrap 150 px fit it at zoom 1.12. `Kim2026/P1` (largest, 16 modules) lays
  out 2350 px wide at the readable zoom of 1 and is panned, as before. Screens: `Aand2024/P1` and `Kim2026/P1` at
  1440 px and 375 px in light and dark, sheet and legend open; no sideways scroll at 375 px.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 218 passed (2.5 min).

- Phase 3 follow-up (REQ-021 to REQ-023). RED: `npx vitest run tests/evidence.test.ts tests/graphElements.test.ts`
  — 5 failed (codes as labels, no `type` field); `npx playwright test e2e/viewer.spec.ts -g "UI AC-19|UI AC-20|UI AC-21"`
  against the a29d6d7 build — AC-19 failed (node label `flow_reactor…`), AC-20 failed (the sheet covered the "Paper DOI"
  link), AC-21 passed: the selection already reset on all three paths tried (history back from Trends, hash to About
  and back, straight to `Kim2026/P1`), so the reported carry-over was not reproduced. The test stays as a guard, and
  `Platform` is now keyed by the platform id. GREEN after `graphElements.ts` (readable labels, `code` field),
  `evidence.ts` and `EvidencePanel.tsx` (type row with the code), `Legend.tsx` (each module type under its group and
  each transfer mode with its code), the sheet CSS (a sticky column beside the content from 1024 px; bottom sheet
  below) and `Graph.tsx` (on a width change the view is fitted again if it was at its fit, otherwise keeps its centre,
  and the selection is brought into view). One mid-run e2e pass timed out in three tests while a dev server ran beside
  it; a headless script against the same build showed no hang, and the reruns passed.
  Browser check: `Aand2024/P1` 1440 px light (sheet and legend), `Kim2026/P1` 1440 px dark (sheet and legend),
  `Aand2024/P1` 375 px dark (bottom sheet), `Kim2026/P1` 375 px light (legend), 1024 px light; no sideways scroll.
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 221 passed (2.5 min).

- Refit fix (REQ-024). Measured on the e2e build at 1440 px: the graph of `Aand2024/P1` is 988 layout px wide, so it
  needs a 1036 px box at zoom 1; with the sheet docked the box was 774 px, so the readable rule could not fit it.
  RED: `npx playwright test e2e/viewer.spec.ts -g "UI AC-24"` — the in-view test failed (modules outside the box).
  GREEN after the page widens into its side margin while the sheet is open (sheet column 320 px; graph box 1039 px at
  1440 px with a scrollbar) and `Graph.tsx` refits after a 60 ms debounced resize unless the reader zoomed or panned
  (Cytoscape's `dragpan`, `scrollzoom`, `pinchzoom` events and the toolbar zoom buttons; "Fit to view" clears it).
  The intermittent e2e timeouts of the follow-up were traced: ten pages at once crash when a node is selected by a
  scripted `emit("tap")`, and do not when the same module is selected by its table row or by a real mouse click, so
  the tests now click (`tapElement`); viewer and contribute specs 27 passed in 9 s (41 s with failures before).
  Browser check: `Aand2024/P1` 1440 px light with the sheet open (whole chain in view), dark after closing (refit).
  Final: `npm test` 682 passed; `npm run typecheck` exit 0; `npm run e2e` 224 passed (2.3 min).

## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready (phases 0 to 2); browser check of AC-13 recorded below.
- Browser check (Vite dev server of the worktree, built-in browser): Home at 1440 px light and dark matches the
  `ArialLight` and `ArialDark` boards in structure (hero with featured card, six stat tiles, three-column view
  cards, row list, two cards). At 375 px dark the page first scrolled sideways (452 px): a long single-line preview
  widened the view-card grid, and the visually hidden link text of the featured chain escaped its scroll box. Fixed
  with `min-width: 0` on the cards and `position: relative` on the chain's scroll box; afterwards scrollWidth = 375 in
  both themes. The "/" key hint is hidden below 600 px so the search placeholder fits.
- Not done here (later phases): platform viewer, Browse and Trends filters, Taxonomy, Benchmark, Workflow builder
  and About keep their layouts and only inherit tokens and typefaces; vocabulary codes outside Home still print as
  codes; chart tokens were not re-validated against the new dark surfaces.
