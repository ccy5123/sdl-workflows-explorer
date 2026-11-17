# Deploying the site

The site is built and ready for GitHub Pages at `https://ccy5123.github.io/sdl-workflows-explorer/`, but it is not
deployed. Branch `release-1.1.0` pins data release 1.1.0 as Zenodo published it (record 23875743, SHA-256
`673b2dbb…`); the site is published together with that release, in this order. Steps 1 to 3 were done on 2026-11-02;
repeat steps 2 and 3 if the record ever gets a different file.

1. **Publish release 1.1.0** on Zenodo (with the ChemRxiv posting).

2. **Check the published file against the pin** on branch `release-1.1.0`:

   ```bash
   curl -L -o /tmp/sdl-workflows-1.1.0.zip https://zenodo.org/api/records/23875743/files/sdl-workflows-1.1.0.zip/content
   sha256sum /tmp/sdl-workflows-1.1.0.zip
   ```

   It must print the `sha256` of `release.config.json`. If it differs, the published file is not the one the branch
   was built from: put the new value in `release.config.json` (the pin is its own commit, so it can be redone),
   re-run the measurements of SPEC-RELEASE-001 plan §A and the derived-file baselines (`tests/release-docs.test.ts`,
   `tests/benchmark-derive.test.ts`), and update the About text if the data card changed.

3. **Rebuild and re-run the tests** on the branch, now against Zenodo:

   ```bash
   npm run build
   npm test
   npm run e2e
   ```

   `npm run build` downloads the zip, checks it against `sha256` and `MANIFEST.sha256`, and stops if any count differs.
   `tests/siteText.test.ts` fails when a number or a quoted phrase of the home or About text (`src/lib/siteText.ts`)
   no longer appears in the release's `DATA_CARD.md`; fix the text from the data card, not the test.

4. **Get the researcher's approval to merge**, then merge `release-1.1.0` into `main` and push `main`.

5. **Make the repository public** (GitHub Pages on the free plan needs a public repository):

   ```bash
   gh repo edit ccy5123/sdl-workflows-explorer --visibility public --accept-visibility-change-consequences
   ```

6. **Choose GitHub Actions as the Pages source**: repository Settings → Pages → Build and deployment → Source:
   "GitHub Actions".

7. **Run the workflow** `.github/workflows/pages.yml` (it runs only when started by hand):

   ```bash
   gh workflow run pages.yml
   gh run watch
   ```

   It fetches the pinned release from Zenodo, runs the typecheck and the Vitest suite, builds the site under
   `/sdl-workflows-explorer/` and deploys it.

8. **Check the live site**: open `https://ccy5123.github.io/sdl-workflows-explorer/`, confirm the footer shows data
   version 1.1.0 and DOI 10.5281/zenodo.23875743, and open each view (home, about, a platform, browse, trends,
   taxonomy, benchmark).

9. **Link the site** from the README of `ccy5123/sdl-workflows` and from the Zenodo record's related identifiers
   (step 8 of `docs/plan.md`).

To rebuild later without a new release, run step 7 again.

## Pinning a new release

`release.config.json` pins the release the site shows, and names the release published before it:

```json
{
  "version": "1.3.0", "doi": "10.5281/zenodo.N", "record_id": "N", "file_name": "sdl-workflows-1.3.0.zip",
  "url": "https://zenodo.org/api/records/N/files/sdl-workflows-1.3.0.zip/content", "sha256": "<64 hex>",
  "counts": { "papers": 0, "platforms": 0, "modules": 0, "steps": 0, "connections": 0, "material_connections": 0, "candidates": 0 },
  "previous": {
    "version": "1.2.0", "doi": "10.5281/zenodo.24088968", "record_id": "24088968", "file_name": "sdl-workflows-1.2.0.zip",
    "url": "https://zenodo.org/api/records/24088968/files/sdl-workflows-1.2.0.zip/content",
    "sha256": "cb248b78cc2e8e0eff4d72885b8225cc65998c7f6d0ff53699c4f91ccd3b6dd4"
  }
}
```

`previous` is the old pin without `counts` (optional; without it the release-to-release check skips). Then:

