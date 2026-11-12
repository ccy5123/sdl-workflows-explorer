// llms.txt and one plain-text page per paper (data/papers/<paper_id>.md), for LLMs that read the site through a fetch
// or browsing tool (they do not run the site's JavaScript, so they cannot open the hash routes). Generated from the derived release like every other
// file of public/data, so version, DOI and counts always match the deployed data. Pure text builders plus one writer.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Evidence, PaperRow, PlatformFile, SimulationJson } from "../../src/data/types";
import { formatCitation } from "../../src/lib/citation";
import { autonomyText } from "../../src/lib/filterState";
import { evidenceText } from "../../src/lib/home";
import { displayLabel } from "../../src/lib/labels";
import { platformHash } from "../../src/lib/route";
import { sortSteps } from "../../src/lib/steps";
import type { Derived } from "./derive";

/** The deployed site; llms.txt is read from outside, so its links are absolute. */
export const SITE_URL = "https://ccy5123.github.io/sdl-workflows-explorer/";
export const MCP_PACKAGE = "sdl-workflows-mcp";

/** The rule every answer built on these files should follow; the MCP server's instructions say the same. */
export const CITATION_RULE =
  "The records were extracted from the papers with an LLM and checked by the author. Answer from these files, not " +
  "from memory: name every platform by its platform_id (e.g. Aand2024/P1) and paper key with DOI, give the evidence " +
  "location (document · page · locator) for every module, step or connection you describe, say \"not recorded\" " +
  "for a null field, and cite the release.";

export const paperPage = (paperId: string) => `data/papers/${encodeURIComponent(paperId)}.md`;

const n = (x: number) => x.toLocaleString("en");
const ev = (e: Evidence) => `evidence: ${evidenceText(e)}`;
const nul = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "not recorded" : String(x));

export function llmsTxt(d: Derived): string {
  const { release, counts, papers } = d.index;
  const cite = formatCitation(d.releaseDocs.citation);
  const lines = [
    "# SDL Workflows Explorer",
    "",
    `> Step-level records of ${n(counts.platforms)} self-driving laboratory platforms from ${n(counts.papers)} papers: ` +
      `${n(counts.modules)} modules, ${n(counts.steps)} cycle steps and ${n(counts.connections)} connections, each with the ` +
      `page of the paper it was read from. Data release ${release.version}, DOI ${release.doi}, ${release.license}.`,
    "",
    CITATION_RULE,
    "",
    `Cite as: ${cite}`,
    "",
    "The site's pages need JavaScript; the files below do not. Start from index.json to find platforms, then read one " +
      "paper's page (Markdown) or file (JSON).",
    "",
    "## Data",
    "",
    `- [index.json](${SITE_URL}data/index.json): release info, counts, one row per paper (paper_id, doi, title, venue, first_public_year, field_tags, integration_mode, sw_autonomy, hw_autonomy) and per platform (platform_id, paper_id, platform_name, module_types, material_transfer_modes, unit_operations, n_modules, n_steps)`,
    `- [search.json](${SITE_URL}data/search.json): per platform_id, the module names as the papers state them (instrument names such as "in-line FT-IR")`,
    `- data/papers/<paper_id>.md (plain text, listed under Papers) and data/platforms/<paper_id>.json: one paper's platforms with modules, ordered steps, connections and evidence locations`,
    `- [taxonomy.json](${SITE_URL}data/taxonomy.json): definitions of every module type, unit operation, transfer mode and field tag, with usage counts`,
    `- [simulation.json](${SITE_URL}data/simulation.json): recorded step durations, throughputs and transfer times with evidence, and the platform layouts the workflow simulator uses`,
    `- [release-docs.json](${SITE_URL}data/release-docs.json): the release's CITATION.cff and DATA_CARD.md (how papers were found, screened, extracted and checked)`,
    "",
    "## Tools",
    "",
    `- Local MCP server for desktop LLM apps and coding tools: \`npx -y ${MCP_PACKAGE}\` (downloads release ${release.version} from Zenodo and checks its SHA-256; read-only search, platform records, similar platforms, cycle-time simulation, trends)`,
    `- [Explorer](${SITE_URL}): the interactive site`,
    `- [Zenodo record](https://doi.org/${release.doi}): the release files (CSV, Parquet, SQLite)`,
    "",
    "## Papers",
    "",
    ...[...papers]
      .sort((a, b) => (a.paper_id < b.paper_id ? -1 : 1))
      .map((p) => `- [${p.paper_id}](${SITE_URL}${paperPage(p.paper_id)}): ${p.title} (${p.first_public_year}; ${p.n_platforms} platform${p.n_platforms === 1 ? "" : "s"})`),
    "",
  ];
  return lines.join("\n");
}

