// SPEC-SITE-001 AC-2 (parser part) and AC-3: the CITATION.cff subset parser and the citation text.
import { describe, expect, it } from "vitest";
import { parseCitationCff } from "../scripts/lib/citation";
import { formatCitation, licenseLabel } from "../src/lib/citation";
import type { Citation } from "../src/data/types";

const RELEASE_CFF = `cff-version: 1.2.0
message: "If you use this dataset, please cite it as below."
type: dataset
title: "sdl-workflows: hardware workflows of closed-loop self-driving laboratories"
version: "1.0.0"
date-released: "2026-11-01"
license: CC-BY-4.0
doi: "10.5281/zenodo.23857126"
authors:
  - family-names: "Joe"
    given-names: "Chan Young"
    affiliation: "Independent Researcher, Incheon, Republic of Korea"
    email: "ccy5123ccy@gmail.com"
    orcid: "https://orcid.org/0009-0007-5822-6714"
`;

const RELEASE_CITATION: Citation = {
  title: "sdl-workflows: hardware workflows of closed-loop self-driving laboratories",
  version: "1.0.0",
  date_released: "2026-11-01",
  doi: "10.5281/zenodo.23857126",
  license: "CC-BY-4.0",
  authors: [{ family: "Joe", given: "Chan Young", orcid: "https://orcid.org/0009-0007-5822-6714" }],
};

describe("parseCitationCff", () => {
  it("parses the release's CITATION.cff into the citation fields", () => {
    expect(parseCitationCff(RELEASE_CFF)).toEqual(RELEASE_CITATION);
  });

  it("keeps a missing given name or ORCID as null", () => {
    const text = RELEASE_CFF.replace(/\n {4}given-names: "Chan Young"/, "").replace(/\n {4}orcid: .*/, "");
    expect(parseCitationCff(text).authors).toEqual([{ family: "Joe", given: null, orcid: null }]);
  });

  it("rejects a line outside the supported subset, naming the line", () => {
    const text = RELEASE_CFF.replace("type: dataset", "identifiers:\n  type: doi");
    expect(() => parseCitationCff(text)).toThrow(/CITATION\.cff line 3/);
  });

  it("rejects a missing required field, naming it", () => {
    expect(() => parseCitationCff(RELEASE_CFF.replace(/^doi: .*\n/m, ""))).toThrow(/CITATION\.cff.*doi/);
    expect(() => parseCitationCff(RELEASE_CFF.replace(/^version: .*\n/m, ""))).toThrow(/CITATION\.cff.*version/);
    const noFamily = RELEASE_CFF.replace('family-names: "Joe"', 'alias: "Joe"');
    expect(() => parseCitationCff(noFamily)).toThrow(/CITATION\.cff.*family-names/);
  });
});

describe("formatCitation", () => {
  it("formats the release citation (AC-3)", () => {
    expect(formatCitation(RELEASE_CITATION)).toBe(
      "Joe, C. Y. (2026). sdl-workflows: hardware workflows of closed-loop self-driving laboratories " +
        "(Version 1.0.0) [Data set]. https://doi.org/10.5281/zenodo.23857126",
    );
  });

  const withAuthors = (authors: Citation["authors"]) => formatCitation({ ...RELEASE_CITATION, authors });
  const a = (family: string, given: string | null) => ({ family, given, orcid: null });

  it("joins two and three authors in APA 7 form", () => {
    expect(withAuthors([a("Alpha", "Bea"), a("Gamma", "Dan")])).toMatch(/^Alpha, B\., & Gamma, D\. \(2026\)/);
    expect(withAuthors([a("Alpha", "Bea"), a("Gamma", "Dan"), a("Eps", "Fay")])).toMatch(
      /^Alpha, B\., Gamma, D\., & Eps, F\. \(2026\)/,
    );
  });

  it("abbreviates hyphenated given names and omits a missing one", () => {
    expect(withAuthors([a("Picard", "Jean-Luc")])).toMatch(/^Picard, J\.-L\. \(2026\)/);
    expect(withAuthors([a("Plato", null)])).toMatch(/^Plato \(2026\)/);
  });

  it("adds no publisher", () => {
    expect(formatCitation(RELEASE_CITATION)).not.toMatch(/Zenodo\./);
  });
});

describe("licenseLabel", () => {
  it("shows CC-BY-4.0 as CC BY 4.0 and other ids as they are", () => {
    expect(licenseLabel("CC-BY-4.0")).toBe("CC BY 4.0");
    expect(licenseLabel("MIT")).toBe("MIT");
  });
});
