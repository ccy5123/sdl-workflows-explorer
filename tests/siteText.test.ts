// SPEC-SITE-001 AC-4, SPEC-UI-001 AC-4: every number in the home text and the about summary comes from the built data
// or appears as a whole number in the pinned release's DATA_CARD.md, with the card's own words. The about figures are
// those build-data counts from the release (index.json about), so the checks hold for whichever release is pinned. The
// real-data case reads public/data/ and skips with a message when build-data has not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AboutFacts, Counts, IndexJson, ReleaseDocs, SimulationJson } from "../src/data/types";
import { fieldTagCounts, latestYear } from "../src/lib/home";
import {
  ABOUT_AUTHOR_LEAD,
  ABOUT_HEADINGS,
  AUTHOR,
  LLM_ABOUT,
  PREPRINT,
  STATS_CAPTION,
  VIEWS,
  WORKFLOW_ABOUT,
  aboutIntro,
  aboutSections,
  fieldsCaption,
  heroLead,
  heroTitle,
  numbersIn,
  sampleText,
  searchPlaceholder,
  unsourcedNumbers,
  yearsCaption,
} from "../src/lib/siteText";

describe("author link (footer and about page)", () => {
  it("names the author and links the personal site", () => {
    expect(AUTHOR).toEqual({ name: "Chan Young Joe", url: "https://ccy5123.github.io/" });
    expect(`${ABOUT_AUTHOR_LEAD} ${AUTHOR.name}.`).toBe("The dataset and this site are by Chan Young Joe.");
  });
});

