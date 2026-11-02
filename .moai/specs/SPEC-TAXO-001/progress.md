# Progress: SPEC-TAXO-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- plan-auditor: iteration 1 FAIL 0.82 (1 blocking major defect D1, 5 blocking minor D2 to D6, 6 optional D7 to
  D12); all twelve applied in version 0.2.0. Report: `.moai/reports/plan-audit/SPEC-TAXO-001-review-1.md`.
  Script changes for 0.2.0: section 4 prints the REQ-004 (g)/(h) checks (data_transfer the only non-material mode;
  0 classes whose counts differ from the browse columns; smallest non-zero counts 4 and 4); section 6 prints the
  sources once per entry (294 / 192 / 102) beside the per-row sum (373 / 271 / 102), the source part counts (1: 102,
  3: 271) and the empty cells in covered kinds (none).
- plan-auditor: iteration 2 PASS 0.92 (no blocking defect; optional N1 to N3 applied in version 0.3.0). Report:
  `.moai/reports/plan-audit/SPEC-TAXO-001-review-2.md`. The SPEC was approved by the researcher through
  AskUserQuestion on 2026-11-02 with N1 to N3 applied. For 0.3.0 the script's REQ-004 (h) check runs on every class
  except those of (g), zero-item field_tag/unmapped included; it still finds no difference (one output label changed).
- Tier M; artifacts: spec.md, plan.md, acceptance.md (plus `expected-counts.mjs` and this file).
- Size: 16 REQs, 16 ACs (Tier M ceiling 16 each).
- Dependencies: SPEC-DATA-001, SPEC-BROWSE-001 and SPEC-TRENDS-001 have status completed (frontmatter checked
  2026-11-02).
- SPEC ID check: `[[ "SPEC-TAXO-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL` printed
  `PASS`; no other SPEC directory uses the id.
- Researcher decisions of 2026-11-02 (taken by the orchestrator through AskUserQuestion, binding):
  1. Unit-operation filter in the browser: `unit_operations` on index platform rows, URL keys `uo` and `uoMatch`
     (default all), platform-level like `mt`/`tm` (spec REQ-001, REQ-006, REQ-007).
  2. `data_transfer` links to the unfiltered platform list with a note; the build fails if its platform count is not
     the total (REQ-004 g, REQ-012).
  3. Layout: `#/taxonomy` overview and `#/taxonomy/<class_kind>/<class>` class pages (REQ-009, REQ-011 to REQ-014).
  4. Up to 5 example platforms, by item count descending then platform id; field tags by platform id (REQ-002).
- Decisions taken in the plan phase (for the auditor and the researcher to check):
  - The unfiltered-link case is a rule, not a class name: a class that is not offered gets the unfiltered links when
    its platform and paper counts equal the totals. The build check (REQ-004 g) covers both counts, so the papers link
    `#/browse` is as safe as the platforms link. The note names the class from data.
  - The trends dashboard gets `uo` as a filter only, not a split. The two `mt`/`tm` paper captions change by one
    phrase, because the papers they count must now also meet the unit-operation filter (REQ-008).
  - No unit-operation column in the browser tables: column lists and their tests stay unchanged, and a platform's
    unit operations are visible in its viewer.
  - The `unmapped` classes of module types, transfer modes and unit operations have no correspondence row; their pages
    say so (REQ-013).
  - Vocabulary sub-sections are headed by the vocabulary name as recorded (XDL, WCSO, …) and show the README
    reference of the row their source keys belong to; the build fails unless each vocabulary's keys sit in one README
    row (REQ-004 f).
  - The "not covered" text is computed from the kinds a vocabulary covers, so "module types only" is not written in
    `src/`.
  - `none` entries show their sources as recorded; four carry page and locator (Gottstein2026 for human, software,
    data_transfer, human_transfer).
  - Relations without an explanation in the data dictionary (exact, none) show an em dash as meaning.
  - Unit-operation families are listed alphabetically (also the order of `core/uo_family.csv`); family definitions are
    out of scope.
  - Size ceilings: `taxonomy.json` 120,000 bytes (estimate 94,799), `index.json` 260,000 bytes (estimate 247,729).
  - The fixture release is extended to pass the new build checks; its fixture-derived expected values change and are
    listed in §E.2 by the run phase.
- Baseline (2026-11-02, HEAD 3cc747f): `public/data/index.json` sha256
  5e8c75ddb0ca66039fade88d33afb392b9eceb0df7e2027050c0997bf5cf0853 (204,900 bytes) and `public/data/taxonomy.json`
  sha256 ca2d7be9bf86b78be00bcb24a958dcd026fac31c06c60f4f4e6ae657e15e7f94 (35,742 bytes), both derived before this
  SPEC. In the verified cache `.cache/release/extract/sdl-workflows-1.0.0/`, `modes/taxonomy/classes.csv`,
  `modes/taxonomy/correspondence.csv`, `core/taxonomy_correspondence.csv`, `README.md`, `data_dictionary.csv` and
  `core/transfer_mode.csv` are byte-identical (`cmp`) to the local release.
- Expected numbers: `node .moai/specs/SPEC-TAXO-001/expected-counts.mjs` run from the repository root on 2026-11-02,
  exit 0. Verbatim output (re-run for version 0.3.0):

