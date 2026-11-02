# Acceptance: SPEC-CONTRIB-001

AC-1 to AC-3 are Vitest unit tests; AC-3's real-data case reads `public/data/index.json` after `npm run build-data`
and skips with a message when it is absent, as in earlier SPECs. AC-4 to AC-8 are Playwright tests (`npm run e2e`)
against the `dist-e2e/` build. `B` below stands for `https://github.com/ccy5123/sdl-workflows/issues/new`.

## Scenarios

### AC-1 Exact URLs (REQ-001)
- `correctionUrl("Aand2024/P1/M2", "1.0.0")` equals
  `B?template=correction.yml&title=%5Bcorrection%5D%20Aand2024%2FP1%2FM2&item_id=Aand2024%2FP1%2FM2&release=1.0.0`.
- `correctionUrl("Aand2024", "1.0.0")` (a paper id) has `item_id=Aand2024` and title `%5Bcorrection%5D%20Aand2024`.
- `paperUrl()` equals `B?template=paper.yml&title=%5Bpaper%5D%20`.
- `taxonomyUrl("module_type", "flow_reactor")` equals
  `B?template=taxonomy.yml&title=%5Btaxonomy%5D%20module_type%2Fflow_reactor&class=module_type%20%2F%20flow_reactor`.

### AC-2 Every value is encoded (REQ-001)
- For values containing a space, `&`, `#`, `+`, `=`, `?`, `%`, `/` and a non-ASCII letter, parsing the returned URL with
  `new URL()` gives back exactly the intended value for every parameter, the parameter names in REQ-001's order and no
  extra parameter; the query part contains no raw space, `#`, `+` or `[`.

### AC-3 Version and module boundary (REQ-001, REQ-002)
- `src/lib/contribute.ts` passes the UI-free module check of `tests/libBoundary.test.ts`.
- No code file under `src/` (`.ts`, `.tsx`), with comments stripped, contains a version string literal: a match for
  the regular expression ``["'`]\d+\.\d+\.\d+["'`]``. Version numbers in comments (such as the one in
  `src/lib/trends.ts`) are allowed.
- With built data: `index.json`'s `release.version` equals `release.config.json`'s `version`.

### AC-4 Platform header link (REQ-003, REQ-007)
- On `#/platform/Aand2024/P1`, the header has one link with text "Report a problem with this record", `href` equal to
  `correctionUrl("Aand2024/P1", <index version>)`, `target="_blank"` and `rel="noopener"`.

### AC-5 Evidence panel link (REQ-004, REQ-007)
- With nothing selected, and after "Show platform evidence", the evidence panel has no such link.
- After selecting module row `Aand2024/P1/M1`, step `Aand2024/P1/S1` and connection row `Aand2024/P1/E1` in turn, the
  evidence panel's link `href` equals `correctionUrl(<that id>, <index version>)`, with `target="_blank"` and
  `rel="noopener"`; after Escape the link is gone.

### AC-6 Taxonomy class link (REQ-005, REQ-007)
- On `#/taxonomy/module_type/flow_reactor`, the page has one link "Propose a mapping or change" with `href` equal to
  `taxonomyUrl("module_type", "flow_reactor")`, `target="_blank"` and `rel="noopener"`.
- On `#/taxonomy/module_type/no_such_class` (the class-not-found page), there is no such link.

### AC-7 Footer link (REQ-006, REQ-007)
- On home, `#/browse` and `#/platform/Aand2024/P1`, the footer has one link "Suggest a missing paper" with `href` equal
  to `paperUrl()`, `target="_blank"` and `rel="noopener"`, placed after the DOI link.

### AC-8 Narrow screen and regressions (REQ-008)
- At 375 × 812 px, on `#/platform/Aand2024/P1` with a module selected and on `#/taxonomy/module_type/flow_reactor`,
  `document.documentElement.scrollWidth` is at most `clientWidth`, and the new links are visible.
- `npm run typecheck` exits 0; the full Vitest suite (446 before) and Playwright suite (63 before) pass with the new
  tests added; `git diff` shows no change under `scripts/` or `public/data/`.
- The only new interface strings are the three link texts of REQ-003, REQ-005 and REQ-006 (review of the diff).

## Definition of done

AC-1 to AC-8 pass; the links are opened in a browser and their URLs read back; the SPEC is completed in sync and the
commits are pushed to the private `origin` `main`.
