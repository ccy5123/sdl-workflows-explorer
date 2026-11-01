---
id: SPEC-DATA-001
title: "Repository scaffold, verified build-time data pipeline and release count test"
version: "0.2.0"
status: in-progress
created: 2026-11-01
updated: 2026-11-01
author: cyjoe
priority: P1
phase: "v0.1.0 target"
module: "scripts/, src/, release.config.json"
lifecycle: spec-anchored
tags: "scaffold, data-pipeline, checksum, zenodo, counts"
tier: M
---

## HISTORY

- 2026-11-01 0.1.0 draft. Open questions of `docs/plan.md` settled with the researcher: React; two-stage
  verification (pinned zip SHA-256, then MANIFEST.sha256 per file); derived JSON not committed; repository
  `ccy5123/sdl-workflows-explorer` on the default GitHub Pages address; a benchmark view added to the plan (its
  data is derived here, the view is a later SPEC); the site shows the latest release only.
- 2026-11-01 0.2.0 revised after plan audit (FAIL 0.72): count sources tabulated (§3), MANIFEST path base and
  cache rule stated, index fields listed, benchmark figures fixed, `SDL_RELEASE_ZIP` missing-file behaviour,
  "no paper text" defined, acceptance traceability completed. Audit item on unmapped classes rejected: `unmapped`
  is one of the 6 transfer-mode classes in `modes/taxonomy/classes.csv`, and every module type, transfer mode,
  unit operation and field tag used in the graphs is one of the 69 classes (checked on the release).

## 1. Why

Step 1 of the plan's order of work. Every later view reads the JSON defined here, and the site's credibility rests
on its counts matching the release. The build therefore fetches the release from its archive, verifies it, derives
the data, and refuses to produce a site if any count differs.

## 2. Requirements (EARS)

### Configuration

- **REQ-001** (ubiquitous) The repository shall pin the release in one file, `release.config.json`, holding the
  release version (`1.0.0`), the Zenodo DOI (`10.5281/zenodo.23857126`), the record id (`23857126`), the zip file
  name (`sdl-workflows-1.0.0.zip`), its download URL
  (`https://zenodo.org/api/records/23857126/files/sdl-workflows-1.0.0.zip/content`), its SHA-256
  (`dd1d18cf2fb7978105d422b2c1e6810c0c35306511fb56491f3d05f6d997e245`), and the expected counts of §3.
- **REQ-002** (unwanted) If `release.config.json` is missing a field or a field has the wrong type or format, then
  the scripts shall stop with an error naming the field.

### Fetch and verify

- **REQ-003** (event) When `npm run fetch-release` runs and no verified extraction is cached, the system shall
  download the zip from the configured URL into `.cache/release/`.
- **REQ-004** (optional) Where the environment variable `SDL_RELEASE_ZIP` is set, the system shall use that file
  instead of downloading and verify it the same way; if the file does not exist, the system shall stop with an
  error naming the path and shall not fall back to downloading.
- **REQ-005** (unwanted) If the zip's SHA-256 differs from the pinned value, then the system shall stop with a
  non-zero exit code, print the expected and actual hashes, and leave no verified extraction.
