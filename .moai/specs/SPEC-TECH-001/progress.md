# Progress: SPEC-TECH-001

## Files and sizes (release 1.1.0)

| File | Before | After |
|---|---|---|
| `public/data/index.json` | 246,821 bytes | 246,821 bytes, byte-identical (hash and 260,000-byte tests unchanged) |
| `public/data/search.json` | about 101 KB (module names only) | 294,264 bytes (module names, plus module id and evidence location per module) |
| `public/data/techniques.json` | – | 82,498 bytes (vocabulary, 333 tagged modules) |
| `public/data/techniques/*.md` | – | 21 pages, 152,073 bytes in all |

`search.json` and `techniques.json` load after the first page; until they arrive the searches read ids, titles and
names only, and the technique filter shows "loading…" (REQ-008).

## Tag table

`data-overlay/module-techniques.csv`: 431 rows, 333 modules with at least one technique, 98 `none`. Every
`instrument_*` module and every module whose stated name contains an alias has a row (REQ-003 (d)); `build-data`
fails otherwise.

Names the tagging pass found to fit no technique of the vocabulary (tagged `none`, for the researcher to decide
whether the vocabulary grows): four-point probes, tensile and other mechanical testers, viscometers, calipers, J-V
(solar-cell) setups, a PPMS, a coercive-field measurement, a CD spectrometer, an STM, thermocouples, colour, RGB and
turbidity sensors, and PAGE.

Judgement calls in the table: detectors inside a chromatograph are tagged `liquid_chromatography`, not UV-Vis; a
plate reader whose mode is not stated is tagged UV-Vis; pumps, lamps, software and preparative units are `none`;
laser reflectivity is tagged `thickness_profilometry`; a solid dispenser with a balance is tagged `weighing`;
Bateni2022 is photoluminescence only; Sadeghi2024's vague detector is `none`; Xu2022's transient absorption is
UV-Vis.

## Search rule checks

- The SPEC-BROWSE-001 and SPEC-TRENDS-001 `expected-counts.mjs` scripts now use `search-rule.mjs` in this folder,
  written from REQ-005 and REQ-008 without the site's code. Every count they printed before is unchanged; the new
  technique cases give the same numbers as the site's `matchingPapers` and `matchingPlatforms` (checked case by case
  on 2026-11-13).
- Writing `search-rule.mjs` found one defect in the site's function: a short plain query found inside a paper id or
  title ("ir" in "HamediRad2019", "Bioinspired") because the whole-query check ignored the whole-token rule. "q IR"
  counted 33 papers against 18 through platforms. Fixed with a reproduction test in `tests/techniqueSearch.test.ts`;
  now 18 papers.

## Evaluation

See `evaluation.md`: recall 0.43 → 1.00 and precision 0.36 → 0.97 over 25 queries; no query lost recall; no IR
false positive returned.

## MCP package 0.2.0

`search_platforms` uses the shared function, with `filters.techniques`, `techniques_match`, per-row `techniques` and
`matched_modules` (module id, stated name, evidence, techniques, alias), and `expansions` and `suggestions` on the
result. `list_vocabulary` accepts `kind: "technique"`. The "search each spelling" sentences are gone from the notes,
the tool description and the server instructions; the provenance sentence is in each. `dist/overlay/` carries the two
overlay files. Tests: 34 pass, including byte-equality of `techniques.json` and `search.json` with the site's
`public/data`. Bundle smoke test over stdio from a clean cache: release verified, server answered.
