---
id: SPEC-CONTRIB-001
title: "Links from the explorer to the dataset's GitHub issue forms"
version: "0.2.0"
status: draft
created: 2026-11-02
updated: 2026-11-02
author: cyjoe
priority: P2
phase: "v0.7.0 target"
module: "src/"
lifecycle: spec-anchored
tags: "contribution, issue forms, links, github"
tier: M
depends_on: [SPEC-VIEW-001, SPEC-TAXO-001]
---

## HISTORY

- 2026-11-02 0.1.0 draft. The researcher opened sdl-workflows to outside suggestions through three GitHub issue forms
  in the public code repository `ccy5123/sdl-workflows` (`correction.yml`, `paper.yml`, `taxonomy.yml`; drafted, live
  with that repository's next push). This SPEC adds the entry points on the site. Not a numbered step of
  `docs/plan.md`; step 7 (home/about, deploy) stays out of scope.
- 2026-11-02 0.2.0 after plan audit (PASS 0.91, no blocking defect): AC-3's literal check given as an exact pattern
  over code with comments stripped; no link on the class-not-found page (REQ-005, AC-6); AC-8 names the three new
  strings instead of a general English review.

## 1. Why

A reader who finds a record that does not match its paper, a missing paper, or a class that should map to another
vocabulary should reach the matching issue form from the page they are on, with the item already named, so the
maintainer receives a report tied to an exact id and release.

## 2. Requirements (EARS)

### URL helper

- **REQ-001** (ubiquitous) One pure module `src/lib/contribute.ts` (no UI package, no `window` or `document`) shall
  build every issue-form URL on the site from the base `https://github.com/ccy5123/sdl-workflows/issues/new`. Each
  query value shall be encoded with `encodeURIComponent` (so a space is `%20`, `/` is `%2F`, `[` is `%5B`), and the
  parameters shall come in the order given below:
  - correction: `template=correction.yml`, `title=[correction] <item id>`, `item_id=<item id>`, `release=<version>`;
  - paper: `template=paper.yml`, `title=[paper] ` (trailing space kept);
  - taxonomy: `template=taxonomy.yml`, `title=[taxonomy] <class kind>/<class>`, `class=<class kind> / <class>`.
  No other form field is prefilled; in particular the taxonomy form's `kind` dropdown (the type of proposal) is left
  for the contributor.
- **REQ-002** (ubiquitous) The release version passed to the correction URL shall be `index.release.version` (the
  value the footer already shows, read from the release that `release.config.json` pins by SHA-256), never a literal
  version string in `src/`.

### Entry points

- **REQ-003** (ubiquitous) The platform header (`#/platform/<paper>/<P>`) shall carry a link "Report a problem with
  this record" to the correction URL for the platform id (for example `Aand2024/P1`).
- **REQ-004** (state) While a module, step or connection is selected in the platform viewer, the evidence panel shall
  carry the same link text with the correction URL for that item's id (`Aand2024/P1/M2`, `/S3`, `/E1`); while nothing
  or the platform itself is selected, the evidence panel shall carry no such link (the header link covers the
  platform).
- **REQ-005** (ubiquitous) Each taxonomy class page (`#/taxonomy/<kind>/<class>`) shall carry a link "Propose a
  mapping or change" to the taxonomy URL for that class; the class-not-found page carries no such link.
- **REQ-006** (ubiquitous) The site footer, on every view once `index.json` has loaded, shall carry a link "Suggest a
  missing paper" to the paper URL, after the data version and DOI.
- **REQ-007** (ubiquitous) Every issue-form link shall open in a new tab (`target="_blank"`) with `rel="noopener"`.

### No regression

- **REQ-008** (unwanted) The change shall not introduce horizontal scrolling at a 375 px wide viewport on the
  platform viewer or a taxonomy class page, shall not change the data files or `scripts/`, and shall leave all
  existing Vitest and Playwright tests passing. All new interface text shall be in English.

## 3. How

- `src/lib/contribute.ts` exports `correctionUrl(itemId, release)`, `paperUrl()`, `taxonomyUrl(classKind, cls)` and
  the three link texts; it joins `key=encodeURIComponent(value)` pairs with `&` (not `URLSearchParams`, which writes
  a space as `+`). It is added to the UI-free module list in `tests/libBoundary.test.ts`.
- A small component renders an issue-form link (`<a href target="_blank" rel="noopener">`) so the attributes are
  written once.
- `Header` and `EvidencePanel` receive the release version from `PlatformView`; `Taxonomy`'s class page and the footer
  in `App` call the helper directly.

## 4. Out of scope

### Out of Scope — forms and repositories

No change to the issue forms, CONTRIBUTING or CONTRIBUTORS files; nothing in `~/research/sdl-db` is edited. Whether
the forms exist on GitHub yet is not checked: the tests check the URL, not the page behind it.

### Out of Scope — other views and steps

No links on the browser, comparison, trends or benchmark views; no home/about page, styling pass or deployment
(step 7). The repository stays private.

## 5. Acceptance

See `acceptance.md`.
