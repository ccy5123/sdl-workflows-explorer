// Citation text from the release's CITATION.cff fields (SPEC-SITE-001 REQ-004): APA 7 author formatting, no
// publisher (the file records none). Pure.
import type { Citation, CitationAuthor } from "../data/types";

/** "Chan Young" → "C. Y."; "Jean-Luc" → "J.-L.". */
const initials = (given: string): string =>
  given
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => `${part[0]!.toUpperCase()}.`)
        .join("-"),
    )
    .join(" ");

const author = (a: CitationAuthor): string => (a.given ? `${a.family}, ${initials(a.given)}` : a.family);

/** "A", "A, & B", "A, B, & C" (APA 7: comma and ampersand before the last of two or more). */
function authorList(authors: readonly CitationAuthor[]): string {
  const names = authors.map(author);
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

export function formatCitation(c: Citation): string {
  return `${authorList(c.authors)} (${c.date_released.slice(0, 4)}). ${c.title} (Version ${c.version}) [Data set]. https://doi.org/${c.doi}`;
}

/** Display form of an SPDX licence id. */
export const licenseLabel = (spdx: string): string => (spdx === "CC-BY-4.0" ? "CC BY 4.0" : spdx);
