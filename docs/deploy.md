# Deploying the site

The site is built and ready for GitHub Pages at `https://ccy5123.github.io/sdl-workflows-explorer/`, but it is not
deployed. It is published together with data release 1.1.0, in this order.

1. **Publish release 1.1.0** on Zenodo (with the ChemRxiv posting). Note the version DOI, the record id, the zip file
   name and its download URL.

2. **Pin the site to 1.1.0** in `release.config.json`: `version`, `doi`, `record_id`, `file_name`, `url`, `sha256`
   (of the published zip: `sha256sum sdl-workflows-1.1.0.zip`) and the seven `counts` from the release's own counts.

3. **Rebuild and re-run the tests** locally:

   ```bash
   npm run build
   npm test
   npm run e2e
   ```

   `npm run build` downloads the zip, checks it against `sha256` and `MANIFEST.sha256`, and stops if any count
   differs. Two kinds of failure are expected and are fixed in the code, not by loosening the tests:
   - a schema change in 1.1.0 that `scripts/lib/derive.ts` does not read yet;
   - `tests/siteText.test.ts`, which fails when a number in the home or about text (`src/lib/siteText.ts`) no longer
     appears in the new `DATA_CARD.md`. Update the text from the new data card; the test names each stale number.

   Commit and push to `main`.

4. **Make the repository public** (GitHub Pages on the free plan needs a public repository):

   ```bash
   gh repo edit ccy5123/sdl-workflows-explorer --visibility public --accept-visibility-change-consequences
   ```

5. **Choose GitHub Actions as the Pages source**: repository Settings → Pages → Build and deployment → Source:
   "GitHub Actions".

6. **Run the workflow** `.github/workflows/pages.yml` (it runs only when started by hand):

   ```bash
   gh workflow run pages.yml
   gh run watch
   ```

   It fetches the pinned release from Zenodo, runs the typecheck and the Vitest suite, builds the site under
   `/sdl-workflows-explorer/` and deploys it.

7. **Check the live site**: open `https://ccy5123.github.io/sdl-workflows-explorer/`, confirm the footer shows data
   version 1.1.0 and the new DOI, and open each view (home, about, a platform, browse, trends, taxonomy, benchmark).

8. **Link the site** from the README of `ccy5123/sdl-workflows` and from the Zenodo record's related identifiers
   (step 8 of `docs/plan.md`).

To rebuild later without a new release, run step 6 again.
