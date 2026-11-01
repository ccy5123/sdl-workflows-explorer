# Product: sdl-workflows explorer

## What it is

A public static website that lets readers explore the sdl-workflows 1.0.0 dataset: the hardware workflows of 280
closed-loop self-driving-lab platforms described in 238 papers (first public 1974–2026), coded as modules,
connections between modules, and the steps of one experimental cycle. The dataset is published on Zenodo
(DOI 10.5281/zenodo.23857126, data CC BY 4.0, code MIT) with its code at `ccy5123/sdl-workflows`. The site is
linked from both.

## Who it is for

Researchers who build or study self-driving laboratories, reviewers of the dataset paper, and readers who want to
check how a given platform was coded before downloading the data.

## Release counts the site must reproduce

| Item | Count |
|---|---|
| Papers | 238 |
| Platforms | 280 |
| Modules | 1603 |
| Steps | 2621 |
| Connections (material) | 1687 (1076) |
| Screened candidates | 2172 |

## Views

1. **Platform viewer** — module/connection graph (nodes coloured by module type family, edges styled by transfer
   mode, inferred edges dashed, uncertain items marked, off-platform modules outside the boundary), the cycle's
   steps in order, an evidence panel (document, page, locator, DOI link), and a header with name, paper, year,
   field tags, campaigns, commercial-integrated flag and the other papers sharing the platform identity.
2. **Browser and comparison** — filterable tables of papers and platforms; side-by-side comparison of two or three
   platforms.
3. **Trends dashboard** — counts by first public year with n per year, 2026 marked partial (search run on
   20 October 2026), years before 2015 grouped, and a note stating what the sample is.
4. **Taxonomy explorer** — the 69 classes with definitions and families, correspondence to XDL, WCSO, Leong2022,
   OntoLab/SAREF and Gottstein2026 with sources, usage counts and example platforms.
5. **Benchmark** — the chrono2023 tasks (module type and transfer mode), their split, and the reference results
   as published in the release.

Shared: home page (counts, DOI, citation), about page (summary of `DATA_CARD.md`), footer with data version and DOI
on every page, light and dark themes, phone width, keyboard navigation, colour-blind-safe palettes.

## Release policy

The site shows the latest release only. Every page footer shows the data version; older versions are reached
through Zenodo. The release version, Zenodo record and zip checksum are pinned in one config file.

## Out of scope

Editing data, accounts, any server or API, paper text, a hosted copy of the data files.

## Roadmap (order of work)

1. Repository scaffold, build-time data pipeline, count test — SPEC-DATA-001.
2. Platform viewer.
3. Browser and comparison.
4. Trends dashboard.
5. Taxonomy explorer.
6. Benchmark view.
7. Home and about pages, accessibility pass, GitHub Pages deployment.
8. Link the site from the sdl-workflows README and the Zenodo record (metadata edit, needs approval).

Each step ends with its tests passing and a screenshot check in the browser.
