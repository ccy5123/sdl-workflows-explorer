// Expected numbers for SPEC-TAXO-001 acceptance.md. An independent re-implementation of spec section 2, reading
// public/data/index.json, public/data/platforms/*.json (release 1.0.0 as derived by SPEC-DATA-001, before this SPEC)
// and the verified release files (modes/taxonomy/*.csv, core/taxonomy_correspondence.csv, README.md,
// data_dictionary.csv). It does not import any code from src/ or scripts/.
// Run from the repository root after npm run build-data (which also fills the verified cache):
//   node .moai/specs/SPEC-TAXO-001/expected-counts.mjs
// The release directory defaults to the verified cache; SDL_RELEASE_DIR overrides it.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REL = process.env.SDL_RELEASE_DIR || ".cache/release/extract/sdl-workflows-1.0.0";
const out = (k, v) => console.log(k.padEnd(58), typeof v === "string" ? v : JSON.stringify(v));
const section = (t) => console.log(`\n== ${t} ==`);

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
  return { header, rows: rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""]))) };
}

// ---- inputs ----
const idx = JSON.parse(readFileSync("public/data/index.json", "utf8"));
const P = idx.papers, L = idx.platforms;
const graphs = readdirSync("public/data/platforms").sort()
  .flatMap((f) => JSON.parse(readFileSync(join("public/data/platforms", f), "utf8")).platforms);
const G = Object.fromEntries(graphs.map((g) => [g.platform_id, g]));
const classes = readCsv(join(REL, "modes/taxonomy/classes.csv")).rows;
const wide = readCsv(join(REL, "modes/taxonomy/correspondence.csv"));
const long = readCsv(join(REL, "core/taxonomy_correspondence.csv")).rows;
const dict = readCsv(join(REL, "data_dictionary.csv")).rows;
const readme = readFileSync(join(REL, "README.md"), "utf8");
const KINDS = [...new Set(classes.map((c) => c.class_kind))];
const UNIT = { field_tag: "papers", module_type: "modules", transfer_mode: "connections", unit_operation: "steps" };

// ---- unit_operations per platform row (spec REQ-001) ----
const uoOf = (id) => [...new Set(G[id].steps.map((s) => s.unit_operation))].sort();
const LU = L.map((l) => ({ ...l, unit_operations: uoOf(l.platform_id) }));

section("1. index.json unit_operations (REQ-001)");
out("platform rows", LU.length);
out("rows with an empty unit_operations list", LU.filter((l) => l.unit_operations.length === 0).length);
const lens = LU.map((l) => l.unit_operations.length);
out("distinct unit operations per platform: min / max", [Math.min(...lens), Math.max(...lens)]);
out("sum of list lengths", lens.reduce((a, b) => a + b, 0));
for (const id of ["Aand2024/P1", "Zhao2026/P1"]) out(`unit_operations of ${id}`, LU.find((l) => l.platform_id === id)?.unit_operations ?? "(absent)");
const offeredUo = [...new Set(LU.flatMap((l) => l.unit_operations))].sort();
out("offered unit operations (uo)", offeredUo.length);
out("offered uo, in order", offeredUo.join(", "));
const sizeIdx = Buffer.byteLength(JSON.stringify(idx));
const sizeIdxNew = Buffer.byteLength(JSON.stringify({ ...idx, platforms: LU }));
out("index.json bytes: current / with unit_operations (estimate)", [sizeIdx, sizeIdxNew]);

