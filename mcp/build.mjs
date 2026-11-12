// Bundles the server and everything it imports from ../src/lib and ../scripts/lib into one file, dist/server.js.
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
