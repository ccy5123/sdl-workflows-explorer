// Expected numbers for SPEC-BENCH-001 acceptance.md. An independent re-implementation of spec section 2, reading
// public/data/index.json and public/data/platforms/*.json (release 1.0.0 as derived before this SPEC) and the
// verified release files (modes/benchmark/*, modes/taxonomy/classes.csv, data_dictionary.csv). It does not import any
// code from src/ or scripts/.
// Run from the repository root after npm run build-data (which also fills the verified cache):
//   node .moai/specs/SPEC-BENCH-001/expected-counts.mjs
// The release directory defaults to the verified cache; SDL_RELEASE_DIR overrides it. Exit status 1 when any
// REQ-004 check finds a disagreement.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REL = process.env.SDL_RELEASE_DIR || ".cache/release/extract/sdl-workflows-1.0.0";
const B = join(REL, "modes/benchmark");
const out = (k, v) => console.log(k.padEnd(58), typeof v === "string" ? v : JSON.stringify(v));
const section = (t) => console.log(`\n== ${t} ==`);
let problems = 0;
const problem = (msg) => { problems++; console.log(`PROBLEM ${msg}`); };

// ---- CSV (RFC 4180: quoted fields, doubled quotes, CRLF tolerated) ----
function readCsv(path) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])));
}

// ---- inputs ----
const idx = JSON.parse(readFileSync("public/data/index.json", "utf8"));
const graphs = readdirSync("public/data/platforms").sort()
  .flatMap((f) => JSON.parse(readFileSync(join("public/data/platforms", f), "utf8")).platforms);
const G = Object.fromEntries(graphs.map((g) => [g.platform_id, g]));
const classes = readCsv(join(REL, "modes/taxonomy/classes.csv"));
const classSet = (kind) => new Set(classes.filter((c) => c.class_kind === kind).map((c) => c.class));
const uoFamily = Object.fromEntries(classes.filter((c) => c.class_kind === "unit_operation").map((c) => [c.class, c.family]));
const dict = readCsv(join(REL, "data_dictionary.csv"));
const splitRows = readCsv(join(B, "split.csv"));
const refText = readFileSync(join(B, "reference_results.json"), "utf8");
const ref = JSON.parse(refText);
const taskFiles = readdirSync(join(B, "tasks")).filter((n) => n.endsWith(".json")).sort();
const tasks = taskFiles.map((n) => JSON.parse(readFileSync(join(B, "tasks", n), "utf8")));
const ITEM_FILE = { module_type: "items_module_type.csv", transfer_mode: "items_transfer_mode.csv" };
const SPLITS = ["train", "test", "excluded"];

// ---- 1. split ----
section("1. Paper split (split.csv)");
const splitOf = new Map();
for (const r of splitRows) {
  if (splitOf.has(r.paper_id)) problem(`split.csv: duplicate paper ${r.paper_id}`);
  if (!SPLITS.includes(r.split)) problem(`split.csv: split "${r.split}"`);
  splitOf.set(r.paper_id, r.split);
}
const paperIds = new Set(idx.papers.map((p) => p.paper_id));
const missing = [...paperIds].filter((p) => !splitOf.has(p));
const extra = [...splitOf.keys()].filter((p) => !paperIds.has(p));
out("split.csv rows / index papers", `${splitRows.length} / ${paperIds.size}`);
out("papers missing from split.csv / not in index", `${missing.length} / ${extra.length}`);
if (missing.length || extra.length) problem("split.csv paper set differs from index papers");
const splitCounts = Object.fromEntries(SPLITS.map((s) => [s, splitRows.filter((r) => r.split === s).length]));
out("paper split counts", splitCounts);
const reasons = {};
for (const r of splitRows) if (r.split === "excluded") reasons[r.exclusion_reason] = (reasons[r.exclusion_reason] ?? 0) + 1;
out("exclusion reasons", reasons);
out("excluded papers", splitRows.filter((r) => r.split === "excluded").map((r) => r.paper_id).join(", "));
out("non-excluded rows with a reason", splitRows.filter((r) => r.split !== "excluded" && r.exclusion_reason !== "").length);
out("benchmark_id values", [...new Set(splitRows.map((r) => r.benchmark_id))]);
const ruleRow = dict.find((r) => r.object === "benchmark_split" && r.column === "benchmark_id");
out("data_dictionary benchmark_split/benchmark_id", ruleRow ? ruleRow.description : "MISSING");
if (!ruleRow) problem("data dictionary row missing");

