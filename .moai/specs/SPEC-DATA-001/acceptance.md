# Acceptance: SPEC-DATA-001

Unit tests (AC-2 to AC-9) use small fixtures and no network. AC-1, AC-10 and AC-12 need the real release, from
`.cache/release/` or `SDL_RELEASE_ZIP`.

## Scenarios

### AC-1 Release counts reproduced (REQ-009, REQ-011, spec §3)
- Given the verified 1.0.0 release,
- When `npm run build-data` runs,
- Then it exits 0, and the count test reports papers 238, platforms 280, modules 1603, steps 2621,
  connections 1687, material connections 1076, candidates 2172, each equal to `release.config.json` and to its
  release source in spec §3.

### AC-2 Count mismatch fails (REQ-011)
- Given derived data with one platform removed (fixture),
- When the count check runs,
- Then it fails and names `platforms` with expected 280 and actual 279.

### AC-3 Tampered zip refused (REQ-005, REQ-012)
- Given a zip whose SHA-256 differs from the pinned value,
- When the fetch step verifies it,
- Then it stops with a non-zero exit, prints both hashes, and leaves no verified extraction (no marker file).

### AC-4 MANIFEST check (REQ-006, REQ-007)
- Given an extracted fixture directory and its `MANIFEST.sha256`,
- Then verification passes when all listed files match; fails naming the file when one file's bytes differ, when a
  listed file is missing, or when an unlisted file is present; and does not require `MANIFEST.sha256` to list
  itself.

### AC-5 Unsafe archive path refused (REQ-007)
- Given a zip with an entry `../evil.txt`, `/abs.txt`, or `other/x.txt` outside the top folder (fixture),
- When extraction runs,
- Then it fails and no file is written outside the extraction directory.

### AC-6 Config validation (REQ-001, REQ-002)
- Given the repository's `release.config.json`, loading succeeds and returns version `1.0.0`, the pinned SHA-256
  and the seven expected counts.
- Given a copy with a malformed `sha256` (not 64 hex characters) or a missing `counts.modules`,
- Then loading fails with an error naming that field.

### AC-7 Download path and cache reuse (REQ-003, REQ-008)
- Given an empty cache and a stubbed `fetch` that serves the fixture zip (with the fixture's hash pinned),
- When the fetch step runs, Then it calls `fetch` once with the configured URL, verifies, extracts, and writes a
  marker recording version and SHA-256.
- When it runs a second time, Then `fetch` is not called and the MANIFEST check runs again.
- Given a cached extraction with one file altered, When the fetch step runs, Then it fails naming the file.

### AC-8 Local zip override (REQ-004)
- Given `SDL_RELEASE_ZIP` pointing to the fixture zip, Then it is verified and extracted without calling `fetch`.
- Given `SDL_RELEASE_ZIP` pointing to a missing path, Then the step fails naming the path and does not call `fetch`.

### AC-9 Derivation on a fixture release (REQ-009, REQ-010)
- Given a two-paper fixture release in the release's file layout,
- Then `index.json` holds exactly the listed fields per row; each `platforms/<paper_id>.json` carries modules, steps,
  connections with evidence objects, `campaigns` and `shared_with`; taxonomy usage counts equal the fixture's item
  counts; and no derived value contains a field outside the lists in REQ-009 (no abstract or text field).

### AC-10 Derived content shape on the real release (REQ-009)
- Given the derived data from the real release,
- Then `index.json` has 238 paper rows and 280 platform rows; `platforms/` has 238 files; every module, step and
  connection carries an evidence object with `doc`; `taxonomy.json` has 69 classes (10 field tags, 22 module types,
  6 transfer modes, 31 unit operations) and the usage counts per kind sum to 270 field-tag assignments (rows of `core/paper_field_tag.csv`), 1603
  modules, 1687 connections and 2621 steps; `benchmark.json` has 2 tasks, split counts train 135 / test 99 /
  excluded 4, and reference results with `n_test_papers` 99 (module_type) and 93 (transfer_mode).

### AC-11 Ignore rules (REQ-014)
- `git check-ignore public/data .cache` prints both paths.

### AC-12 Scaffold and build (REQ-012, REQ-013, REQ-015)
- `npm test` passes; `npm run typecheck` passes; `npm run build` produces `dist/` with `dist/data/index.json`.
- With `SDL_RELEASE_ZIP` pointing to a file whose hash differs, `npm run build` exits non-zero and creates no `dist/`.
- The built page, opened in a browser, shows the counts table and a footer with version 1.0.0 and the DOI link.

## Quality gates

- Coverage of `scripts/lib/` at least 85% (Vitest v8 coverage).
- `npm run typecheck` with zero errors.
