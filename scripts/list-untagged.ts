// Lists the modules that need a row in data-overlay/module-techniques.csv (SPEC-TECH-001 REQ-003 (d), REQ-012): every
// module of an instrument_* type, and every module whose stated name contains an alias, that has no row yet or whose
// row's stated name no longer matches the release. Prints CSV lines `module_id,,name_in_paper` with a header, plus the
// module type and the aliases in the name for the classifier; rows whose module is gone are named on stderr.
// Usage: npm run list-untagged [-- --all]  (--all lists every module that needs a row, tagged or not)
import { pathToFileURL } from "node:url";
import { loadConfig } from "./lib/config";
import { deriveAll } from "./lib/derive";
import { CACHE_DIR, verifiedReleaseDir } from "./lib/release";
import { readOverlay, untaggedModules } from "./lib/techniques";

const csvField = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function main(): void {
  const all = process.argv.includes("--all");
  const derived = deriveAll(verifiedReleaseDir(loadConfig(), CACHE_DIR));
  const { modules: need, orphanRows } = untaggedModules(derived, readOverlay(), all);
  console.log("module_id,techniques,name_in_paper,module_type,aliases_in_name");
  for (const m of need) {
    console.log([m.module_id, "", m.name_in_paper, m.module_type, m.aliases.join(" ")].map(csvField).join(","));
  }
  console.error(`${need.length} module(s)${all ? " need a row" : " need a row and have none, or a stale one"}`);
  for (const r of orphanRows) console.error(`line ${r.line}: ${r.module_id} is not a module of the pinned release; remove the row`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