// ---- browse filter rules of SPEC-BROWSE-001, extended with uo (spec REQ-006, REQ-007) ----
const D = { view: "papers", years: { from: null, to: null }, field: [], im: [], sw: [], hw: [], mt: [], mtMatch: "all", tm: [], tmMatch: "all", uo: [], uoMatch: "all", q: "" };
const S = (o) => ({ ...D, ...o });
const byId = Object.fromEntries(P.map((p) => [p.paper_id, p]));
const setMatch = (have, want, mode) => want.length === 0 || (mode === "any" ? want.some((w) => have.includes(w)) : want.every((w) => have.includes(w)));
const yearOk = (y, s) => (s.years.from === null || y >= s.years.from) && (s.years.to === null || y <= s.years.to);
const fieldOk = (tags, s) => s.field.length === 0 || s.field.some((f) => tags.includes(f));
const paperLevel = (p, s) => (s.im.length === 0 || s.im.includes(p.integration_mode)) && (s.sw.length === 0 || s.sw.includes(p.sw_autonomy)) && (s.hw.length === 0 || s.hw.includes(p.hw_autonomy));
const platLevel = (l, s) => setMatch(l.module_types, s.mt, s.mtMatch) && setMatch(l.material_transfer_modes, s.tm, s.tmMatch) && setMatch(l.unit_operations, s.uo, s.uoMatch);
const has = (t, q) => t != null && t.toLowerCase().includes(q);
const paperOk = (p, s) => {
  const q = s.q.trim().toLowerCase();
  const active = s.mt.length || s.tm.length || s.uo.length;
  return yearOk(p.first_public_year, s) && fieldOk(p.field_tags, s) && paperLevel(p, s) &&
    (!active || LU.some((l) => l.paper_id === p.paper_id && platLevel(l, s))) && (!q || has(p.paper_id, q) || has(p.title, q));
};
const platOk = (l, s) => {
  const q = s.q.trim().toLowerCase();
  return yearOk(l.first_public_year, s) && fieldOk(l.field_tags, s) && paperLevel(byId[l.paper_id], s) && platLevel(l, s) &&
    (!q || has(l.platform_id, q) || has(l.platform_name, q));
};
const count = (s) => (s.view === "platforms" ? LU.filter((l) => platOk(l, s)) : P.filter((p) => paperOk(p, s))).length;
const alpha = (xs) => [...new Set(xs)].sort();
const list = (xs) => xs.map((x) => encodeURIComponent(String(x))).join(",");
const offered = {
  field: alpha(P.flatMap((p) => p.field_tags)), mt: alpha(L.flatMap((l) => l.module_types)),
  tm: alpha(L.flatMap((l) => l.material_transfer_modes)), uo: offeredUo,
};
function encodeFilters(s) {
  const parts = [];
  if (s.view !== "papers") parts.push(`view=${s.view}`);
  if (s.years.from !== null || s.years.to !== null) parts.push(`years=${s.years.from ?? ""}-${s.years.to ?? ""}`);
  for (const k of ["field", "im"]) if (s[k].length) parts.push(`${k}=${list(alpha(s[k]))}`);
  for (const k of ["sw", "hw"]) if (s[k].length) parts.push(`${k}=${list([...new Set(s[k])].sort((a, b) => a - b))}`);
  for (const k of ["mt", "tm", "uo"]) {
    if (s[k].length) parts.push(`${k}=${list(alpha(s[k]))}`);
    if (s[`${k}Match`] !== "all") parts.push(`${k}Match=${s[`${k}Match`]}`);
  }
  if (s.q.trim()) parts.push(`q=${encodeURIComponent(s.q.trim())}`);
  return parts.join("&");
}
const browseHash = (s) => (encodeFilters(s) ? `#/browse?${encodeFilters(s)}` : "#/browse");
const line = (s) => `${count(s)} of ${s.view === "platforms" ? L.length : P.length} ${s.view}`;

