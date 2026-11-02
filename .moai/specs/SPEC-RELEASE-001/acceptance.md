# Acceptance: SPEC-RELEASE-001

All runs are on branch `release-1.1.0` with `SDL_RELEASE_ZIP=/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip`.
Real-data cases read `public/data/` after `npm run build-data`, as before.

## Scenarios

### AC-1 Pinned release (REQ-001, REQ-007)
- In the same run as the suites, `sha256sum "$SDL_RELEASE_ZIP"` prints the pinned SHA-256 and `stat -c %s` prints
  2480672.
- `tests/config.test.ts` checks every REQ-001 value of `release.config.json`.
- `npm run fetch-release` verifies the bundle against the pin and `MANIFEST.sha256`; `npm run build-data` reports counts
  equal to `release.config.json`.
- `git show --stat <pin commit>` lists only `release.config.json`.

### AC-2 Release checks read the pin (REQ-002)
- `tests/release-docs.test.ts`: `release-docs.json` version and DOI equal `release.config.json`, and `data_card` starts
  with `# Data card: sdl-workflows <pinned version>`. `tests/benchmark.test.ts`: `index.release.doi` equals the pinned
  DOI. e2e: the footer shows `Data version <pinned version>` (benchmark and taxonomy specs); the trends data-card link
  and the benchmark evaluation link go to `https://doi.org/<pinned DOI>`; the benchmark spec reads the extracted release
  from `.cache/release/extract/sdl-workflows-<pinned version>/`.
- `git grep -l -e "1\.0\.0" -e 23857126 -- tests e2e` prints exactly: `tests/citation.test.ts`,
  `tests/contribute.test.ts`, `tests/derive.test.ts`, `tests/fetch-release.test.ts`,
  `tests/fixtures/release-mini/CITATION.cff`, `tests/fixtures/release-mini/DATA_CARD.md`,
  `tests/fixtures/release-mini/README.md`, `tests/fixtures/release-mini/core/release.csv`, `tests/fixtures/zip.ts`,
  `tests/release-docs.test.ts` — synthetic or fixture values only; in `tests/release-docs.test.ts` the remaining
  matches are the two fixture-release cases (expected fixture citation, version-mismatch edit).

### AC-3 Derived files stay checked against the previous release (REQ-003)
Values below were measured on the published bundle 673b2dbb… (re-pinned on 2026-11-02 after Zenodo published 1.1.0;
98ea319b… is void). Each derived file has its pinned 1.1.0 hash, and a test in `tests/release-docs.test.ts` reverts the
changes the 1.1.0 `CHANGELOG.md` names and compares the result, as `JSON.stringify`, with the 1.0.0 file without the
rows of Snapp2023 (that hash computed from the 1.0.0 build):
- Platform files: 237 files, no `Snapp2023.json`, concatenation `b4212f2b…`; reverting the seven papers' DOIs, the
  first public year of Snapp2024 (2023 back to 2024) and Snapp2023 in the `shared_with` of identity I010 gives
  `8935ce45…`.
- `benchmark-items.json` `0f12de15…`, no Snapp2023 rows; reverting the 12 Snapp2024 rows from train to test gives
  `9b4d87ab…`.
- `index.json` `a452131e…`; its `release` equals `{version: "1.1.0", released_on: "2026-11-02", doi:
  "10.5281/zenodo.23875743", taxonomy_version: "v1", license: "data: CC-BY-4.0; code: MIT"}`, its counts are 237, 279,
  1597, 2610, 1681, 1074 and 2172; reverting the DOIs and Snapp2024's year, without `release` and `counts`, gives
  `20dc3a0d…`.
- `taxonomy.json` `677615d0…`; reverting the 56 Gottstein2026 locators (`p.N` back to `pdf p.N`) and the Leong2022
  sentence, with the usage counts and examples left out, gives `2dcc668d…`.
- `benchmark.json` `585ca400…`; reverting the exclusion reason and Snapp2024's split, with the recomputed split counts,
  summaries, reference results and task figures (top-1 values, interval, test items and papers, `recorded_in`) left
  out, gives `21de595d…`.
- The fields left out are pinned by `tests/taxonomy-derive.test.ts` and `tests/benchmark-derive.test.ts`, whose values
  were re-measured on the published bundle; each change from 1.0.0 is Snapp2023's removal (a training paper: 11 module
  and 2 transfer items) or Snapp2024 moving from test to train (10 and 2 items).
- `tests/benchmark-derive.test.ts`, `tests/benchmark.test.ts` and `e2e/benchmark.spec.ts` read the expected exclusion
  reason from the extracted release's `modes/benchmark/split.csv` instead of a literal.