```

== 1. index.json unit_operations (REQ-001) ==
platform rows                                              280
rows with an empty unit_operations list                    0
distinct unit operations per platform: min / max           [4,15]
sum of list lengths                                        2155
unit_operations of Aand2024/P1                             ["analyze_data","dispense_liquid","handle_sample","measure_optical","plan_next_experiment","react_photo_electro"]
unit_operations of Zhao2026/P1                             ["analyze_data","centrifuge","dispense_liquid","dispense_solid","evaporate_dry","generate_instructions","handle_sample","measure_separation_ms","plan_next_experiment","react_photo_electro","react_thermal","sample_aliquot","sonicate","wash_extract"]
offered unit operations (uo)                               31
offered uo, in order                                       analyze_data, anneal, assemble_device, centrifuge, clean_equipment, cool_quench, deposit_coat, dispense_liquid, dispense_solid, evaporate_dry, filter, generate_instructions, handle_sample, measure_electrochemical, measure_imaging, measure_optical, measure_physical, measure_separation_ms, measure_structural, mix, plan_next_experiment, preheat, prepare_substrate, purify, react_flow, react_photo_electro, react_thermal, sample_aliquot, sonicate, unmapped, wash_extract
index.json bytes: current / with unit_operations (estimate) [204900,247729]

== 2. uo URL and filter rules (REQ-006, REQ-007) ==
#/browse?view=platforms&uo=sonicate                        5 of 280 platforms
#/browse?uo=sonicate                                       5 of 238 papers
#/browse?view=platforms&uo=mix,sonicate                    0 of 280 platforms
#/browse?view=platforms&uo=mix,sonicate&uoMatch=any        111 of 280 platforms
#/browse?uo=mix,sonicate                                   0 of 238 papers
#/browse?uo=mix,sonicate&uoMatch=any                       98 of 238 papers
#/browse?view=platforms&uo=unmapped                        39 of 280 platforms
#/browse?view=platforms&mt=liquid_handler&uo=dispense_solid 18 of 280 platforms
#/browse?mt=liquid_handler&uo=dispense_solid               16 of 238 papers
#/browse?view=platforms&tm=mobile_robot&uo=handle_sample   4 of 280 platforms
#/browse?years=2018-2024&field=catalysis&uo=react_thermal  3 of 238 papers
#/browse?view=platforms&uo=plan_next_experiment            280 of 280 platforms
#/browse?view=platforms&uo=clean_equipment,dispense_liquid 74 of 280 platforms
#/browse?uo=clean_equipment,dispense_liquid                61 of 238 papers
#/browse?uo=clean_equipment,dispense_liquid&q=Roch2020     0 of 238 papers
#/browse?view=platforms&q=Roch2020                         5 of 280 platforms
uo pair where split platforms would differ (first found)   ["clean_equipment","dispense_liquid"]
  papers, one platform has both (REQ-007)                  61
  papers, both on any platforms of the paper (not the rule) 62
  papers counted only by the wrong rule                    ["Roch2020"]
decode uo=sonicate,mix                                     {"uo":["mix","sonicate"],"uoMatch":"all"}
decode uo=mix,xx,mix                                       {"uo":["mix"],"uoMatch":"all"}
decode uo=xx                                               {"uo":[],"uoMatch":"all"}
decode uo=mix&uo=xx                                        {"uo":[],"uoMatch":"all"}
decode uo=xx&uo=mix                                        {"uo":["mix"],"uoMatch":"all"}
decode uoMatch=any                                         {"uo":[],"uoMatch":"any"}
decode uoMatch=some                                        {"uo":[],"uoMatch":"all"}
decode uo=                                                 {"uo":[],"uoMatch":"all"}
decode uo=%E0,mix                                          {"uo":["mix"],"uoMatch":"all"}
encode {view platforms, mt flow_reactor, tmMatch any, uo [sonicate, mix], uoMatch any, q pump} view=platforms&mt=flow_reactor&tmMatch=any&uo=mix,sonicate&uoMatch=any&q=pump

== 3. classes per kind and families (REQ-002, REQ-011) ==
classes                                                    69
  field_tag                                                10
  module_type                                              22
  transfer_mode                                            6
  unit_operation                                           31
unit-operation families, alphabetical (name: classes)      analyze: 1, form: 2, handle: 2, measure: 6, mix: 2, plan: 2, prepare: 4, react: 6, separate: 5, unmapped: 1
classes with a family outside unit operations              0

== 4. per-class counts, links and count lines (REQ-002, REQ-012, REQ-015) ==
  field_tag      analytical_chemistry        items   12 papers      platforms  16  papers  12
  field_tag      battery_electrochem         items   15 papers      platforms  15  papers  15
  field_tag      biology_biochem             items   22 papers      platforms  22  papers  22
  field_tag      catalysis                   items   23 papers      platforms  23  papers  23
  field_tag      chemistry_synthesis         items   85 papers      platforms 123  papers  85
  field_tag      materials_inorganic         items   12 papers      platforms  12  papers  12
  field_tag      materials_polymer_soft      items   31 papers      platforms  33  papers  31
  field_tag      materials_thin_film         items   24 papers      platforms  24  papers  24
  field_tag      nanomaterials               items   46 papers      platforms  48  papers  46
  field_tag      unmapped                    items    0 papers      platforms   0  papers   0
  module_type    assembly_unit               items    4 modules     platforms   4  papers   4
  module_type    batch_reactor               items   86 modules     platforms  73  papers  67
  module_type    coating_printing_unit       items   31 modules     platforms  29  papers  29
  module_type    commercial_integrated       items    4 modules     platforms   4  papers   4
  module_type    flow_reactor                items  139 modules     platforms 127  papers  99
  module_type    fluidics                    items  188 modules     platforms 176  papers 141
  module_type    human                       items   33 modules     platforms  32  papers  29
  module_type    instrument_electrochemical  items   31 modules     platforms  30  papers  30
  module_type    instrument_imaging          items   40 modules     platforms  37  papers  37
  module_type    instrument_optical          items  120 modules     platforms 114  papers 107
  module_type    instrument_physical         items   39 modules     platforms  31  papers  30
  module_type    instrument_separation_ms    items  109 modules     platforms 106  papers  81
  module_type    instrument_structural       items   29 modules     platforms  29  papers  28
  module_type    liquid_handler              items  129 modules     platforms 107  papers  97
  module_type    mixer                       items   48 modules     platforms  44  papers  43
  module_type    sample_handling_station     items   20 modules     platforms  18  papers  18
  module_type    separation_unit             items   49 modules     platforms  40  papers  36
  module_type    software                    items  358 modules     platforms 280  papers 238
  module_type    solid_dispenser             items   22 modules     platforms  18  papers  17
  module_type    storage                     items   51 modules     platforms  43  papers  42
  module_type    thermal_unit                items   45 modules     platforms  38  papers  37
  module_type    unmapped                    items   28 modules     platforms  24  papers  24
  transfer_mode  data_transfer               items  611 connections platforms 280  papers 238
  transfer_mode  fixed_tubing                items  455 connections platforms 172  papers 134
  transfer_mode  human_transfer              items  146 connections platforms  57  papers  51
  transfer_mode  mobile_robot                items   42 connections platforms   9  papers   9
  transfer_mode  robot_arm_gantry            items  426 connections platforms 106  papers 102
  transfer_mode  unmapped                    items    7 connections platforms   6  papers   6
  unit_operation analyze_data                items  288 steps       platforms 280  papers 238
  unit_operation anneal                      items   20 steps       platforms  16  papers  16
  unit_operation assemble_device             items    6 steps       platforms   6  papers   6
  unit_operation centrifuge                  items   20 steps       platforms  13  papers  13
  unit_operation clean_equipment             items   91 steps       platforms  79  papers  66
  unit_operation cool_quench                 items   47 steps       platforms  45  papers  41
  unit_operation deposit_coat                items   43 steps       platforms  35  papers  35
  unit_operation dispense_liquid             items  427 steps       platforms 248  papers 209
  unit_operation dispense_solid              items   35 steps       platforms  28  papers  25
  unit_operation evaporate_dry               items   25 steps       platforms  22  papers  22
  unit_operation filter                      items   16 steps       platforms  15  papers  13
  unit_operation generate_instructions       items   92 steps       platforms  91  papers  70
  unit_operation handle_sample               items   77 steps       platforms  49  papers  43
  unit_operation measure_electrochemical     items   32 steps       platforms  30  papers  30
  unit_operation measure_imaging             items   48 steps       platforms  38  papers  38
  unit_operation measure_optical             items  140 steps       platforms 116  papers 109
  unit_operation measure_physical            items   37 steps       platforms  28  papers  27
  unit_operation measure_separation_ms       items  111 steps       platforms 105  papers  80
  unit_operation measure_structural          items   30 steps       platforms  30  papers  29
  unit_operation mix                         items  128 steps       platforms 106  papers  93
  unit_operation plan_next_experiment        items  280 steps       platforms 280  papers 238
  unit_operation preheat                     items   35 steps       platforms  34  papers  30
  unit_operation prepare_substrate           items   13 steps       platforms   8  papers   8
  unit_operation purify                      items   11 steps       platforms  11  papers   9
  unit_operation react_flow                  items  138 steps       platforms 122  papers  94
  unit_operation react_photo_electro         items   22 steps       platforms  22  papers  22
  unit_operation react_thermal               items  135 steps       platforms  85  papers  79
  unit_operation sample_aliquot              items  173 steps       platforms 139  papers 113
  unit_operation sonicate                    items   11 steps       platforms   5  papers   5
  unit_operation unmapped                    items   45 steps       platforms  39  papers  37
  unit_operation wash_extract                items   45 steps       platforms  30  papers  28
classes with browse links                                  68
  of these, unfiltered links (not offered, on every platform) ["transfer_mode/data_transfer"]
classes without browse links                               ["field_tag/unmapped"]
classes whose count lines differ from n_platforms / n_papers 0
sum of n_items, field_tag                                  270
sum of n_items, module_type                                1603
sum of n_items, transfer_mode                              1687
sum of n_items, unit_operation                             2621
papers with no platform                                    0
transfer modes with connections, none material (REQ-004 g) ["data_transfer"]
classes (all but REQ-004 g) whose counts differ from the browse columns (REQ-004 h) []
classes with 0 items                                       ["field_tag/unmapped"]
smallest non-zero n_platforms / n_papers                   [4,4]

== 5. chosen classes: links, count lines, examples (AC-10, AC-12) ==
  field_tag/catalysis  family (none)  items 23 papers, platforms 23, papers 23
    platforms  #/browse?view=platforms&field=catalysis  → 23 of 280 platforms
    papers     #/browse?field=catalysis  → 23 of 238 papers
    examples ["Amara2015/P1","Bai2023a/P1","Baumgartner2019/P1","Bennett2024/P1","Brody2026/P1"]
    example names ["self-optimizing continuous-flow reactor","Lissy Chemical Workstation (Zinsser Analytic) high-throughput robotic platform with off-line HSI and XPS","automated microfluidic optimization platform (droplet platform)","Fast-Cat","autonomous flow reactor platform"]
  field_tag/chemistry_synthesis  family (none)  items 85 papers, platforms 123, papers 85
    platforms  #/browse?view=platforms&field=chemistry_synthesis  → 123 of 280 platforms
    papers     #/browse?field=chemistry_synthesis  → 85 of 238 papers
    examples ["Aand2024/P1","Ahn2023/P1","Aka2019/P1","Amara2015/P1","Angello2022/P1"]
    example names ["auto-optimization platform (AOP)","automated microreactor platform (AMP)","reconfigurable flow platform (autonomous self-optimizing flow reactor)","self-optimizing continuous-flow reactor","automated synthesis instrument (robotic system)"]
  field_tag/unmapped  family (none)  items 0 papers, platforms 0, papers 0
    platforms  (no link)
    papers     (no link)
    examples []
    example names []
  module_type/flow_reactor  family (none)  items 139 modules, platforms 127, papers 99
    platforms  #/browse?view=platforms&mt=flow_reactor  → 127 of 280 platforms
    papers     #/browse?mt=flow_reactor  → 99 of 238 papers
    examples ["Bedard2018/P11 (3)","Nambiar2022/P2 (3)","AbdelLatif2021/P1 (2)","Bedard2018/P10 (2)","Bedard2018/P6 (2)"]
    example names ["Reconfigurable continuous-flow system, ketene generation and [2+2] cycloaddition configuration","modular, robotically reconfigurable continuous flow synthesis platform (convergent multistep configuration)","AI-guided modular microfluidic reactor (self-driving modular LHP QD synthesizer)","Reconfigurable continuous-flow system, photoredox configuration","Reconfigurable continuous-flow system, Horner-Wadsworth-Emmons configuration"]
  module_type/software  family (none)  items 358 modules, platforms 280, papers 238
    platforms  #/browse?view=platforms&mt=software  → 280 of 280 platforms
    papers     #/browse?mt=software  → 238 of 238 papers
    examples ["Koscher2023/P1 (4)","Vogler2023/P1 (4)","Bai2024a/P1 (3)","Bai2024a/P2 (3)","Dave2022/P1 (3)"]
    example names ["integrated autonomous molecular discovery platform (MIT AMD platform)","FINALES-brokered materials acceleration platform (MAP)","Cambridge lab automated flow chemistry platform (Vapourtec)","Singapore lab automated flow chemistry platform (Vapourtec)","Clio"]
  module_type/assembly_unit  family (none)  items 4 modules, platforms 4, papers 4
    platforms  #/browse?view=platforms&mt=assembly_unit  → 4 of 280 platforms
    papers     #/browse?mt=assembly_unit  → 4 of 238 papers
    examples ["Dai2025/P1 (1)","Gao2026/P1 (1)","Toyama2025/P1 (1)","Yik2025/P1 (1)"]
    example names ["Polybot","automated fabrication platform for perovskite solar cells (closed-loop automated manufacturing platform)","Autonomous closed-loop high-throughput materials exploration system for the AHE (combinatorial experiments + NIMO Bayesian optimization)","ODACell 2"]
  transfer_mode/mobile_robot  family (none)  items 42 connections, platforms 9, papers 9
    platforms  #/browse?view=platforms&tm=mobile_robot  → 9 of 280 platforms
    papers     #/browse?tm=mobile_robot  → 9 of 238 papers
    examples ["Song2025/P1 (7)","Wang2026a/P1 (7)","Zhu2024/P1 (7)","Burger2020/P1 (6)","Yang2026a/P1 (5)"]
    example names ["Automated Lab (robotic AI chemist driven by ChemAgents)","AP-Lab","robotic AI-Chemist","mobile robotic chemist (KUKA KMR mobile robot workflow)","robotic AI-Chemist"]
  transfer_mode/data_transfer  family (none)  items 611 connections, platforms 280, papers 238
    platforms  #/browse?view=platforms  → 280 of 280 platforms
    papers     #/browse  → 238 of 238 papers
    examples ["Bai2023a/P1 (4)","Cao2021/P1 (4)","DeCost2022/P1 (4)","Fei2026/P1 (4)","Knox2025/P1 (4)"]
    example names ["Lissy Chemical Workstation (Zinsser Analytic) high-throughput robotic platform with off-line HSI and XPS","Two modular wheel platforms R1 and R2 with offline incubator and viscometer","autonomous scanning droplet cell (autoSDC)","A-Lab GPSS (A-Lab for Glovebox Powder Solid-state Synthesis)","self-driving laboratory platform (tubular flow reactor with online NMR, GPC and DLS)"]
  transfer_mode/unmapped  family (none)  items 7 connections, platforms 6, papers 6
    platforms  #/browse?view=platforms&tm=unmapped  → 6 of 280 platforms
    papers     #/browse?tm=unmapped  → 6 of 238 papers
    examples ["Haque2025/P1 (2)","Leonov2024/P4 (1)","Liang2026/P1 (1)","Low2024/P1 (1)","Pence2026/P1 (1)"]
    example names ["autonomous PLD system","Chemputer platform with Raman spectrometer","self-driving PLD workflow (combinatorial PLD with in-situ RHEED and Bayesian optimization)","AgNP HTE platform (self-driving lab for AgNP synthesis)","roll-to-roll platform"]
  unit_operation/sonicate  family mix  items 11 steps, platforms 5, papers 5
    platforms  #/browse?view=platforms&uo=sonicate  → 5 of 280 platforms
    papers     #/browse?uo=sonicate  → 5 of 238 papers
    examples ["Zhao2026/P1 (6)","Pilz2023/P1 (2)","Dave2022/P1 (1)","Kim2026/P1 (1)","Yang2026a/P1 (1)"]
    example names ["ChemAgents-driven robotic AI chemist","Staubli TX-60 6-axis dipping robot in nitrogen-filled glovebox with SyCoFinder genetic algorithm","Clio","self-driving laboratory (batch synthesis module + electrochemical measurement module)","robotic AI-Chemist"]
  unit_operation/dispense_liquid  family prepare  items 427 steps, platforms 248, papers 209
    platforms  #/browse?view=platforms&uo=dispense_liquid  → 248 of 280 platforms
    papers     #/browse?uo=dispense_liquid  → 209 of 238 papers
    examples ["Singh2025/P1 (12)","HamediRad2019/P1 (7)","Kanda2022/P1 (7)","OrtizPerez2024/P1 (7)","Hu2022/P1 (6)"]
    example names ["iBioFAB (Illinois Biological Foundry for Advanced Biomanufacturing)","BioAutomata (iBioFAB integrated with Bayesian optimization)","LabDroid Maholo booth with Bayesian optimization module (robotic-AI system)","nanoparticle design platform (microfluidic formulation, high content imaging, active machine learning)","robotic workflow for combinatorial mutant creation and MALDI-ToF MS screening"]
  unit_operation/unmapped  family unmapped  items 45 steps, platforms 39, papers 37
    platforms  #/browse?view=platforms&uo=unmapped  → 39 of 280 platforms
    papers     #/browse?uo=unmapped  → 37 of 238 papers
    examples ["Li2026/P1 (3)","Fei2026/P1 (2)","HamediRad2019/P1 (2)","Kim2026/P1 (2)","Sim2024/P1 (2)"]
    example names ["MAX phase intelligent synthesis robot (robot-CNN-LSTM closed loop)","A-Lab GPSS (A-Lab for Glovebox Powder Solid-state Synthesis)","BioAutomata (iBioFAB integrated with Bayesian optimization)","self-driving laboratory (batch synthesis module + electrochemical measurement module)","ChemOS 2.0"]
first class whose examples contain a tie on n              ["module_type/assembly_unit",["Dai2025/P1 (1)","Gao2026/P1 (1)","Toyama2025/P1 (1)","Yik2025/P1 (1)"]]
classes with fewer than 5 examples                         ["field_tag/unmapped:0","module_type/assembly_unit:4","module_type/commercial_integrated:4"]

== 6. correspondence: long table, wide table, cross-check (REQ-003, REQ-004) ==
vocabularies in wide column order                          ["XDL","WCSO","Leong2022","OntoLab_SAREF","Gottstein2026"]
wide rows (classes in the correspondence)                  56
  field_tag                                                0
  module_type                                              21
  transfer_mode                                            5
  unit_operation                                           30
classes not in the correspondence                          ["module_type/unmapped","transfer_mode/unmapped","unit_operation/unmapped"]
long rows                                                  280
filled cells / not-covered cells / cells x vocab total     [245,35,280]
cells with one 'none' target                               106
cells with more than one target                            21
targets parsed from the wide table                         280
long rows whose class is missing from classes.csv          0
long-vs-wide disagreements (targets, relations, sources)   0
cells where the target order differs (same targets)        0
not-covered cells by vocabulary and kind                   {"OntoLab_SAREF transfer_mode":5,"OntoLab_SAREF unit_operation":30}
kinds covered per vocabulary                               {"XDL":["module_type","transfer_mode","unit_operation"],"WCSO":["module_type","transfer_mode","unit_operation"],"Leong2022":["module_type","transfer_mode","unit_operation"],"OntoLab_SAREF":["module_type"],"Gottstein2026":["module_type","transfer_mode","unit_operation"]}
targets by relation                                        {"exact":92,"none":106,"narrower":49,"broader":33}
targets by vocabulary                                      {"XDL":74,"WCSO":61,"Leong2022":68,"OntoLab_SAREF":21,"Gottstein2026":56}
source keys used per vocabulary                            {"XDL":["Mehr2020"],"WCSO":["Schilling2026"],"Leong2022":["Leong2022"],"OntoLab_SAREF":["Bai2024"],"Gottstein2026":["Gottstein2026"]}
entries' sources (once per entry): total / page+locator / key only [294,192,102]
  (summed over the 280 long-table rows instead: total / page+locator / key only) [373,271,102]
source part counts over long rows (REQ-004 i: only 1 or 3 allowed) {"1":102,"3":271}
empty cells in a kind the vocabulary covers (REQ-004 a)    []
key-only sources sit on 'none' rows only                   true
distinct page strings                                      pdf p.3 | p.4 | p.5 | p.11 | p.6 | p.11–12 | p.3 | p.7 | p.9 | p.8 | p.2 | p.10 | pdf p.4 | pdf p.8 | pdf p.7 | p.4–5 | p.6, p.9

== 7. README source table and relation meanings (REQ-003) ==
README table header                                        | Key | Vocabulary | Reference |
README source rows                                         5
  Mehr2020                                                 XDL | doi 10.1126/science.abc2986
  Schilling2026, Schilling2026_SI                          WeChemSynOntology (WCSO) | doi 10.1039/d6dd00058d
  Leong2022                                                MAP workflow framework | doi 10.1016/j.matt.2022.08.017
  Bai2024                                                  OntoLab / SAREF (module types only) | doi 10.1038/s41467-023-44599-9
  Gottstein2026                                            Orchestration levels | doi 10.1016/j.device.2026.101202
README keys                                                ["Mehr2020","Schilling2026","Schilling2026_SI","Leong2022","Bai2024","Gottstein2026"]
source keys used but absent from README                    []
README keys never used                                     ["Schilling2026_SI"]
README row per vocabulary (via its keys)                   {"XDL":["XDL"],"WCSO":["WeChemSynOntology (WCSO)"],"Leong2022":["MAP workflow framework"],"OntoLab_SAREF":["OntoLab / SAREF (module types only)"],"Gottstein2026":["Orchestration levels"]}
relation meanings (data_dictionary.csv)                    [{"match":"exact","meaning":null},{"match":"broader","meaning":"the target is wider than our class"},{"match":"narrower","meaning":"the target is narrower; for Gottstein2026, one of our items may span several of its objects"},{"match":"none","meaning":null}]
relations used in the long table but not defined           []

== 8. taxonomy.json size (REQ-005) ==
taxonomy.json bytes: current (raw correspondence rows)     35742
taxonomy.json bytes: estimate in the shape of spec REQ-002/REQ-003 94799
structured targets in the estimate                         280

== 9. correspondence of chosen classes (AC-13) ==
  module_type/thermal_unit
    XDL            Heater/chiller (exact); Low temperature (exact); circulation chiller (exact); heater chiller (exact); stirrer hotplate (exact)  ←  Mehr2020 ; p.10 ; Fig. 5 · Mehr2020 ; p.4 ; Fig. 2 · Mehr2020 ; p.11 ; main text
    WCSO           heat treatment device (exact); heated magnetic stirrer (exact); temperature change device (exact)  ←  Schilling2026 ; p.5 ; Fig. 2
    Leong2022      furnace (exact); hotplate stirrer (exact); rapid joule heating (exact)  ←  Leong2022 ; p.4 ; Table 1 · Leong2022 ; p.7 ; Fig. 4, CS3
    OntoLab_SAREF  none  ←  Bai2024
    Gottstein2026  setup (exact)  ←  Gottstein2026 ; pdf p.3 ; §Vocabulary and formalism (physical terms)
  module_type/assembly_unit
    XDL            none  ←  Mehr2020
    WCSO           none  ←  Schilling2026
    Leong2022      none  ←  Leong2022
    OntoLab_SAREF  none  ←  Bai2024
    Gottstein2026  setup (exact)  ←  Gottstein2026 ; pdf p.3 ; §Vocabulary and formalism (physical terms)
  module_type/human
    XDL            none  ←  Mehr2020
    WCSO           none  ←  Schilling2026
    Leong2022      Manual task (broader); manual tool (narrower)  ←  Leong2022 ; p.3 ; Fig. 1 · Leong2022 ; p.7 ; CS3
    OntoLab_SAREF  none  ←  Bai2024
    Gottstein2026  none  ←  Gottstein2026 ; pdf p.3 ; Fig. 1
  transfer_mode/mobile_robot
    XDL            none  ←  Mehr2020
    WCSO           none  ←  Schilling2026
    Leong2022      transportation task (broader)  ←  Leong2022 ; p.9 ; Limitations
    OntoLab_SAREF  (not covered)
    Gottstein2026  unit_operation (exact)  ←  Gottstein2026 ; pdf p.4 ; §Results
  unit_operation/sonicate
    XDL            none  ←  Mehr2020
    WCSO           sonicate (exact)  ←  Schilling2026 ; p.5 ; main text · Schilling2026 ; p.2 ; Fig. 1
    Leong2022      material processing (broader)  ←  Leong2022 ; p.2 ; Proposal
    OntoLab_SAREF  (not covered)
    Gottstein2026  unit_operation (narrower)  ←  Gottstein2026 ; pdf p.3 ; §Orchestration objects (UO)
  unit_operation/wash_extract
    XDL            Extract (exact); Separate (exact); Wash (exact)  ←  Mehr2020 ; p.4 ; Fig. 2 · Mehr2020 ; p.11 ; Fig. 6 · Mehr2020 ; p.6, p.9 ; main text (Separate)
    WCSO           extract (exact); wash (exact)  ←  Schilling2026 ; p.4 ; main text
    Leong2022      material processing (broader)  ←  Leong2022 ; p.2 ; Proposal
    OntoLab_SAREF  (not covered)
    Gottstein2026  unit_operation (narrower)  ←  Gottstein2026 ; pdf p.3 ; §Orchestration objects (UO)
none rows whose source has a page and locator              ["module_type/human Gottstein2026: Gottstein2026 ; pdf p.3 ; Fig. 1","module_type/software Gottstein2026: Gottstein2026 ; pdf p.4 ; §Extending the hierarchy to software operations","transfer_mode/data_transfer Gottstein2026: Gottstein2026 ; pdf p.4 ; §Formalism","transfer_mode/human_transfer Gottstein2026: Gottstein2026 ; pdf p.3 ; Fig. 1"]
class named human (kind)                                   module_type

== 10. trends caption with the uo filter (REQ-008) ==
  Papers by first public year and module type. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the module type and meets the module type, transfer mode and unit operation filters; n is the number of matching papers first public in that year. A paper can have several module types, so a column does not add up to n.
  Papers by first public year and transfer mode. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the transfer mode and meets the module type, transfer mode and unit operation filters; n is the number of matching papers first public in that year. A paper can have several transfer modes, so a column does not add up to n.
trends count line with uo, #/trends?uo=sonicate (papers)   5 of 238 papers
```

