# Acceptance: SPEC-BROWSE-001

Unit tests (AC-1 to AC-8) run in Vitest without a browser; AC-3, AC-5, AC-6 and AC-7 read the real `public/data/`
after `npm run build-data`. AC-9 to AC-16 are Playwright tests (`npm run e2e`) against the `dist-e2e/` build.
"Page error" means an uncaught exception (`pageerror`); a 404 resource message in the console does not count. "Count
line" means the text of REQ-008. "First row" means the first body row of the table shown.

The offered values (AC-3), the counts (AC-5) and the comparison rows (AC-6, AC-14) were computed from release 1.0.0
`public/data/` with `expected-counts.mjs` in this folder (`node .moai/specs/SPEC-BROWSE-001/expected-counts.mjs`
from the repository root), which applies the rules of spec §2.

The screenshot check in the browser that `docs/plan.md` asks for at the end of each step is done by the orchestrator
after the run phase; it is not an acceptance criterion.

## Scenarios

### AC-1 Route parsing (REQ-001)
- `#/browse` and `#/browse?` → browse, query `""`; `#/browse?view=platforms&q=x` → browse, query `view=platforms&q=x`.
- `#/compare/Aand2024/P1,Li2020/P1` → compare, ids `["Aand2024/P1", "Li2020/P1"]`; `#/compare/` → compare, ids `[]`;
  `#/compare/Aand%202024/P1,Zed` → compare, ids `["Aand 2024/P1", "Zed"]`; `#/compare/%E0%A4%A/P1,Li2020/P1` →
  compare, ids `["%E0%A4%A/P1", "Li2020/P1"]`, without throwing.
- `#/browse/`, `#/browse/x`, `#/browsex` and `#/compare` → not found carrying the hash.
- `compareHash(["Aand2024/P1", "Li2020/P1"])` is `#/compare/Aand2024/P1,Li2020/P1` and parses back to the same ids.
- Every existing case in `tests/route.test.ts` passes without edits to those cases.

### AC-2 URL encoding and round trip (REQ-002)
- The default state encodes to `""` and the browse hash `#/browse`.
- State {view platforms, years 2018–2024, field nanomaterials and catalysis, mt flow_reactor, mtMatch any,
  q "chem speed"} encodes to
  `view=platforms&years=2018-2024&field=catalysis,nanomaterials&mt=flow_reactor&mtMatch=any&q=chem%20speed`.
- A year range with only "From" 2026 encodes to `years=2026-`; with only "To" 2014 to `years=-2014`.
- q `a,b&c` encodes to `q=a%2Cb%26c` and decodes back to `a,b&c`.
- For a state per parameter alone (each of the 11) and the state above, decoding the encoding returns an equal state.

### AC-3 Decoding bad input and offered values (REQ-002, REQ-004)
- With the offered values of the real index,
  `foo=1&view=tables&years=2024-2018&field=catalysis,not_a_tag&sw=4,3&mtMatch=some&q=%E0%A4%A` decodes without
  throwing to: view papers, no year limit, field `[catalysis]`, sw `[3]`, mtMatch all, q empty.
- `view=papers&view=platforms` → view platforms; `view=platforms&view=tables` → view papers (invalid last occurrence
  takes the default). `years=18-24`, `years=2018` and `years=abcd-2020` → no year limit.
- `field=nanomaterials,catalysis` → field `[catalysis, nanomaterials]`; `field=catalysis,catalysis` → field
  `[catalysis]`; `sw=3,2` → sw `[2, 3]`.
- `q=a+b` → q `a+b`; `q=%20x%20` → q `x`.
- The offered values of the real index are, in this order: field `analytical_chemistry, battery_electrochem,
  biology_biochem, catalysis, chemistry_synthesis, materials_inorganic, materials_polymer_soft, materials_thin_film,
  nanomaterials`; integration mode `fixed_tubing, human_transfer, mixed, mobile_robot, none, robot_arm_gantry,
  unmapped`; sw `2, 3`; hw `1, 2, 3`; 22 module types from `assembly_unit` to `unmapped` in alphabetical order;
  transfer modes `fixed_tubing, human_transfer, mobile_robot, robot_arm_gantry, unmapped`.

