# Deploying the site

The site is built and ready for GitHub Pages at `https://ccy5123.github.io/sdl-workflows-explorer/`, but it is not
deployed. Branch `release-1.1.0` already pins data release 1.1.0 (Zenodo record 23875743) from the local bundle; the
site is published together with that release, in this order.

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
