// Bundles the server and everything it imports from ../src/lib and ../scripts/lib into one file, dist/server.js.
import { copyFileSync, mkdirSync } from "node:fs";
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  legalComments: "none",
  banner: { js: "import { createRequire as __createRequire } from \"node:module\"; const require = __createRequire(import.meta.url);" },
});

// The technique overlay (SPEC-TECH-001): the vocabulary and the tag table, read at start-up by dataset.ts.
mkdirSync("dist/overlay", { recursive: true });
for (const f of ["techniques.json", "module-techniques.csv"]) copyFileSync(`../data-overlay/${f}`, `dist/overlay/${f}`);
