// Expected numbers for SPEC-TRENDS-001 acceptance.md, computed from public/data/index.json with the rules of spec
// section 2: the SPEC-BROWSE-001 filter rules (copied from its expected-counts.mjs), the year bins and labels (REQ-006),
// the offered split values (REQ-007), the link state and counts (REQ-008), and the colour checks of REQ-011/REQ-012.
// Section 10 holds the checks added in spec version 0.2.0.
// Run from the repository root after npm run build-data: node .moai/specs/SPEC-TRENDS-001/expected-counts.mjs
import { readFileSync } from "node:fs";

const idx = JSON.parse(readFileSync("public/data/index.json", "utf8"));
const P = idx.papers, L = idx.platforms;
const byId = Object.fromEntries(P.map((p) => [p.paper_id, p]));
const out = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));

// ---- SPEC-BROWSE-001 filter rules (REQ-005 to REQ-007 there) ----
const D = { view: "papers", years: { from: null, to: null }, field: [], im: [], sw: [], hw: [], mt: [], mtMatch: "all", tm: [], tmMatch: "all", q: "" };
const setMatch = (have, want, mode) => want.length === 0 || (mode === "any" ? want.some((w) => have.includes(w)) : want.every((w) => have.includes(w)));
const yearOk = (y, s) => (s.years.from === null || y >= s.years.from) && (s.years.to === null || y <= s.years.to);
const fieldOk = (tags, s) => s.field.length === 0 || s.field.some((f) => tags.includes(f));
const paperLevel = (p, s) => (s.im.length === 0 || s.im.includes(p.integration_mode)) && (s.sw.length === 0 || s.sw.includes(p.sw_autonomy)) && (s.hw.length === 0 || s.hw.includes(p.hw_autonomy));
const platLevel = (l, s) => setMatch(l.module_types, s.mt, s.mtMatch) && setMatch(l.material_transfer_modes, s.tm, s.tmMatch);
const has = (t, q) => t != null && t.toLowerCase().includes(q);
const paperOk = (p, s) => {
  const q = s.q.trim().toLowerCase();
  return yearOk(p.first_public_year, s) && fieldOk(p.field_tags, s) && paperLevel(p, s) &&
    (s.mt.length === 0 && s.tm.length === 0 ? true : L.some((l) => l.paper_id === p.paper_id && platLevel(l, s))) &&
    (!q || has(p.paper_id, q) || has(p.title, q));
};
const platOk = (l, s) => {
  const q = s.q.trim().toLowerCase();
  return yearOk(l.first_public_year, s) && fieldOk(l.field_tags, s) && paperLevel(byId[l.paper_id], s) && platLevel(l, s) &&
    (!q || has(l.platform_id, q) || has(l.platform_name, q));
};
const count = (s) => (s.view === "platforms" ? L.filter((l) => platOk(l, s)) : P.filter((p) => paperOk(p, s))).length;

// ---- offered values and URL encoding (SPEC-BROWSE-001 REQ-002, REQ-004) ----
const alpha = (xs) => [...new Set(xs)].sort();
const numeric = (xs) => [...new Set(xs)].sort((a, b) => a - b);
const offered = {
  field: alpha(P.flatMap((p) => p.field_tags)), im: alpha(P.map((p) => p.integration_mode)),
  sw: numeric(P.map((p) => p.sw_autonomy)), hw: numeric(P.map((p) => p.hw_autonomy)),
  mt: alpha(L.flatMap((l) => l.module_types)), tm: alpha(L.flatMap((l) => l.material_transfer_modes)),
};
const list = (xs) => xs.map((x) => encodeURIComponent(String(x))).join(",");
function encodeFilters(s) {
  const parts = [];
  if (s.view !== "papers") parts.push(`view=${s.view}`);
  if (s.years.from !== null || s.years.to !== null) parts.push(`years=${s.years.from ?? ""}-${s.years.to ?? ""}`);
  for (const k of ["field", "im"]) if (s[k].length) parts.push(`${k}=${list(alpha(s[k]))}`);
  for (const k of ["sw", "hw"]) if (s[k].length) parts.push(`${k}=${list(numeric(s[k]))}`);
  if (s.mt.length) parts.push(`mt=${list(alpha(s.mt))}`);
  if (s.mtMatch !== "all") parts.push(`mtMatch=${s.mtMatch}`);
  if (s.tm.length) parts.push(`tm=${list(alpha(s.tm))}`);
  if (s.tmMatch !== "all") parts.push(`tmMatch=${s.tmMatch}`);
  if (s.q.trim()) parts.push(`q=${encodeURIComponent(s.q.trim())}`);
  return parts.join("&");
}
const browseHash = (s) => (encodeFilters(s) ? `#/browse?${encodeFilters(s)}` : "#/browse");
const trendsQuery = (s, split) => [encodeFilters(s), split === "im" ? "" : `split=${split}`].filter(Boolean).join("&");
const trendsHash = (s, split) => (trendsQuery(s, split) ? `#/trends?${trendsQuery(s, split)}` : "#/trends");

