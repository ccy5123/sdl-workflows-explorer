# Plan: SPEC-VIEW-001

## A. Context

Step 2 of `docs/plan.md`. Depends on SPEC-DATA-001 (committed in c64fd27). The private remote is
`github.com/ccy5123/sdl-workflows-explorer`.

## B. Tasks (TDD per unit)

1. Dependencies: `cytoscape`, `cytoscape-dagre`, their type packages; `@playwright/test` (dev) and Chromium.
2. `src/lib/route.ts` (AC-1).
3. `src/lib/moduleGroups.ts` with the §3 groups and palette (AC-2).
4. `src/lib/graphElements.ts`: elements and stylesheet for Cytoscape (AC-3).
5. `src/lib/steps.ts`, `src/lib/evidence.ts`, `src/lib/identity.ts`, `src/lib/platformFilter.ts` (AC-4 to AC-8).
6. Components and views: Header, Graph (Cytoscape mount, highlight API), StepList, EvidencePanel, Legend,
   PlatformView, Home with platform list; App hash router.
7. Playwright config and `e2e/viewer.spec.ts` (AC-9 to AC-13), run by an `e2e` npm script that builds with `--mode e2e --outDir dist-e2e` and serves that folder
   with `vite preview`.

## C. Risks

| Risk | Mitigation |
|---|---|
| Chromium for Playwright needs system libraries missing in WSL | Try `npx playwright install chromium`; if it cannot run without sudo, report a blocker rather than skip AC-9 to AC-13 |
| Cytoscape is hard to test in jsdom | Keep logic in pure functions; test the canvas only through Playwright, reading node state via `window.__cy`, exposed only in `vite build --mode e2e` |
| Ids with "/" break `#id` selectors; parallel edges overlap | `cy.getElementById()`; `curve-style: bezier` |
| dagre may place an off-platform node over the boundary box | Test parentage, not bounding boxes |
| SPEC-DATA-001 still in-progress blocks the depends_on pre-flight | Close SPEC-DATA-001 (sync) before run |
| Dense graphs (up to 16 modules, 34 steps) | dagre left-to-right layout, fit on load, zoom/pan enabled |
| Colour reliance | Type name in every node label, text label on every edge, legend |

## D. Files

New: `src/lib/{route,moduleGroups,graphElements,steps,evidence,identity,platformFilter}.ts`,
`src/components/{Header,Graph,StepList,EvidencePanel,Legend}.tsx`, `src/views/{Home,PlatformView}.tsx`,
`src/styles.css`, `tests/*.test.ts` for each lib file, `playwright.config.ts`, `e2e/viewer.spec.ts`.
Edited: `src/App.tsx`, `src/main.tsx`, `package.json`, `package-lock.json`, `vitest.config.ts`, `.gitignore`
(Playwright reports), `tsconfig.json` if needed; `.gitignore` also gets `dist-e2e/`.