section("2. uo URL and filter rules (REQ-006, REQ-007)");
const cases = [
  S({ view: "platforms", uo: ["sonicate"] }),
  S({ uo: ["sonicate"] }),
  S({ view: "platforms", uo: ["mix", "sonicate"] }),
  S({ view: "platforms", uo: ["mix", "sonicate"], uoMatch: "any" }),
  S({ uo: ["mix", "sonicate"] }),
  S({ uo: ["mix", "sonicate"], uoMatch: "any" }),
  S({ view: "platforms", uo: ["unmapped"] }),
  S({ view: "platforms", mt: ["liquid_handler"], uo: ["dispense_solid"] }),
  S({ mt: ["liquid_handler"], uo: ["dispense_solid"] }),
  S({ view: "platforms", tm: ["mobile_robot"], uo: ["handle_sample"] }),
  S({ years: { from: 2018, to: 2024 }, field: ["catalysis"], uo: ["react_thermal"] }),
  S({ view: "platforms", uo: ["plan_next_experiment"] }),
  S({ view: "platforms", uo: ["clean_equipment", "dispense_liquid"] }),
  S({ uo: ["clean_equipment", "dispense_liquid"] }),
  S({ uo: ["clean_equipment", "dispense_liquid"], q: "Roch2020" }),
  S({ view: "platforms", q: "Roch2020" }),
];
for (const s of cases) out(browseHash(s), line(s));

// The REQ-007 rule on uo: one platform must pass every selected unit operation (match all).
const pairOnePlatform = (a, b) => P.filter((p) => paperOk(p, S({ uo: [a, b] }))).length;
const pairAnyPlatforms = (a, b) => P.filter((p) => {
  const ls = LU.filter((l) => l.paper_id === p.paper_id);
  return ls.some((l) => l.unit_operations.includes(a)) && ls.some((l) => l.unit_operations.includes(b));
}).length;
let example = null;
for (const a of offeredUo) for (const b of offeredUo) if (!example && a < b && pairAnyPlatforms(a, b) > pairOnePlatform(a, b)) example = [a, b];
out("uo pair where split platforms would differ (first found)", example);
if (example) {
  out("  papers, one platform has both (REQ-007)", pairOnePlatform(...example));
  out("  papers, both on any platforms of the paper (not the rule)", pairAnyPlatforms(...example));
  const papersSplit = P.filter((p) => {
    const ls = LU.filter((l) => l.paper_id === p.paper_id);
    return ls.some((l) => l.unit_operations.includes(example[0])) && ls.some((l) => l.unit_operations.includes(example[1])) &&
      !ls.some((l) => l.unit_operations.includes(example[0]) && l.unit_operations.includes(example[1]));
  }).map((p) => p.paper_id);
  out("  papers counted only by the wrong rule", papersSplit);
}

// Decoding cases (same rules as SPEC-BROWSE-001 REQ-002, applied to uo / uoMatch).
function decodeUo(query) {
  const raw = new Map();
  for (const part of query.split("&")) { const eq = part.indexOf("="); if (eq > 0) raw.set(part.slice(0, eq), part.slice(eq + 1)); }
  let uo = [], uoMatch = "all";
  if (raw.has("uo")) {
    const items = raw.get("uo").split(",").map((x) => { try { return decodeURIComponent(x); } catch { return null; } }).filter((x) => x !== null && offered.uo.includes(x));
    if (items.length) uo = alpha(items);
  }
  if (raw.get("uoMatch") === "any" || raw.get("uoMatch") === "all") uoMatch = raw.get("uoMatch");
  return { uo, uoMatch };
}
for (const q of ["uo=sonicate,mix", "uo=mix,xx,mix", "uo=xx", "uo=mix&uo=xx", "uo=xx&uo=mix", "uoMatch=any", "uoMatch=some", "uo=", "uo=%E0,mix"]) out(`decode ${q}`, decodeUo(q));
out("encode {view platforms, mt flow_reactor, tmMatch any, uo [sonicate, mix], uoMatch any, q pump}",
  encodeFilters(S({ view: "platforms", mt: ["flow_reactor"], tmMatch: "any", uo: ["sonicate", "mix"], uoMatch: "any", q: "pump" })));