// ---- year bins and labels (REQ-006, REQ-013) ----
const GROUP_END = 2014, PARTIAL_YEAR = 2026;
const EARLIEST = Math.min(...P.map((p) => p.first_public_year));
const LATEST = Math.max(...P.map((p) => p.first_public_year));
function bins(applied) {
  const lo = applied.from ?? -Infinity, hi = applied.to ?? Infinity;
  const result = [];
  if (Math.max(EARLIEST, lo) <= Math.min(GROUP_END, hi)) {
    const end = Math.min(applied.to ?? GROUP_END, GROUP_END);
    const label = applied.from === null
      ? (applied.to === null || applied.to >= GROUP_END ? `before ${GROUP_END + 1}` : `before ${applied.to + 1}`)
      : (applied.from === end ? `${end}` : `${applied.from}–${end}`);
    result.push({ label, years: { from: applied.from, to: end } });
  }
  for (let y = GROUP_END + 1; y <= LATEST; y++)
    if (y >= lo && y <= hi) result.push({ label: y === PARTIAL_YEAR ? `${y}*` : `${y}`, years: { from: y, to: y } });
  return result;
}

// ---- offered split values and link state (REQ-007, REQ-008) ----
function splitValues(split, s) {
  const sel = s[split];
  const keepSelected = sel.length > 0 && (["im", "sw", "hw", "field"].includes(split) || s[`${split}Match`] === "any");
  return keepSelected ? offered[split].filter((v) => sel.includes(v)) : offered[split];
}
function linkState(s, bin, split, v) {
  const st = { ...s, years: bin.years };
  if (v === undefined) return st;
  if (["im", "sw", "hw", "field"].includes(split)) st[split] = [v];
  else {
    const sel = s[split];
    st[split] = sel.length === 0 || s[`${split}Match`] === "any" ? [v] : alpha([...sel, v]);
  }
  return st;
}
function table(s, split) {
  const bs = bins(s.years);
  const values = splitValues(split, s);
  return {
    bins: bs.map((b) => b.label),
    n: bs.map((b) => count(linkState(s, b, split))),
    rows: values.map((v) => [v, bs.map((b) => count(linkState(s, b, split, v)))]),
  };
}
function printTable(title, s, split) {
  const t = table(s, split);
  console.log(`${title}  [trends hash ${trendsHash(s, split)}; count line ${count(s)}; sum of n ${t.n.reduce((a, b) => a + b, 0)}]`);
  console.log(`  ${"bin".padEnd(26)}${t.bins.map((b) => b.padStart(12)).join("")}`);
  console.log(`  ${"n".padEnd(26)}${t.n.map((x) => String(x).padStart(12)).join("")}`);
  for (const [v, cs] of t.rows) console.log(`  ${String(v).padEnd(26)}${cs.map((x) => String(x).padStart(12)).join("")}`);
}
const S = (o) => ({ ...D, ...o, years: { ...D.years, ...(o.years ?? {}) } });
function cellLink(s, split, label, v) {
  const b = bins(s.years).find((x) => x.label === label);
  const st = linkState(s, b, split, v);
  out(`cell ${label} ${split}=${v} (${s.view}) of ${trendsHash(s, split)}`, { count: count(st), n: count(linkState(s, b, split)), link: browseHash(st) });
}

// ---- 1. checks behind the spec text ----
out("papers / platforms (index totals)", [P.length, L.length]);
out("earliest / latest first public year", [EARLIEST, LATEST]);
out("papers per year <= 2014", Object.fromEntries(numeric(P.map((p) => p.first_public_year)).filter((y) => y <= GROUP_END).map((y) => [y, P.filter((p) => p.first_public_year === y).length])));
out("platform year == paper year (all)", L.every((l) => l.first_public_year === byId[l.paper_id].first_public_year));
out("platform tags == paper tags (mismatches)", L.filter((l) => JSON.stringify([...l.field_tags].sort()) !== JSON.stringify([...byId[l.paper_id].field_tags].sort())).length);
out("offered im", offered.im);
out("offered sw / hw", [offered.sw, offered.hw]);
out("offered field", offered.field);
out("offered mt", offered.mt);
out("offered tm", offered.tm);
out("papers with more than one field tag", P.filter((p) => p.field_tags.length > 1).length);

