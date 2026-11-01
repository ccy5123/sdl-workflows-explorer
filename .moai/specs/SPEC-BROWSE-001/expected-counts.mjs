// Expected counts for SPEC-BROWSE-001 acceptance.md (AC-3 offered values, AC-5 counts, AC-6 and AC-14 comparison rows), computed from public/data/ with the rules of spec section 2.
// Run from the repository root after npm run build-data: node .moai/specs/SPEC-BROWSE-001/expected-counts.mjs
import { readFileSync, readdirSync } from "node:fs";

const idx = JSON.parse(readFileSync("public/data/index.json", "utf8"));
const tax = JSON.parse(readFileSync("public/data/taxonomy.json", "utf8"));
const P = idx.papers, L = idx.platforms;
const tally = (xs) => xs.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
const out = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));

out("papers / platforms", [P.length, L.length]);
out("years", [Math.min(...P.map((p) => p.first_public_year)), Math.max(...P.map((p) => p.first_public_year))]);
out("integration_mode", tally(P.map((p) => p.integration_mode)));
out("sw", tally(P.map((p) => p.sw_autonomy)));
out("hw", tally(P.map((p) => p.hw_autonomy)));
out("field tags used (papers)", [...new Set(P.flatMap((p) => p.field_tags))].sort());
out("field tags used (platforms)", [...new Set(L.flatMap((p) => p.field_tags))].sort().length);
out("taxonomy class_kind", tally(tax.classes.map((c) => c.class_kind)));
out("transfer modes (platforms)", tally(L.flatMap((p) => p.material_transfer_modes)));
out("module types used", new Set(L.flatMap((p) => p.module_types)).size);
out("null platform_name", L.filter((p) => p.platform_name === null).length);
out("n_platforms max / papers with 0", [Math.max(...P.map((p) => p.n_platforms)), P.filter((p) => p.n_platforms === 0).length]);
out("platforms per paper == n_platforms", P.every((p) => L.filter((l) => l.paper_id === p.paper_id).length === p.n_platforms));
const byId = Object.fromEntries(P.map((p) => [p.paper_id, p]));
out("platform year == paper year", L.every((l) => l.first_public_year === byId[l.paper_id].first_public_year));
out("platform tags == paper tags", L.filter((l) => JSON.stringify([...l.field_tags].sort()) !== JSON.stringify([...byId[l.paper_id].field_tags].sort())).length);
out("platforms with empty module_types", L.filter((l) => l.module_types.length === 0).length);
out("platforms with empty transfer modes", L.filter((l) => l.material_transfer_modes.length === 0).length);
out("papers with empty field_tags", P.filter((p) => p.field_tags.length === 0).length);
// paper id substring collisions (matters for q)
const coll = P.filter((a) => P.some((b) => b !== a && b.paper_id.toLowerCase().includes(a.paper_id.toLowerCase()))).map((p) => p.paper_id);
out("paper ids contained in another id", coll);

// graph consistency with index
let mtMismatch = 0, tmMismatch = 0, maxSteps = 0, maxModules = 0;
for (const f of readdirSync("public/data/platforms")) {
  const file = JSON.parse(readFileSync(`public/data/platforms/${f}`, "utf8"));
  for (const g of file.platforms) {
    const row = L.find((l) => l.platform_id === g.platform_id);
    const mt = [...new Set(g.modules.map((m) => m.module_type))].sort();
    const tm = [...new Set(g.connections.filter((c) => c.is_material).map((c) => c.transfer_mode))].sort();
    if (JSON.stringify(mt) !== JSON.stringify([...row.module_types].sort())) mtMismatch++;
    if (JSON.stringify(tm) !== JSON.stringify([...row.material_transfer_modes].sort())) tmMismatch++;
    maxSteps = Math.max(maxSteps, g.steps.length);
    maxModules = Math.max(maxModules, g.modules.length);
  }
}
out("module_types index vs all graph modules mismatch", mtMismatch);
out("transfer modes index vs material connections mismatch", tmMismatch);
out("max steps / modules per platform", [maxSteps, maxModules]);