### AC-4 About and home text (REQ-004)
- `#/about` has the `h2` headings, in order: "How the papers were found", "How the papers were coded", "How far the
  labels can be trusted", "Timing data", "Human-intervention reporting", "Limits", "Full text".
- A Vitest case in `tests/siteText.test.ts` checks that each of these phrases appears both in the About text and,
  whitespace-normalised, in the 1.1.0 `DATA_CARD.md`, so a figure paired with the wrong words fails: "237 papers were
  eligible", "Of the 3298 screening decisions", "3239 were made by a language model working from the written
  criteria", "59 by the researcher", "340 of 2610 steps and 155 of 1681 connections", "0.905 for the unit operation of
  steps, 0.898 for module type and 0.891 for transfer mode", "0.862, 0.858 and 0.847", "454 step durations", "185
  numbers of samples one device handles in one run of a step", "233 batch sizes", "135 throughputs (91 measured in a
  campaign, 44 nominal)", "13 costs", "228 of the 237 papers have at least one value", "(57 rows)", "For the same 30
  papers as above", "1.000 for throughput (15 platforms)", "0.870 for step duration (54 steps", "95% interval 0.755 to
  0.957", "25 papers state a number", "73 name tasks people performed without a number", "51 state that the campaign
  ran without human intervention", "88 state none of these", "48 papers state a stretch of the campaign that ran
  without a person", "The 237 papers are the eligible candidates that this search found", "29 main texts are
  preprints, and 19 of them belong to papers with a journal version whose pages differ", "settled on 10 development
  papers and not changed afterwards", "midpoint of a stated range".
- The About text also contains "agreement between two models, not accuracy", "reference values are not released", "No
  second reading exists", "free-text qualifiers" and "the reference values of the timing data are not included"; the
  home intro contains "batch sizes" and "human intervention".
- The whole-number check of `tests/siteText.test.ts` passes against the 1.1.0 card, with its planted cases; the
  SPEC-SITE-001 AC-7 phrase and no-conclusion checks pass.

### AC-5 No new view, no stale release text (REQ-005)
- `git diff main -- scripts src/App.tsx src/lib/route.ts src/views/About.tsx src/views/Home.tsx` is empty;
  `public/data/` holds the same file names as a build of `main`.
- `git grep -n "1\.0\.0" -- src` prints nothing.

### AC-6 Plain-language text (REQ-008 to REQ-011)
- `git grep -n -i -w -e frozen -e "SW autonomy" -e "HW autonomy" -e "model codings" -e "On platform" -- src` prints
  nothing; the About and home text contains neither "extraction" nor "frozen".
- progress.md lists every reviewed source of visible text (`src/lib/*.ts` with site texts, `src/views/*.tsx`,
  `src/components/*.tsx`), each with the strings changed or "none found".
- Browse papers: column headers "Software autonomy" and "Hardware autonomy"; below the table one note containing "Tom
  et al. (2024)", the three software and three hardware level meanings of `SW_LABELS` and `HW_LABELS`, and the
  integration-mode definition with "mixed when several are used" and "none when no material connection is coded".
- Trends: split labels "Software autonomy" and "Hardware autonomy"; the caption for those splits contains "Tom et al.
  (2024)"; the caption for the integration-mode split contains the same integration-mode definition.
- Platform page: modules table header "Part of the platform" and the note "yes for modules of the platform, no for
  equipment outside it that the loop uses".
- Benchmark: intro contains "The labels are the codings in the release, made by a language model"; the "Excluded" line
  still equals the release's `exclusion_reason` text.

### AC-7 Suites, build, screen, branch (REQ-006, REQ-007)
- Typecheck exit 0; full Vitest and `npm run e2e` pass; `npm run build` exits 0.
- From the production build, at 1280 and 375 px, light and dark: on `#/about` all seven headings are visible and
  `scrollWidth <= clientWidth`; the same scroll check on `#/browse`, `#/trends?split=sw`, `#/platform/Aand2024/P1` and
  `#/benchmark`, where the REQ-009 to REQ-011 texts are read back; observations recorded in progress.md.
- `git push -u origin release-1.1.0`; `origin/main` still at aa10af8; repository PRIVATE; Pages API 404;
  `gh auth status` logged in, and `gh run list -R ccy5123/sdl-workflows-explorer --json createdAt` shows no run created
  after the push.
- `docs/deploy.md` gives the REQ-007 order.

## Definition of done

AC-1 to AC-7 pass; SPEC-RELEASE-001 is completed on the branch and the branch is pushed. Not merged, not deployed.