### AC-4 Filter rules on a fixture (REQ-005, REQ-006, REQ-007)
Fixture: paper `Alpha2020` (title "Catalyst screening", year 2020, tags [catalysis], im fixed_tubing, sw 2, hw 2)
with platform `Alpha2020/P1` (name "Flow rig", mt [flow_reactor, software], tm [fixed_tubing]); paper `Beta2015`
(title "Nanoparticle synthesis", year 2015, tags [catalysis, nanomaterials], im mixed, sw 3, hw 1) with
`Beta2015/P1` (name null, mt [liquid_handler], tm [robot_arm_gantry]) and `Beta2015/P2` (name "Beta line", mt
[flow_reactor], tm [fixed_tubing]). Each platform carries its paper's year and field tags.
- Empty state → both papers, all three platforms.
- im mixed → papers [Beta2015]; platforms [Beta2015/P1, Beta2015/P2] (tested through the paper row).
- mt [flow_reactor, liquid_handler], all → no paper, no platform (Beta2015 has each value only on a different
  platform); any → both papers, all three platforms.
- mt [flow_reactor] with tm [robot_arm_gantry] → no paper, no platform.
- mt [flow_reactor] with im mixed → papers [Beta2015]; platforms [Beta2015/P2].
- years 2016–2020 → papers [Alpha2020]; years 2015–2015 → papers [Beta2015] (both ends inclusive).
- field [nanomaterials] → papers [Beta2015]; platforms [Beta2015/P1, Beta2015/P2].
- q `  BETA ` → papers [Beta2015], platforms [Beta2015/P1, Beta2015/P2]; q `flow rig` → platforms [Alpha2020/P1],
  papers none (titles do not contain it); q `null` matches no platform.

### AC-5 Real index counts (REQ-005, REQ-006, REQ-007)

| Filter state | Papers | Platforms |
|---|---|---|
| default | 238 | 280 |
| years 2018–2024 | 124 | 155 |
| years from 2026 | 36 | 42 |
| years to 2014 | 27 | 28 |
| field catalysis, nanomaterials | 66 | 68 |
| im mixed | 65 | 86 |
| im fixed_tubing, mobile_robot | 105 | 125 |
| sw 3 | 4 | 4 |
| hw 1, 3 | 9 | 9 |
| mt flow_reactor | 99 | 127 |
| mt flow_reactor, liquid_handler, match all | 19 | 25 |
| mt flow_reactor, liquid_handler, match any | 176 | 209 |
| tm fixed_tubing, robot_arm_gantry, match all | 21 | 24 |
| tm fixed_tubing, robot_arm_gantry, match any | 214 | 254 |
| mt flow_reactor and tm robot_arm_gantry | 9 | 9 |
| q chemspeed | 7 | 9 |
| years 2018–2024, field catalysis, mt flow_reactor | 6 | 6 |

- Under "mt flow_reactor, liquid_handler, match all" and under "mt flow_reactor and tm robot_arm_gantry", paper
  `Zhang2025b` is not among the matching papers (flow_reactor only on `Zhang2025b/P2`; liquid_handler and
  robot_arm_gantry only on `Zhang2025b/P1`); under "match any" it is.
- q chemspeed matches exactly `Christensen2021/P1`, `Moosavi2019/P1`, `Ramirez2024/P1`, `Sim2024/P1`,
  `StriethKalthoff2024/P1`, `StriethKalthoff2024/P2`, `StriethKalthoff2024/P3`, `Vescovi2023/P2`, `Wu2025c/P1`
  (three by name, six by a module name; amended 2026-11-11).

### AC-6 Comparison assembly (REQ-014, REQ-009)
- Fixture: steps given out of order come back sorted by `step_order`; a null performer stays null (shown as "—");
  an off-platform module is counted in its type's row; a connection with `is_material` false is not counted.
- Real `Aand2024/P1` and `Li2020/P1`: module rows, in order, flow_reactor 1 | 1, fluidics 1 | 1,
  instrument_optical 1 | 2, liquid_handler absent | 1, sample_handling_station 1 | absent, software 1 | 1;
  transfer rows fixed_tubing 3 | 3, robot_arm_gantry absent | 1; step lists of 6 and 9 entries, the first
  `1 dispense_liquid robot` for both, the last `6 plan_next_experiment software` and
  `9 generate_instructions software`.
- Adding `Angello2022/P1` as third: 8 module rows (adds instrument_separation_ms and unmapped) and 3 transfer rows
  (adds human_transfer: absent | absent | 1).