// ---- 2. tasks and reference results ----
section("2. Tasks and reference results");
out("task files", taskFiles);
out("reference_results keys", Object.keys(ref));
const FIELDS = ["n_test_items", "n_test_papers", "baseline_top1", "reference_model_top1", "diff_ci95_low", "diff_ci95_high"];
for (const [i, t] of tasks.entries()) {
  if (`${t.task_id}.json` !== taskFiles[i]) problem(`task_id ${t.task_id} vs file ${taskFiles[i]}`);
  if (t.benchmark_id !== splitRows[0].benchmark_id) problem(`${t.task_id}: benchmark_id ${t.benchmark_id}`);
  const r = ref[t.task_id];
  if (!r) { problem(`no reference_results entry for ${t.task_id}`); continue; }
  if (r.task_id !== t.task_id) problem(`reference_results key ${t.task_id} holds task_id ${r.task_id}`);
  for (const f of FIELDS) if (r[f] !== t[f]) problem(`${t.task_id}.${f}: task ${t[f]} vs reference ${r[f]}`);
  out(`${t.task_id} target / keys`, `${t.target} / ${Object.keys(t).join(",")}`);
  out(`${t.task_id} reference row keys`, Object.keys(r).join(","));
  out(`${t.task_id} benchmark_id / reference task_id`, `${t.benchmark_id} / ${r.task_id}`);
  const fmt = (x) => x.toFixed(4);
  const sign = (x) => (x >= 0 ? "+" : "") + x.toFixed(4);
  out(`${t.task_id} 4-decimal row`,
    `${r.n_test_items} (${r.n_test_papers}) | ${fmt(r.baseline_top1)} | ${fmt(r.reference_model_top1)} | ` +
    `${sign(r.reference_model_top1 - r.baseline_top1)} | [${sign(r.diff_ci95_low)}, ${sign(r.diff_ci95_high)}] | ${r.replicates}`);
}
if (Object.keys(ref).length !== tasks.length) problem("reference_results entries differ from task files");
out("reference_results.json bytes / ends with newline", `${Buffer.byteLength(refText)} / ${refText.endsWith("\n")}`);

// ---- 3. items ----
section("3. Items");
const fieldTags = classSet("field_tag");
const uos = classSet("unit_operation");
const summaries = [];
const itemsJson = {};
const perPlatform = new Map(); // platform_id -> counts per task index
for (const [ti, t] of tasks.entries()) {
  const rows = readCsv(join(B, ITEM_FILE[t.target]));
  const labelsOk = classSet(t.target);
  const seen = new Set();
  const items = Object.fromEntries(SPLITS.map((s) => [s, 0]));
  const uncertain = Object.fromEntries(SPLITS.map((s) => [s, 0]));
  const labels = new Map();
  const testPapers = new Set();
  let graphMismatch = 0;
  for (const [i, r] of rows.entries()) {
    const where = `${ITEM_FILE[t.target]} row ${i + 2}`;
    if (r.task_id !== t.task_id) problem(`${where}: task_id ${r.task_id}`);
    if (seen.has(r.item_id)) problem(`${where}: duplicate item ${r.item_id}`);
    seen.add(r.item_id);
    const seg = r.item_id.split("/");
    if (seg[0] !== r.paper_id || `${seg[0]}/${seg[1]}` !== r.platform_id) problem(`${where}: ids ${r.item_id} ${r.platform_id}`);
    if (splitOf.get(r.paper_id) !== r.split) problem(`${where}: split ${r.split} vs paper ${splitOf.get(r.paper_id)}`);
    if (!labelsOk.has(r.label)) problem(`${where}: label ${r.label}`);
    if (r.field_tag !== "" && !fieldTags.has(r.field_tag)) problem(`${where}: field_tag ${r.field_tag}`);
    if (r.uncertain !== "0" && r.uncertain !== "1") problem(`${where}: uncertain ${r.uncertain}`);
    const g = G[r.platform_id];
    if (!g) { problem(`${where}: platform ${r.platform_id}`); continue; }
    if (t.target === "module_type") {
      if (!uos.has(r.unit_operation)) problem(`${where}: unit_operation ${r.unit_operation}`);
      for (const k of ["prev_unit_operation", "next_unit_operation"])
        if (!uos.has(r[k]) && r[k] !== (k.startsWith("prev") ? "START" : "END")) problem(`${where}: ${k} ${r[k]}`);
      const step = g.steps.find((s) => s.step_id === r.item_id);
      if (!step) { problem(`${where}: no step ${r.item_id}`); continue; }
      const mod = g.modules.find((m) => m.module_id === step.modules[0]);
      if (step.unit_operation !== r.unit_operation || !mod || mod.module_type !== r.label || step.uncertain !== (r.uncertain === "1"))
        graphMismatch++;
    } else {
      for (const k of ["from_unit_operation", "to_unit_operation"]) if (!uos.has(r[k])) problem(`${where}: ${k} ${r[k]}`);
      if (uoFamily[r.from_unit_operation] !== r.from_family || uoFamily[r.to_unit_operation] !== r.to_family)
        problem(`${where}: family ${r.from_family}/${r.to_family}`);
      const edge = g.connections.find((c) => c.edge_id === r.item_id);
      if (!edge) { problem(`${where}: no connection ${r.item_id}`); continue; }
      if (!edge.is_material || edge.transfer_mode !== r.label || edge.uncertain !== (r.uncertain === "1")) graphMismatch++;
    }
    items[r.split]++;
    if (r.uncertain === "1") uncertain[r.split]++;
    if (!labels.has(r.label)) labels.set(r.label, Object.fromEntries(SPLITS.map((s) => [s, 0])));
    labels.get(r.label)[r.split]++;
    if (r.split === "test") testPapers.add(r.paper_id);
    if (!perPlatform.has(r.platform_id)) perPlatform.set(r.platform_id, tasks.map(() => 0));
    perPlatform.get(r.platform_id)[ti]++;
  }
  if (items.test !== t.n_test_items) problem(`${t.task_id}: ${items.test} test items vs n_test_items ${t.n_test_items}`);
  if (testPapers.size !== t.n_test_papers) problem(`${t.task_id}: ${testPapers.size} test papers vs ${t.n_test_papers}`);
  out(`${t.task_id} rows`, rows.length);
  out(`${t.task_id} items by split`, items);
  out(`${t.task_id} uncertain by split`, uncertain);
  out(`${t.task_id} distinct test papers`, testPapers.size);
  out(`${t.task_id} platforms with items`, new Set(rows.map((r) => r.platform_id)).size);
  out(`${t.task_id} items disagreeing with the platform graph`, graphMismatch);
  if (graphMismatch) problem(`${t.task_id}: ${graphMismatch} items disagree with the graph`);
  const ordered = [...labels.entries()].sort((a, b) => {
    const ta = SPLITS.reduce((n, s) => n + a[1][s], 0), tb = SPLITS.reduce((n, s) => n + b[1][s], 0);
    return tb - ta || (a[0] < b[0] ? -1 : 1);
  });
  out(`${t.task_id} labels (${ordered.length})`, "");
  for (const [l, c] of ordered) console.log(`   ${l.padEnd(28)} train ${String(c.train).padStart(4)}  test ${String(c.test).padStart(4)}  excluded ${String(c.excluded).padStart(3)}`);
  const cols = t.target === "module_type"
    ? ["item_id", "split", "label", "field_tag", "unit_operation", "prev_unit_operation", "next_unit_operation", "uncertain"]
    : ["item_id", "split", "label", "field_tag", "from_unit_operation", "to_unit_operation", "from_family", "to_family", "uncertain"];
  itemsJson[t.task_id] = { columns: cols, rows: rows.map((r) => cols.map((c) => (c === "uncertain" ? Number(r[c]) : r[c]))) };
  out(`${t.task_id} first item`, itemsJson[t.task_id].rows[0]);
  summaries.push({ task_id: t.task_id, items, uncertain, labels: ordered.map(([label, c]) => ({ label, ...c })) });
}

