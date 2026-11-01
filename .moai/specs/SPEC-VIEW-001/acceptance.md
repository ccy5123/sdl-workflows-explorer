# Acceptance: SPEC-VIEW-001

Unit tests (AC-1 to AC-8) run in Vitest without a browser; AC-2 and AC-8 read the real `public/data/` after
`npm run build-data`. AC-9 to AC-13 are Playwright tests (`npm run e2e`) against the `dist-e2e/` build of `vite build --mode e2e`.
"Page error" below means an uncaught exception (`pageerror`); a 404 resource message in the console does not count.

Reference platform: `Aand2024/P1` (5 modules, 6 steps, 5 connections in the release).

## Scenarios

### AC-1 Route parsing (REQ-001, REQ-002)
- `#/platform/Aand2024/P1` → platform route, paper `Aand2024`, platform `Aand2024/P1`.
- `""`, `#`, `#/` → home.
- `#/platform/`, `#/platform/Aand2024`, `#/nonsense` → not-found carrying the hash. No input throws.

### AC-2 Display groups (REQ-007, REQ-011, spec §3)
- Every one of the 22 module types in the real `taxonomy.json` maps to exactly one of the 5 groups with the colour of
  §3; no group lists a type outside the taxonomy; an unknown type maps to "Control and other". Every one of the 6
  transfer modes has the label and colour of §3.

### AC-3 Graph elements (REQ-006, REQ-008, REQ-009, REQ-010)
- For a fixture platform with one off-platform module, one inferred edge, one uncertain edge, one data edge and two
  parallel edges between the same pair, the element builder returns: one platform parent node; `parent` set exactly on
  modules with `on_platform` true; one edge per connection (both parallel edges kept) with source/target equal to
  `from_module`/`to_module`; class `inferred` exactly on the `stated` false edge; class `uncertain` and "?" in the label
  exactly on the uncertain edge; the transfer-mode class and label on every edge; the stylesheet sets
  `curve-style: bezier`.

### AC-4 Steps and highlight set (REQ-012, REQ-013)
- Steps given out of order come back sorted by `step_order`; the highlight set for a step equals its `modules`; the
  selection reducer toggles off when the same step is selected twice and clears on Escape.

### AC-5 Evidence and null display (REQ-014, REQ-015)
- For a module, a connection, a step and a platform, the formatter returns kind, id, document, page, locator, the
  `unmapped_note` when present, and `https://doi.org/<doi>`. Null page, locator, family and performer render as "—".

### AC-6 Shared identity links (REQ-005)
- Fixture: platform A1 shares `identity_id` with B1 and B2 (paper B) and paper C has no matching platform → links to
  B1 and B2, C listed without a link.
- Real index: `CortesBorda2018/P1` lists two links for `Wimmer2019`.

### AC-7 Platform list filter (REQ-003)
- On fixture rows the filter matches id, name and paper id case-insensitively and ignores null names.

### AC-8 Real index list (REQ-003)
- An empty filter returns all 280 platform rows; `aand2024` returns `Aand2024/P1`.

### AC-9 Viewer opens by URL (REQ-001, REQ-005, REQ-006, REQ-012, REQ-014, REQ-016)
- `#/platform/Aand2024/P1` shows the header with name "auto-optimization platform (AOP)", year 2024 and the link
  `https://doi.org/10.1039/d4re00138a`; `window.__cy` has 5 module nodes and 5 edges; the step list has 6 rows in order
  1-6; the module table has 5 rows and the connection table 5 rows; the evidence panel shows doc `main`, page 4,
  locator `Fig. 1a`.

### AC-10 Step selection (REQ-013, REQ-014, REQ-016)
- Focusing step 1 with Tab and pressing Enter highlights exactly its modules (checked through `window.__cy` classes)
  and shows doc `SI1`, page 15, locator `§S2.4 ¶1`. Pressing Escape clears the highlight and the panel shows the
  platform evidence again. Selecting step 1 twice by click toggles the highlight off.

### AC-11 Table selection (REQ-014, REQ-016)
- Pressing Enter on the first module-table row shows that module's evidence, and on the first connection-table row
  that connection's evidence, in the panel.

### AC-12 Not found, home list and navigation (REQ-002, REQ-003, REQ-004, REQ-016)
- `#/platform/Nope2000/P1` and `#/nonsense` show the not-found message with a home link and raise no page error.
- On home, Tab into the filter, type `Aand2024`, Tab to the single row, press Enter → the platform opens; browser
  back returns to home.

### AC-13 Off-platform and markers on a real platform (REQ-008, REQ-010, REQ-011)
- For a release platform with an off-platform module, an inferred edge and an uncertain item (picked from the data at
  run time): the off-platform node has no parent in `window.__cy` while on-platform nodes have the boundary as
  parent; the inferred edge has `line-style` dashed; the uncertain item shows "?"; the legend lists 5 groups, 6
  transfer modes and the display-choice note.

### AC-14 Gates
- `npm test`, `npm run typecheck`, `npm run build` and the Playwright suite pass; the SPEC-DATA-001 tests still pass;
  `src/lib/` coverage at least 85%; the production `dist/` bundle contains no `__cy`.
