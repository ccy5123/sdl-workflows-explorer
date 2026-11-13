---
id: SPEC-TECH-001
title: "Technique tags: one search for every spelling of an instrument, on the site and in the MCP package"
version: "0.1.1"
status: approved
created: 2026-11-13
updated: 2026-11-13
author: cyjoe
priority: P1
phase: "after MCP 0.1.1"
module: "data-overlay/, scripts/, src/lib/, src/views/, mcp/"
lifecycle: spec-anchored
tags: "search, techniques, controlled vocabulary, mcp, llms.txt"
tier: M
depends_on: [SPEC-DATA-001, SPEC-BROWSE-001, SPEC-TRENDS-001, SPEC-UI-001]
---

## HISTORY

- 2026-11-13 0.1.0 draft.
- 2026-11-13 0.1.1 implementation notes, written into the requirements below: the matching function is in
  `src/lib/techniqueMatch.ts` (the vocabulary rules stay in `techniqueSearch.ts`); a word whose tokens are each an
  alias gives one technique term per token, and a compound alias (LCMS, which "LC-MS" normalises to) needs every
  technique it names among the platform's tagged modules; a plain query found whole in a platform's id, paper or name
  puts that platform first, and a short plain word must be a whole token there too; a paper row's own id and title
  are read with every term plain; `tech` and `techMatch` come after `uoMatch`, the unit-operation filter added since
  SPEC-BROWSE-001; reasons with evidence are shown on Home (the Browse tables have no reason column), the expansion
  line and suggestions on both.

## 1. Why

Papers name one instrument in many ways. Every search path of the site and of the MCP package matches the query as
a lower-case substring of the module names the papers state, so a reader who types one spelling misses most of the
platforms that have the instrument. Measured on `public/data/search.json` of release 1.1.0 (279 platforms), with
spellings collected by hand (lower bounds):

| Technique | Platforms | Best single spelling |
|---|---|---|
| IR spectroscopy | 19 (FT-IR, FTIR, FT/IR, ReactIR, FlowIR, IR detector, IR spectrometer, ATR-IR) | ReactIR 9; FT-IR 8; FTIR 4 |
| UV-Vis | 35 (UV-Vis, UV/Vis, spectrophotometer, absorbance) | UV-Vis 23 |
| Mass spectrometry | 38 | LC-MS 13; "mass spectrom" 5 |
| XRD | 9 (XRD, X-ray diffraction, diffractometer) | XRD 5 |
| GC | 15 | "gas chromatograph" 3 |

Short queries also return modules that are not the instrument: "IR" finds an IR lamp (Kim2026/P1), an infrared
thermometer (Li2025/P1) and IR sensors (Wang2020/P1, Xu2026/P1). The coded vocabulary does not separate these
techniques: module type `instrument_optical` holds IR and UV-Vis spectrometers alike.

The release has 1,597 modules; 364 have an `instrument_*` module type, with 341 distinct stated names. Classifying
them once is small enough to do by reading every name.

The approach follows PubMed's Automatic Term Mapping: a controlled vocabulary with entry terms, the query mapped to
it, the mapping shown to the reader, and quotes to switch it off.

## 2. Terms

- **Technique**: a measurement technique, one level below module type (for example `ir_spectroscopy` under
  `instrument_optical`). Defined in the vocabulary file.
- **Alias**: a spelling or brand name of a technique (`FTIR`, `FT-IR`, `FT/IR`, `ReactIR`, `infrared spectroscopy`).
- **Tag**: the techniques a module performs, from the tag table; a module may have several (a "UPLC-DAD/MS" is liquid
  chromatography, UV-Vis and mass spectrometry) or none.
- **Tokens** of a text: its maximal runs of letters and digits (`in-line FT-IR (ReactIR 15)` → `in`, `line`, `FT`,
  `IR`, `ReactIR`, `15`). **Normalised** text: lower case with every character that is not a letter or a digit
  removed (`UV–Vis`, `UV/Vis`, `uv vis` → `uvvis`).
- An alias **occurs in** a text when its normalised form equals the concatenation of one or more consecutive tokens
  of the text, compared in lower case. `FTIR` occurs in "in-line FT-IR"; `IR` occurs in "IR lamp" and in "FT-IR" but
  not in "stirrer"; `MS` occurs in "LC-MS".