// ---- 4. platforms ----
section("4. Items by platform");
const allPlatforms = idx.platforms.map((p) => p.platform_id);
out("index platforms / platforms with any item", `${allPlatforms.length} / ${perPlatform.size}`);
const noItems = allPlatforms.filter((p) => !perPlatform.has(p));
out("platforms without items", noItems);
const plat = allPlatforms.sort().map((p) => ({ platform_id: p, split: splitOf.get(p.split("/")[0]), n: perPlatform.get(p) ?? tasks.map(() => 0) }));
const bySplit = {};
for (const p of plat) bySplit[p.split] = (bySplit[p.split] ?? 0) + 1;
out("platforms by paper split", bySplit);
for (const id of ["Aand2024/P1", plat[0].platform_id, plat[plat.length - 1].platform_id]) out(`platform ${id}`, plat.find((p) => p.platform_id === id));
out("platforms with 0 transfer_mode items", plat.filter((p) => p.n[1] === 0).length);
out("test platforms with 0 transfer_mode items", plat.filter((p) => p.split === "test" && p.n[1] === 0).length);

// ---- 5. sizes ----
section("5. Size estimates (JSON.stringify, no whitespace)");
const benchmark = {
  benchmark_id: splitRows[0].benchmark_id,
  split_rule: ruleRow?.description,
  split_counts: splitCounts,
  exclusion_reasons: Object.entries(reasons).map(([reason, n]) => ({ reason, n })),
  tasks,
  summaries,
  platforms: plat,
  reference_results: ref,
  reference_results_text: refText,
};
out("benchmark.json estimate (bytes)", Buffer.byteLength(JSON.stringify(benchmark)));
out("benchmark-items.json estimate (bytes)", Buffer.byteLength(JSON.stringify(itemsJson)));

section("Result");
out("problems", problems);
process.exit(problems ? 1 : 0);
