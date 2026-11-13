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

After the tag table (431 rows: 333 modules tagged, 98 ), on the same 25 queries and expected sets, unchanged
since they were written. Same script.

| Query | Expected | Earlier: returned, recall, precision | Technique search: returned, recall, precision | Expected platforms gained | Expected platforms lost | Other platforms no longer returned | Other platforms returned |
|---|---|---|---|---|---|---|---|
| FT-IR | 19 | 8, 0.42, 1.00 | 19, 1.00, 1.00 | 11 | – | 0 | – |
| FTIR | 19 | 4, 0.21, 1.00 | 19, 1.00, 1.00 | 15 | – | 0 | – |
| ReactIR | 19 | 9, 0.47, 1.00 | 19, 1.00, 1.00 | 10 | – | 0 | – |
| infrared spectroscopy | 19 | 0, 0.00, – | 19, 1.00, 1.00 | 19 | – | 0 | – |
| IR | 19 | 91, 1.00, 0.21 | 19, 1.00, 1.00 | 0 | – | 72 | – |
| UV-Vis | 58 | 23, 0.40, 1.00 | 64, 1.00, 0.91 | 35 | – | 0 | DelgadoLicona2025/P1, King1974/P1, Li2020/P1, Luo2025/P1, Tao2021/P1, Wu2025b/P1 |
| UV/Vis | 58 | 1, 0.00, 0.00 | 64, 1.00, 0.91 | 58 | – | 1 | DelgadoLicona2025/P1, King1974/P1, Li2020/P1, Luo2025/P1, Tao2021/P1, Wu2025b/P1 |
| spectrophotometer | 58 | 11, 0.19, 1.00 | 64, 1.00, 0.91 | 47 | – | 0 | DelgadoLicona2025/P1, King1974/P1, Li2020/P1, Luo2025/P1, Tao2021/P1, Wu2025b/P1 |
| mass spectrometry | 31 | 0, 0.00, – | 32, 1.00, 0.97 | 31 | – | 0 | Holmes2016a/P1 |
| MS | 31 | 136, 1.00, 0.23 | 32, 1.00, 0.97 | 0 | – | 104 | Holmes2016a/P1 |
| LC-MS | 23 | 13, 0.57, 1.00 | 23, 1.00, 1.00 | 10 | – | 0 | – |
| XRD | 9 | 5, 0.56, 1.00 | 9, 1.00, 1.00 | 4 | – | 0 | – |
| X-ray diffraction | 9 | 1, 0.11, 1.00 | 9, 1.00, 1.00 | 8 | – | 0 | – |
| diffractometer | 9 | 7, 0.78, 1.00 | 9, 1.00, 1.00 | 2 | – | 0 | – |
| GC | 16 | 14, 0.88, 1.00 | 16, 1.00, 1.00 | 2 | – | 0 | – |
| gas chromatograph | 16 | 4, 0.25, 1.00 | 16, 1.00, 1.00 | 12 | – | 0 | – |
| Raman | 9 | 9, 1.00, 1.00 | 9, 1.00, 1.00 | 0 | – | 0 | – |
| NMR | 14 | 14, 1.00, 1.00 | 14, 1.00, 1.00 | 0 | – | 0 | – |
| HPLC | 77 | 80, 0.83, 0.80 | 77, 1.00, 1.00 | 13 | – | 16 | – |
| UPLC | 77 | 7, 0.09, 1.00 | 77, 1.00, 1.00 | 70 | – | 0 | – |
| SEM | 2 | 32, 1.00, 0.06 | 2, 1.00, 1.00 | 0 | – | 30 | – |
| electron microscope | 2 | 1, 0.50, 1.00 | 2, 1.00, 1.00 | 1 | – | 0 | – |
| DLS | 10 | 9, 0.90, 1.00 | 10, 1.00, 1.00 | 1 | – | 0 | – |
| photoluminescence | 15 | 1, 0.07, 1.00 | 16, 1.00, 0.94 | 14 | – | 0 | DelgadoLicona2025/P1 |
| PL | 15 | 276, 1.00, 0.05 | 16, 1.00, 0.94 | 0 | – | 260 | DelgadoLicona2025/P1 |

Total over 25 queries: earlier recall 0.43, precision 0.36; technique search recall 1.00, precision 0.97

No query recalls less than before, and none returns Kim2026/P1, Li2025/P1, Wang2020/P1 or Xu2026/P1 for "IR" (the IR
lamp, infrared thermometer and IR sensors). Every spelling of one technique returns the same set. The test
 fails if either stops holding.

The 8 platforms returned outside the expected sets come from modules whose names give an instrument model rather than
the technique; the tagging pass read the model, the judges read the words:

- UV-Vis (6): DelgadoLicona2025/P1/M3 (flow cell, BAL 2000 light source, Ocean Insight HDX spectrometer),
  King1974/P1/M4 (Spectronic 20 spectrometer), Li2020/P1/M4 (DH-mini light source, USB2000+), Luo2025/P1/M8
  (SpectraMax iD5), Tao2021/P1/M3 and Wu2025b/P1/M2 (light source and Thorlabs CCS200 spectrometer).
- Mass spectrometry (1): Holmes2016a/P1/M3 (Advion Expression CMS, a compact mass spectrometer).
- Photoluminescence (1): DelgadoLicona2025/P1/M3, the same module, which also has a 365-nm LED.

These are counted as false positives above; the expected sets were not changed to fit the tags.
