// Manual end-to-end check of an installed package over stdio: `node tests/smoke.mjs <command> [args...]`, e.g.
// `node tests/smoke.mjs npx sdl-workflows-mcp` in a folder where the packed tarball is installed. Prints how long the
// server took to answer `initialize` (first start includes the Zenodo download) and the gist of two tool calls.
import { spawn } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
const p = spawn(cmd, args, { env: process.env });
let out = "";
p.stdout.on("data", (d) => (out += d));
p.stderr.on("data", (d) => process.stderr.write(d));
const send = (m) => p.stdin.write(`${JSON.stringify(m)}\n`);
const replies = () => out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const t0 = Date.now();

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } });
const wait = setInterval(() => {
  if (!replies().some((m) => m.id === 1)) return;
  clearInterval(wait);
  console.log(`initialize answered after ${Date.now() - t0} ms`);
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "simulate_cycle_time", arguments: { from_platform: "Aand2024/P1", n: 5, runs: 5 } } });
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_platforms", arguments: { filters: { module_types: ["xrd"] } } } });
  setTimeout(() => {
    for (const m of replies()) {
      if (m.id === 2) {
        const b = JSON.parse(m.result.content[0].text).results;
        console.log("simulate:", JSON.stringify({ cycle_s: b.cycle_range.cycle_s, makespan_s: b.simulation?.makespan_s, bottleneck: b.simulation?.bottleneck }));
      }
      if (m.id === 3) console.log("search with an unknown code:", m.result.isError ? "refused:" : "answered:", m.result.content[0].text.slice(0, 160));
    }
    p.kill();
  }, 5000);
}, 100);
setTimeout(() => {
  console.error("no answer within 120 s");
  p.kill();
  process.exit(1);
}, 120_000).unref();
