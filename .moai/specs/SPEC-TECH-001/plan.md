# Plan: SPEC-TECH-001

## A. Context

Depends on SPEC-DATA-001 (build-data), SPEC-BROWSE-001 and SPEC-TRENDS-001 (filters and text search), SPEC-UI-001
(Home search) and the MCP package in `mcp/`. TDD. The release under `.cache/release/` is read-only; the new files are
an explorer-side layer in `data-overlay/`. One short feature branch, fast-forwarded into `main`.

## B. Order of work

1. **Vocabulary** (`data-overlay/techniques.json`) with the §4 list, and the normalisation and "alias occurs in" rules
   in `src/lib/techniqueSearch.ts`, unit-tested on the examples of spec §2. Check the vocabulary for aliases that
   collide after normalisation.
2. **Evaluation set first** (REQ-013): a subagent pass reads the stated names for each query family and writes the
   expected platform sets to `tests/fixtures/technique-queries.json`, before any tag exists. A baseline report of
   today's search on that set is written to `evaluation.md`.
3. **Tag table**: `npm run list-untagged` (new, `scripts/list-untagged.ts`) prints every module that REQ-003 (d)
   requires, with its type and stated name. Subagents (`model: opus`) classify them in batches against the vocabulary
   definitions, unclear names → `none`, names that fit no technique listed separately for the researcher. Merge into
   `data-overlay/module-techniques.csv`. Commit the table with the vocabulary.
4. **Build checks and outputs** (REQ-003, REQ-004) in `scripts/lib/techniques.ts`, called from `deriveAll` so the MCP
   derives the same files; fixture tests in `tests/fixtures/release-mini/` for each failure (a) to (e). `index.json`
   tests unchanged; MCP byte-equality test extended to `techniques.json` and the new `search.json`.
5. **Matching function** (REQ-005, REQ-006) in `src/lib/techniqueSearch.ts`; added to `tests/libBoundary.test.ts`.
   Rewire `platformFilter.searchPlatforms`, `filterApply.matchingPapers` / `matchingPlatforms` and the MCP's
   `textSearch` / `matchedModules` to it; remove the MCP's own short-word and capitals rules.
6. **Site** (REQ-007, REQ-008): expansion line and quote button on Home and Browse; reasons with module id and
   evidence; suggestions; technique filter group, `tech` / `techMatch` in `filterState.ts` and `filterUrl.ts`.
7. **SPEC amendments**: SPEC-BROWSE-001 (REQ-005 text-search rule, §3 parameters, counts) and SPEC-TRENDS-001
   (`expected-counts.mjs` reads the same overlay through the shared function's rule); record the new counts in their
   HISTORY and acceptance, with the reason for each change.
8. **MCP** (REQ-010): filter, fields, `list_vocabulary` kind, notes and instructions; bundle the overlay; version
   0.2.0; README.
9. **Chat pages** (REQ-011) and the REQ-009 sentence everywhere tags appear.
10. **Evaluation** (REQ-013): run the comparison, write `evaluation.md` with per-query recall, precision, gains and
    losses for today's and the new search.
11. Full checks: site typecheck, Vitest, e2e; MCP typecheck and Vitest; a fresh manual MCP check session with the
    question set (`mcp/tests/questions.md` regenerated: the FT-IR question now expects one search).

## C. Publishing (each needs the researcher's approval)

Push `main`; Pages run (`gh workflow run pages.yml --ref main`); `npm publish` of 0.2.0 (staged, approved on
npmjs.com).

## D. Risks

- The table is the language model's reading of each stated name; a wrong tag makes the search wrong in the same way
  everywhere. Mitigation: the reasons show the stated name and evidence, the evaluation set is written independently,
  and REQ-009 says how the tags were made.
- `search.json` grows with module ids and evidence; its size before and after is reported in `progress.md`.
- Browse URLs with `tech` must wait for `techniques.json`; REQ-008 keeps the value instead of dropping it.
