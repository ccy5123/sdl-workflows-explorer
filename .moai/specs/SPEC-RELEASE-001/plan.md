# Plan: SPEC-RELEASE-001

## A. Context

Branch `release-1.1.0` from `origin/main` at aa10af8, in a separate worktree
(`~/research/sdl-workflows-explorer-rel110`) so the primary checkout stays on `main`. Final bundle (sdl-db ae25d90,
the file held by Zenodo draft 23875743): `/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.1.0.zip`, 2,484,010
bytes, SHA-256 98ea319b…, MD5 ee6c2e45…; the earlier b77dacc2… and b1d35a52… are void.

Re-pinned in 0.5.0 to the file Zenodo published (673b2dbb…, 2,480,672 bytes); the measurements below describe the
98ea319b… bundle, and those of the published file are in progress.md §E.5 and acceptance.md AC-3.

Measured on the final bundle with the 1.1.0 pin, before any test change: `fetch-release` verifies 90 files;
`build-data` passes with unchanged counts; `benchmark-items.json` 7a709c16… and the platform files 9001ca64… hash as
in 1.0.0; `index.json` 464b1c6d… differs only in `release` (without it: 76908d5a…, as in 1.0.0); `taxonomy.json`
f4b111b0… (56 Gottstein2026 locators `pdf p.N` → `p.N`, and the Leong2022 reference sentence from the README's sources
table) and `benchmark.json` bbf945aa… (exclusion reason) change as AC-3 states; `release-docs.json` 67716ea7…. The
About draft's phrases and numbers were re-checked against the final data card. Failing before any change (measured on
the first 1.1.0 bundle; the final one adds the taxonomy and benchmark baselines and the exclusion-reason literals):
Vitest 5 of 522 (config.test.ts:17; release-docs.test.ts version and
69d2dc7 hashes; benchmark-derive.test.ts AC-4 index hash; benchmark.test.ts:397 DOI); Playwright
`e2e/benchmark.spec.ts` fails to load (reads `.cache/release/extract/sdl-workflows-1.0.0/`), `e2e/taxonomy.spec.ts`
2 ("Data version 1.0.0"), `e2e/trends.spec.ts` 1 (1.0.0 DOI).

Data card 1.0.0 → rebuilt 1.1.0: title; line 8; lines 47-48 ("not changed afterwards" instead of "then frozen");
new "Timing data" and "Human-intervention reporting"; benchmark heading and lines 143-146; the "Not included" list.
"Limitations" unchanged. CITATION.cff: version, date-released 2026-11-02, DOI.

The six plain-language findings of the orchestrating session map to REQ-008 (About "frozen"), REQ-009 (autonomy),
REQ-010 (integration mode), REQ-011 ("On platform", benchmark intro); finding 5 (benchmark "Excluded" line) shows the
release's own `exclusion_reason` text, which the final release rewrote to "one of the 10 development papers of the
coding instructions", so it is settled in the release and the site keeps showing it. Sources of the definitions:
`data_dictionary.csv`
(`paper.sw_autonomy`, `paper.hw_autonomy`, `trends_paper.integration_mode`, `module.on_platform`).

## B. Tasks (TDD)

0. **Final bundle.** Done: the orchestrating session sent the final SHA-256 (98ea319b…); §A was re-measured on it and
   AC-3 holds its baselines.
1. **Pin and re-baseline.** Edit the tests (REQ-002, REQ-003; `e2e/release.ts` reads the pin for the specs; the
   invalid-value rows of `tests/config.test.ts` stop using the old record id). RED:
   restore `release.config.json` to 1.0.0, `npm run fetch-release` and `build-data` with the 1.0.0 zip
   (`/home/cyjoe/research/sdl-db/release/out/sdl-workflows-1.0.0.zip`), run the edited tests — they fail on the 1.1.0
   expectations. GREEN: commit the pin alone (provisional; redone if the bundle changes again), rebuild with the 1.1.0
   zip, run the tests.
2. **About and home text.** Add the AC-4 checks (Vitest phrase case, e2e headings and phrases) — RED; then
   `src/lib/siteText.ts`; `src/lib/trends.ts:50` comment no longer names 1.0.0.
3. **Plain-language fixes.** Add the AC-6 checks (`tests/trends.test.ts` captions, e2e for Browse, Trends, platform
   and benchmark) — RED; then `Browse.tsx` (headers, note), `trends.ts` (labels, captions), `PlatformView.tsx`
   (header, note), `benchmark.ts` (intro).