## §F Phase 4 Mode Selection

- Input parameters: tier M; about 25 files across `scripts/`, `src/`, `tests/`, `e2e/` and the fixture release;
  domains: data pipeline, filter library, routing, view, tests; TypeScript and CSV/Markdown fixtures; concurrency
  benefit low (coding-heavy, each unit builds on the types and derive output of the one before).
- Mode evaluation: direct — not selected (multi-file feature work); serial — selected; fanout — not selected
  (coding-heavy work, not multi-domain research); sweep — not selected (no uniform mechanical transform over ≥ ~30
  files); agent-team — not requested.
- Decision: serial
- Justification: one implementer works through the plan's units in order (types and derive, filters, routes and
  library, view and e2e). The units share types and generated data, so parallel writers would collide; fanout and
  sweep do not apply to coding-heavy work.

## §E.2 Run-phase Evidence

- Pre-flight (HEAD 3b3397d, branch main): `npm test` → `Test Files 23 passed (23)`, `Tests 281 passed (281)`;
  `npm run typecheck` → exit 0.
- Commits (TDD per unit, failing test first):
  - 98b04d7 M1 derive: `unit_operations`, class counts and examples, structured correspondence, REQ-004 checks;
    fixture extension; SPEC status draft → in-progress.
  - 1b0833d M2 `uo`/`uoMatch` filter state, URL, rules, FilterPanel group; trends caption phrase.
  - 7ed2cf5 M3 taxonomy routes and `taxonomyHash`; `src/lib/taxonomy.ts`; real-data link consistency test.
  - bb603d4 M4 `src/views/Taxonomy.tsx`, App lazy chunk and nav link, CSS, `e2e/taxonomy.spec.ts`, AC-14 e2e cases.