```bash
SDL_RELEASE_ZIP=<new zip> SDL_PREVIOUS_RELEASE_ZIP=<previous zip> npm run fetch-release   # either variable optional
npm run build-data
npm run typecheck && npm test && npm run e2e
npm run record-baselines   # once everything passes; commit tests/derived-baselines.json with the pin
```

`fetch-release` verifies the pinned release into `.cache/release/` and the previous one into
`.cache/release/previous/`; without the variables it downloads them from Zenodo. The tests and e2e specs take every
count the release decides from the release itself (`tests/release-expect.ts`, `e2e/expected.ts`), and the home and
About text take theirs from `index.json` (`about`, counted by `scripts/lib/about.ts`); nothing in them is edited for
a new release. `tests/release-docs.test.ts` derives both releases and fails when the new one changes anything of the
previous one except the papers it adds (and earlier platforms joining an identity group, which it lists); such a
release (a correction, a re-split benchmark) needs a person to read the change. `tests/siteText.test.ts` fails when
the data card words a figure differently from the About text; fix the text from the data card, not the test.

## Monthly release

From release 1.3.0 on, the data release is published once a month (first week) by the scheduled task
`sdl-db-monthly-release` of the sdl-db workspace, without an approval step; sdl-db `update/WEEKLY.md` ("Monthly
release") gives the whole flow. The explorer part is `scripts/monthly-release.sh`; the task runs only its five steps
(its tool guard allows no other command in this repository):

1. **`prepare`** (before the Zenodo publish): from a clean `main`, `git pull --ff-only`, branch `release-<version>`,
   the pin written by sdl-db's `update/release.py explorer-pin` (version, the draft's record id and reserved DOI, the
   sha256 of sdl-db's local zip, the counts, and the `previous` release), `npm run fetch-release` with
   `SDL_RELEASE_ZIP` set to that local zip, the pin committed, `npm run build-data`. It exits 3 when new modules need
   technique tags and writes them to `.cache/untagged-<version>.csv` (from `npm run list-untagged`); the task has them
   classified by subagents and adds the rows to `data-overlay/module-techniques.csv` (SPEC-TECH-001 REQ-012; unclear →
   `none`, no new technique).
2. **`check`** and **`e2e`**: `npm run build-data`, `npm run typecheck`, `npm test`, then `npm run e2e` (6 to 10
   minutes; the task runs it in the background) and `npm run record-baselines`; the tag rows and
   `tests/derived-baselines.json` are committed on the branch. Tests, e2e specs and the site text read their expected
   values from the pinned release ("Pinning a new release" above), and `tests/release-docs.test.ts` compares it with
   the `previous` release, so a new pin needs no hand edits; a failure here means something other than the added
   papers changed, and the task stops before publishing (the Zenodo draft stays unpublished).
3. **`finalize`** (after sdl-db's `zenodo-verify`): the pin must be the file Zenodo now serves (sdl-db
   `update/releases.json`); the cached copy is dropped and `fetch-release` downloads it from Zenodo; build-data,
   typecheck and vitest again; fast-forward `main` to the branch, push, `gh workflow run pages.yml`, `gh run watch`
   on that run, and the live `data/index.json` must name the version.
4. **`abort`**: back to `main`; the branch keeps the state reached (uncommitted pin or tag changes committed as
   `wip`). The task runs it when it stops before the merge. It never retries a publish; after the Zenodo publish a
   failure leaves the site on the old version and is reported.

Variables for tests and dry runs only (the task sets none): `SDLDB` (sdl-db folder), `GH` (a stand-in for `gh`),
`LIVE_URL`, `SKIP_LIVE=1`, and `SDL_RELEASE_ZIP` (passed through to `fetch-release` in `finalize`). A dry run uses a
clone of this repository with a local bare repository as `origin`, a copy of sdl-db with the Zenodo mock
(`update/zenodo_mock.py`), `GH` pointing at a stub and `SKIP_LIVE=1`.

The MCP npm package in `mcp/` is not part of the monthly release: after the site moves, bump its minor version and
publish it by hand (npm 2FA).
