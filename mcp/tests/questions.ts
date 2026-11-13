// Writes tests/questions.md: questions a user might ask, each with the record ids a correct answer must cite, computed
// from the pinned release with the same tool functions the server runs. Used for the manual check with a real LLM
// client before each publish. Run: npx tsx tests/questions.ts (from mcp/, after the release is in ../.cache/release).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadDataset, PIN } from "../src/dataset";
import { comparePlatforms, countByYear, getPlatform, searchPlatformsTool, similarPlatforms, simulateCycleTime } from "../src/tools";

const ds = await loadDataset({
  cacheDir: join(import.meta.dirname, "..", "..", ".cache", "release-mcp-questions"),
  localZip: join(import.meta.dirname, "..", "..", ".cache", "release", PIN.file_name),
});

const ids = (rows: { platform_id: string }[], n = 100) => rows.slice(0, n).map((r) => r.platform_id);
const list = (xs: readonly (string | number)[]) => xs.map((x) => `\`${x}\``).join(", ");

const sections: string[] = [];
const add = (question: string, tools: string, expect: string[]) => {
  sections.push(`### ${sections.length + 1}. ${question}\n\nExpected tools: ${tools}\n\n${expect.map((e) => `- ${e}`).join("\n")}\n`);
};

/** Platforms each spelling finds; under the technique search every spelling of one technique gives the same set. */
function spellings(texts: string[]) {
  const per = texts.map((text) => ({ text, ids: ids(searchPlatformsTool(ds, { text, limit: 100 }).results.platforms) }));
  return { per, all: [...new Set(per.flatMap((p) => p.ids))].sort() };
}

const ftir = spellings(["FT-IR", "FTIR", "ReactIR", "FlowIR"]);
add("Which self-driving labs use an in-line FT-IR?", "search_platforms (text, or filters.techniques ir_spectroscopy)", [
  `${ftir.all.length} platforms; each spelling gives the same set (${ftir.per.map((p) => `"${p.text}" ${p.ids.length}`).join(", ")}): ${list(ftir.all)}`,
  "Whether a given IR is in-line is in the module name, not in the technique tag",
  "Each named with paper key and DOI; the IR module named as the paper states it, with its module id and evidence (matched_modules)",
  "The answer says the technique tags were assigned by a language model and are not part of the release",
]);

const xrd = spellings(["XRD", "diffractometer", "X-ray diffraction"]);
add("Find platforms that measure with X-ray diffraction.", "search_platforms (text, or filters.techniques x_ray_diffraction)", [
  `${xrd.all.length} platforms; each spelling gives the same set (${xrd.per.map((p) => `"${p.text}" ${p.ids.length}`).join(", ")}): ${list(xrd.all)}`,
  "If the model filters by module type instead, the code is `instrument_structural` (XRD, XPS or NMR), so it must not call every hit an XRD",
]);

const flowOpt = searchPlatformsTool(ds, { filters: { module_types: ["flow_reactor", "instrument_optical"] }, limit: 100 }).results;
add("Which platforms combine a flow reactor with an optical spectrometer?", "list_vocabulary, search_platforms (filters, all)", [
  `${flowOpt.total} platforms: ${list(ids(flowOpt.platforms))}`,
]);

const aand = getPlatform(ds, { platform_id: "Aand2024/P1" }).results;
add("Walk me through one cycle of Aand2024/P1 and say where in the paper each step is described.", "get_platform", [
  `Steps in order: ${list(aand.steps!.map((s) => s.step_id))}`,
  `Evidence per step, e.g. ${aand.steps![0]!.step_id}: ${aand.steps![0]!.evidence.text}`,
  `Step ${aand.steps!.find((s) => s.uncertain)?.step_id ?? "none"} is marked uncertain; a good answer says so`,
]);

const mobile = searchPlatformsTool(ds, { filters: { transfer_modes: ["mobile_robot"] }, limit: 100 }).results;
add("Which labs move samples with a mobile robot?", "search_platforms (transfer_modes)", [`${mobile.total} platforms: ${list(ids(mobile.platforms))}`]);

