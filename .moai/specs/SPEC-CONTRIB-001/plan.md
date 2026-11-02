# Plan: SPEC-CONTRIB-001

## A. Context

Follows SPEC-BENCH-001 (closed at 8606ede). The issue forms are drafted in the researcher's release folder
(`~/research/sdl-db/release/public-repo/.github/ISSUE_TEMPLATE/`, read-only here) and go live in
`ccy5123/sdl-workflows` with that repository's next push. Field ids used: `item_id`, `release` (correction), `class`
(taxonomy); titles as in each form's `title:` prefix.

## B. Tasks (TDD per unit)

1. `tests/contribute.test.ts` (AC-1 to AC-3) fails; then `src/lib/contribute.ts`; add the file to
   `tests/libBoundary.test.ts`.
2. `e2e/contribute.spec.ts` (AC-4 to AC-8) fails; then an `IssueLink` component, the `Header` and `EvidencePanel`
   links (release version passed from `PlatformView`), the taxonomy class-page link and the footer link; CSS only if
   the 375 px check needs it.
3. Full suites, browser check at 1280 and 375 px, sync.

## C. Risks

| Risk | Mitigation |
|---|---|
| `URLSearchParams` writes spaces as `+`, which GitHub might keep literally in a title | Build pairs with `encodeURIComponent`; AC-2 checks no raw `+` |
| Prefilling the taxonomy `kind` dropdown with a class kind would select nothing or the wrong option | Not prefilled (REQ-001) |
| The forms are not live yet, so a click lands on a GitHub 404 or the blank form chooser | Tests and the browser check read the URL; the page behind it is out of scope |
| Long link text in the header wraps badly at 375 px | AC-8 scroll check; wrap rather than overflow |
| The pre-commit hook runs the full Vitest suite, so a commit with a failing RED test is refused | Commit test and implementation of a unit together; record the RED run in progress.md |

## D. Files

New: `src/lib/contribute.ts`, `src/components/IssueLink.tsx`, `tests/contribute.test.ts`, `e2e/contribute.spec.ts`.
Edited: `src/components/Header.tsx`, `src/components/EvidencePanel.tsx`, `src/views/PlatformView.tsx`,
`src/views/Taxonomy.tsx`, `src/App.tsx`, `tests/libBoundary.test.ts`, possibly `src/styles.css`.
