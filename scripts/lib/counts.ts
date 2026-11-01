// The seven release counts (spec §3): computed from derived JSON and from the release's core tables,
// and compared with the expected values pinned in release.config.json (REQ-011).
import { join } from "node:path";
import { COUNT_NAMES, type CountName, type Counts } from "../../src/data/types";
import { readCsv, toBool01 } from "./csv";
import type { Derived } from "./derive";

export interface CountProblem {
  name: CountName;
  expected: number;
  actual: number;
  source: string;
}

type Observation = [CountName, number, string];

function graphs(d: Derived) {
  return Object.values(d.platformFiles).flatMap((f) => f.platforms);
}

function derivedObservations(d: Derived): Observation[] {
  const g = graphs(d);
  const connections = g.flatMap((p) => p.connections);
  return [
    ["papers", d.index.papers.length, "index.json papers rows"],
    ["papers", Object.keys(d.platformFiles).length, "files in platforms/"],
    ["platforms", d.index.platforms.length, "index.json platforms rows"],
    ["platforms", g.length, "platforms across platforms/*.json"],
    ["modules", g.reduce((n, p) => n + p.modules.length, 0), "modules across platforms/*.json"],
    ["steps", g.reduce((n, p) => n + p.steps.length, 0), "steps across platforms/*.json"],
    ["connections", connections.length, "connections across platforms/*.json"],
    ["material_connections", connections.filter((c) => c.is_material).length, "connections with is_material = true"],
    ["candidates", d.index.counts.candidates, "index.json counts.candidates"],
  ];
}

function releaseObservations(releaseDir: string): Observation[] {
  const rows = (rel: string) => readCsv(join(releaseDir, rel));
  const material = new Set(
    rows("core/transfer_mode.csv")
      .filter((r, i) => toBool01(r.is_material ?? "", `core/transfer_mode.csv row ${i + 2} is_material`))
      .map((r) => r.transfer_mode),
  );
  const connections = rows("core/connection.csv");
  return [
    ["papers", rows("core/paper.csv").length, "core/paper.csv rows"],
    ["platforms", rows("core/platform.csv").length, "core/platform.csv rows"],
    ["modules", rows("core/module.csv").length, "core/module.csv rows"],
    ["steps", rows("core/step.csv").length, "core/step.csv rows"],
    ["connections", connections.length, "core/connection.csv rows"],
    [
      "material_connections",
      connections.filter((c) => material.has(c.transfer_mode)).length,
      "core/connection.csv rows with a material transfer_mode",
    ],
    ["candidates", rows("core/candidate.csv").length, "core/candidate.csv rows"],
  ];
}

function firstPerName(observations: Observation[]): Counts {
  const out: Partial<Counts> = {};
  for (const [name, value] of observations) if (out[name] === undefined) out[name] = value;
  return out as Counts;
}

/** The seven counts computed from the derived JSON (first source per count in spec §3). */
export function countDerived(d: Derived): Counts {
  return firstPerName(derivedObservations(d));
}

/** The seven counts computed from the release's own tables (last column of spec §3). */
export function countReleaseSources(releaseDir: string): Counts {
  return firstPerName(releaseObservations(releaseDir));
}

/** Every derived figure, every index.json count and every release source must equal the expected value. */
export function checkCounts(expected: Counts, d: Derived, releaseDir: string): CountProblem[] {
  const indexCounts: Observation[] = COUNT_NAMES.filter((n) => n !== "candidates").map((n) => [
    n,
    d.index.counts[n],
    `index.json counts.${n}`,
  ]);
  return [...derivedObservations(d), ...indexCounts, ...releaseObservations(releaseDir)]
    .filter(([name, actual]) => actual !== expected[name])
    .map(([name, actual, source]) => ({ name, expected: expected[name], actual, source }));
}

export function formatProblems(problems: CountProblem[]): string {
  return problems.map((p) => `  ${p.name}: expected ${p.expected}, actual ${p.actual} (${p.source})`).join("\n");
}
