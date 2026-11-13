// Lists the modules that need a row in data-overlay/module-techniques.csv (SPEC-TECH-001 REQ-003 (d), REQ-012): every
// module of an instrument_* type, and every module whose stated name contains an alias, that has no row yet. Prints
// CSV lines `module_id,,name_in_paper` with a header, plus the module type as a comment column for the classifier.
// Usage: npm run list-untagged [-- --all]  (--all lists every module that needs a row, tagged or not)
import { pathToFileURL } from "node:url";
import { loadConfig } from "./lib/config";
import { deriveAll } from "./lib/derive";
import { CACHE_DIR, verifiedReleaseDir } from "./lib/release";
import { modulesNeedingRows, readOverlay } from "./lib/techniques";

const csvField = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function main(): void {
  const all = process.argv.includes("--all");
  const derived = deriveAll(verifiedReleaseDir(loadConfig(), CACHE_DIR));
  const overlay = readOverlay();
  const tagged = new Set(overlay.rows.map((r) => r.module_id));
  const need = modulesNeedingRows(derived, overlay.vocabulary).filter((m) => all || !tagged.has(m.module_id));
  console.log("module_id,techniques,name_in_paper,module_type,aliases_in_name");
  for (const m of need) {
    console.log([m.module_id, "", m.name_in_paper, m.module_type, m.aliases.join(" ")].map(csvField).join(","));
  }
  console.error(`${need.length} module(s)${all ? " need a row" : " need a row and have none"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
