---
id: SPEC-RELEASE-001
title: "Pin the explorer to data release 1.1.0 on a branch, with a plain-language pass over the site text"
version: "0.4.0"
status: draft
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P1
phase: "v0.9.0 target"
module: "release.config.json, src/lib/, src/views/, tests/, e2e/, docs/deploy.md"
lifecycle: spec-anchored
tags: "release, data card, about, re-baseline, 1.1.0, plain language"
tier: M
depends_on: [SPEC-SITE-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. The researcher decided the site goes public together with sdl-workflows 1.1.0 (Zenodo
  record 23875743, still a draft on 2026-11-02). This SPEC prepares the switch on branch `release-1.1.0` from the
  local bundle; merging into `main` and deploying are later steps, each needing the researcher's approval.
- 2026-11-02 0.2.0 after plan audit 1 (FAIL 0.78) and two changes from the orchestrating session. The bundle was
  rebuilt after a vocabulary audit of the release documents: pin SHA-256 `b1d35a52…` (2,483,740 bytes); only document
  text changed (data card lines 47-48, 115-116, 138, 143-146); data and derived files measured unchanged again. The
  pin is one separate, provisional commit, redone if the bundle changes again before Zenodo publishes. A
  plain-language rule now covers all visible site text (REQ-008); the orchestrating session's six findings are
  REQ-008 to REQ-011 (its item 5 is bundle text and stays). Audit fixes: suites as a `shall` (REQ-007); exact grep
  for leftover 1.0.0 text in tests (AC-2); the Timing paragraph states the three permitted calculations; every About
  figure is pinned by its phrase (AC-4); screen-check pass conditions (AC-7); `docs/deploy.md` follows the new order.
- 2026-11-02 0.3.0 after plan audit 2 (FAIL 0.87): the release export was rewritten after the pinned zip with changes
  to data tables (benchmark exclusion reason, correspondence locators), so REQ-003 now keeps files identical to 1.0.0
  except where the 1.1.0 CHANGELOG names a change (new hash plus a check that only the named values differ), tests
  read changed release values from the release, and run-phase work waits for the final bundle (plan §B step 0).
  REQ-008 and REQ-011 obligations written with "shall"; REQ-008 gets a reviewed-sources list (AC-6); "once per
  paper"; the workflow check reads `createdAt` after the push.
- 2026-11-02 0.4.0 on the final bundle (sdl-db ae25d90): SHA-256 `98ea319b…`, 2,484,010 bytes, MD5 `ee6c2e45…`, the
  file held by Zenodo draft 23875743; `b77dacc2…` and `b1d35a52…` are void. Re-measured: `taxonomy.json` and
  `benchmark.json` change, every other derived file is as in 1.0.0 (AC-3). Besides the two CHANGELOG items, the
  release README's sources table adds one sentence to the Leong2022 reference, which reaches `taxonomy.json`; REQ-003
  names it.

## 1. Why

The manuscript cites data release 1.1.0, and the site is to be published with it. 1.1.0 keeps every table the site
reads and adds timing data and human-intervention reporting; its data card describes both and changes what is listed
as not included. The site must pin 1.1.0, show it, and describe it in the data card's own terms, with the tests
checking the new release. Readers outside the project must also be able to read every label and note without
knowing the project's working vocabulary.

## 2. Requirements (EARS)

### Release pin and tests

- **REQ-001** (ubiquitous) `release.config.json` on branch `release-1.1.0` shall pin version `1.1.0`, DOI
  `10.5281/zenodo.23875743`, record id `23875743`, file name `sdl-workflows-1.1.0.zip`, URL
  `https://zenodo.org/api/records/23875743/files/sdl-workflows-1.1.0.zip/content`, SHA-256
  `98ea319bb1884c2b2404a818504580a529fc4b8dd02d01f7712c84ee60a2d357` and the unchanged counts (238, 280, 1603, 2621,
  1687, 1076, 2172), in a commit that changes only this file.
- **REQ-002** (ubiquitous) Tests that pinned release 1.0.0 shall check release 1.1.0: the config test shall check the
  REQ-001 values; tests and e2e specs that compare the site with the pinned release (footer data version, release DOI,
  path of the extracted release, describe names and skip messages naming the release) shall take the expected values
  from `release.config.json` or name "the pinned release" instead of a version literal.
- **REQ-003** (ubiquitous) The derived-file checks shall keep checking what did not change: every derived file
  (`index.json` without its `release` object, `taxonomy.json`, `benchmark.json`, `benchmark-items.json`, the platform
  files) shall stay identical to 1.0.0 except where the 1.1.0 release documents a change — the two `CHANGELOG.md`
  items (benchmark exclusion reason; Gottstein2026 locators `pdf p.N` → `p.N`) and the Leong2022 reference sentence of
  the README's sources table; a file that changes shall get its new pinned hash plus a check that only those values
  differ from 1.0.0; the `release` object shall equal
  the 1.1.0 release metadata; tests that show a value the release changed (such as the benchmark exclusion reason)
  shall read it from the release instead of a literal. No check shall be deleted.

### About and home text (extends SPEC-SITE-001 REQ-005 to REQ-007)

- **REQ-004** (ubiquitous) The About summary shall match the 1.1.0 data card: a "Timing data" and a
  "Human-intervention reporting" section of one paragraph each, with their counts and agreement figures from the card;
  the three calculations the timing instructions allowed; the timing agreement figures stated as agreement between two
  models, not accuracy, with the reference values not released; that the human-intervention reading has no second
  reading to compare with; and the list of what is not included as the card gives it. The home intro shall say that
  the release also holds the stated times, batch sizes, throughput and cost, and what papers state about human
  intervention. Every number shall appear as a whole number in the 1.1.0 `DATA_CARD.md` or come from `index.json`.
- **REQ-005** (unwanted) The change shall add no view, route or derived file for the new tables; shall not change
  `scripts/`; and no site text or code comment under `src/` shall name release 1.0.0 as the current release.

### Plain-language site text

- **REQ-008** (ubiquitous) Every text a visitor can see (page text, headings, table headers, notes, tooltips, link
  labels, the About summary, error messages) shall use no word whose meaning exists only in the project's working
  sessions: no variant labels, item or requirement numbers, words for the project's own machinery, coined shorthand,
  status words (such as "frozen") or file names used as concepts. Field vocabulary (SDL, CSV, DOI, micro-F1) and the
  dataset's released class names shall stay. The About summary shall say the instructions were "settled on 10
  development papers and not changed afterwards", as the rebuilt card does; the new paragraphs shall say the model
  "extracted" values and "read" statements, without naming the process as an "extraction". Every source of visible
  text (`src/lib/*.ts` texts, `src/views/*.tsx`, `src/components/*.tsx`) shall be reviewed and the result listed in
  progress.md: the strings changed, or "none found".
- **REQ-009** (ubiquitous) Software and hardware autonomy shall be written out in full everywhere (Browse column
  headers, Trends split labels). Under the Browse paper table, one note shall say that the levels are the software and
  hardware autonomy categories of Tom et al. (2024) and give each level's meaning from the data dictionary; when
  Trends is split by software or hardware autonomy, its caption shall name Tom et al. (2024) (the legend already gives
  each level's meaning).
- **REQ-010** (ubiquitous) The same Browse note, and the Trends caption when split by integration mode, shall define
  integration mode from the data dictionary: how material moves between the modules of a paper's platforms — the one
  material transfer mode used (which may be unmapped), mixed when several are used, none when no material connection
  is coded.
- **REQ-011** (ubiquitous) The platform page's module table column "On platform" shall be headed "Part of the
  platform", with a note under the table: yes for modules of the platform, no for equipment outside it that the loop
  uses. The benchmark intro shall read "The labels are the codings in the release, made by a language model, so top-1
  accuracy measures agreement with those codings." The benchmark's "Excluded" line shall keep showing the release's own
  `exclusion_reason` text; in the final 1.1.0 release that text already reads "one of the 10 development papers of the
  coding instructions", so the orchestrating session's finding 5 is settled in the release.

### Suites, branch and deployment notes

- **REQ-006** (unwanted) The branch shall not be merged into `main`; the repository shall not be made public, Pages
  shall not be enabled and no workflow shall be run.
- **REQ-007** (ubiquitous) Typecheck, Vitest, Playwright and the Pages build shall pass with `SDL_RELEASE_ZIP` set to
  the local 1.1.0 bundle, after `sha256sum` of that bundle has been checked against the pin in the same run; the
  branch shall be pushed to the private origin; `docs/deploy.md` shall give the order that now applies: check the
  published Zenodo file against the pin (if it differs: re-pin, re-run the plan §A measurements and the REQ-003
  baselines), get approval to merge, merge, then the public, Pages and workflow steps.

### Existing tests that change

The edits REQ-002 to REQ-004 and REQ-009 to REQ-011 require, and nothing else: `tests/config.test.ts`,
`tests/release-docs.test.ts`, `tests/benchmark-derive.test.ts`, `tests/benchmark.test.ts`, `tests/release.test.ts`,
`tests/taxonomy-derive.test.ts`, `tests/trends.test.ts` (captions), `tests/siteText.test.ts` (phrase case),
`e2e/benchmark.spec.ts`, `e2e/taxonomy.spec.ts`, `e2e/trends.spec.ts` (split labels, data-card link),
`e2e/site.spec.ts` (About checks), `e2e/browse.spec.ts` (autonomy headers and note), `e2e/viewer.spec.ts` (module
table header and note).

## 3. Out of scope

### Out of Scope — release and deployment

- Publishing on Zenodo, merging into `main`, deploying, making the repository public, step 8 of `docs/plan.md`.
- `docs/plan.md`, the approved planning record, is not rewritten.
- Nothing in `~/research/sdl-db` is edited; bundle-side wording is reported to the orchestrating session, not changed
  here.

### Out of Scope — new data

- Views, routes or derived JSON for `step_timing`, `process_value` and `human_intervention`.

## 4. Acceptance

See `acceptance.md`.