const years = countByYear(ds, { unit: "papers", split: "im" }).results;
const robot = years.values.find((v) => v.value === "robot_arm_gantry");
add("How has the number of papers with robot-arm integration changed over the years?", "count_by_year (papers, im)", [
  `Bins: ${years.bins.map((b) => b.label).join(", ")}`,
  `robot_arm_gantry per bin: ${robot ? robot.counts!.join(", ") : "not offered"}`,
  `The last year is partial (search date ${"20 October 2026"}); a good answer says so`,
]);

const similar = similarPlatforms(ds, { platform_id: "Aand2024/P1", limit: 5 }).results;
add("Which platforms are built most like Aand2024/P1?", "similar_platforms", [
  `Top 5: ${list(ids(similar.platforms))}`,
  "A good answer says the ranking compares structure (step order, module types, transfer modes), not quality",
]);

const sim = simulateCycleTime(ds, {
  workflow: {
    modules: [{ type: "liquid_handler" }, { type: "batch_reactor" }, { type: "instrument_optical" }],
    steps: [
      { unit_operation: "dispense_liquid", module: 1 },
      { unit_operation: "react_thermal", module: 2 },
      { unit_operation: "measure_optical", module: 3 },
    ],
  },
  parallel: 2,
  include_durations: true,
}).results;
const used = sim.cycle_range.steps.flatMap((s) => (s.durations_used?.all ?? []).map((d) => d.step_id));
// The rows the default output names (lowest, median, highest per step); a good answer cites some of these.
const shown = sim.cycle_range.steps.flatMap((s) =>
  s.durations_used ? [s.durations_used.lowest, ...s.durations_used.median, s.durations_used.highest].map((d) => d.step_id) : [],
);
add(
  "I plan a liquid handler → heated batch reactor → UV-vis workflow with two batches in parallel. How many experiments per day could it run?",
  "list_vocabulary, simulate_cycle_time",
  [
    `Cycle range (s): ${JSON.stringify(sim.cycle_range.cycle_s)}; experiments per day: ${JSON.stringify(sim.cycle_range.experiments_per_day)}`,
    `${used.length} recorded duration rows from other platforms; the default output names the lowest, median and highest per step: ${list([...new Set(shown)])}`,
    "A good answer calls these simulated from other platforms' recorded durations and gives the workflow_url",
    "With one reactor the two batches queue for it (the result says so in notes); a good answer gives the figure for one reactor and for two, or asks how many reactors there are",
  ],
);

const cmp = comparePlatforms(ds, { platform_ids: ["Aand2024/P1", "AbdelLatif2021/P1"] }).results;
add("Compare Aand2024/P1 with AbdelLatif2021/P1.", "compare_platforms", [
  `Module types: ${cmp.module_types.map((r) => `${r.module_type} ${r.counts.map((c) => c ?? 0).join("/")}`).join("; ")}`,
]);

const cryo = searchPlatformsTool(ds, { text: "cryo-EM" }).results;
add("Is there a self-driving lab with a cryo-EM in the database?", "search_platforms", [
  `Text "cryo-EM" matches ${cryo.total} platforms; a correct answer says the database records none, instead of naming one from memory`,
]);

const withThroughput = ds.derived.simulation.throughputs.find((t) => t.kind === "measured" && t.per_day !== null)!;
const tp = getPlatform(ds, { platform_id: withThroughput.platform_id, include: ["timing"] }).results;
add(`What throughput did ${withThroughput.platform_id} report?`, "get_platform (timing)", [
  `Throughputs: ${tp.timing!.throughputs.map((t) => `${t.kind} ${t.stated} (${t.evidence.text})`).join("; ")}`,
]);

const doc = `# Questions for the manual check

Generated by \`tests/questions.ts\` from release ${PIN.version} (${PIN.doi}). Ask each question in a client with the
server connected and note, per question, which expected ids the answer cites, whether it cites ids that are not in
the tool results, and whether it says "not recorded" where the database has nothing. The record of a check is the list
of those observations, not a score.

${sections.join("\n")}`;
writeFileSync(join(import.meta.dirname, "questions.md"), doc);
console.log(`wrote ${sections.length} questions`);
