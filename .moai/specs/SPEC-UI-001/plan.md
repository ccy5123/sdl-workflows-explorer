# Plan: SPEC-UI-001

## A. Context

Follows SPEC-SIM-001 (main at 1c3788d, release 1.1.0 deployed). Plan source and approval: the sdl-db redesign plan
and the Design canvas, variant B (spec.md HISTORY). Work happens on branch `feat/SPEC-UI-001` in the worktree
`.claude/worktrees/spec-ui-001`; nothing is pushed or deployed.

### A.5 Preserve

- Routes, view names and the views other than Home (they inherit tokens and typefaces only).
- `src/lib/chartTokens.ts` and its test; `src/lib/moduleGroups.ts` colours; every derived data file.
- Class names located by e2e specs: `.benchmark`, `.trends-chart`, `.filter-panel`, `.wf-*`, `.taxo-facts`,
  `.trends-table-details`, `footer.site-footer`, `.skip-link`.
- `~/research/sdl-db` (read-only).

## B. Milestones (tests first per unit)

| M | Unit | Test first | Then |
|---|---|---|---|
| M1 | Tokens, fonts, shell, components | `tests/siteTokens.test.ts` (new values and pairs), `tests/fonts.test.ts`, `tests/theme.test.ts`, `e2e/shell.spec.ts` | `siteTokens.ts`, `styles.css` tokens and component sections, `public/fonts/`, `lib/theme.ts`, `index.html`, `main.tsx`, `App.tsx` shell, `ThemeToggle`, `Skeleton`, `CopyButton` |
| M2 | Labels | `tests/labels.test.ts`, `libBoundary` list | `lib/labels.ts`, `components/Label.tsx` |
| M3 | Home | `tests/home.test.ts`, `tests/siteText.test.ts` (Home text), `e2e/site.spec.ts` (AC-8 to AC-11), `e2e/viewer.spec.ts` home-list part, `e2e/a11y.spec.ts` table routes | `lib/home.ts`, `siteText.ts`, `views/Home.tsx`, styles |
| M4 | Verification | full suites; browser check at 1440 and 375 px, light and dark | fixes from the check |

No plan-auditor run: the plan was reviewed and approved by the researcher in the planning session; recorded as a
gap in progress.md.
