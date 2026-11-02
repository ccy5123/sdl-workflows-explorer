# Research: SPEC-SITE-001

Codebase and release facts the plan rests on (read on 2026-11-02 at HEAD 69d2dc7).

## Release files

- `CITATION.cff` (release 1.0.0): `cff-version`, `message`, `type: dataset`, `title`, `version: "1.0.0"`,
  `date-released: "2026-11-01"`, `license: CC-BY-4.0`, `doi: "10.5281/zenodo.23857126"`, and one author with
  `family-names`, `given-names`, `affiliation`, `email`, `orcid`. Only flat `key: value` lines and one `authors` list
  of maps: a small strict parser is enough; no YAML dependency is needed.
- `DATA_CARD.md` (124 lines): sections "What the data record", "How the papers were found", "How the papers were
  coded", "How far the labels can be trusted", "Benchmark chrono2023", "Limitations", "Not included", "Versions and
  corrections". Its own limits, quoted for REQ-006: "This is agreement between two models, not accuracy against
  human coding; the release contains no human coding"; "The 238 papers are the eligible candidates that this search
  found, not every closed-loop SDL paper published"; 3240 of 3298 screening decisions by a language model.
- Both files are inside the zip and listed in `MANIFEST.sha256`, so `fetch-release` already verifies them.
- `tests/fixtures/release-mini` has neither file; the fixture needs both.

## Site

- Routing: `src/lib/route.ts` (`parseRoute`, pure); `App.tsx` renders by `route.kind`; nav has Home, Browse, Trends,
  Taxonomy, Benchmark. No `about` route.
- `Home.tsx` today: counts table (`table.counts`) and the filterable platform list (`[data-table="platforms"]`), which
  is the main way into the platform viewer; e2e tests in `browse.spec.ts`, `viewer.spec.ts`, `trends.spec.ts` and
  `taxonomy.spec.ts` use both. Both stay, with their selectors.
- Footer: data version, DOI link, "Suggest a missing paper" (SPEC-CONTRIB-001).
- Styles: one `src/styles.css` (863 lines) with light tokens on `:root` (`--text`, `--muted`, `--line`, `--panel`,
  `--accent`) and a body background `#ffffff`; `:focus-visible` outline 3px accent already exists. The trends chart
  tokens have a dark set under `:root[data-theme="dark"]` that nothing switches on yet ("waits for the site-wide
  theme switch"); `tests/chartTokens.test.ts` keeps CSS and `CHART_TOKENS` equal.
- Graph: `graphElements.buildStylesheet()` hard-codes light colours (`#1f2328` labels, `#ffffff` label background,
  `#f6f8fa` boundary); module-group and transfer-mode colours are Okabe–Ito in `moduleGroups.ts`, `unmapped` is
  `#000000` (invisible on a dark background).
- Tables: `table.data` (browse, home), `.counts`, `.taxo-table` and `.bench-table` (stacked below 800 px), compare
  tables, trends count tables. `.taxonomy` sets `overflow-wrap: anywhere`, which lets words split mid-word; the
  benchmark view already overrides this in its table cells (SPEC-BENCH-001 fix 5c9573c) but the taxonomy tables do
  not — the cause of the "Relatio|n" break the researcher saw.
- `vite.config.ts`: `base: "./"`. Playwright serves `dist-e2e` at port 4317 with `baseURL` at the origin root; every
  spec uses `page.goto("/#/...")`, so changing the e2e base would mean editing every spec.
- `.github/workflows/` has only `label-sync.yml`. The `gh` token has the `workflow` scope, so the new workflow file
  can be pushed.
- `src/lib/*` must stay UI-free (`tests/libBoundary.test.ts`: no React, no `window`/`document`).

## Environment

- The repository is on a WSL path reached as a UNC path from Windows; earlier steps found that subagent worktree
  isolation fails there, so earlier runs were done by the orchestrating session directly.
- The pre-commit hook runs the full Vitest suite, so a commit whose tests need a later file is refused.
