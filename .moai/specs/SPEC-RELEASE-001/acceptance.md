# Acceptance: SPEC-RELEASE-001

All runs are on branch `release-1.1.0` with `SDL_RELEASE_ZIP=/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip`.
Real-data cases read `public/data/` after `npm run build-data`, as before.

## Scenarios

### AC-1 Pinned release (REQ-001, REQ-007)
- In the same run as the suites, `sha256sum "$SDL_RELEASE_ZIP"` prints the pinned SHA-256 and `stat -c %s` prints
  2484010.
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

### AC-3 Unchanged files stay checked (REQ-003)
Values below were measured on the final bundle 98ea319b…; if the bundle is ever re-pinned, they are re-measured.
- Unchanged, with their 1.0.0 hashes (SPEC-SITE-001 progress.md §E.1), checked in `tests/release-docs.test.ts` and
  `tests/benchmark-derive.test.ts`: `benchmark-items.json` (7a709c16…) and the 238 platform files (9001ca64…).
- `taxonomy.json` hashes to `f4b111b046402fcb332050a67bc19ff9126dc82003b1e5c1e71e9fbdcd392537`, and differs from 1.0.0
  in exactly 57 values: 56 correspondence source `page` values, each `p.N` where 1.0.0 had `pdf p.N` (all Gottstein2026
  rows), and the Leong2022 `reference` in `sources`, which is the 1.0.0 text followed by ". The locators Proposal,
  CS1–CS3 and FW1–FW3 are the paper's own section heading and labels of its case studies and future-work examples". A
  test reverts these values and compares the result with the 1.0.0 file by its hash (e33f52e3…).
- `benchmark.json` hashes to `bbf945aa945885c420729fc76518040994d72ee8900931af4ae120209b39828e`, and differs from
  1.0.0 only in `exclusion_reasons[0].reason` ("one of the 10 development papers of the coding instructions" instead of
  "used to develop the extraction instructions"); a test reverts it and compares with the 1.0.0 hash (4ca73f0e…).
- `index.json` without its `release` object hashes (as `JSON.stringify`) to
  `76908d5a24205c4878684f109585156fdfd394db0e6540478ec3df14a3a4b856` (the 1.0.0 value), its `release` equals
  `{version: "1.1.0", released_on: "2026-11-02", doi: "10.5281/zenodo.23875743", taxonomy_version: "v1", license:
  "data: CC-BY-4.0; code: MIT"}`, and the whole file hashes to
  `464b1c6dce9f30f39a89c2f3ac5f32b9d7d0d688d0e9c926a4c7715543a21064`.
- `tests/benchmark-derive.test.ts`, `tests/benchmark.test.ts` and `e2e/benchmark.spec.ts` read the expected exclusion
  reason from the extracted release's `modes/benchmark/split.csv` instead of a literal.

### AC-4 About and home text (REQ-004)
- `#/about` has the `h2` headings, in order: "How the papers were found", "How the papers were coded", "How far the
  labels can be trusted", "Timing data", "Human-intervention reporting", "Limits", "Full text".
- A Vitest case in `tests/siteText.test.ts` checks that each of these phrases appears both in the About text and,
  whitespace-normalised, in the 1.1.0 `DATA_CARD.md`, so a figure paired with the wrong words fails: "455 step
  durations", "186 numbers of samples one device handles in one run of a step", "234 batch sizes", "136 throughputs (92
  measured in a campaign, 44 nominal)", "13 costs", "229 of the 238 papers have at least one value", "(57 rows)", "For
  the same 30 papers as above", "1.000 for throughput (15 platforms)", "0.870 for step duration (54 steps", "95%
  interval 0.755 to 0.957", "26 papers state a number", "73 name tasks people performed without a number", "51 state
  that the campaign ran without human intervention", "88 state none of these", "48 papers state a stretch of the
  campaign that ran without a person", "settled on 10 development papers and not changed afterwards", "midpoint of a
  stated range".
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