- **REQ-006** (event) When the zip hash matches, the system shall extract the archive and check every file listed
  in `MANIFEST.sha256` against its listed SHA-256. Listed paths are resolved against the directory that contains
  `MANIFEST.sha256` (the archive's top folder `sdl-workflows-1.0.0/`). `MANIFEST.sha256` itself is exempt. A file
  present in the archive but not listed fails the check, and so does any archive entry outside the top folder.
- **REQ-007** (unwanted) If any listed file is missing or its hash differs, or an archive entry has an absolute path
  or a `..` segment, then the system shall stop with a non-zero exit code naming the file, without writing outside
  the extraction directory.
- **REQ-008** (state) While `.cache/release/` holds an extraction whose marker file records the pinned version and
  zip SHA-256, the system shall reuse it without downloading, and shall re-run the MANIFEST check of REQ-006 on
  every reuse; a failed re-check discards the cache and stops with an error.

### Derive

- **REQ-009** (event) When `npm run build-data` runs on a verified release, the system shall write to
  `public/data/`:
  - `index.json`:
    - `release`: version, released date, DOI, taxonomy version, license (from `core/release.csv`);
    - `counts`: the seven counts of §3;
    - `papers` (238 rows): `paper_id`, `doi`, `title`, `venue`, `first_public_year`, `field_tags`,
      `integration_mode`, `sw_autonomy`, `hw_autonomy`, `hardware_location`, `n_platforms` (from
      `modes/trends/papers.csv`);
    - `platforms` (280 rows): `platform_id`, `paper_id`, `platform_name`, `first_public_year`, `field_tags`,
      `commercial_integrated`, `identity_id`, `n_modules`, `n_steps`, `module_types`,
      `material_transfer_modes` (from `modes/builder/platforms.csv`);
  - `platforms/<paper_id>.json` (238 files): the paper's platforms from `modes/builder/platform_graphs.jsonl`
    with modules, steps, connections and every evidence object (`doc`, `page`, `locator`), plus `campaigns`
    (from `modes/builder/platforms.csv`) and `shared_with`: the other paper ids whose platforms carry the same
    `identity_id`;
  - `taxonomy.json`: the 69 classes (`class_kind`, `class`, `family`, `definition`), the correspondence rows with
    each vocabulary column and its `_source` column (from `modes/taxonomy/`), and per class the number of items
    using it (modules for module types, connections for transfer modes, steps for unit operations, papers for
    field tags);
  - `benchmark.json`: the two task definitions (`modes/benchmark/tasks/*.json`), the paper counts of
    `modes/benchmark/split.csv` by split (train 135, test 99, excluded 4), and `reference_results.json` as
    published (including each task's `n_test_items` and `n_test_papers`).
- **REQ-010** (ubiquitous) The derived JSON shall contain only values present in the public release and the counts
  computed from them; it shall contain no full text or abstracts of papers (titles and venues as published in the
  release are allowed).
- **REQ-011** (unwanted) If any count computed from the derived JSON differs from its expected value in
  `release.config.json`, or any expected value differs from its release source in §3, then `build-data` shall exit
  non-zero and list each differing count with expected and actual values.
- **REQ-012** (ubiquitous) `npm run build` shall run fetch, derive and `vite build` in that order and stop at the
  first failure, so a release that fails verification or the count check never produces `dist/`.

### Scaffold

- **REQ-013** (ubiquitous) The repository shall use Vite, TypeScript in strict mode, React 18 and Vitest; `npm test`
  shall run the test suite; `npm run typecheck` shall pass with no errors.
- **REQ-014** (ubiquitous) `public/data/` and `.cache/` shall be git-ignored.
- **REQ-015** (event) When the built site loads, it shall read `data/index.json` and show the counts table and a
  footer with the data version and the DOI link.

## 3. Count sources

| Count | Expected | Computed from derived JSON | Release source it must also equal |
|---|---|---|---|
| papers | 238 | `index.json` `papers` rows; files in `platforms/` | rows of `core/paper.csv` |
| platforms | 280 | `index.json` `platforms` rows; platforms across `platforms/*.json` | rows of `core/platform.csv` |
| modules | 1603 | modules across `platforms/*.json` | rows of `core/module.csv` |
| steps | 2621 | steps across `platforms/*.json` | rows of `core/step.csv` |
| connections | 1687 | connections across `platforms/*.json` | rows of `core/connection.csv` |
| material connections | 1076 | connections with `is_material = true` | `core/connection.csv` rows whose `transfer_mode` has `is_material = 1` in `core/transfer_mode.csv` |
| candidates | 2172 | `index.json` `counts.candidates`, counted from `modes/trends/candidates.csv` | rows of `core/candidate.csv` |

## 4. How

Plain Node scripts run with `tsx`; pure functions in `scripts/lib/` carry the logic so unit tests exercise them
without network or the real release. Details in `plan.md`.

## 5. Out of scope

### Out of Scope — views and deployment

Views (platform viewer, browser, trends, taxonomy, benchmark), routing, styling beyond a readable default, GitHub
Actions and Pages deployment.

### Out of Scope — repository actions

Creating the GitHub repository, commits and pushes (each needs the researcher's explicit approval).

## 6. Acceptance

See `acceptance.md`.
