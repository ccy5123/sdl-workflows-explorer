// The figures of the data card that the home and about pages state (SPEC-SITE-001 REQ-005, REQ-007), counted from the
// release tables, so the site text follows the pinned release without being edited. tests/siteText.test.ts checks
// each figure against the words of the release's DATA_CARD.md. A table the release lacks counts as empty.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AboutFacts } from "../../src/data/types";
import { type CsvRow, readCsv } from "./csv";

/**
 * The reference-list and keyword searches of 20 October 2026 gave candidates C0001 to C2172 (release 1.1.0); every
 * later candidate came from the researcher's Google Scholar alerts (DATA_CARD.md of 1.2.0, "Since release 1.1.0").
 */
export const LAST_SEARCH_CANDIDATE = 2172;

const candidateNumber = (id: string) => Number(/^C(\d+)$/.exec(id)?.[1] ?? NaN);

export function readAboutFacts(dir: string): AboutFacts {
  const rows = (rel: string): CsvRow[] => (existsSync(join(dir, rel)) ? readCsv(join(dir, rel)) : []);
  const count = <T>(xs: T[], ok: (x: T) => boolean) => xs.filter(ok).length;

  const candidates = rows("modes/trends/candidates.csv");
  const papers = rows("core/paper.csv");
  const screening = rows("modes/trends/screening.csv");
  const screenedAt = (stage: string) => new Set(screening.filter((r) => r.stage === stage).map((r) => r.cand_id)).size;
  const timing = rows("modes/simulation/step_timing.csv");
  const values = rows("modes/simulation/process_values.csv");
  const human = rows("modes/trends/human_intervention.csv");
  const docs = rows("core/paper_document.csv");
  const doiOf = new Map(papers.map((p) => [p.paper_id, p.doi]));
  const preprints = docs.filter((d) => d.doc === "main" && d.version === "preprint");
  const isThroughput = (r: CsvRow) => r.target_kind === "platform" && r.quantity === "throughput";

  return {
    alert_candidates: count(candidates, (c) => candidateNumber(c.cand_id!) > LAST_SEARCH_CANDIDATE),
    alert_papers: count(papers, (p) => candidateNumber(p.cand_id!) > LAST_SEARCH_CANDIDATE),
    screened_titles: screenedAt("title"),
    screened_second_stage: screenedAt("abstract"),
    screened_fulltexts: screenedAt("fulltext"),
    screening_decisions: screening.length,
    decisions_model: count(screening, (r) => r.decided_by === "model"),
    decisions_researcher: count(screening, (r) => r.decided_by === "researcher"),
    steps_uncertain: count(rows("core/step.csv"), (r) => r.uncertain === "1"),
    connections_uncertain: count(rows("core/connection.csv"), (r) => r.uncertain === "1"),
    step_durations: count(timing, (r) => r.quantity === "duration"),
    samples_per_run: count(timing, (r) => r.quantity === "duration_batch_size"),
    joint_durations: count(timing, (r) => (r.covers_steps ?? "") !== ""),
    batch_sizes: count(values, (r) => r.target_kind === "platform" && r.quantity === "batch_size"),
    throughputs: count(values, isThroughput),
    throughputs_measured: count(values, (r) => isThroughput(r) && r.throughput_kind === "measured"),
    throughputs_nominal: count(values, (r) => isThroughput(r) && r.throughput_kind === "nominal"),
    costs: count(values, (r) => r.target_kind === "platform" && r.quantity === "cost"),
    transfer_times: count(values, (r) => r.target_kind === "connection" && r.quantity === "transfer_time"),
    papers_with_timing: new Set([...timing, ...values].map((r) => r.platform_id!.split("/")[0])).size,
    human_quantified: count(human, (r) => r.category === "quantified"),
    human_described: count(human, (r) => r.category === "described"),
    human_none_stated: count(human, (r) => r.category === "none_stated"),
    human_not_reported: count(human, (r) => r.category === "not_reported"),
    human_run_length: count(human, (r) => (r.run_length_value ?? "") !== ""),
    preprint_main_texts: preprints.length,
    preprints_other_pages: count(preprints, (d) => d.source_doi !== doiOf.get(d.paper_id!)),
  };
}