- RED evidence (verbatim, captured before each implementation):
  - derive (`npx vitest run tests/derive.test.ts tests/counts.test.ts`): `Tests 23 failed | 16 passed (39)`, e.g.
    `AssertionError: expected { 'PaperA2024/P1': undefined, …(2) } to deeply equal { 'PaperA2024/P1': [ …(2) ], …(2) }`.
  - uo filter (`npx vitest run tests/filterState.test.ts tests/filterUrl.test.ts tests/filterApply.test.ts
    tests/trends.test.ts`): `Tests 27 failed | 97 passed (124)`.
  - route (`npx vitest run tests/route.test.ts`): `Tests 2 failed | 40 passed (42)`,
    `TypeError: taxonomyHash is not a function`.
  - taxonomy lib (`npx vitest run tests/taxonomy.test.ts tests/libBoundary.test.ts`): `Error: Failed to load url
    ../src/lib/taxonomy … Does the file exist?` and `ENOENT: … src/lib/taxonomy.ts`.
  - Written after the code they test: `tests/taxonomy-derive.test.ts` (real-release check of the derive unit that the
    fixture tests drove) and the Playwright view tests.
- Fixture release changes (spec §3) and the fixture-derived expected values that changed with them:
  - `modes/builder/platform_graphs.jsonl`: `PaperA2024/P2` gains connection E3 (data_transfer, M1→M2);
    `PaperB2025/P1` gains module M2 (fluidics) and connection E1 (data_transfer, M2→M1), so data_transfer is on all
    three platforms. `core/module.csv` +1 row, `core/connection.csv` +2 rows; `modes/builder/platforms.csv`
    `PaperB2025/P1`: n_modules 1 → 2, module_types `software` → `software,fluidics`.
  - `modes/taxonomy/correspondence.csv` rewritten: vocabularies XDL, OntoLab_SAREF (module types only),
    Gottstein2026; classes fluidics, software, data_transfer, dispense_liquid; relations exact/broader/narrower/none;
    sources with one or three parts (the relation `broad` and the two-part sources are gone).
  - New: `core/taxonomy_correspondence.csv` (11 rows), `README.md` (source table, 3 rows), `data_dictionary.csv`
    (`taxonomy_correspondence.match` row).
  - `tests/derive.test.ts`: counts modules 5 → 6, connections 3 → 5; usage `module_type:fluidics` 2 → 3,
    `transfer_mode:data_transfer` 1 → 3; platform-row field list and `index.platforms[1]` gain `unit_operations`;
    `classes[0]` gains n_platforms/n_papers/examples/correspondence; the raw correspondence-row assertion is replaced
    by the structured checks. `tests/counts.test.ts` EXPECTED modules 5 → 6, connections 3 → 5.