### AC-7 Compare id check (REQ-015)
- `[]` and `["Aand2024/P1"]` → too few, naming the count; four known ids → too many, naming the count.
- `["Aand2024/P1", "Aand2024/P1"]` → duplicate, naming `Aand2024/P1`.
- `["Aand2024/P1", "Nope2000/P1", "Zed"]` → unknown, naming `Nope2000/P1` and `Zed`.
- Check order: `["Aand2024/P1", "Aand2024/P1", "Nope2000/P1", "Zed"]` → too many;
  `["Aand2024/P1", "Aand2024/P1", "Nope2000/P1"]` → duplicate (not unknown).
- `["Aand2024/P1", "Li2020/P1"]` → valid, paper files `[Aand2024, Li2020]`; `["Bedard2018/P1", "Bedard2018/P2"]` →
  valid, one paper file `[Bedard2018]`.

### AC-8 Filter functions free of UI code (REQ-009)
- A unit test `tests/libBoundary.test.ts` reads `src/lib/filterState.ts`, `src/lib/filterUrl.ts`,
  `src/lib/filterApply.ts` and `src/lib/compare.ts`, removes `//` and `/* */` comments, and finds no import of
  `react`, `react-dom` or any `@tanstack/` package (with `from`, as a side-effect `import "…"`, or as a dynamic
  `import("…")`; single or double quotes) and no use of `window` or `document` (matched as
  `\b(window|document)\s*[.\[]`, so the words inside a message string do not count). The test fails when such an
  import is added to a copy of one file (checked once during the run phase).
- The predicate functions take the filter state with `PaperRow[]` and `PlatformRow[]` (as in `IndexJson`) and return
  the matching rows; AC-4 and AC-5 call them directly.

### AC-9 A filtered URL opens the browser (REQ-001, REQ-003, REQ-004, REQ-008, REQ-010)
- Given `#/browse?view=platforms&years=2018-2024&field=catalysis&mt=flow_reactor`, when the page loads, then the
  "Platforms" button has `aria-pressed="true"`, From shows 2018, To shows 2024, the catalysis and flow_reactor boxes
  are checked, the "all" radio button in the group "Module types match" is checked, and the count line reads
  "6 of 280 platforms" in an element with `aria-live="polite"`.
- When "Papers" is activated, then the count line reads "6 of 238 papers" and the hash is
  `#/browse?years=2018-2024&field=catalysis&mt=flow_reactor`.
- The software autonomy option 3 has a label containing "3" and "closed-loop iteration over an algorithm-generated
  search space".
- Given `#/browse?q=Bedard2018`, then the Bedard2018 row's Platforms cell shows 11 and 11 links labelled P1, P2, …,
  P11 in that order, the first pointing to `#/platform/Bedard2018/P1`.
- The site navigation has links "Home" (`#/`) and "Browse" (`#/browse`); following "Home" shows the counts table and
  the platform list of SPEC-VIEW-001.

### AC-10 Filters write the URL without history entries (REQ-003, REQ-004)
- Given home, when "Browse" is followed, the "Platforms" button activated and `chemspeed` typed in the search box,
  then the count line reads "3 of 280 platforms", the hash is `#/browse?view=platforms&q=chemspeed`, and
  `history.length` equals its value right after "Browse" was followed.
- When the browser goes back, then home is shown.
- Given `#/browse?view=platforms&q=chemspeed`, when the "Browse" link is followed, then the search box is empty, the
  "Papers" button is active, the count line reads "238 of 238 papers" and the hash is `#/browse`.
- Given From 2024 and To 2018 typed, then the message "From year is after To year" is shown, the count line reads
  "238 of 238 papers" and the hash has no `years`.
- Given `#/browse`, when `201` is typed in From, then the count line reads "238 of 238 papers" and the hash has no
  `years`.
- Given `#/browse?view=platforms&years=2020-2024&mt=flow_reactor&mtMatch=any&q=Aand2024` and `Aand2024/P1`
  selected for comparison, when "Clear filters" is activated, then the count line reads "280 of 280 platforms", the
  hash is `#/browse?view=platforms`, From, To and the search box are empty, no filter box is checked, both "all"
  radio buttons are checked, and the button reads "Compare (1)".

