// SPEC-SITE-001 AC-4: every number in the home intro and the about summary comes from index.json or appears as a
// whole number in the pinned release's DATA_CARD.md. The real-data case reads public/data/ and skips with a message
// when build-data has not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IndexJson, ReleaseDocs, SimulationJson } from "../src/data/types";
import {
  ABOUT_AUTHOR_LEAD,
  ABOUT_SECTIONS,
  AUTHOR,
  VIEWS,
  WORKFLOW_ABOUT,
  aboutIntro,
  homeIntro,
  numbersIn,
  unsourcedNumbers,
} from "../src/lib/siteText";

describe("author link (footer and about page)", () => {
  it("names the author and links the personal site", () => {
    expect(AUTHOR).toEqual({ name: "Chan Young Joe", url: "https://ccy5123.github.io/" });
    expect(`${ABOUT_AUTHOR_LEAD} ${AUTHOR.name}.`).toBe("The dataset and this site are by Chan Young Joe.");
  });
});

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

  it("names the release's only author", () => {
    expect(docs.citation.authors.map((a) => `${a.given} ${a.family}`)).toEqual([AUTHOR.name]);
  });

  it("reports a planted stale figure", () => {
    const limits = ABOUT_SECTIONS.find((s) => s.heading === "How far the labels can be trusted")!.text;
    expect(limits).toContain("For 30 papers");
    expect(unsourcedNumbers(limits.replace("For 30 papers", "For 31 papers"), docs.data_card, filled)).toEqual(["31"]);
    expect(unsourcedNumbers(`${limits} 999`, docs.data_card, filled)).toEqual(["999"]);
  });

  // SPEC-RELEASE-001 AC-4: each figure travels with its own words, so a figure paired with the wrong words fails. The
  // list covers every count of the about summary that the data card states in the same words.
  const norm = (s: string) => s.replace(/\s+/g, " ");
  const about = norm(ABOUT_SECTIONS.map((s) => s.text).join(" "));
  it.each([
    "237 papers were eligible",
    "Of the 3298 screening decisions",
    "3239 were made by a language model working from the written criteria",
    "59 by the researcher",
    "340 of 2610 steps and 155 of 1681 connections",
    "0.905 for the unit operation of steps, 0.898 for module type and 0.891 for transfer mode",
    "0.862, 0.858 and 0.847",
    "454 step durations",
    "185 numbers of samples one device handles in one run of a step",
    "233 batch sizes",
    "135 throughputs (91 measured in a campaign, 44 nominal)",
    "13 costs",
    "228 of the 237 papers have at least one value",
    "(57 rows)",
    "For the same 30 papers as above",
    "1.000 for throughput (15 platforms)",
    "0.870 for step duration (54 steps",
    "95% interval 0.755 to 0.957",
    "25 papers state a number",
    "73 name tasks people performed without a number",
    "51 state that the campaign ran without human intervention",
    "88 state none of these",
    "48 papers state a stretch of the campaign that ran without a person",
    "The 237 papers are the eligible candidates that this search found",
    "29 main texts are preprints, and 19 of them belong to papers with a journal version whose pages differ",
    "settled on 10 development papers and not changed afterwards",
    "midpoint of a stated range",
  ])("states %j as the data card does", (phrase) => {
    expect(about).toContain(phrase);
    expect(norm(docs.data_card)).toContain(phrase);
  });

  it("keeps the card's limits on the timing data and the human-intervention reading", () => {
    for (const phrase of [
      "agreement between two models, not accuracy",
      "reference values are not released",
      "No second reading exists",
      "free-text qualifiers",
      "the reference values of the timing data are not included",
    ]) {
      expect(about, phrase).toContain(phrase);
    }
    const home = homeIntro(index.release.version, index.counts.platforms, index.counts.papers);
    expect(home).toContain("batch sizes");
    expect(home).toContain("human intervention");
    for (const text of [home, about]) {
      expect(text).not.toMatch(/extraction/i);
      expect(text).not.toMatch(/frozen/i);
    }
  });
});

// SPEC-SIM-001 AC-17: the About section on the workflow builder, its figures checked against simulation.json.
describe("About section on the workflow builder", () => {
  it("has at most four paragraphs whose only figures are 10 and 4", () => {
    expect(WORKFLOW_ABOUT.heading).toBe("Workflow builder");
    expect(WORKFLOW_ABOUT.paragraphs.length).toBeLessThanOrEqual(4);
    expect(WORKFLOW_ABOUT.paragraphs.flatMap(numbersIn)).toEqual(["10", "4"]);
  });

  const path = join(DATA_DIR, "simulation.json");
  it.skipIf(!existsSync(path))("matches simulation.json: most unit operations have fewer than 10 values; 4 transfer times", () => {
    const sim = JSON.parse(readFileSync(path, "utf8")) as SimulationJson;
    const n = new Map(sim.unit_operations.map((u) => [u.id, 0]));
    for (const d of sim.durations) if (!d.joint) n.set(d.unit_operation, (n.get(d.unit_operation) ?? 0) + 1);
    const under = [...n.values()].filter((v) => v < 10).length;
    expect(under).toBeGreaterThan(n.size / 2);
    const text = WORKFLOW_ABOUT.paragraphs.join(" ");
    expect(text).toContain("fewer than 10 recorded durations");
    expect(text).toContain(`holds ${sim.transfer_times.length} recorded transfer times`);
    expect(sim.transfer_times).toHaveLength(4);
  });
});