- Existing tests edited only as REQ-008 allows: row literals of `tests/{compare,identity,platformFilter}.test.ts` and
  the row helper of `tests/filterApply.test.ts` gain `unit_operations: []` only; the `offeredValues` input of
  `tests/filterUrl.test.ts` gains `unit_operations` and its expected value the `uo` group; `OFFERED` literals of
  `tests/filterUrl.test.ts` and `tests/trends.test.ts` gain `uo`; the two mt/tm paper captions of
  `tests/trends.test.ts`. One edit outside that list: the navigation assertion of `e2e/trends.spec.ts` (AC-9) lists
  "Taxonomy" after "Trends", which REQ-009 and AC-11 require.
- Sizes written by `npm run build-data` on release 1.0.0: `public/data/taxonomy.json` 94,799 bytes (ceiling
  120,000), `public/data/index.json` 247,729 bytes (ceiling 260,000) — both equal the script's estimates.
- `node .moai/specs/SPEC-TAXO-001/expected-counts.mjs` after `npm run build-data`: exit 0; its output differs from
  the §E.1 run only in the two "current" size lines (`[204900,247729]` → `[247729,247729]`, `35742` → `94799`).
- Final gates (HEAD bb603d4 before this record): `npm test` → `Test Files 25 passed (25)`, `Tests 369 passed (369)`;
  `npm run typecheck` exit 0; `npm run build` exit 0 (chunk `dist/assets/Taxonomy-gdrOlCvI.js` 8.95 kB);
  `npm run e2e` → `47 passed` (34 existing + 13 new); `npx vitest run --coverage`: `src/lib` statements 100 %,
  branches 97.18 %; `src/lib/taxonomy.ts` statements 100 %, branches 89.85 %.