4. **`docs/deploy.md`** in the REQ-007 order; full suites with the hash check; build; screen check; sync; push.

Final text (each figure phrase verbatim from the rebuilt card):

Home intro, added sentence: "It also holds the times, batch sizes, throughput and cost that the papers state, and what
each paper states about human intervention during its campaign."

"How the papers were coded": "… a taxonomy that were settled on 10 development papers and not changed afterwards. …"
(rest unchanged).

"Timing data": "The release holds the process numbers the papers state: 455 step durations and 186 numbers of samples
one device handles in one run of a step; for platforms, 234 batch sizes, 136 throughputs (92 measured in a campaign, 44
nominal), 13 costs and other quantities; and values for some modules and connections. 229 of the 238 papers have at
least one value. Claude Opus 5.5 extracted the values under written instructions, once per paper, from the
paper's text and its released coding. The instructions allowed only numbers the paper states, with three
calculations: the midpoint of a stated range, a measured throughput as a stated number of experiments divided by a
stated elapsed time of the same campaign, and an expression the paper prints for that one quantity; the model was not
allowed to estimate a value or derive a time from flow rates, volumes or counts. Values are in the paper's unit. A time
the paper gives for several consecutive steps sits on the first of them (57 rows). For the same 30 papers as above,
Claude Fable 5.1 extracted the timing data under the same instructions as a reference. Counting an item as agreeing
when both gave a value and the two differed by at most 10%, the share of agreeing items was 1.000 for throughput (15
platforms) and 0.870 for step duration (54 steps; 95% interval 0.755 to 0.957). This is agreement between two models,
not accuracy; the reference values are not released."

"Human-intervention reporting": "For every paper, the release records what it states about human intervention during
its closed-loop campaign, read by Claude Opus 5.5 under written instructions, once per paper. 26 papers state a
number for it (a count of interventions, person-time, or the frequency of a human task), 73 name tasks people performed
without a number, 51 state that the campaign ran without human intervention, and 88 state none of these. One-time
set-up before the first iteration does not count as intervention, and a capability statement or the word
"autonomous" alone does not count as a statement that the campaign ran without it. 48 papers state a stretch of the
campaign that ran without a person. No second reading exists to compare with."

"Limits", last sentence: "Paper text and abstracts, process conditions other than the stated times, batch sizes,
throughput and cost, the coders' general notes on each paper, the extracting model's notes and free-text qualifiers,
the second coding and the reference values of the timing data are not included."

Browse note (under the paper table): "Integration mode is how material moves between the modules of a paper's
platforms: the one material transfer mode used (which may be unmapped), mixed when several are used, none when no
material connection is coded. Software and hardware autonomy are the categories of Tom et al. (2024). Software
autonomy: 1, one experiment from a data-driven design; 2, closed-loop iteration in which results choose the next
experiment; 3, closed-loop iteration over an algorithm-generated search space. Hardware autonomy: 1, a device doing one
kind of task; 2, a workflow joining several tasks; 3, a fully automated laboratory running varied experiments without
human intervention." (level texts from `SW_LABELS` and `HW_LABELS`, which equal the data dictionary).

Trends captions: integration-mode split appends the integration-mode sentence; software and hardware autonomy splits
append "The levels are the software (hardware) autonomy categories of Tom et al. (2024)."

## C. Risks

| Risk | Mitigation |
|---|---|
| Zenodo URL not live, so a plain `npm run build` fails | Every run sets `SDL_RELEASE_ZIP`; the zip is still checked against the pin |
| The bundle is rebuilt again after pinning | Pin in its own commit; `sha256sum` checked in the same run as the suites; `docs/deploy.md` re-checks the published file before merge |
| A re-baseline hides a real change | Hash checks kept for every unchanged file; `index.json` checked without `release` against the 1.0.0 value and as a whole against its 1.1.0 hash |
| About figures paired with the wrong words | Phrase case: each figure phrase must be verbatim in the card |
| Caption changes break pinned caption tests | Only the tests named in spec.md §2 change, and only on those strings |
| Work lands on `main` by mistake | Separate worktree; push names the branch; `origin/main` checked after the push |

## D. Files

New: `e2e/release.ts`. Edited: `release.config.json`, `src/lib/siteText.ts`, `src/lib/trends.ts`,
`src/lib/benchmark.ts`, `src/views/Browse.tsx`, `src/views/PlatformView.tsx`, `docs/deploy.md`, and the tests listed in
spec.md §2 plus `tests/siteText.test.ts`.