// ---- 2. bins and labels ----
for (const [name, y] of [["none", {}], ["from 2010", { from: 2010 }], ["to 2012", { to: 2012 }], ["2016-2020", { from: 2016, to: 2020 }],
  ["from 2026", { from: 2026 }], ["2014-2014", { from: 2014, to: 2014 }], ["from 1990 to 2018", { from: 1990, to: 2018 }],
  ["to 2014", { to: 2014 }], ["to 1970", { to: 1970 }], ["from 2030", { from: 2030 }]]) {
  const bs = bins({ from: null, to: null, ...y });
  out(`bins ${name}`, bs.map((b) => `${b.label} [${b.years.from ?? ""}-${b.years.to ?? ""}]`));
}

// ---- 3. per-bin totals, unfiltered ----
out("n per bin, papers", Object.fromEntries(bins(D.years).map((b) => [b.label, count(linkState(D, b))])));
out("n per bin, platforms", Object.fromEntries(bins(D.years).map((b) => [b.label, count(linkState(S({ view: "platforms" }), b))])));

// ---- 4. full tables ----
printTable("TABLE im, papers, unfiltered", D, "im");
printTable("TABLE im, platforms, unfiltered", S({ view: "platforms" }), "im");
printTable("TABLE hw, papers, unfiltered", D, "hw");
printTable("TABLE sw, papers, unfiltered", D, "sw");
printTable("TABLE field, papers, unfiltered", D, "field");
printTable("TABLE tm, papers, unfiltered", D, "tm");
printTable("TABLE im, papers, years 2018-2024 + field catalysis", S({ years: { from: 2018, to: 2024 }, field: ["catalysis"] }), "im");
printTable("TABLE im, platforms, years 2018-2024 + field catalysis", S({ view: "platforms", years: { from: 2018, to: 2024 }, field: ["catalysis"] }), "im");
printTable("TABLE im, papers, im [mixed, robot_arm_gantry]", S({ im: ["mixed", "robot_arm_gantry"] }), "im");
printTable("TABLE tm, papers, from 2010", S({ years: { from: 2010 } }), "tm");

// ---- 5. single cells and their links ----
cellLink(D, "im", "2021", "fixed_tubing");
cellLink(D, "im", "before 2015", "fixed_tubing");
cellLink(S({ view: "platforms" }), "im", "2024", "robot_arm_gantry");
cellLink(D, "field", "2021", "catalysis");
cellLink(D, "field", "2025", "nanomaterials");
cellLink(D, "mt", "2025", "flow_reactor");
cellLink(S({ view: "platforms" }), "mt", "2025", "flow_reactor");
cellLink(D, "sw", "2021", 2);

