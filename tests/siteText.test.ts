// SPEC-SITE-001 AC-4: every number in the home intro and the about summary comes from index.json or appears as a
// whole number in the pinned release's DATA_CARD.md. The real-data case reads public/data/ and skips with a message
// when build-data has not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IndexJson, ReleaseDocs } from "../src/data/types";
import { ABOUT_SECTIONS, VIEWS, aboutIntro, homeIntro, numbersIn, unsourcedNumbers } from "../src/lib/siteText";

describe("numbersIn and unsourcedNumbers", () => {
  it("reads whole number tokens", () => {
    expect(numbersIn("0.905 of 1,687 in 2026 (95% of 30)")).toEqual(["0.905", "1,687", "2026", "95", "30"]);
  });

  it("matches whole tokens, not digit runs inside other numbers", () => {
    const card = "On 20 October 2026, 0.905 of 3298.";
    expect(unsourcedNumbers("2026 and 0.905", card)).toEqual([]);
    // "20" is in the card as a whole token; "30", "90" and "5" only occur inside other numbers.
    expect(unsourcedNumbers("20, 30, 90 and 5", card)).toEqual(["30", "90", "5"]);
  });

  it("accepts numbers given as allowed values", () => {
    expect(unsourcedNumbers("280 platforms", "", ["280"])).toEqual([]);
  });
});

const DATA_DIR = "public/data";
const built = existsSync(join(DATA_DIR, "release-docs.json")) && existsSync(join(DATA_DIR, "index.json"));

describe.skipIf(!built)("home and about text against the pinned release (AC-4)", () => {
  if (!built) console.warn("release-docs.json absent: run `npm run build-data` for the real-data cases");
  const docs = (built ? JSON.parse(readFileSync(join(DATA_DIR, "release-docs.json"), "utf8")) : null) as ReleaseDocs;
  const index = (built ? JSON.parse(readFileSync(join(DATA_DIR, "index.json"), "utf8")) : null) as IndexJson;
  const filled = built
    ? [index.release.version, String(index.counts.platforms), String(index.counts.papers)]
    : [];
  const texts = built
    ? [
        homeIntro(index.release.version, index.counts.platforms, index.counts.papers),
        aboutIntro(index.release.version),
        ...VIEWS.map((v) => v.description),
        ...ABOUT_SECTIONS.map((s) => s.text),
      ]
    : [];

  it("has no number outside index.json and the data card", () => {
    expect(texts.flatMap((t) => unsourcedNumbers(t, docs.data_card, filled))).toEqual([]);
  });

  it("reports a planted stale figure", () => {
    const limits = ABOUT_SECTIONS.find((s) => s.heading === "How far the labels can be trusted")!.text;
    expect(limits).toContain("For 30 papers");
    expect(unsourcedNumbers(limits.replace("For 30 papers", "For 31 papers"), docs.data_card, filled)).toEqual(["31"]);
    expect(unsourcedNumbers(`${limits} 999`, docs.data_card, filled)).toEqual(["999"]);
  });
});
