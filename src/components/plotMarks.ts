// Observable Plot names each mark's <g> with an aria-label ("rule", "x-axis tick label"). ARIA does not allow a name
// on an element without a role (axe: aria-prohibited-attr), and the names are Plot's, not words for a reader; the
// chart's own label or links carry what a reader needs. The name moves to `data-mark`, where styles and tests can still
// find each mark (SPEC-UI-001 UI AC-49).

/** Moves Plot's `aria-label` on mark groups of `svg` to `data-mark`. */
export function unnameMarks(svg: Element) {
  for (const g of svg.querySelectorAll("g[aria-label]")) {
    if (g.hasAttribute("role")) continue;
    g.setAttribute("data-mark", g.getAttribute("aria-label")!);
    g.removeAttribute("aria-label");
  }
}