- Interpretations made in the run phase (no SPEC body edited):
  - The class route is `{ kind: "taxonomyClass", classKind, cls }`; `kind` is already the route discriminant.
  - `classLinks` returns no link and no note for a class that is not offered, has platforms and is not on every
    platform; REQ-004 (g)/(h) make that case unreachable on valid data.
  - The README parse requires the header row `Key | Vocabulary | Reference` and stops at the next `## ` heading.
  - A platform row without a graph would get `unit_operations: []` (none in 1.0.0; the count check rejects it).
  - Wide-table rows whose class is not in `classes.csv` are not checked; REQ-004 (c) names the long table only.
  - On the class page the kind and family are a definition list (Kind, Family); the example caption is shown only
    when there are examples.
  - A duplicated long-table row (AC-4 d) is reported by check (a), which runs first; check (d) stays as a final guard.
- Not done here: the screenshot check at 1280 px and 375 px (orchestrator, per acceptance.md).

## §E.3 Run-phase Audit-Ready Signal

- run_status: audit-ready
- run_complete_at: 2026-11-02
- AC-1 to AC-16: PASS (unit tests in `tests/{derive,counts,taxonomy-derive,filterState,filterUrl,filterApply,trends,
  route,taxonomy,libBoundary}.test.ts`, Playwright in `e2e/{taxonomy,browse,trends}.spec.ts`).