### AC-11 Match control (REQ-006, REQ-007)
- Given `#/browse?view=platforms&mt=flow_reactor,liquid_handler`, then the count line reads "25 of 280 platforms".
- When "any" is chosen in "Module types match", then it reads "209 of 280 platforms" and the hash contains
  `mtMatch=any`; after "Papers", it reads "176 of 238 papers".
- When "all" is chosen again, then it reads "19 of 238 papers" and the hash has no `mtMatch`.

### AC-12 Sorting and column chooser by keyboard (REQ-011, REQ-012, REQ-016)
- On `#/browse`, Tab to the "Year" header button and press Enter: `aria-sort="ascending"`, first row `King1974`;
  Enter again: `descending`, first row `Adesiji2026a`; Enter again: `none`, first row `Aand2024`.
- On `#/browse?view=platforms`, Enter on "Steps": first row has 4 steps; again: first row `HamediRad2019/P1`.
  Sorting by "Name" ascending and descending both leave a row with "—" as the last row.
- In the paper column chooser, unchecking "Venue" removes the "Venue" header; the "Paper" checkbox is present,
  checked and disabled. In the platform column chooser the "Platform" and "Select" checkboxes are present, checked and
  disabled.

### AC-13 Selecting platforms for comparison (REQ-013, REQ-016)
- Given `#/browse?view=platforms&q=Aand2024`, when Space is pressed on the focused checkbox "Select Aand2024/P1 for
  comparison", then the "Compare (1)" button, shown above the platform table, is disabled.
- When the search is changed to `Li2020` and `Li2020/P1` is selected with Space, then "Compare (2)" is enabled; when
  `Li2020/P1` is unchecked, it reads "Compare (1)" and is disabled; when it is checked again, "Compare (2)" is enabled.
- When the search is changed to `Angello2022` and `Angello2022/P1` is selected, then "Compare (3)" is enabled and,
  after clearing the search, the checkbox of every other row is disabled.
- When Enter is pressed on "Compare (3)", then the hash is `#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1`; when
  the browser goes back, the browser is shown again with the hash it had before.

### AC-14 Comparison page (REQ-014, REQ-016)
- Given `#/compare/Aand2024/P1,Li2020/P1`, then two columns head with "auto-optimization platform (AOP)" and
  "Intelligent cloud lab (MAOSIC)", each id linking to its viewer hash; the module-type table has 6 rows with
  `instrument_optical` showing 1 and 2 and `liquid_handler` showing "—" and 1; the transfer-mode table has rows
  `fixed_tubing` (3, 3) and `robot_arm_gantry` ("—", 1); the step lists have 6 and 9 entries in order 1 to 6 and
  1 to 9.
- Given `#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1`, then there are 3 columns, 8 module-type rows and 3
  transfer-mode rows. No page error in either case.

### AC-15 Comparison errors (REQ-015)
- `#/compare/Aand2024/P1` and a hash with 4 known ids each show a message stating the number of ids given and that 2
  or 3 are needed.
- `#/compare/Aand2024/P1,Aand2024/P1` names `Aand2024/P1` as listed twice; `#/compare/Aand2024/P1,Nope2000/P1` names
  `Nope2000/P1` as unknown.
- For `#/compare/Aand2024/P1,Li2020/P1`, with the request for `data/platforms/Li2020.json` intercepted by Playwright
  `route`:
  - answered with HTTP 500 → a message naming `data/platforms/Li2020.json`;
  - answered with HTTP 200 and body `not json` → a message naming `data/platforms/Li2020.json`;
  - answered with HTTP 200 and body `{"paper_id":"Li2020","platforms":[]}` → a message naming `Li2020/P1` and
    `data/platforms/Li2020.json`;
  - aborted with `route.abort()` → a message naming `data/platforms/Li2020.json`.
- Each message has links to Browse and Home; no page error in any case.

### AC-16 Narrow screen and gates (REQ-016, all)
- At 375 × 800, on `#/browse`, on `#/browse?view=platforms` and on
  `#/compare/Aand2024/P1,Li2020/P1,Angello2022/P1`, `document.documentElement.scrollWidth` is at most 375.
- `npm test`, `npm run typecheck`, `npm run build` and `npm run e2e` (new and existing viewer tests) pass;
  `src/lib/` coverage is at least 85%; `package.json` lists `"@tanstack/react-table": "9.3.1"`.
