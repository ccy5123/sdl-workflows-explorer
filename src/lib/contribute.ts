// URLs of the dataset's GitHub issue forms, prefilled through query parameters named by form field id
// (SPEC-CONTRIB-001 REQ-001). Pure: no UI package, no window or document.

const ISSUES_NEW = "https://github.com/ccy5123/sdl-workflows/issues/new";

export const CORRECTION_LINK_TEXT = "Report a problem with this record";
export const TAXONOMY_LINK_TEXT = "Propose a mapping or change";
export const PAPER_LINK_TEXT = "Suggest a missing paper";

/** Base URL plus `key=value` pairs, each value percent-encoded (URLSearchParams would write a space as `+`). */
function issueUrl(pairs: [string, string][]): string {
  return `${ISSUES_NEW}?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;
}

/** Correction form for an item (`Aand2024/P1`, `Aand2024/P1/M2`, ...) or a paper id, in the given data release. */
export function correctionUrl(itemId: string, release: string): string {
  return issueUrl([
    ["template", "correction.yml"],
    ["title", `[correction] ${itemId}`],
    ["item_id", itemId],
    ["release", release],
  ]);
}

/** Missing-paper form; the contributor fills in the DOI and title. */
export function paperUrl(): string {
  return issueUrl([
    ["template", "paper.yml"],
    ["title", "[paper] "],
  ]);
}

/** Taxonomy form for one class. The form's `kind` dropdown (type of proposal) is left to the contributor. */
export function taxonomyUrl(classKind: string, cls: string): string {
  return issueUrl([
    ["template", "taxonomy.yml"],
    ["title", `[taxonomy] ${classKind}/${cls}`],
    ["class", `${classKind} / ${cls}`],
  ]);
}
