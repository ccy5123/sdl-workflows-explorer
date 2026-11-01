# Progress: SPEC-DATA-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-01
- plan-auditor: iteration 1 FAIL 0.72 (10 defects; defect 7 rejected with evidence, withdrawn by auditor);
  iteration 2 PASS 0.88 (Tier M threshold 0.80); 3 minor follow-ups applied (field-tag sum 270, entries outside
  the top folder fail, download URL risk noted); optional REQ-004 split not applied.
- Implementation Kickoff Approval: approved by the researcher on 2026-11-01.

## §F Phase 4 Mode Selection

- Input parameters: tier M; ~20 new files; domains: build scripts, React scaffold, tests (TypeScript only);
  concurrency benefit LOW (coding-heavy, files depend on shared types).
- direct: not selected (multi-file implementation).
- serial: selected (coding-heavy; one write-capable agent at a time).
- fanout: not selected (not research; shared types create file dependencies).
- sweep: not selected (not a uniform mechanical transform).
- Decision: serial (one manager-develop, cycle_type=tdd).
- Justification: new code across interdependent files; sequential TDD is the safe default for coding work.

## §E.2 Run-phase Evidence

- run_at: 2026-11-01 (manager-develop, cycle_type=tdd, in place; no commits)
- Environment: WSL Ubuntu, Node 20.19.6, npm 10.8.2; vite 5.4.21, vitest 2.1.9, typescript 5.9.3, react 18.3.1.

| AC | Command | Actual output | Status |
|---|---|---|---|
| AC-1 | `npm run build-data` after a verified fetch; `npm test` (tests/release.test.ts) | build-data exit 0; derived / release source / expected: papers 238, platforms 280, modules 1603, steps 2621, connections 1687, material_connections 1076, candidates 2172 | PASS |
| AC-2 | `npm test` (counts.test.ts, release.test.ts) | real release: `{ name: "platforms", expected: 280, actual: 279, source: "index.json platforms rows" }`; fixture: `platforms: expected 3, actual 2` | PASS |
| AC-3 | `npm test` (fetch-release.test.ts, "tampered zip") | error prints `expected <pinned>` and `actual <other>`; no marker, no extract/ | PASS |
| AC-4 | `npm test` (checksum.test.ts) | passes without self-listing; fails naming changed, missing and unlisted files | PASS |
| AC-5 | `npm test` (extract.test.ts) | `../evil.txt`, `/abs.txt`, `other/x.txt`, nested `..`, backslash and drive-letter entries refused; destination not created | PASS |
| AC-6 | `npm test` (config.test.ts) | repository config loads (1.0.0, pinned sha256, 7 counts); malformed `sha256` and missing `counts.modules` named | PASS |
| AC-7 | `npm test` (fetch-release.test.ts, global fetch stubbed) | fetch called once with config.url; marker `{version, sha256}`; second run: no fetch, `MANIFEST verified (3 files)`; altered cached file named, cache discarded | PASS |
| AC-8 | `npm test` (fetch-release.test.ts) | local zip verified without fetch; missing path named, fetch not called | PASS |
| AC-9 | `npm test` (derive.test.ts on tests/fixtures/release-mini) | exact field lists per row and object; campaigns and shared_with; taxonomy usage equals fixture items; no `abstract` in output | PASS |
| AC-10 | `npm test` (release.test.ts) | 238 paper rows, 280 platform rows, 238 files; evidence.doc on all 5911 items; 69 classes (10/22/6/31); usage sums 270/1603/1687/2621; split 135/99/4; n_test_papers 99/93 | PASS |
| AC-11 | `git check-ignore public/data .cache` | prints `public/data` and `.cache` (exit 0) | PASS |
| AC-12 | `npm test`; `npm run typecheck`; `npm run build` three times; browser | 70/70 tests; tsc exit 0; build with local zip exit 0 and `dist/data/index.json` present; build after `rm -rf .cache` without SDL_RELEASE_ZIP downloaded from Zenodo (sha256 dd1d18cf..., md5 be20a321...) exit 0; build with a different-hash zip exit 1 and `ls dist` reports no such file; built page (vite preview) shows the counts table and footer `Data version 1.0.0 · doi:10.5281/zenodo.23857126` linking to https://doi.org/10.5281/zenodo.23857126 | PASS |

Quality gates: scripts/lib coverage 100% lines, 96.41% branches (v8); `npm run typecheck` 0 errors.

Run-phase findings:
- The Zenodo URL in release.config.json is correct. Node's fetch needed two transport fixes in
  scripts/fetch-release.ts: a descriptive User-Agent (Zenodo answers 403 "unusual traffic" to the default `node`
  agent) and a 2 s per-address connect timeout (Node 20 tries each address for 250 ms; every attempt timed out on
  this route, while curl succeeded).
- `campaigns` is free text (data_dictionary.csv: "Coder's summary"), not a list, and is carried as a string.
  `field_tags` are ';'-separated; `module_types` and `material_transfer_modes` are ','-separated.
- When SDL_RELEASE_ZIP is set it takes precedence over the cache, and a hash mismatch discards any earlier verified
  extraction (REQ-005, "leave no verified extraction").
- `npm audit`: csv-parse 5.6.0 has a moderate advisory (GHSA-8cw4-87c7-c6xx, prototype replacement via `columns`);
  its input here is hash-verified release data. The dev-only chain (vite 5, vitest 2, esbuild) reports further
  advisories; the fixes need major upgrades and were not applied.

Verbatim tails:

```
$ npm run build   # .cache deleted, SDL_RELEASE_ZIP unset
downloading https://zenodo.org/api/records/23857126/files/sdl-workflows-1.0.0.zip/content
zip SHA-256 verified (dd1d18cf2fb7978105d422b2c1e6810c0c35306511fb56491f3d05f6d997e245)
MANIFEST verified (79 files)
verified release 1.0.0 at .cache/release/extract/sdl-workflows-1.0.0
derived release 1.0.0 into public/data; counts match release.config.json:
  papers                 238
  platforms              280
  modules                1603
  steps                  2621
  connections            1687
  material_connections   1076
  candidates             2172
dist/index.html                  0.33 kB │ gzip:  0.24 kB
dist/assets/index-B_-jijIM.js  144.15 kB │ gzip: 46.60 kB
✓ built in 961ms
BUILD2_EXIT=0

$ SDL_RELEASE_ZIP=/tmp/.../bad.zip npm run build   # dist deleted first
fetch-release failed: SHA-256 mismatch for sdl-workflows-1.0.0.zip:
  expected dd1d18cf2fb7978105d422b2c1e6810c0c35306511fb56491f3d05f6d997e245
  actual 5539f3ea9b1d3803cde97485d2adad83a4e21b53b2696b1d009ab353e80d32b5
BUILD3_EXIT=1
ls: cannot access 'dist': No such file or directory

$ npm test
 Test Files  8 passed (8)
      Tests  70 passed (70)

$ npm run typecheck
> tsc --noEmit
TYPECHECK_EXIT=0
```

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-01
- Implementation commit: c64fd27 (pushed to the private remote github.com/ccy5123/sdl-workflows-explorer, main).
- Orchestrator re-verification before commit: 70/70 tests, count test equal across derived, release and config,
  typecheck 0 errors, scripts/lib 100% lines / 96.41% branches, local build exit 0, built page checked in a browser.
- Docs: project docs in .moai/project/ and docs/plan.md are current; no README yet (planned for step 7).
- sync_commit_sha: pending-backfill (this sync commit)
