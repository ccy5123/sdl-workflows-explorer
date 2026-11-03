# Design: SPEC-UI-001

Source of the values: `project/Main.dc.html` of the approved Design canvas, variant B (`fontset="arial"`, accent
`indigo`), read on 2026-11-03.

## §1 Colour tokens

| Token | Light | Dark | Mock name |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0b0d12` | `--bg` |
| `--panel` | `#f6f7f9` | `#11141a` | `--surface` |
| `--card` | `#ffffff` | `#151922` | `--card` |
| `--line` | `#e4e7ec` | `#252b36` | `--line` |
| `--line-strong` | `#cdd2da` | `#363d4a` | `--line-strong` |
| `--text` | `#0e1116` | `#eceef2` | `--text` |
| `--muted` | `#586170` | `#a0a8b6` | `--muted` |
| `--accent` | `#4338ca` | `#8c94ff` | `--accent` |
| `--accent-ink` | `#ffffff` | `#0b0d12` | `--accent-ink` |
| `--accent-text` | `#3730a3` | `#b9beff` | `--accent-text` |
| `--highlight` | `#eef0ff` | `#1d2142` | `--accent-tint` |
| `--warn` | `#b35900` | `#e8a25c` | (kept) |
| `--danger` | `#cf222e` | `#ff7b72` | (kept) |
| `--unmapped` | `#000000` | `#eceef2` | (kept; dark = dark `--text`) |

Shadows (`--shadow`, `--shadow-lg`) are the mock's rgba values, redefined in the dark block. Chart tokens are not
changed in this SPEC: the dark chart surface `#1a1a19` now sits on a darker page and reads as a panel; re-validating
the chart palette against the new surfaces belongs to phase 4 (Trends).

## §2 Type, radius, spacing

- Families: `--font-ui` Arial stack; `--font-mono` "JetBrains Mono", ui-monospace, Consolas, monospace;
  `--font-math` "Latin Modern Roman", "Latin Modern Math", serif.
- Base size 15px, line height 1.55 (mock). Sizes used: 12, 13, 14, 15, 17, 20, 26, 30, 50 px (hero 50 px on desktop,
  34 px at 375 px).
- Radii: `--radius-sm` 8px (buttons, tabs), `--radius-md` 10px (controls, inner panels), `--radius-lg` 16px (cards),
  pill 999px (chips).
- Layout: content max width 1200px, side gutter 24px (16px below 600px); sections separated by 56–72px on Home.

## §3 Shell

`header.topbar` (sticky, `--bg`, bottom line) → `.topbar-inner` (max width 1200) → `nav.site-nav[aria-label=Main]`
(logo link `.site-title` + `ul.nav-tabs`) and `.topbar-actions` (version chip link, theme toggle button). Below
800px `.topbar-inner` wraps; `.nav-tabs` takes a full row with `overflow-x: auto`. The skip link stays first in the
DOM. `footer.site-footer` holds `.footer-inner` with two groups.

Theme: `index.html` reads `localStorage["sdl-theme"]` (in try/catch) before the first paint, falling back to the
system scheme; `src/lib/theme.ts` (pure) decides the theme from (stored, prefersDark); `main.tsx` re-applies on a
system change only when no choice is stored; the toggle stores the choice and sets `data-theme`.

## §4 Home layout

Hero: two columns (`auto-fit, minmax(min(100%, 440px), 1fr)`), left text and search, right featured card; one column
at 375px. Stat tiles: `auto-fit, minmax(160px, 1fr)`. View cards: `auto-fit, minmax(min(100%, 340px), 1fr)`.
Platform rows: flex-wrap with name/id, field chips, counts. Cite and sample cards: two columns, one at 375px.

Featured graph layout (`featuredLayout` in `src/lib/home.ts`): material connections give the chain (walk from the
module with no incoming material edge); modules in no material connection form the control row; each link carries
its transfer-mode label and whether it is stated. A platform whose material connections are not one simple path
falls back to the modules in step order without links (not reached for `Aand2024/P1`).
