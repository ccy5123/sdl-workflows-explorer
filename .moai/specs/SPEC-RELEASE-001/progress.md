# Progress: SPEC-RELEASE-001

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-11-02
- Tier M (about 20 files); artifacts: spec.md, plan.md, acceptance.md (plus this file). Size: 11 REQs, 7 ACs.
- plan-auditor: iteration 1 FAIL 0.78 (MP-2 failed on REQ-006; stale SHA after the bundle rebuild; D1 to D14), all
  applied in 0.2.0 except D10's `docs/plan.md` part (planning record, out of scope). Report:
  `.moai/reports/plan-audit/SPEC-RELEASE-001-review-1.md`.
- 0.2.0 also carries the orchestrating session's two changes: the rebuilt bundle (b1d35a52…, 2,483,740 bytes; pin
  as a separate provisional commit) and the plain-language rule with its six findings (finding 5 is release text,
  reported back and left).
- plan-auditor: iteration 2 FAIL 0.87 (MP-2 on REQ-008/REQ-011 wording; N1 export rewritten after the pinned zip;
  N3 REQ-008 coverage), applied in 0.3.0. Report: `SPEC-RELEASE-001-review-2.md`.
- 0.4.0: final bundle 98ea319b… (2,484,010 bytes, MD5 ee6c2e45…, sdl-db ae25d90), re-measured (plan §A, AC-3). That
  Zenodo draft 23875743 holds this file was confirmed by the orchestrating session (not observable from here); the
  pre-merge re-check in `docs/deploy.md` covers it.
- plan-auditor: iteration 3 FAIL 0.92 on one must-pass word (REQ-003 "No check is deleted" without `shall`; F1),
  optional F2-F4. F1 to F4 applied in 0.4.0 (REQ-003 and REQ-002 wording, the test list of spec §2, finding 5 settled
  in the release, this note). Iteration cap reached; the auditor recommends acceptance once F1 is made, checked on
  that line alone. Report: `SPEC-RELEASE-001-review-3.md`.
- Implementation Kickoff Approval: the researcher approved version 0.4.0 through AskUserQuestion on 2026-11-02 and
  chose autonomous progression (run, screen check, sync and branch push without intermediate stops; no merge, no
  deployment).

## §E.2 Run-phase Evidence

- M1 pin and re-baseline. Tests edited first (`tests/pinned-release.ts` new: pinned version, DOI, extract folder and
  the release's own exclusion reason, shared by Vitest and Playwright). RED: with `release.config.json` back at 1.0.0
  and `fetch-release` + `build-data` run on the 1.0.0 zip, `npx vitest run` gave 5 failed of 525 (config pin; index,
  taxonomy and benchmark changes in release-docs.test.ts; AC-4 baselines in benchmark-derive.test.ts). GREEN after the
  pin commit 194e656 (only `release.config.json`) and `fetch-release` + `build-data` on the 1.1.0 zip (98ea319b…, 90
  files verified): two more failures appeared, both real-data rows that print a Gottstein2026 locator
  (`tests/taxonomy.test.ts` AC-10, `tests/taxonomy-derive.test.ts` AC-3). Their literals were moved to the 1.1.0 value
  ("p.3", "p.4"), as were the same rows in `e2e/taxonomy.spec.ts`. Deviation: `tests/taxonomy.test.ts` was not in
  spec §2's list, and these rows keep literals rather than reading from the release — reading them from the release
  would compare the derived rows with themselves. The synthetic fixture rows in `tests/derive.test.ts` keep "pdf p.3".
  Then Vitest 34 files / 525 passed; `npm run e2e` 162 passed; typecheck 0.
- M2 About and home text. Tests first: the AC-4 phrase case and limits case in `tests/siteText.test.ts`, the AC-4
  e2e test in `e2e/site.spec.ts`. RED: Vitest 19 failed (18 phrases absent from the About text, the limits case);
  the e2e test failed on the `h2` list. GREEN after `src/lib/siteText.ts` (coding sentence "not changed afterwards";
  "Timing data" and "Human-intervention reporting" sections; the new not-included sentence; the home intro sentence)
  and the `src/lib/trends.ts:50` comment (no release number): Vitest 34 files / 544 passed; site.spec 6 passed;
  `git grep -n "1\.0\.0" -- src` prints nothing; typecheck 0.
- Dependencies: SPEC-SITE-001 completed (main at aa10af8).
- Source of the brief: the orchestrating session of 2026-11-02 relayed the researcher's decision to publish the site
  with release 1.1.0 (Zenodo record 23875743, draft on that day), the pin values, the local bundle path and SHA-256,
  and its own measurement (5 failing Vitest tests, unchanged CSV headers and row counts, added files only).
- Measured by this session with the 1.1.0 pin, before any test change: see plan.md §A.