/** One paper's platforms as plain text, every item with its id and evidence location. */
export function paperMarkdown(file: PlatformFile, paper: PaperRow, sim: SimulationJson, cite: string): string {
  const out = [
    `# ${paper.paper_id}: ${paper.title}`,
    "",
    `- DOI: https://doi.org/${paper.doi}`,
    `- Venue: ${paper.venue}; first public year ${paper.first_public_year}`,
    `- Field tags: ${paper.field_tags.join(", ") || "none"}`,
    `- Integration mode: ${paper.integration_mode}`,
    `- ${autonomyText("sw", paper.sw_autonomy).long}`,
    `- ${autonomyText("hw", paper.hw_autonomy).long}`,
    `- Cite the data as: ${cite}`,
    "",
    CITATION_RULE,
  ];
  for (const g of file.platforms) {
    out.push(
      "",
      `## Platform ${g.platform_id}${g.name ? `: ${g.name}` : ""}`,
      "",
      `- Explorer: ${SITE_URL}${platformHash(g.platform_id)}`,
      `- Platform ${ev(g.evidence)}`,
      `- Commercial integrated system: ${g.commercial_integrated ? "yes" : "no"}`,
      `- Same physical platform as in: ${g.shared_with.join(", ") || "none recorded"}`,
      `- Campaigns: ${nul(g.campaigns)}`,
      "",
      "### Modules",
      "",
      ...g.modules.map(
        (m) =>
          `- ${m.module_id}: ${displayLabel("module_type", m.module_type)} (${m.module_type})${m.on_platform ? "" : ", off the platform"}; ` +
          `name in paper: ${nul(m.name_in_paper)}${m.unmapped_note ? `; note: ${m.unmapped_note}` : ""}; ${ev(m.evidence)}`,
      ),
      "",
      "### Steps of one cycle, in order",
      "",
      ...sortSteps(g.steps).map(
        (s) =>
          `${s.step_order}. ${s.step_id}: ${displayLabel("unit_operation", s.unit_operation)} (${s.unit_operation}); ` +
          `performed by ${nul(s.performed_by)}; modules ${s.modules.join(", ") || "none"}${s.uncertain ? "; uncertain" : ""}` +
          `${s.unmapped_note ? `; note: ${s.unmapped_note}` : ""}; ${ev(s.evidence)}`,
      ),
      "",
      "### Connections",
      "",
      ...(g.connections.length === 0
        ? ["None recorded."]
        : g.connections.map(
            (c) =>
              `- ${c.edge_id}: ${c.from_module} → ${c.to_module}, ${displayLabel("transfer_mode", c.transfer_mode)} (${c.transfer_mode}), ` +
              `${c.is_material ? "material" : "data"}, ${c.stated ? "stated" : "inferred"}${c.uncertain ? ", uncertain" : ""}` +
              `${c.unmapped_note ? `; note: ${c.unmapped_note}` : ""}; ${ev(c.evidence)}`,
          )),
    );
    const durations = sim.durations.filter((d) => d.platform_id === g.platform_id);
    const throughputs = sim.throughputs.filter((t) => t.platform_id === g.platform_id);
    if (durations.length + throughputs.length > 0) {
      out.push("", "### Recorded times and throughput", "");
      for (const d of durations) {
        const mark = [d.bound ? `${d.bound} bound` : "", d.approximate ? "approximate" : ""].filter(Boolean).join(", ");
        const what = d.joint ? `steps ${d.joint.step_ids.join(", ")} together` : `${d.step_id} (${d.unit_operation})`;
        out.push(`- Duration of ${what}: ${d.value} ${d.unit}${mark ? ` (${mark})` : ""}; ${ev(d.evidence)}`);
      }
      for (const t of throughputs) {
        const day = t.per_day === null ? "" : `, ${t.per_day.toLocaleString("en", { maximumSignificantDigits: 4 })} per day`;
        out.push(`- Throughput (${t.kind}): ${t.value} ${t.unit}${day}; ${ev(t.evidence)}`);
      }
    }
  }
  out.push("");
  return out.join("\n");
}

/** Writes llms.txt into the site folder and one Markdown page per paper next to its JSON file. */
export function writeLlms(d: Derived, publicDir: string, dataDir: string): void {
  writeFileSync(join(publicDir, "llms.txt"), llmsTxt(d));
  mkdirSync(join(dataDir, "papers"), { recursive: true });
  const cite = formatCitation(d.releaseDocs.citation);
  const papers = new Map(d.index.papers.map((p) => [p.paper_id, p]));
  for (const [paperId, file] of Object.entries(d.platformFiles)) {
    writeFileSync(join(dataDir, "papers", `${paperId}.md`), paperMarkdown(file, papers.get(paperId)!, d.simulation, cite));
  }
}
