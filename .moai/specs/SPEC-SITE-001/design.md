# Design: SPEC-SITE-001

## 1. Data flow for the release documents

```
zip (SHA-256 pinned) → fetch-release (MANIFEST check) → .cache/release/extract/{CITATION.cff, DATA_CARD.md}
  → deriveAll().releaseDocs (scripts/lib/citation.ts parses CFF; cross-checks version and doi with core/release.csv)
  → writeDerived → public/data/release-docs.json   (new file; every other derived file unchanged)
  → Home (citation, CITATION.cff block) and About (data card) fetch it when opened
```

`release-docs.json` shape:

```ts
interface ReleaseDocs {
  citation: {
    title: string; version: string; date_released: string; doi: string; license: string;
    authors: { family: string; given: string | null; orcid: string | null }[];
  };
  citation_cff: string; // verbatim
  data_card: string;    // verbatim
}
```

Affiliation and e-mail are not copied into `citation` (the formatted citation does not use them); they remain visible
in the verbatim CFF block. The licence is shown as released, with the SPDX id mapped for display:
`CC-BY-4.0` → "CC BY 4.0" (any other id is shown as is).

## 2. Page layout

Home (`#/`), top to bottom — main content first, reference tables after (the researcher's layout preference):

1. `h1` "SDL Workflows Explorer" and the intro paragraph.
2. "Views": a table, one row per view (View | What it shows). Not repeated cards.
3. "The data": counts table, DOI link, "Download the data" (Zenodo record), "How to cite" with the citation, the
   licence, and a closed `<details>` "CITATION.cff as released".
4. "Platforms": the existing filter and list (unchanged markup and selectors).

The platform-viewer row has no single URL to point to (a platform must be chosen), so the row has a `<button>`
that scrolls to and focuses the platform filter. A `#platforms` fragment link cannot be used: every
hash is a route.

About (`#/about`): `h1` "About the data", one sentence naming the source ("This page summarises the data card,
DATA_CARD.md, of release {version} …", the version from `index.json`), the four summary sections, then "Full text" with a closed `<details>` holding the
data card in a `<pre>` that wraps, and a link to the release on Zenodo. The full text is shown verbatim rather than
rendered as Markdown, as SPEC-BENCH-001 does for `reference_results.json`: no Markdown dependency, and nothing in a
later data card can be mis-rendered.

## 3. Draft text (English; numbers checked by AC-4)

Home intro (counts filled from `index.json`):

> sdl-workflows records which modules published closed-loop self-driving laboratories use, in what order one
> experimental cycle runs its steps on them, and how material moves between the modules. Release {version} codes
> {platforms} platforms described in {papers} papers that one literature search found; About the data explains how
> they were found and coded.

Views table:

| View | What it shows |
|---|---|
| Platform viewer | One platform's modules and connections as a graph, the steps of one cycle, and the page each item comes from. Choose a platform from the list on this page or from Browse. |
| Browse and compare | Papers and platforms in filterable tables; pick two or three platforms to compare side by side. |
| Trends | Papers or platforms counted by first public year, split by integration mode, field tag, autonomy, module type or transfer mode. |
| Taxonomy | The classes used in the coding, with definitions, families, usage counts and correspondence to other vocabularies. |
| Benchmark | The chrono2023 tasks, their train/test split and the reference results as published. |

About, "How the papers were found":

> The 2172 candidates came from the reference lists of three reviews and from keyword searches of Crossref and
> arXiv, both run on 20 October 2026. They were screened on titles (2172), abstracts (655) and full texts (469). A
> paper was eligible when it is an original research paper; an algorithm chose the next experiment from earlier
> results, at least once on the physical system; automated hardware ran the experiments, with isolated manual steps
> allowed; something was made or processed in the loop; and the hardware is described. 238 papers were eligible. A language model working from the
> written criteria made 3240 of the 3298 screening decisions; the researcher made 58.

"How the papers were coded":

> Each paper was coded once by a language model (Claude Opus 5.5) from its main text and supplements, following
> written coding instructions and a taxonomy that were settled on 10 development papers and then frozen. For each
> platform the coding records its modules, the steps of one experimental cycle in order (unit operation, whether a
> robot, a person or software performs it, and the modules involved) and the connections between modules (transfer
> mode, and whether the paper states the transfer or it was inferred from context). Every item carries the document,
> page and figure, table or section that describes it. An item that fits no class is coded unmapped.

"How far the labels can be trusted":

> A second coding of every paper by the same model with the same instructions was compared with the released coding
> item by item; items without a counterpart of the same class are marked uncertain (340 of 2621 steps and 156 of 1687
> connections). For 30 papers, a different model, Claude Fable 5.1, coded the papers under the same instructions as a
> reference. Against it, the released coding reached a field-wise strict micro-F1 of 0.905 for the unit operation of
> steps, 0.898 for module type and 0.891 for transfer mode; the lower bounds of the 95% intervals were 0.862, 0.858
> and 0.847. These figures are agreement between two language models, not accuracy against human coding; the release
> contains no human coding.

"Limits":

> The search ran once, on one date, in two indexes. The 238 papers are the eligible candidates that this search
> found, not every closed-loop self-driving laboratory paper published, so counts by year reflect the search as well
> as the field. Page numbers refer to the file versions that were read; 30 main texts are preprints, and 13 of them
> belong to papers with a journal version whose pages differ. Paper text and abstracts, process conditions, the
> coders' general notes on each paper and the second coding are not included.

Constraint for later edits: `tests/taxonomy.test.ts` bans the string "doi:10." anywhere under `src/`; these texts use
`https://doi.org/...` links only. The about figures are checked as whole number tokens against the pinned data card
(AC-4), so a "30" here must match a "30" in the card, not a digit run inside "2026" or "0.905".

The view-table and intro wording names no count that the release does not carry (the taxonomy row deliberately
gives no class count, which lives in `taxonomy.json`).

## 4. Theme

Site tokens (`src/lib/siteTokens.ts`, mirrored in `styles.css`; contrast checked by AC-5):

| Token | Light (current) | Dark (new) |
|---|---|---|
| `--bg` | `#ffffff` | `#1a1a19` (= `--chart-surface` dark) |
| `--text` | `#1f2328` | `#f0efec` (= `--chart-ink` dark) |
| `--muted` | `#57606a` | `#b8b7ae` |
| `--line` | `#d0d7de` | `#4a4a46` |
| `--panel` | `#f6f8fa` | `#242422` |
| `--accent` (links, focus) | `#0969da` | `#6cb4ff` |

Shared layout properties on `:root` (REQ-012, AC-19): `--table-border` (a colour, = `var(--line)`), `--cell-pad-y`,
`--cell-pad-x`, `--th-weight`, `--section-gap`. The existing table rules keep their selectors and take these values;
border widths stay `1px` or `0`. One shared rule right-aligns numeric cells (`.num`, with tabular figures), used by
every table kind that shows counts.

Measured ratios against `--bg`: light text 15.8, muted 6.4, accent 5.2; dark text 15.2, muted 8.6, accent 8.0.
Okabe–Ito group colours against the dark background are 3.4 to 7.7 (graphical objects, WCAG 1.4.11 asks 3).

Switch: an inline script in `index.html` sets `document.documentElement.dataset.theme` from
`matchMedia("(prefers-color-scheme: dark)")` before the bundle loads (no light flash); `main.tsx` listens for changes
and updates the attribute; a `useTheme()` hook in `src/components/` reads the attribute through a
`MutationObserver`, and `Graph` calls `cy.style(buildStylesheet(theme))` when it changes. `color-scheme: light dark`
on `:root` lets form controls and scrollbars follow. Trends charts already read CSS variables, so they follow the
attribute without code changes.

## 5. Keyboard

- Skip link: first element in `.page`, visually hidden until focused; target `<main id="main" tabIndex={-1}>`.
- `aria-current="page"` from `route.kind` (home, about, browse, trends, taxonomy/taxonomyClass,
  benchmark/benchmarkItems).
- `document.title` set in `App` from the route (names in REQ-010; the platform title uses the route's platform id and
  the class title the route's class, so no data load is needed).
- Visible focus: the existing `:focus-visible` rule stays; any rule that sets `outline: none` or a focus style
  thinner than 2px is removed or replaced. The graph canvas is not a focus stop of its own; its contents are
  reachable through the module, step and connection lists that already exist.

## 6. Pages build

```
vite.config.ts:  defineConfig(({ mode }) => ({ base: mode === "e2e" ? "./" : "/sdl-workflows-explorer/", ... }))
npm run e2e:     vite build --mode e2e --outDir dist-e2e && vite build --outDir dist-pages && playwright test
playwright:      webServer = [ vite preview --mode e2e --outDir dist-e2e :4317 (existing server, mode added),
                               vite preview --mode production --outDir dist-pages :4319 (new) ]
pages.yml:       on: workflow_dispatch → build job (checkout, setup-node 20, npm ci, fetch-release, build-data,
                 typecheck, vitest, vite build, configure-pages, upload-pages-artifact dist) → deploy job
                 (environment github-pages, deploy-pages)
```

`vite preview` reads `base` from the config of its mode; without `--mode e2e` the existing server would take the
production base and redirect `/` (Vite 5.4 preview base middleware), breaking every `goto("/#/...")`. Pinning both
modes keeps the 68 existing specs at the origin root.

Fetches stay relative (`data/index.json`), which resolves under the base because hash routing keeps the document URL
at the base path.