- `public/data/` is built (release 1.0.0) for the orchestrator's browser check.

## §E.4 Sync-phase Audit-Ready Signal

- sync_at: 2026-11-02
- Implementation commits: 98b04d7..8fcd5a4 (pushed to the private remote github.com/ccy5123/sdl-workflows-explorer,
  main).
- Orchestrator verification at sync (HEAD 8fcd5a4): `npm run typecheck` exit 0; `npm test` 25 files / 369 tests
  passed; `node .moai/specs/SPEC-TAXO-001/expected-counts.mjs` exit 0; `npm run e2e` 47 passed; `public/data/`
  sizes `taxonomy.json` 94,799 bytes, `index.json` 247,729 bytes.
- Browser check by the orchestrator (dev server 127.0.0.1:5173):
  - 1280 px: `#/taxonomy` and `#/taxonomy/module_type/thermal_unit`, scrollWidth 1265, no horizontal scroll.
  - thermal_unit's "38 platforms" link opened `#/browse?view=platforms&mt=thermal_unit` showing "38 of 280
    platforms"; unit_operation/sonicate "5 platforms" opened `#/browse?view=platforms&uo=sonicate` showing "5 of 280
    platforms".
  - 375 px: `#/taxonomy` and `#/taxonomy/transfer_mode/data_transfer`, scrollWidth 375, no horizontal scroll; tables
    stacked as labelled blocks; data_transfer showed the unfiltered-list note.
  - No console errors.