// ---- filter semantics as specified ----
const D = { years: null, field: [], im: [], sw: [], hw: [], mt: [], mtMatch: "all", tm: [], tmMatch: "all", q: "" };
const setMatch = (have, want, mode) => want.length === 0 || (mode === "any" ? want.some((w) => have.includes(w)) : want.every((w) => have.includes(w)));
const yearOk = (y, s) => !s.years || ((s.years[0] == null || y >= s.years[0]) && (s.years[1] == null || y <= s.years[1]));
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
const cases = {
  "empty": {},
  "years 2018-2024": { years: [2018, 2024] },
  "years 2026-": { years: [2026, null] },
  "years -2014": { years: [null, 2014] },
  "field catalysis": { field: ["catalysis"] },
  "field catalysis,nanomaterials": { field: ["catalysis", "nanomaterials"] },
  "im mixed": { im: ["mixed"] },
  "im fixed_tubing,mobile_robot": { im: ["fixed_tubing", "mobile_robot"] },
  "sw 3": { sw: [3] },
  "hw 1,3": { hw: [1, 3] },
  "mt flow_reactor (all)": { mt: ["flow_reactor"] },
  "mt flow_reactor,liquid_handler all": { mt: ["flow_reactor", "liquid_handler"] },
  "mt flow_reactor,liquid_handler any": { mt: ["flow_reactor", "liquid_handler"], mtMatch: "any" },
  "tm fixed_tubing,robot_arm_gantry all": { tm: ["fixed_tubing", "robot_arm_gantry"] },
  "tm fixed_tubing,robot_arm_gantry any": { tm: ["fixed_tubing", "robot_arm_gantry"], tmMatch: "any" },
  "tm mobile_robot": { tm: ["mobile_robot"] },
  "mt flow_reactor + tm robot_arm_gantry": { mt: ["flow_reactor"], tm: ["robot_arm_gantry"] },
  "q chemspeed": { q: "chemspeed" },
  "q Aand2024": { q: "Aand2024" },
  "example URL": { years: [2018, 2024], field: ["catalysis", "nanomaterials"], mt: ["flow_reactor"], mtMatch: "any", q: "chemspeed" },
  "years 2018-2024 + field catalysis + mt flow_reactor": { years: [2018, 2024], field: ["catalysis"], mt: ["flow_reactor"] },
};
for (const [name, c] of Object.entries(cases)) {
  const s = { ...D, ...c };
  out(`count ${name} [papers, platforms]`, [P.filter((p) => paperOk(p, s)).length, L.filter((l) => platOk(l, s)).length]);
}
// cross-table witnesses: a paper whose platforms each satisfy one of two mt filters but none both
const s2 = { ...D, mt: ["flow_reactor", "liquid_handler"] };
const split = P.filter((p) => {
  const pl = L.filter((l) => l.paper_id === p.paper_id);
  return pl.some((l) => l.module_types.includes("flow_reactor")) && pl.some((l) => l.module_types.includes("liquid_handler")) && !pl.some((l) => platLevel(l, s2));
}).map((p) => p.paper_id);
out("papers w/ flow_reactor and liquid_handler only on different platforms", split);
// mt + tm split across platforms
const s3 = { ...D, mt: ["flow_reactor"], tm: ["robot_arm_gantry"] };
const split3 = P.filter((p) => {
  const pl = L.filter((l) => l.paper_id === p.paper_id);
  return pl.some((l) => l.module_types.includes("flow_reactor")) && pl.some((l) => l.material_transfer_modes.includes("robot_arm_gantry")) && !pl.some((l) => platLevel(l, s3));
}).map((p) => p.paper_id);
out("papers w/ flow_reactor + robot_arm_gantry split", split3);
out("chemspeed platforms", L.filter((l) => has(l.platform_name, "chemspeed") || has(l.platform_id, "chemspeed")).map((l) => l.platform_id));
out("chemspeed papers (title)", P.filter((p) => has(p.title, "chemspeed")).map((p) => p.paper_id));
// compare reference
for (const id of ["Aand2024/P1", "Angello2022/P1", "CortesBorda2018/P1"]) {
  const row = L.find((l) => l.platform_id === id);
  out(`row ${id}`, row && { name: row.platform_name, mt: row.module_types, tm: row.material_transfer_modes, n_steps: row.n_steps, n_modules: row.n_modules });
}
out("papers with >1 platform (first 5)", P.filter((p) => p.n_platforms > 1).slice(0, 5).map((p) => [p.paper_id, p.n_platforms]));

// ---- offered filter values (REQ-004, AC-3): values present in index.json, alphabetical; autonomy numeric ----
const alpha = (xs) => [...new Set(xs)].sort();
const numeric = (xs) => [...new Set(xs)].sort((a, b) => a - b);
out("offered field", alpha(P.flatMap((p) => p.field_tags)));
out("offered im", alpha(P.map((p) => p.integration_mode)));
out("offered sw / hw", [numeric(P.map((p) => p.sw_autonomy)), numeric(P.map((p) => p.hw_autonomy))]);
out("offered mt", alpha(L.flatMap((l) => l.module_types)));
out("offered tm", alpha(L.flatMap((l) => l.material_transfer_modes)));
out("Bedard2018 links (numeric suffix order)", L.filter((l) => l.paper_id === "Bedard2018").map((l) => l.platform_id.split("/")[1]).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))));

// ---- comparison rows (REQ-014, AC-6, AC-14): all modules by type, material connections by mode, steps by step_order ----
const graph = (id) => JSON.parse(readFileSync(`public/data/platforms/${id.split("/")[0]}.json`, "utf8")).platforms.find((g) => g.platform_id === id);
function compare(ids) {
  const gs = ids.map(graph);
  const countBy = (xs) => xs.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
  const mt = gs.map((g) => countBy(g.modules.map((m) => m.module_type)));
  const tm = gs.map((g) => countBy(g.connections.filter((c) => c.is_material).map((c) => c.transfer_mode)));
  const rows = (per) => [...new Set(per.flatMap(Object.keys))].sort().map((k) => `${k} ${per.map((c) => c[k] ?? "—").join(" | ")}`);
  console.log(`compare ${ids.join(" + ")}`);
  console.log("  names:", gs.map((g) => g.name ?? "—").join(" | "));
  console.log(`  module rows (${rows(mt).length}):`, rows(mt).join("; "));
  console.log(`  transfer rows (${rows(tm).length}):`, rows(tm).join("; "));
  for (const g of gs) {
    const s = [...g.steps].sort((a, b) => a.step_order - b.step_order).map((x) => `${x.step_order} ${x.unit_operation} ${x.performed_by ?? "—"}`);
    console.log(`  steps ${g.platform_id} (${s.length}):`, s.join("; "));
  }
}
compare(["Aand2024/P1", "Li2020/P1"]);
compare(["Aand2024/P1", "Li2020/P1", "Angello2022/P1"]);