// ---- per-class counts and examples (spec REQ-002) ----
const cmpId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function itemsOn(kind, cls, g) {
  if (kind === "module_type") return g.modules.filter((m) => m.module_type === cls).length;
  if (kind === "transfer_mode") return g.connections.filter((c) => c.transfer_mode === cls).length;
  if (kind === "unit_operation") return g.steps.filter((s) => s.unit_operation === cls).length;
  return null;
}
function classStats(c) {
  const kind = c.class_kind, cls = c.class;
  let nItems, plats;
  if (kind === "field_tag") {
    nItems = P.filter((p) => p.field_tags.includes(cls)).length;
    plats = L.filter((l) => l.field_tags.includes(cls)).map((l) => ({ platform_id: l.platform_id, platform_name: l.platform_name, n: null }))
      .sort((a, b) => cmpId(a.platform_id, b.platform_id));
  } else {
    nItems = graphs.reduce((n, g) => n + itemsOn(kind, cls, g), 0);
    plats = graphs.map((g) => ({ platform_id: g.platform_id, platform_name: L.find((l) => l.platform_id === g.platform_id).platform_name, n: itemsOn(kind, cls, g) }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n || cmpId(a.platform_id, b.platform_id));
  }
  const paperIds = new Set(plats.map((x) => L.find((l) => l.platform_id === x.platform_id).paper_id));
  const nPapers = kind === "field_tag" ? nItems : paperIds.size;
  return { nItems, nPlatforms: plats.length, nPapers, examples: plats.slice(0, 5) };
}
const GROUP = { field_tag: "field", module_type: "mt", transfer_mode: "tm", unit_operation: "uo" };
/** Browse link of a class for one view (spec REQ-012): filtered when offered, unfiltered for a class on every platform, else none. */
function browseLink(c, st, view) {
  const g = GROUP[c.class_kind];
  if (offered[g].includes(c.class)) return browseHash(S({ view, [g]: [c.class] }));
  if (st.nPlatforms === L.length && st.nPapers === P.length) return browseHash(S({ view }));
  return null;
}
const queryState = (hash) => {
  const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const m = new Map(q.split("&").filter(Boolean).map((p) => p.split("=")));
  const s = S({ view: m.get("view") ?? "papers" });
  for (const g of ["field", "mt", "tm", "uo"]) if (m.has(g)) s[g] = m.get(g).split(",");
  return s;
};

section("3. classes per kind and families (REQ-002, REQ-011)");
out("classes", classes.length);
for (const k of KINDS) out(`  ${k}`, classes.filter((c) => c.class_kind === k).length);
const fam = {};
for (const c of classes.filter((c) => c.class_kind === "unit_operation")) fam[c.family] = (fam[c.family] ?? 0) + 1;
out("unit-operation families, alphabetical (name: classes)", Object.keys(fam).sort().map((f) => `${f}: ${fam[f]}`).join(", "));
out("classes with a family outside unit operations", classes.filter((c) => c.class_kind !== "unit_operation" && c.family !== "").length);

section("4. per-class counts, links and count lines (REQ-002, REQ-012, REQ-015)");
const stats = new Map();
let linked = 0, unfiltered = [], noLink = [], mismatches = 0;
for (const c of classes) {
  const st = classStats(c);
  stats.set(`${c.class_kind}/${c.class}`, st);
  const lp = browseLink(c, st, "platforms"), lq = browseLink(c, st, "papers");
  if (lp === null) noLink.push(`${c.class_kind}/${c.class}`);
  else {
    linked++;
    if (count(queryState(lp)) !== st.nPlatforms || count(queryState(lq)) !== st.nPapers) mismatches++;
    if (!offered[GROUP[c.class_kind]].includes(c.class)) unfiltered.push(`${c.class_kind}/${c.class}`);
  }
  console.log(`  ${c.class_kind.padEnd(15)}${c.class.padEnd(28)}items ${String(st.nItems).padStart(4)} ${UNIT[c.class_kind].padEnd(12)}platforms ${String(st.nPlatforms).padStart(3)}  papers ${String(st.nPapers).padStart(3)}`);
}
out("classes with browse links", linked);
out("  of these, unfiltered links (not offered, on every platform)", unfiltered);
out("classes without browse links", noLink);
out("classes whose count lines differ from n_platforms / n_papers", mismatches);
const sumBy = (k, f) => classes.filter((c) => c.class_kind === k).reduce((n, c) => n + stats.get(`${k}/${c.class}`)[f], 0);
for (const k of KINDS) out(`sum of n_items, ${k}`, sumBy(k, "nItems"));
out("papers with no platform", P.filter((p) => !L.some((l) => l.paper_id === p.paper_id)).length);

// REQ-004 (g) and (h): graph-derived counts against the platform-row columns the browser filters on.
const COLUMN = { field_tag: "field_tags", module_type: "module_types", transfer_mode: "material_transfer_modes", unit_operation: "unit_operations" };
const nonMaterial = classes.filter((c) => c.class_kind === "transfer_mode").filter((c) => {
  const conns = graphs.flatMap((g) => g.connections.filter((x) => x.transfer_mode === c.class));
  return conns.length > 0 && conns.every((x) => !x.is_material);
}).map((c) => c.class);
out("transfer modes with connections, none material (REQ-004 g)", nonMaterial);
let hFail = [];
for (const c of classes) {
  const st = stats.get(`${c.class_kind}/${c.class}`);
  if ((c.class_kind === "transfer_mode" && nonMaterial.includes(c.class))) continue;
  const rows = LU.filter((l) => l[COLUMN[c.class_kind]].includes(c.class));
  const papersCol = c.class_kind === "field_tag" ? P.filter((p) => p.field_tags.includes(c.class)).length : new Set(rows.map((l) => l.paper_id)).size;
  if (rows.length !== st.nPlatforms || papersCol !== st.nPapers) hFail.push(`${c.class_kind}/${c.class}`);
}
out("classes (all but REQ-004 g) whose counts differ from the browse columns (REQ-004 h)", hFail);
out("classes with 0 items", classes.filter((c) => stats.get(`${c.class_kind}/${c.class}`).nItems === 0).map((c) => `${c.class_kind}/${c.class}`));
out("smallest non-zero n_platforms / n_papers", [Math.min(...[...stats.values()].map((s) => s.nPlatforms).filter((n) => n > 0)), Math.min(...[...stats.values()].map((s) => s.nPapers).filter((n) => n > 0))]);

section("5. chosen classes: links, count lines, examples (AC-10, AC-12)");
const chosen = [
  ["field_tag", "catalysis"], ["field_tag", "chemistry_synthesis"], ["field_tag", "unmapped"],
  ["module_type", "flow_reactor"], ["module_type", "software"], ["module_type", "assembly_unit"],
  ["transfer_mode", "mobile_robot"], ["transfer_mode", "data_transfer"], ["transfer_mode", "unmapped"],
  ["unit_operation", "sonicate"], ["unit_operation", "dispense_liquid"], ["unit_operation", "unmapped"],
];
for (const [k, cls] of chosen) {
  const c = classes.find((x) => x.class_kind === k && x.class === cls);
  const st = stats.get(`${k}/${cls}`);
  console.log(`  ${k}/${cls}  family ${c.family || "(none)"}  items ${st.nItems} ${UNIT[k]}, platforms ${st.nPlatforms}, papers ${st.nPapers}`);
  for (const view of ["platforms", "papers"]) {
    const h = browseLink(c, st, view);
    console.log(`    ${view.padEnd(10)} ${h ?? "(no link)"}${h ? `  → ${line(queryState(h))}` : ""}`);
  }
  console.log(`    examples ${JSON.stringify(st.examples.map((e) => (e.n === null ? e.platform_id : `${e.platform_id} (${e.n})`)))}`);
  console.log(`    example names ${JSON.stringify(st.examples.map((e) => e.platform_name))}`);
}
let tie = null;
for (const c of classes.filter((x) => x.class_kind !== "field_tag")) {
  const ex = stats.get(`${c.class_kind}/${c.class}`).examples;
  for (let i = 1; i < ex.length && !tie; i++) if (ex[i].n === ex[i - 1].n) tie = [`${c.class_kind}/${c.class}`, ex.map((e) => `${e.platform_id} (${e.n})`)];
}
out("first class whose examples contain a tie on n", tie);
out("classes with fewer than 5 examples", classes.filter((c) => stats.get(`${c.class_kind}/${c.class}`).examples.length < 5).map((c) => `${c.class_kind}/${c.class}:${stats.get(`${c.class_kind}/${c.class}`).examples.length}`));

// ---- correspondence (spec REQ-003, REQ-004) ----
section("6. correspondence: long table, wide table, cross-check (REQ-003, REQ-004)");
const VOCABS = wide.header.filter((h) => h !== "class_kind" && h !== "class" && !h.endsWith("_source"));
out("vocabularies in wide column order", VOCABS);
out("wide rows (classes in the correspondence)", wide.rows.length);
const inCorr = new Set(wide.rows.map((w) => `${w.class_kind}/${w.class}`));
for (const k of KINDS) out(`  ${k}`, wide.rows.filter((w) => w.class_kind === k).length);
out("classes not in the correspondence", classes.filter((c) => !inCorr.has(`${c.class_kind}/${c.class}`)).map((c) => `${c.class_kind}/${c.class}`).filter((x) => !x.startsWith("field_tag/")));
out("long rows", long.length);
const parseSources = (cell) => cell.split(" · ").map((s) => { const p = s.split(" ; "); return { key: p[0], page: p[1] ?? null, locator: p[2] ?? null }; });
function parseCell(cell) {
  if (cell === "none") return [{ target: "none", match: "none" }];
  return cell.split("; ").map((part) => { const m = /^(.*) \(([^()]*)\)$/.exec(part); return m ? { target: m[1], match: m[2] } : { target: part, match: "?" }; });
}
let cells = 0, notCovered = 0, multi = 0, wideTargets = 0, disagreements = 0, orderDiffs = 0, noneCells = 0;
const missingClass = long.filter((r) => !classes.some((c) => c.class_kind === r.class_kind && c.class === r.class)).length;
for (const w of wide.rows) for (const v of VOCABS) {
  const rows = long.filter((r) => r.class_kind === w.class_kind && r.class === w.class && r.vocabulary === v);
  if (w[v] === "") { notCovered++; if (rows.length || w[`${v}_source`] !== "") disagreements++; continue; }
  cells++;
  const parsed = parseCell(w[v]);
  wideTargets += parsed.length;
  if (parsed.length > 1) multi++;
  if (w[v] === "none") noneCells++;
  const a = parsed.map((t) => `${t.target}|${t.match}`), b = rows.map((r) => `${r.target}|${r.match}`);
  if (JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort())) disagreements++;
  else if (JSON.stringify(a) !== JSON.stringify(b)) orderDiffs++;
  if (rows.some((r) => r.source_ref !== w[`${v}_source`])) disagreements++;
}
out("filled cells / not-covered cells / cells x vocab total", [cells, notCovered, wide.rows.length * VOCABS.length]);
out("cells with one 'none' target", noneCells);
out("cells with more than one target", multi);
out("targets parsed from the wide table", wideTargets);
out("long rows whose class is missing from classes.csv", missingClass);
out("long-vs-wide disagreements (targets, relations, sources)", disagreements);
out("cells where the target order differs (same targets)", orderDiffs);
const nc = {};
for (const w of wide.rows) for (const v of VOCABS) if (w[v] === "") nc[`${v} ${w.class_kind}`] = (nc[`${v} ${w.class_kind}`] ?? 0) + 1;
out("not-covered cells by vocabulary and kind", nc);
const kindsByVocab = Object.fromEntries(VOCABS.map((v) => [v, KINDS.filter((k) => long.some((r) => r.vocabulary === v && r.class_kind === k))]));
out("kinds covered per vocabulary", kindsByVocab);
const matches = {};
for (const r of long) matches[r.match] = (matches[r.match] ?? 0) + 1;
out("targets by relation", matches);
const perVocab = Object.fromEntries(VOCABS.map((v) => [v, long.filter((r) => r.vocabulary === v).length]));
out("targets by vocabulary", perVocab);
const keysByVocab = Object.fromEntries(VOCABS.map((v) => [v, [...new Set(long.filter((r) => r.vocabulary === v).flatMap((r) => parseSources(r.source_ref).map((s) => s.key)))]]));
out("source keys used per vocabulary", keysByVocab);
const allSources = long.flatMap((r) => parseSources(r.source_ref));
// Sources as stored in taxonomy.json (spec REQ-002): once per entry (filled cell), not once per long-table row.
const cellSources = [];
for (const w of wide.rows) for (const v of VOCABS) {
  const row = long.find((r) => r.class_kind === w.class_kind && r.class === w.class && r.vocabulary === v);
  if (row) cellSources.push(...parseSources(row.source_ref));
}
out("entries' sources (once per entry): total / page+locator / key only",
  [cellSources.length, cellSources.filter((s) => s.page !== null && s.locator !== null).length, cellSources.filter((s) => s.page === null).length]);
