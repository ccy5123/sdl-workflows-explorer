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
