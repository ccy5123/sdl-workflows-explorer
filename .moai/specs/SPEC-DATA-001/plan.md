# Plan: SPEC-DATA-001

## A. Context

First SPEC of the explorer (step 1 of `docs/plan.md`). Standalone; later SPECs (one per view) build on the JSON
defined here.

## B. Tasks (TDD: RED -> GREEN -> REFACTOR per unit)

1. Scaffold: `package.json`, `tsconfig.json`, `vite.config.ts` (base `./`), `index.html`, `src/main.tsx`,
   `src/App.tsx`, `.gitignore` additions. Dependencies: react, react-dom, vite, @vitejs/plugin-react, typescript,
   vitest, @vitest/coverage-v8, tsx, csv-parse, fflate, @types/react, @types/react-dom, @types/node.
2. `release.config.json` + `scripts/lib/config.ts` (validation; AC-6).
3. `scripts/lib/checksum.ts`: SHA-256, MANIFEST parsing, per-file verification (AC-3, AC-4).
4. `scripts/lib/extract.ts`: safe unzip with fflate (AC-5).
5. `scripts/fetch-release.ts`: cache, download (Node `fetch`), `SDL_RELEASE_ZIP`, verification marker (REQ-008).
6. `src/data/types.ts` + `scripts/lib/derive.ts`: index, platform files, taxonomy, benchmark (AC-7).
7. `scripts/lib/counts.ts` + `scripts/build-data.ts`: counts and comparison (AC-1, AC-2).
8. `App.tsx` reads `data/index.json`, shows counts and footer (AC-8).

## C. Risks

| Risk | Mitigation |
|---|---|
| Zenodo unavailable at build time | Cache in `.cache/release/`; `SDL_RELEASE_ZIP` for a local copy, still hash-checked |
| Release CSV quirks (quoted commas, empty fields) | csv-parse with header mode; numeric fields parsed explicitly |
| Derived JSON drifting from the release | Count test against both pinned counts and `core/` row counts |
| Zip-slip | Reject entries with absolute paths, `..` segments, or outside the top folder before writing |
| Download URL untested (unit tests stub `fetch`) | The first real build (AC-1/AC-12) confirms the Zenodo `/content` URL; fix it in `release.config.json` if it fails |

## D. Files

New: `release.config.json`, `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`,
`src/main.tsx`, `src/App.tsx`, `src/data/types.ts`, `scripts/fetch-release.ts`, `scripts/build-data.ts`,
`scripts/lib/{config,checksum,extract,csv,derive,counts}.ts`, `tests/*.test.ts`, `tests/fixtures/`.
Edited: `.gitignore`.