out("  (summed over the 280 long-table rows instead: total / page+locator / key only)",
  [allSources.length, allSources.filter((s) => s.page !== null && s.locator !== null).length, allSources.filter((s) => s.page === null).length]);
const partCounts = {};
for (const r of long) for (const s of r.source_ref.split(" · ")) { const n = s.split(" ; ").length; partCounts[n] = (partCounts[n] ?? 0) + 1; }
out("source part counts over long rows (REQ-004 i: only 1 or 3 allowed)", partCounts);
const emptyCovered = [];
for (const w of wide.rows) for (const v of VOCABS) if (w[v] === "" && kindsByVocab[v].includes(w.class_kind)) emptyCovered.push(`${w.class_kind}/${w.class} ${v}`);
out("empty cells in a kind the vocabulary covers (REQ-004 a)", emptyCovered);
out("key-only sources sit on 'none' rows only", long.every((r) => parseSources(r.source_ref).every((s) => s.page !== null) || r.match === "none"));
out("distinct page strings", [...new Set(allSources.map((s) => s.page).filter(Boolean))].join(" | "));

// ---- README source table and relation meanings (spec REQ-003) ----
section("7. README source table and relation meanings (REQ-003)");
const sec = readme.indexOf("## Sources of the correspondence table");
// The first Markdown table after the heading: contiguous "|" lines; the header row and the separator row are skipped.
const after = readme.slice(sec).split("\n");
const start = after.findIndex((l) => l.startsWith("|"));
const tbl = [];
for (let i = start; i >= 0 && i < after.length && after[i].startsWith("|"); i++) tbl.push(after[i]);
const srcTable = tbl.slice(2).map((l) => l.split("|").slice(1, -1).map((x) => x.trim())).map(([keys, vocabulary, reference]) => {
  const m = /doi:(\S+)/.exec(reference);
  return { keys: keys.split(", "), vocabulary, reference, doi: m ? m[1].replace(/[.,]$/, "") : null };
});
out("README table header", tbl[0]);
out("README source rows", srcTable.length);
for (const s of srcTable) out(`  ${s.keys.join(", ")}`, `${s.vocabulary} | doi ${s.doi}`);
out("README keys", srcTable.flatMap((s) => s.keys));
const usedKeys = [...new Set(allSources.map((s) => s.key))];
out("source keys used but absent from README", usedKeys.filter((k) => !srcTable.some((s) => s.keys.includes(k))));
out("README keys never used", srcTable.flatMap((s) => s.keys).filter((k) => !usedKeys.includes(k)));
out("README row per vocabulary (via its keys)", Object.fromEntries(VOCABS.map((v) => [v, [...new Set(keysByVocab[v].map((k) => srcTable.findIndex((s) => s.keys.includes(k))))].map((i) => srcTable[i]?.vocabulary)])));
const matchRow = dict.find((r) => r.object === "taxonomy_correspondence" && r.column === "match");
function splitTop(text) {
  const parts = []; let depth = 0, cur = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (depth === 0 && text.startsWith("; ", i)) { parts.push(cur); cur = ""; i++; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}
const relations = splitTop(matchRow.description).map((p) => { const m = /^(\S+) \((.*)\)$/.exec(p); return m ? { match: m[1], meaning: m[2] } : { match: p, meaning: null }; });
out("relation meanings (data_dictionary.csv)", relations);
out("relations used in the long table but not defined", Object.keys(matches).filter((m) => !relations.some((r) => r.match === m)));

// ---- size estimate of the new taxonomy.json (spec REQ-005) ----
section("8. taxonomy.json size (REQ-005)");
const corrOf = (c) => {
  if (!inCorr.has(`${c.class_kind}/${c.class}`)) return null;
  return VOCABS.filter((v) => long.some((r) => r.class_kind === c.class_kind && r.class === c.class && r.vocabulary === v)).map((v) => {
    const rows = long.filter((r) => r.class_kind === c.class_kind && r.class === c.class && r.vocabulary === v);
    return { vocabulary: v, targets: rows.map((r) => ({ target: r.target, match: r.match })), sources: parseSources(rows[0].source_ref) };
  });
};
const estimate = {
  classes: classes.map((c) => {
    const st = stats.get(`${c.class_kind}/${c.class}`);
    return { class_kind: c.class_kind, class: c.class, family: c.family || null, definition: c.definition, n_items: st.nItems, n_platforms: st.nPlatforms, n_papers: st.nPapers, examples: st.examples, correspondence: corrOf(c) };
  }),
  vocabularies: VOCABS.map((v) => ({ vocabulary: v, kinds: kindsByVocab[v], source_keys: keysByVocab[v] })),
  sources: srcTable, relations,
};
const current = Buffer.byteLength(readFileSync("public/data/taxonomy.json", "utf8"));
out("taxonomy.json bytes: current (raw correspondence rows)", current);
out("taxonomy.json bytes: estimate in the shape of spec REQ-002/REQ-003", Buffer.byteLength(JSON.stringify(estimate)));
out("structured targets in the estimate", estimate.classes.reduce((n, c) => n + (c.correspondence ?? []).reduce((m, v) => m + v.targets.length, 0), 0));

// ---- detail-page expectations for the correspondence display (spec REQ-013) ----
section("9. correspondence of chosen classes (AC-13)");
for (const [k, cls] of [["module_type", "thermal_unit"], ["module_type", "assembly_unit"], ["module_type", "human"], ["transfer_mode", "mobile_robot"], ["unit_operation", "sonicate"], ["unit_operation", "wash_extract"]]) {
  const c = classes.find((x) => x.class_kind === k && x.class === cls);
  if (!c) { out(`${k}/${cls}`, "(not a class)"); continue; }
  const corr = corrOf(c);
  console.log(`  ${k}/${cls}`);
  for (const v of VOCABS) {
    const e = corr?.find((x) => x.vocabulary === v);
    console.log(`    ${v.padEnd(14)} ${e ? e.targets.map((t) => (t.match === "none" ? "none" : `${t.target} (${t.match})`)).join("; ") + "  ←  " + e.sources.map((s) => [s.key, s.page, s.locator].filter((x) => x !== null).join(" ; ")).join(" · ") : "(not covered)"}`);
  }
}
const noneWithPage = long.filter((r) => r.match === "none" && parseSources(r.source_ref).some((s) => s.page !== null));
out("none rows whose source has a page and locator", noneWithPage.map((r) => `${r.class_kind}/${r.class} ${r.vocabulary}: ${r.source_ref}`));
const human = classes.find((x) => x.class === "human");
out("class named human (kind)", human ? human.class_kind : null);

// ---- trends caption (spec REQ-008) ----
section("10. trends caption with the uo filter (REQ-008)");
for (const [name, plural] of [["module type", "module types"], ["transfer mode", "transfer modes"]]) {
  console.log(`  Papers by first public year and ${name}. Each cell is the number of papers matching the filters that were first public in that year and have a platform that has the ${name} and meets the module type, transfer mode and unit operation filters; n is the number of matching papers first public in that year. A paper can have several ${plural}, so a column does not add up to n.`);
}
out("trends count line with uo, #/trends?uo=sonicate (papers)", line(S({ uo: ["sonicate"] })));