describe("preprint citation (home, footer and about page)", () => {
  it("cites the ChemRxiv preprint by its DOI", () => {
    expect(PREPRINT.doi).toBe("10.26434/chemrxiv.15011572/v1");
    expect(PREPRINT.citation.startsWith("Joe, C. Y. (2026). ")).toBe(true);
    expect(PREPRINT.citation.endsWith(`ChemRxiv. https://doi.org/${PREPRINT.doi}`)).toBe(true);
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

// The about summary with and without candidates from the Google Scholar alerts: the figures of releases 1.2.0 and
// 1.1.0, and the wording each of them shows.
const FACTS_120: AboutFacts = {
  alert_candidates: 368, alert_papers: 7, screened_titles: 2540, screened_second_stage: 699, screened_fulltexts: 488,
  screening_decisions: 3729, decisions_model: 3665, decisions_researcher: 64, steps_uncertain: 351,
  connections_uncertain: 163, step_durations: 465, samples_per_run: 192, joint_durations: 61, batch_sizes: 239,
  throughputs: 139, throughputs_measured: 95, throughputs_nominal: 44, costs: 14, transfer_times: 4,
  papers_with_timing: 235, human_quantified: 26, human_described: 74, human_none_stated: 54, human_not_reported: 90,
  human_run_length: 52, preprint_main_texts: 35, preprints_other_pages: 19,
};
const COUNTS_120: Counts = {
  papers: 244, platforms: 289, modules: 1647, steps: 2678, connections: 1724, material_connections: 1098, candidates: 2540,
};
const FACTS_110: AboutFacts = {
  ...FACTS_120, alert_candidates: 0, alert_papers: 0, screened_titles: 2172, screened_second_stage: 655,
  screened_fulltexts: 469, preprint_main_texts: 29,
};
const COUNTS_110: Counts = { ...COUNTS_120, papers: 237, candidates: 2172 };
const ELIGIBLE =
  "A paper was eligible when it is an original research paper; an algorithm chose the next experiment from " +
  "earlier results, at least once on the physical system; automated hardware ran the experiments, with isolated " +
  "manual steps allowed; something was made or processed in the loop; and the hardware is described. ";

describe("aboutSections: the alert sentences only when the release holds alert candidates", () => {
  const text = (counts: Counts, about: AboutFacts, heading: string) =>
    aboutSections({ counts, about }).find((s) => s.heading === heading)!.text;

  it("keeps the six headings in order", () => {
    expect(aboutSections({ counts: COUNTS_120, about: FACTS_120 }).map((s) => s.heading)).toEqual([...ABOUT_HEADINGS]);
  });

  it("describes the alert route with the figures of 1.2.0", () => {
    expect(text(COUNTS_120, FACTS_120, "How the papers were found")).toBe(
      "The candidates of release 1.1.0 came from the reference lists of three reviews and from keyword searches of " +
        "Crossref and arXiv, both run on 20 October 2026. Since release 1.1.0, 368 further candidates came from the " +
        "researcher's daily Google Scholar alerts (21 October 2026 onward) and were screened against the same criteria; " +
        "7 of the 244 papers were added this way. The 2540 candidates were screened on titles (2540), abstracts (699) " +
        "and full texts (488). " +
        ELIGIBLE +
        "244 papers were eligible. Of the 3729 screening decisions, 3665 were made by a language model working from " +
        "the written criteria and 64 by the researcher.",
    );
    expect(text(COUNTS_120, FACTS_120, "Limits")).toMatch(
      /^The search ran once, on one date, in two indexes, and has since been extended only by one researcher's Google Scholar alerts\. The 244 papers are the eligible candidates found this way, not every closed-loop self-driving laboratory paper published, so counts by year reflect the search as well as the field\. Page numbers refer to the file versions that were read; 35 main texts are preprints, and 19 of them/,
    );
    expect(yearsCaption(2026, 368)).toBe("Papers per year; 2026 covers the search to 20 October and the Google Scholar alerts after it.");
  });

  it("leaves the alerts out when there are none, as release 1.1.0 did", () => {
    expect(text(COUNTS_110, FACTS_110, "How the papers were found")).toBe(
      "The 2172 candidates came from the reference lists of three reviews and from keyword searches of Crossref and " +
        "arXiv, both run on 20 October 2026. They were screened on titles (2172), abstracts (655) and full texts (469). " +
        ELIGIBLE +
        "237 papers were eligible. Of the 3729 screening decisions, 3665 were made by a language model working from " +
        "the written criteria and 64 by the researcher.",
    );
    expect(text(COUNTS_110, FACTS_110, "Limits")).toMatch(
      /^The search ran once, on one date, in two indexes\. The 237 papers are the eligible candidates that this search found, not every closed-loop self-driving laboratory paper published, so counts by year reflect the search as well as the field\. Page numbers refer to the file versions that were read; 29 main texts are preprints, and 19 of them/,
    );
    const all = aboutSections({ counts: COUNTS_110, about: FACTS_110 }).map((s) => s.text).join(" ");
    expect(all).not.toMatch(/alert|Google Scholar|since release/i);
    expect(yearsCaption(2026, 0)).toBe("Papers per year; 2026 covers the search to 20 October.");
  });
});

const DATA_DIR = "public/data";
const built = existsSync(join(DATA_DIR, "release-docs.json")) && existsSync(join(DATA_DIR, "index.json"));

describe.skipIf(!built)("home and about text against the pinned release (AC-4)", () => {
  if (!built) console.warn("release-docs.json absent: run `npm run build-data` for the real-data cases");
  const docs = (built ? JSON.parse(readFileSync(join(DATA_DIR, "release-docs.json"), "utf8")) : null) as ReleaseDocs;
  const index = (built ? JSON.parse(readFileSync(join(DATA_DIR, "index.json"), "utf8")) : null) as IndexJson;
  const latest = built ? latestYear(index.platforms) : { year: 0, n: 0 };
  const tagsInUse = built ? fieldTagCounts(index.papers).length : 0;
  const sections = built ? aboutSections(index) : [];
  const filled = built
    ? [
        index.release.version,
        ...[index.counts.platforms, index.counts.papers, index.counts.candidates].flatMap((n) => [String(n), n.toLocaleString("en")]),
        String(latest.year),
        String(tagsInUse),
      ]
    : [];
  // The Home text with its placeholders filled as Home fills them (5 field tags shown).
  const homeText = built
    ? [
        heroTitle(index.counts.platforms),
        heroLead(index.counts.papers),
        searchPlaceholder(index.counts.platforms),
        STATS_CAPTION,
        yearsCaption(latest.year, index.about.alert_candidates),
        fieldsCaption(5, tagsInUse),
        ...sampleText(index.counts.candidates, index.counts.papers),
      ]
    : [];
  const texts = built
    ? [
        ...homeText,
        aboutIntro(index.release.version),
        ...VIEWS.map((v) => v.description),
        ...sections.map((s) => s.text),
      ]
    : [];

  it("has no number outside index.json and the data card", () => {
    expect(texts.flatMap((t) => unsourcedNumbers(t, docs.data_card, filled))).toEqual([]);
  });

  it("names the release's only author", () => {
    expect(docs.citation.authors.map((a) => `${a.given} ${a.family}`)).toEqual([AUTHOR.name]);
  });

  it("reports a planted stale figure", () => {
    const limits = sections.find((s) => s.heading === "How far the labels can be trusted")!.text;
    expect(limits).toContain("For 30 papers");
    expect(unsourcedNumbers(limits.replace("For 30 papers", "For 31 papers"), docs.data_card, filled)).toEqual(["31"]);
    expect(unsourcedNumbers(`${limits} 999`, docs.data_card, filled)).toEqual(["999"]);
  });

  // SPEC-RELEASE-001 AC-4: each figure travels with its own words, so a figure paired with the wrong words fails. The
  // list covers every count of the about summary that the data card states in the same words; its figures are those
  // build-data counted from the release (index.json), so the check holds for whichever release is pinned.
  const norm = (s: string) => s.replace(/\s+/g, " ");
  const about = norm(sections.map((s) => s.text).join(" "));
  const card = built ? norm(docs.data_card) : "";
  const a = built ? index.about : ({} as AboutFacts);
  const c = built ? index.counts : ({} as Counts);
  const alerts = built && a.alert_candidates > 0;
  const phrases = built
    ? [
        ...(alerts
          ? [
              `${a.alert_candidates} further candidates came from the researcher's daily Google Scholar alerts (21 October 2026 onward)`,
              `${a.alert_papers} of the ${c.papers} papers were added this way`,
              "has since been extended only by one researcher's Google Scholar alerts",
              `The ${c.papers} papers are the eligible candidates found this way`,
            ]
          : [`The ${c.papers} papers are the eligible candidates that this search found`]),
        `${c.papers} papers were eligible`,
        `Of the ${a.screening_decisions} screening decisions`,
        `${a.decisions_model} were made by a language model working from the written criteria`,
        `${a.decisions_researcher} by the researcher`,
        `${a.steps_uncertain} of ${c.steps} steps and ${a.connections_uncertain} of ${c.connections} connections`,
        "0.905 for the unit operation of steps, 0.898 for module type and 0.891 for transfer mode",
        "0.862, 0.858 and 0.847",
        `${a.step_durations} step durations`,
        `${a.samples_per_run} numbers of samples one device handles in one run of a step`,
        `${a.batch_sizes} batch sizes`,
        `${a.throughputs} throughputs (${a.throughputs_measured} measured in a campaign, ${a.throughputs_nominal} nominal)`,
        `${a.costs} costs`,
        `${a.papers_with_timing} of the ${c.papers} papers have at least one value`,
        `(${a.joint_durations} rows)`,
        "For the same 30 papers as above",
        "1.000 for throughput (15 platforms)",
        "0.870 for step duration (54 steps",
        "95% interval 0.755 to 0.957",
        `${a.human_quantified} papers state a number`,
        `${a.human_described} name tasks people performed without a number`,
        `${a.human_none_stated} state that the campaign ran without human intervention`,
        `${a.human_not_reported} state none of these`,
        `${a.human_run_length} papers state a stretch of the campaign that ran without a person`,
        `${a.preprint_main_texts} main texts are preprints, and ${a.preprints_other_pages} of them belong to papers with a journal version whose pages differ`,
        "settled on 10 development papers and not changed afterwards",
        "midpoint of a stated range",
      ]
    : [];
  it.each(phrases)("states %j as the data card does", (phrase) => {
    expect(about).toContain(phrase);
    expect(card).toContain(phrase);
  });

  it("states the screening stages and the candidates with the data card's figures", () => {
    expect(card).toContain(
      `screened on titles (${a.screened_titles}), then abstracts (${a.screened_second_stage}), then full texts (${a.screened_fulltexts})`,
    );
    expect(about).toContain(
      `screened on titles (${a.screened_titles}), abstracts (${a.screened_second_stage}) and full texts (${a.screened_fulltexts})`,
    );
    // Every candidate is screened on its title, so the title count is the candidate total of the About text. The data
    // card states the total (1.1.0, 1.2.0 as published) or, from the template fixed on 2026-11-17, the candidates of
    // release 1.1.0 beside the alert candidates.
    expect(a.screened_titles).toBe(c.candidates);
    expect([
      `The ${c.candidates} candidates came from`,
      `The ${c.candidates - a.alert_candidates} candidates of release 1.1.0 came from`,
    ].some((phrase) => card.includes(phrase))).toBe(true);
    if (a.alert_candidates > 0) expect(card).toContain(`${a.alert_candidates} further candidates came from`);
    expect(about).toContain(`The ${c.candidates} candidates`);
  });

  it("names the Google Scholar alerts exactly when the data card does", () => {
    expect(card.includes("Google Scholar alerts")).toBe(alerts);
    expect(about.includes("Google Scholar alerts")).toBe(alerts);
    expect(yearsCaption(latest.year, a.alert_candidates).includes("Google Scholar alerts")).toBe(alerts);
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
    const home = homeText.join(" ");
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
  it("has at most four paragraphs whose only figures are 10 and the number of transfer times", () => {
    expect(WORKFLOW_ABOUT.heading).toBe("Workflow builder");
    expect(WORKFLOW_ABOUT.paragraphs(7).length).toBeLessThanOrEqual(4);
    expect(WORKFLOW_ABOUT.paragraphs(7).flatMap(numbersIn)).toEqual(["10", "7"]);
  });

  const path = join(DATA_DIR, "simulation.json");
  it.skipIf(!existsSync(path) || !built)("matches simulation.json: most unit operations have fewer than 10 values; the transfer times", () => {
    const sim = JSON.parse(readFileSync(path, "utf8")) as SimulationJson;
    const index = JSON.parse(readFileSync(join(DATA_DIR, "index.json"), "utf8")) as IndexJson;
    const n = new Map(sim.unit_operations.map((u) => [u.id, 0]));
    for (const d of sim.durations) if (!d.joint) n.set(d.unit_operation, (n.get(d.unit_operation) ?? 0) + 1);
    const under = [...n.values()].filter((v) => v < 10).length;
    expect(under).toBeGreaterThan(n.size / 2);
    expect(index.about.transfer_times).toBe(sim.transfer_times.length);
    const text = WORKFLOW_ABOUT.paragraphs(index.about.transfer_times).join(" ");
    expect(text).toContain("fewer than 10 recorded durations");
    expect(text).toContain(`holds ${sim.transfer_times.length} recorded transfer times`);
  });
});

describe("LLM_ABOUT (LLM-access plan, 2026-11-12)", () => {
  it("names the published package of mcp/, states no number and makes no claim of human checking", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "mcp", "package.json"), "utf8")) as { name: string };
    expect(LLM_ABOUT.mcpPackage).toBe(pkg.name);
    const text = [LLM_ABOUT.lead, LLM_ABOUT.mcp, LLM_ABOUT.webBefore, LLM_ABOUT.webAfter, LLM_ABOUT.caution].join(" ");
    expect(numbersIn(text)).toEqual([]);
    expect(text).toContain("the release contains no human coding");
    expect(text).not.toMatch(/checked by|verified by|validated/i);
  });
});
