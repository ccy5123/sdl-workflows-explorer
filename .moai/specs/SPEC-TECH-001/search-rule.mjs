// The text-search and technique-filter rules of SPEC-TECH-001 (REQ-005, REQ-008), written again from the spec text for
// the expected-counts scripts of SPEC-BROWSE-001 and SPEC-TRENDS-001. It reads public/data/ only and shares no code
// with src/lib, so the counts it gives are a check on the site's implementation, not a copy of it.
// Import from a script run at the repository root after npm run build-data.
import { readFileSync } from "node:fs";

const idx = JSON.parse(readFileSync("public/data/index.json", "utf8"));
const search = JSON.parse(readFileSync("public/data/search.json", "utf8"));
const tech = JSON.parse(readFileSync("public/data/techniques.json", "utf8"));

// ---- Readable labels of module types and unit operations (SPEC-UI-001 REQ-007): sentence case unless overridden ----
const OVERRIDES = {
  module_type: {
    coating_printing_unit: "Coating / printing unit",
    commercial_integrated: "Commercial integrated system",
    instrument_electrochemical: "Electrochemical instrument",
    instrument_imaging: "Imaging instrument",
    instrument_optical: "Optical instrument",
    instrument_physical: "Physical-property instrument",
    instrument_separation_ms: "Separation / MS instrument",
    instrument_structural: "Structural instrument",
    unmapped: "Other module (unmapped)",
  },
  unit_operation: {
    cool_quench: "Cool / quench",
    deposit_coat: "Deposit / coat",
    evaporate_dry: "Evaporate / dry",
    measure_electrochemical: "Electrochemical measurement",
    measure_imaging: "Imaging measurement",
    measure_optical: "Optical measurement",
    measure_physical: "Physical-property measurement",
    measure_separation_ms: "Separation / MS measurement",
    measure_structural: "Structural measurement",
    react_flow: "Flow reaction",
    react_photo_electro: "Photo/electro reaction",
    react_thermal: "Thermal reaction",
    wash_extract: "Wash / extract",
    unmapped: "Other operation (unmapped)",
  },
};
const sentence = (code) => {
  const w = code.split("_").filter(Boolean).join(" ");
  return w.charAt(0).toUpperCase() + w.slice(1);
};
const label = (kind, code) => OVERRIDES[kind][code] ?? sentence(code);

// ---- Aliases (REQ-004): normalise, tokens, "occurs in" ----
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const toks = (s) => s.match(/[\p{L}\p{N}]+/gu) ?? [];
const occurs = (alias, text) => {
  const a = norm(alias);
  const t = toks(text).map((x) => x.toLowerCase());
  for (let i = 0; i < t.length; i++) {
    let j = i, s = "";
    while (j < t.length && s.length < a.length) s += t[j++];
    if (s === a) return true;
  }
  return false;
};
const ALIAS = new Map();
for (const t of tech.techniques) for (const a of t.aliases) ALIAS.set(norm(a), [t.id]);
for (const c of tech.compound_aliases) ALIAS.set(norm(c.alias), c.techniques);

// ---- Query terms (REQ-005) ----
export function terms(query, aliases = ALIAS) {
  const parts = [...query.matchAll(/"([^"]*)"|(\S+)/g)]
    .map((m) => (m[1] !== undefined ? { text: m[1].trim(), quoted: true } : { text: m[2], quoted: false }))
    .filter((p) => p.text);
  const out = [];
  for (let i = 0; i < parts.length; ) {
    if (parts[i].quoted) {
      out.push({ kind: "quoted", text: parts[i++].text });
      continue;
    }
    let n = Math.min(4, parts.length - i);
    for (; n >= 1; n--) {
      const run = parts.slice(i, i + n);
      if (run.some((r) => r.quoted)) continue;
      const text = run.map((r) => r.text).join(" ");
      if (aliases.has(norm(text))) {
        out.push({ kind: "technique", text, ids: aliases.get(norm(text)) });
        break;
      }
    }
    if (n >= 1) {
      i += n;
      continue;
    }
    const ts = toks(parts[i].text);
    if (ts.length > 1 && ts.every((t) => aliases.has(norm(t)))) for (const t of ts) out.push({ kind: "technique", text: t, ids: aliases.get(norm(t)) });
    else out.push({ kind: "plain", text: parts[i].text });
    i++;
  }
  return out;
}

// ---- Matching a platform (REQ-005) ----
const TAGS = new Map();
for (const m of tech.modules) TAGS.set(m.platform_id, [...(TAGS.get(m.platform_id) ?? []), m.techniques]);
const head = (l) => [l.platform_id, l.paper_id, l.platform_name].filter((x) => x != null);
const shortWord = (w) => /^[\p{L}\p{N}]+$/u.test(w) && w.length <= 3;
const textHit = (w, text, plain) =>
  plain && shortWord(w) ? toks(text).some((t) => t.toLowerCase() === w.toLowerCase()) : text.toLowerCase().includes(w.toLowerCase());

function termHit(t, l) {
  if (t.kind === "technique") {
    const carried = new Set((TAGS.get(l.platform_id) ?? []).flat());
    if (t.ids.every((id) => carried.has(id))) return true;
    return head(l).some((f) => occurs(t.text, f));
  }
  const plain = t.kind === "plain";
  const fields = [
    ...head(l),
    ...(search.module_names[l.platform_id] ?? []),
    ...l.module_types.map((c) => `${label("module_type", c)} ${c}`),
    ...l.unit_operations.map((c) => `${label("unit_operation", c)} ${c}`),
  ];
  return fields.some((f) => textHit(t.text, f, plain));
}

/** Platforms matching the query: the whole plain query in the id, paper or name, or every term somewhere. */
export function platformMatches(l, query, aliases = ALIAS) {
  const q = query.trim();
  if (!q) return true;
  const ts = terms(q, aliases);
  if (ts.every((t) => t.kind === "plain") && !shortWord(q) && head(l).some((f) => f.toLowerCase().includes(q.toLowerCase()))) return true;
  return ts.every((t) => termHit(t, l));
}

/**
 * A paper matches through any matching platform, or through its own paper id and title read as a platform row with
 * every term plain (titles carry no technique tags).
 */
export function paperMatches(p, query) {
  if (!query.trim()) return true;
  if (idx.platforms.some((l) => l.paper_id === p.paper_id && platformMatches(l, query))) return true;
  const pseudo = { platform_id: p.paper_id, paper_id: p.paper_id, platform_name: p.title, module_types: [], unit_operations: [] };
  return platformMatches(pseudo, query, new Map());
}

/** Technique ids a platform's tagged modules carry (the technique filter, REQ-008). */
export const platformTechniques = (platformId) => [...new Set((TAGS.get(platformId) ?? []).flat())].sort();