// ---- 6. mt with a selection: match all vs any ----
const sAll = S({ mt: ["flow_reactor", "liquid_handler"] });
const sAny = S({ mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" });
out("mt S=[flow_reactor,liquid_handler] all: offered count", splitValues("mt", sAll).length);
out("mt S=... any: offered", splitValues("mt", sAny));
for (const s of [sAll, sAny]) for (const v of ["flow_reactor", "liquid_handler", "instrument_optical"]) {
  if (!splitValues("mt", s).includes(v)) { out(`  ${s.mtMatch}: ${v}`, "not offered"); continue; }
  cellLink(s, "mt", "2024", v);
}
printTable("TABLE mt, papers, mt [flow_reactor, liquid_handler] any", sAny, "mt");
printTable("TABLE mt, papers, mt [flow_reactor, liquid_handler] all", sAll, "mt");
const allT = table(sAll, "mt");
out("mt all: rows for flow_reactor and liquid_handler equal n", allT.rows.filter(([v]) => sAll.mt.includes(v)).every(([, cs]) => JSON.stringify(cs) === JSON.stringify(allT.n)));
out("mt all: n per bin", Object.fromEntries(allT.bins.map((b, i) => [b, allT.n[i]])));

// ---- 7. URL cases ----
out("trends hash default", trendsHash(D, "im"));
out("trends hash platforms + years 2018-2024 + field catalysis + mt", trendsHash(S({ view: "platforms", years: { from: 2018, to: 2024 }, field: ["catalysis"] }), "mt"));
out("trends count line years 2018-2024 + field catalysis (papers, platforms)", [count(S({ years: { from: 2018, to: 2024 }, field: ["catalysis"] })), count(S({ view: "platforms", years: { from: 2018, to: 2024 }, field: ["catalysis"] }))]);
out("count line im mixed + mt flow_reactor (papers, platforms)", [count(S({ im: ["mixed"], mt: ["flow_reactor"] })), count(S({ view: "platforms", im: ["mixed"], mt: ["flow_reactor"] }))]);
out("count line q zzzz (papers, platforms)", [count(S({ q: "zzzz" })), count(S({ view: "platforms", q: "zzzz" }))]);
out("bins from 2030 (empty)", bins({ from: 2030, to: null }).length);

// ---- 8. colours: WCAG contrast ----
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const r2 = (x) => Math.round(x * 100) / 100;
const CAT_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];
const CAT_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"];
out("categorical light vs #ffffff", CAT_LIGHT.map((c) => `${c} ${r2(contrast(c, "#ffffff"))}`));
out("categorical dark vs #1a1a19", CAT_DARK.map((c) => `${c} ${r2(contrast(c, "#1a1a19"))}`));
out("ordinal ramp vs #ffffff / #1a1a19", ["#86b6ef", "#3987e5", "#1c5cab"].map((c) => `${c} ${r2(contrast(c, "#ffffff"))} / ${r2(contrast(c, "#1a1a19"))}`));
const RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
out("grid text colour per ramp step (higher contrast of #000000 / #ffffff)", RAMP.map((c, i) => {
  const dark = contrast(c, "#000000"), light = contrast(c, "#ffffff");
  return `${i} ${c} ${dark >= light ? "#000000" : "#ffffff"} ${r2(Math.max(dark, light))}`;
}));
const step = (c, max) => (c === 0 ? null : Math.min(12, Math.ceil((13 * c) / max) - 1));
out("ramp step (count, max) -> step", [[1, 39], [3, 39], [20, 39], [38, 39], [39, 39], [0, 39], [1, 1]].map(([c, m]) => `${c},${m}->${step(c, m)}`));

// ---- 9. caption and note texts against the banned list (REQ-014) ----
const BANNED = ["rise", "rose", "rising", "grow", "grew", "growth", "increas", "decreas", "declin", "surge", "boom", "drive", "driven", "popular", "dominat", "shift", "trend"];
const UNITS = [["papers", "Papers", "paper"], ["platforms", "Platforms", "platform"]];
const EXCL = [["im", "integration mode"], ["sw", "software autonomy"], ["hw", "hardware autonomy"]];
const MULTI = [["field", "field tag", "field tags"], ["mt", "module type", "module types"], ["tm", "transfer mode", "transfer modes"]];
const texts = [];
for (const [, U, u] of UNITS) {
  for (const [, name] of EXCL) texts.push(`${U} by first public year, split by ${name}. Each bar is the number of ${u}s matching the filters that were first public in that year; n above the bar is the total.`);
  for (const [k, name, plural] of MULTI) {
    const has = k === "field" || u === "platform" ? `have the ${name}` : `have a platform that has the ${name} and meets the module type and transfer mode filters`;
    texts.push(`${U} by first public year and ${name}. Each cell is the number of ${u}s matching the filters that were first public in that year and ${has}; n is the number of matching ${u}s first public in that year. A ${u} can have several ${plural}, so a column does not add up to n.`);
  }
  texts.push(`No ${u}s match these filters.`);
}
texts.push("Platforms carry the first public year, field tags, integration mode and autonomy of their paper.");
texts.push(`* ${PARTIAL_YEAR} is partial: the search ran on 20 October 2026.`);
texts.push(`The counts cover the ${P.length} papers (${L.length} platforms) that passed the screening described in the data card (DATA_CARD.md in the release files on Zenodo), not every paper on self-driving laboratories.`);
const hits = texts.flatMap((t) => BANNED.filter((b) => t.toLowerCase().includes(b)).map((b) => `${b} in: ${t}`));
out("caption and note texts checked", texts.length);
out("banned substrings found", hits);
out("texts containing %", texts.filter((t) => t.includes("%")).length);
for (const t of texts) console.log(`  text: ${t}`);
out("every grid step reaches 4.5:1 with its text colour", RAMP.every((c) => Math.max(contrast(c, "#000000"), contrast(c, "#ffffff")) >= 4.5));
out("#2a78d6 with #0b0b0b / #000000 / #ffffff", [r2(contrast("#2a78d6", "#0b0b0b")), r2(contrast("#2a78d6", "#000000")), r2(contrast("#2a78d6", "#ffffff"))]);

// ---- 10. additions of version 0.2.0 (bin-total links, value labels, rendered shading, filter toggle, inverted years) ----
const SW_LABELS = { 1: "one experiment from a data-driven design", 2: "closed-loop iteration in which results choose the next experiment", 3: "closed-loop iteration over an algorithm-generated search space" };
const HW_LABELS = { 1: "a device doing one kind of task", 2: "a workflow joining several tasks", 3: "a fully automated laboratory running varied experiments without human intervention" };
const valueLabel = (split, v) => (split === "sw" ? `${v} \u2014 ${SW_LABELS[v]}` : split === "hw" ? `${v} \u2014 ${HW_LABELS[v]}` : String(v));
function names(s, split, label, v) {
  const b = bins(s.years).find((x) => x.label === label);
  const n = count(linkState(s, b, split)), unit = s.view;
  const total = { name: `${label}: ${n} ${unit}`, link: browseHash(linkState(s, b, split)), browseCountLine: `${count(linkState(s, b, split))} of ${unit === "platforms" ? L.length : P.length} ${unit}` };
  if (v === undefined) return total;
  const st = linkState(s, b, split, v);
  return { name: `${label}, ${valueLabel(split, v)}: ${count(st)} of ${n} ${unit}`, link: browseHash(st), browseCountLine: `${count(st)} of ${unit === "platforms" ? L.length : P.length} ${unit}` };
}
out("bin total 2021 (papers, split im)", names(D, "im", "2021"));
out("bin total 2024 (platforms, split im)", names(S({ view: "platforms" }), "im", "2024"));
out("bin total 2025 (papers, split field)", names(D, "field", "2025"));
out("segment name / title 2021 im fixed_tubing", names(D, "im", "2021", "fixed_tubing").name);
out("segment 2021 sw 2", names(D, "sw", "2021", 2));
out("segment 2022 hw 3", names(D, "hw", "2022", 3));
out("legend order split im (offered order, stack order from the baseline up)", splitValues("im", D));
out("legend split hw", splitValues("hw", D).map((v) => valueLabel("hw", v)));
const ft = table(D, "field");
const fmax = Math.max(...ft.rows.flatMap(([, cs]) => cs));
const nano = ft.rows.find(([v]) => v === "nanomaterials")[1][ft.bins.indexOf("2025")];
const nstep = step(nano, fmax);
const textFor = (hex) => (contrast(hex, "#000000") >= contrast(hex, "#ffffff") ? "#000000" : "#ffffff");
out("field table: largest value count m", fmax);
out("cell 2025 nanomaterials: count, step, background, text", [nano, nstep, RAMP[nstep], textFor(RAMP[nstep])]);
const ana2015 = ft.rows.find(([v]) => v === "analytical_chemistry")[1][ft.bins.indexOf("2015")];
out("zero cell name (split field)", names(D, "field", "2015", "analytical_chemistry").name);
out("zero cell count / shaded", [ana2015, step(ana2015, fmax)]);
const activeFilterCount = (s) => [s.field, s.im, s.sw, s.hw, s.mt, s.tm].filter((g) => g.length > 0).length + (s.years.from !== null || s.years.to !== null ? 1 : 0) + (s.q.trim() ? 1 : 0);
out("Filters (n active): default / years 2018-2024 + field catalysis", [activeFilterCount(D), activeFilterCount(S({ years: { from: 2018, to: 2024 }, field: ["catalysis"] }))]);
const YEAR = /^\d{4}$/;
function yearsFromInputs(from, to) {
  const f = YEAR.test(from.trim()) ? Number(from.trim()) : null, t = YEAR.test(to.trim()) ? Number(to.trim()) : null;
  if (f !== null && t !== null && f > t) return { years: { from: null, to: null }, inverted: true };
  return { years: { from: f, to: t }, inverted: false };
}
const inv = yearsFromInputs("2020", "2018");
out("inputs From 2020 To 2018: applied range, inverted, bins, count line", [inv.years, inv.inverted, bins(inv.years).length, count(S({ years: inv.years }))]);
