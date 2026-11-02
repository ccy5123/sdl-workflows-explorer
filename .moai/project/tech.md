# Tech

## Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 5, TypeScript (strict) | Static output for GitHub Pages; fast dev server |
| UI | React 18 | Confirmed 2026-11-01; best-supported by the graph, table and chart libraries below |
| Routing | Hash URLs (`#/platform/Aand2024/P1`) | Stable per-platform links without server rewrites on GitHub Pages |
| Graphs | Cytoscape.js + dagre layout | Module/connection networks (from step 2) |
| Charts | Observable Plot | Trends dashboard (from step 4) |
| Tables | TanStack Table | Browser and comparison (from step 3) |
| Unit tests | Vitest | Data build, checksum verification, helpers |
| E2E | Playwright | Smoke test per view (from step 2) |
| Build scripts | tsx (Node 20) | Run TypeScript scripts in `scripts/` without a separate compile step |
| CSV | csv-parse | Parses the release's quoted CSV files |
| Zip | fflate | Pure-JS unzip; no native dependency |

## Data pipeline (build time only)

1. `scripts/fetch-release.ts` reads `release.config.json`, downloads the zip from Zenodo into `.cache/release/`
   (or uses a local zip given by `SDL_RELEASE_ZIP`), checks the zip's SHA-256 against the pinned value, extracts it,
   and checks every file listed in `MANIFEST.sha256`. Any mismatch stops the build.
2. `scripts/build-data.ts` reads the verified release and writes compact JSON to `public/data/`, then checks the
   derived data against the pinned release counts and fails on any difference.
3. `public/data/` and `.cache/` are git-ignored; `npm run build` runs both scripts before `vite build`.

## Environment

- Node 20 (developed with 20.19), npm 10.
- Network access to zenodo.org at build time, unless `SDL_RELEASE_ZIP` points to a local copy (still verified).

## Deployment

GitHub Pages at `https://ccy5123.github.io/sdl-workflows-explorer/` (no custom domain), built and deployed by
`.github/workflows/pages.yml`, which runs only when started by hand. Vite `base` is `/sdl-workflows-explorer/` for
the production build and `./` for the e2e build; Playwright also serves the production build under the base path
(SPEC-SITE-001). Not deployed yet: the steps are in `docs/deploy.md`.

## Theme and accessibility

Light and dark colour tokens (`src/lib/siteTokens.ts`, mirrored in `src/styles.css`) follow `prefers-color-scheme`
through `data-theme` on `<html>`; tests keep the CSS equal to the tokens and check WCAG contrast. Shared table and
spacing properties, a skip link, `aria-current` on the current nav link and a title per route (SPEC-SITE-001).
