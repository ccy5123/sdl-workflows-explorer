# Evaluation: SPEC-TECH-001

Query set: `tests/fixtures/technique-queries.json` (25 queries, 11 technique families, release 1.1.0). Two passes,
separate from the tagging pass, judged the expected platform sets from the stated module names on 2026-11-13, before
the tag table existed. Platforms the judges could not decide from the name are listed under `ignore`; they count
neither as hits nor as misses. Script: `npx tsx scripts/technique-eval.ts --markdown`.

Recall = expected platforms returned / expected platforms. Precision = expected platforms returned / platforms
returned (ignore list left out).

## Baseline: the earlier Home search (before any tag)

| Query | Expected | Earlier: returned, recall, precision |
|---|---|---|
| FT-IR | 19 | 8, 0.42, 1.00 |
| FTIR | 19 | 4, 0.21, 1.00 |
| ReactIR | 19 | 9, 0.47, 1.00 |
| infrared spectroscopy | 19 | 0, 0.00, – |
| IR | 19 | 91, 1.00, 0.21 |
| UV-Vis | 58 | 23, 0.40, 1.00 |
| UV/Vis | 58 | 1, 0.00, 0.00 |
| spectrophotometer | 58 | 11, 0.19, 1.00 |
| mass spectrometry | 31 | 0, 0.00, – |
| MS | 31 | 136, 1.00, 0.23 |
| LC-MS | 23 | 13, 0.57, 1.00 |
| XRD | 9 | 5, 0.56, 1.00 |
| X-ray diffraction | 9 | 1, 0.11, 1.00 |
| diffractometer | 9 | 7, 0.78, 1.00 |
| GC | 16 | 14, 0.88, 1.00 |
| gas chromatograph | 16 | 4, 0.25, 1.00 |
| Raman | 9 | 9, 1.00, 1.00 |
| NMR | 14 | 14, 1.00, 1.00 |
| HPLC | 77 | 80, 0.83, 0.80 |
| UPLC | 77 | 7, 0.09, 1.00 |
| SEM | 2 | 32, 1.00, 0.06 |
| electron microscope | 2 | 1, 0.50, 1.00 |
| DLS | 10 | 9, 0.90, 1.00 |
| photoluminescence | 15 | 1, 0.07, 1.00 |
| PL | 15 | 276, 1.00, 0.05 |

Total over 25 queries: recall 0.43, precision 0.36.

## Technique search

Filled in after the tag table (plan step 10).