## 3. Requirements (EARS)

### Vocabulary and tag table

- **REQ-001** (ubiquitous) `data-overlay/techniques.json` shall list one entry per technique with `id` (snake case),
  `label`, a one-line `definition`, the `module_types` it is expected under, and `aliases`. No alias may occur in two
  techniques after normalisation. The initial vocabulary is in §4; adding, merging or renaming a technique is the
  researcher's decision.
- **REQ-002** (ubiquitous) `data-overlay/module-techniques.csv` shall have the columns `module_id`, `techniques` (ids
  joined with `;`, or `none`) and `name_in_paper` (the module's stated name as it was read). It is filled once in a
  Claude Code session whose subagents read every stated name against the vocabulary; nothing is classified at search
  time and no API is called. A name whose technique is unclear gets `none`.
- **REQ-003** (event) When `npm run build-data` runs, it shall fail, naming each offending row or module, when:
  (a) a `module_id` is not a module of the pinned release;
  (b) a technique is not in the vocabulary, or `none` is combined with a technique;
  (c) a row's `name_in_paper` differs from the release's stated name, so a row cannot outlive a renamed module;
  (d) a module has no row although its type is `instrument_*` or an alias occurs in its stated name (an IR lamp needs
  a row saying `none`);
  (e) a `module_id` appears twice.
  Rows for other modules are allowed.
- **REQ-004** (ubiquitous) `build-data` shall write `public/data/techniques.json`, holding the vocabulary and, per
  tagged module, its platform id, module id, techniques, stated name and evidence location text. It shall also add
  module ids and evidence location texts beside the module names in `public/data/search.json`, so that every search
  reason can name them. `index.json` shall stay byte-identical: its hash and size tests are not changed.

### One matching function

- **REQ-005** (ubiquitous) One pure function, `searchWithTechniques` in `src/lib/techniqueMatch.ts`, shall decide
  which platforms match a query and why. It is used by the Home search (`platformFilter.ts`), the Browse and Trends
  text search (`filterApply.ts`) and the MCP's `search_platforms`. Terms are read left to right:
  - a double-quoted term is matched as written: a case-insensitive substring of the platform id, paper id, platform
    name, stated module names, readable module types or readable unit operations (today's rule), with no mapping;
  - otherwise the longest run of one to four words that is an alias is one **technique term**;
  - a word whose tokens are each an alias ("HPLC/ESI") gives one technique term per token;
  - every other word is a **plain term**, matched by today's rule, except that a plain word of at most three letters
    or digits must equal a whole token.

  A platform matches when it matches every term (AND, as today). A technique term matches a platform that has a
  module tagged with that technique (for a compound alias such as LCMS, modules carrying every technique it names),
  or whose id, paper id or name contains the alias. It does not match stated module names as text: by REQ-003 (d)
  every module whose name contains an alias has a row, so the table decides. Platforms whose id, paper or name holds
  the whole query, when every term is plain, come first (a short word as a whole token), then the rest, each group in
  input order. A paper row matches when one of its platforms matches or when its own paper id and title match with
  every term read as plain (titles carry no tags).
- **REQ-006** (ubiquitous) For each matching platform the function shall return the reason: for a technique term,
  the module id, stated name, evidence location and technique; for a text hit on a module, the module id, stated
  name and evidence location; for a hit on the id, name or paper, that field. It shall also return, for each
  technique term, the alias as typed, the technique and its aliases (the expansion), and, when fewer than three
  platforms match, up to five stated module names closest to the query by edit distance on normalised text.

### The site

- **REQ-007** (event) When a query contains a technique term, the Home search and Browse shall show one line above
  the results, for example `FTIR: searched as IR spectroscopy (FT-IR, FTIR, FT/IR, ReactIR, FlowIR, …)`, with a button
  "Search "FTIR" only" that puts the term in double quotes (the URL `q` changes accordingly). On Home, each row's
  reason shows the module id, stated name and evidence location. When fewer than three platforms match, the site
  lists the suggested module names as links that search for them.
- **REQ-008** (ubiquitous) Browse and Trends shall have a technique filter next to the module-type filter: a
  checkbox group "Techniques" with an "all"/"any" match control, URL parameters `tech` and `techMatch` after
  `uoMatch` (SPEC-BROWSE-001 §3), offered values the techniques that tag at least one module. It is a platform-level
  filter in the sense of SPEC-BROWSE-001 REQ-007. Until `techniques.json` has loaded, a `tech` value in the URL is
  kept and not applied, and the group shows that it is loading.
- **REQ-009** (ubiquitous) Wherever tags appear (site, `llms.txt`, technique pages, MCP results and instructions),
  the text shall say that the tags were assigned by a language model from the module names the papers state and are
  not part of the Zenodo release. No text shall say they were checked by a person.

### MCP package

- **REQ-010** (ubiquitous) `search_platforms` shall use REQ-005 and accept `filters.techniques` with
  `techniques_match`. Each row shall name the matching modules with module id, stated name, evidence, techniques and
  the alias that mapped. The result shall carry the expansion and the suggestions of REQ-006.
  `list_vocabulary` shall accept `kind: "technique"`, listing id, label, definition, aliases and platform counts.
  The sentences telling the model to search each spelling shall be removed from the tool notes, the tool description
  and the server instructions. The package bundles the two overlay files. Its derived JSON, `techniques.json`
  included, stays byte-equal to the site's `public/data`. Version 0.2.0 (minor: new filter and fields).

### Pages for chat models

- **REQ-011** (ubiquitous) `scripts/lib/llms.ts` shall write `public/data/techniques/<id>.md` per technique. Each page
  holds the definition, the aliases, the REQ-009 sentence, and per platform its id, paper DOI, and the tagged modules
  with module id, stated name and evidence location. `llms.txt` shall link every technique page.

### Updates

- **REQ-012** (event) When the explorer pin moves to a new Zenodo version, `build-data` shall list the modules that
  need a row (REQ-003 (d)) or whose row no longer matches (REQ-003 (a), (c)), and `npm run list-untagged` shall print
  them as CSV lines to fill. Only those modules are classified; existing rows are kept.

### Evaluation

- **REQ-013** (ubiquitous) `tests/fixtures/technique-queries.json` shall hold 20 to 30 queries, each with the platform
  set it should return. It covers every spelling family of §1, Raman, NMR, HPLC/UPLC, electron microscopy, DLS and
  photoluminescence, and the false-positive cases "IR" (IR lamp, infrared thermometer, IR sensors).
  - The expected sets are written before the tag table is filled, by a pass separate from the tagging pass, from the
    stated names. They are not changed afterwards to fit the tags; a later correction is recorded in `evaluation.md`.
  - A test reports, per query and in total, the recall and precision of today's search and of the new search against
    the expected sets, and the platforms each query gains and loses.
  - The test fails when the new search has lower recall than today's on any query, or when a false-positive platform
    is returned.
  - The report is written to `.moai/specs/SPEC-TECH-001/evaluation.md`.

## 4. Initial vocabulary (for approval)

From the brief: `ir_spectroscopy`, `uv_vis_spectroscopy`, `raman_spectroscopy`, `nmr_spectroscopy`,
`mass_spectrometry`, `gas_chromatography`, `liquid_chromatography` (HPLC, UPLC, UHPLC), `x_ray_diffraction`,
`electron_microscopy` (SEM, TEM, STEM), `dynamic_light_scattering`, `fluorescence_photoluminescence`.

Proposed from the stated names of the `instrument_*` modules: `x_ray_scattering` (SAXS, WAXS, total scattering),
`x_ray_photoelectron_spectroscopy`, `x_ray_fluorescence`, `size_exclusion_chromatography` (GPC, SEC),
`electrochemical_measurement` (potentiostat, voltammetry, impedance), `optical_microscopy_imaging` (microscope,
camera), `weighing` (balance), `ph_measurement`, `thickness_profilometry`, `electron_diffraction` (RHEED). The tagging
pass reports names that fit none; any further technique is added only on the researcher's approval.

## 5. Out of scope

- Changing the records or the Zenodo release; module names stay as the papers state them. Whether tags become a
  release column is a separate decision.
- Any language model, embedding or server call at search time.
- A technique split in the Trends chart (the filter applies; no new split).
- Tagging modules other than those REQ-003 (d) requires; unit operations and connections.

## 6. Acceptance

See `acceptance.md`.
