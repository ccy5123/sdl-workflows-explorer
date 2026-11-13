# Acceptance: SPEC-TECH-001

## AC-1 Vocabulary and table (REQ-001, REQ-002)

- `data-overlay/techniques.json` parses; ids are unique snake case; no two techniques share an alias after
  normalisation; every technique has a label, a definition, module types and at least one alias.
- `data-overlay/module-techniques.csv` has the header `module_id,techniques,name_in_paper` and one row per module
  that REQ-003 (d) requires, plus any optional rows.

## AC-2 Build checks (REQ-003, REQ-004)

- With the fixture release, each of the five faults (unknown module id, unknown technique or `none;x`, stale
  `name_in_paper`, missing row for an `instrument_*` module or for a module whose name contains an alias, duplicate
  module id) makes `deriveAll` throw with a message naming the row or module.
- On the real release `build-data` succeeds; `index.json` is byte-identical to before (its hash test unchanged);
  `techniques.json` and the extended `search.json` are written, and the MCP's derived copies equal them byte for byte.

## AC-3 Matching (REQ-005, REQ-006)

- "alias occurs in": `FTIR` in "in-line FT-IR" yes; `IR` in "IR lamp" yes, in "stirrer" no; `MS` in "LC-MS" yes;
  `UV-Vis`, `UV/Vis`, `UV–vis` all normalise to `uvvis`.
- For each technique of the evaluation set, every listed spelling returns the same platform set on Home
  (`searchPlatforms`), Browse/Trends (`matchingPlatforms`, and `matchingPapers` over the same platforms) and the MCP
  (`search_platforms`).
- `"ReactIR"` (quoted) returns only platforms whose fields contain `reactir`; `ReactIR` (unquoted) returns the IR
  spectroscopy set.
- "IR" returns none of Kim2026/P1 (IR lamp), Li2025/P1 (infrared thermometer), Wang2020/P1 and Xu2026/P1 (IR
  sensors) unless another of their modules is tagged `ir_spectroscopy`.
- A query with a technique term and a plain term ("FT-IR flow") requires both.
- Reasons carry module id, stated name and evidence for every module hit; fewer than three results give up to five
  suggestions.

## AC-4 Site (REQ-007, REQ-008, REQ-009)

- Home and Browse with `FTIR` show "FTIR: searched as IR spectroscopy (…)" and a "Search "FTIR" only" button; the
  button sets `q` to `"FTIR"` and the result changes to the quoted rule.
- Browse shows the "Techniques" group with all/any; `#/browse?view=platforms&tech=ir_spectroscopy` lists the IR set;
  the URL round-trips; a `tech` value in a URL loaded before `techniques.json` is kept and applied once it loads.
- The REQ-009 sentence is on Home (near the expansion line), Browse (filter group), `llms.txt`, the technique pages
  and the MCP instructions. (About was dropped on 2026-11-13 at the researcher's request: no separate paragraph.)
- At 375 px no page-level sideways scroll on Home and Browse with the expansion line shown; axe passes.

## AC-5 MCP (REQ-010)

- `search_platforms {text: "FTIR"}` and `{text: "ReactIR"}` return the same rows; each row's matched modules carry
  techniques and the alias; the result carries the expansion.
- `search_platforms {filters: {techniques: ["x_ray_diffraction"]}}` returns the XRD set; an unknown technique is
  refused with the closest ids.
- `list_vocabulary {kind: "technique"}` lists every technique with aliases and counts.
- The server instructions and tool notes no longer tell the model to search each spelling.
- Package version 0.2.0; MCP tests pass.

## AC-6 Chat pages (REQ-011)

- `data/techniques/<id>.md` exists for every technique, lists every tagged platform with DOI and module evidence, and
  is linked from `llms.txt`; a test checks every link resolves to a written file.

## AC-7 Updates (REQ-012)

- With one row removed from a copy of the table, `build-data` fails naming that module, and `npm run list-untagged`
  prints exactly that module as a CSV line.

## AC-8 Evaluation (REQ-013)

- `tests/fixtures/technique-queries.json` has 20 to 30 queries with expected platform sets, committed before the tag
  table.
- The evaluation test prints per-query recall and precision of today's and the new search, and fails on any query
  where the new recall is lower than today's or a false-positive platform appears.
- `evaluation.md` records the table and the platforms each query gains and loses.

## AC-9 Existing SPECs

- SPEC-BROWSE-001 and SPEC-TRENDS-001 are amended (HISTORY, rule text, parameters, counts); their
  `expected-counts.mjs` apply the new rule and the new counts are recorded with the reason for each change.
- Site typecheck, Vitest and e2e pass; MCP typecheck and Vitest pass.