- Change outside REQ-008's list, accepted by the orchestrator: one existing navigation assertion in
  `e2e/trends.spec.ts` now includes "Taxonomy", as REQ-009 / AC-11 require.
- Docs: `.moai/project/` and `docs/plan.md` are current; no changes. Step 5 of `docs/plan.md` (taxonomy explorer) is
  done with this SPEC; the next step is step 6 (benchmark view), not started.
- sync_commit_sha: 6547cc5

## Amendment 0.4.0

- 2026-11-02, in-place amendment of the completed 0.3.0 (prior_completed_sha 9993952); spec.md status back to
  `in-progress`, `amendment_of: SPEC-TAXO-001`. Reason: the researcher's screen check at 800 px and 375 px.
- Changed requirements: REQ-005, REQ-009, REQ-011, REQ-013, REQ-015, REQ-016. Changed acceptance criteria: AC-5, AC-9,
  AC-10, AC-11, AC-13, AC-16. Counts stay at 16 REQ and 16 AC.
- Scope: overview order with an "On this page" jump list (buttons, hash unchanged); a caption sentence on papers with
  several field tags; site glosses for `exact` and `none` in the Relations table; the class page correspondence as one
  table Vocabulary | Term | Relation | Source with vocabulary display labels linking to `#/taxonomy?source=<key>`; line
  breaks in class names and vocabulary labels only after "_" or at a space. No change to the derived data.
- Figures the new acceptance criteria use were checked on the built `public/data/taxonomy.json` (release 1.0.0):
  245 entries, 280 targets, 35 vocabulary-class pairs not covered (315 table rows); flow_reactor has an XDL entry;
  no "searched: …" text contains a `BANNED_SUBSTRINGS` entry. `moai spec lint` on spec.md: 0 errors, 1 expected
  warning (StatusGitConsistency: frontmatter `in-progress` while git history implies `completed`).
- Plan-audit cache for this SPEC is invalidated by the spec.md change; the run phase starts with a new plan audit.
- The run phase records its evidence in §E.2 and §E.3 as additional entries; the sync phase updates §E.4.

### Run evidence

- 2026-11-02, base 14351ab, TDD per unit (route, `src/lib/taxonomy.ts`, view/e2e). Recorded here rather than in §E.2/§E.3
  at the orchestrator's instruction for this run.
- Pre-flight on 14351ab: `npm test` 369 passed (25 files); `npm run typecheck` exit 0; `npm run e2e` 47 passed.
- RED, route (`npx vitest run tests/route.test.ts`): 4 failed | 50 passed; e.g.
  `AssertionError: expected { kind: 'notFound', …(1) } to deeply equal { kind: 'taxonomy', source: 'a b' }` and
  `TypeError: taxonomySourceHash is not a function`.
- RED, library (`npx vitest run tests/taxonomy.test.ts`): 13 failed; e.g.
  `expected 'Mehr2020 ; p.10 ; Fig. 5' to be 'Mehr2020, p.10, Fig. 5'`, `TypeError: correspondenceRows is not a function`,
  `TypeError: relationMeaning is not a function`.
- RED, view: the new `e2e/taxonomy.spec.ts` run against the 14351ab code in a temporary detached worktree (removed
  afterwards): 9 failed, 7 passed; e.g. AC-13 `expect(locator).toHaveCount(expected) failed Expected: 1 Received: 0`,
  AC-16 `Tab did not reach the BUTTON Field tags within 400 presses`.
- GREEN: `npm run typecheck` exit 0; `npm test` 389 passed (25 files); `npm run e2e` 52 passed; `npx vitest run
  --coverage`: `src/lib` 100 % statements and lines (route.ts 98.21 % branches, taxonomy.ts 92.13 % branches);
  production `vite build` (to a temporary directory) emits `assets/Taxonomy-*.js`.
- Line breaks measured per character (temporary probe, not kept): at 800 px and 375 px no overview class name wraps
  (each fits its stacked cell); at 375 px "Gottstein2026 orchestration levels" wraps at a space; at 1280 px four class
  names wrap (materials_polymer_soft, instrument_electrochemical, generate_instructions, plan_next_experiment). No
  `white-space: nowrap` fallback was needed for "OntoLab/SAREF".
- Files: `src/lib/route.ts`, `src/lib/taxonomy.ts`, `src/views/Taxonomy.tsx`, `src/styles.css`, `tests/route.test.ts`
  (new cases only), `tests/taxonomy.test.ts`, `e2e/taxonomy.spec.ts`. `src/App.tsx` unchanged: it already passes the
  whole route, which now carries `source`. `BANNED_SUBSTRINGS` in `src/lib/trends.ts` unchanged; the AC-10 test checks
  more texts against it.
