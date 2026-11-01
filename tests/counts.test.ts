// AC-2: count mismatch fails and is named (REQ-011), on the fixture release.
import { describe, expect, it } from "vitest";
import { checkCounts, countDerived, countReleaseSources, formatProblems } from "../scripts/lib/counts";
import { deriveAll } from "../scripts/lib/derive";
import type { Counts } from "../src/data/types";

const MINI = "tests/fixtures/release-mini";
const EXPECTED: Counts = {
  papers: 2,
  platforms: 3,
  modules: 5,
  steps: 6,
  connections: 3,
  material_connections: 2,
  candidates: 3,
};

describe("counts", () => {
  it("computes the seven counts from derived JSON and from the release sources", () => {
    expect(countDerived(deriveAll(MINI))).toEqual(EXPECTED);
    expect(countReleaseSources(MINI)).toEqual(EXPECTED);
    expect(checkCounts(EXPECTED, deriveAll(MINI), MINI)).toEqual([]);
  });

  it("fails naming platforms with expected and actual when one platform is removed", () => {
    const d = deriveAll(MINI);
    d.index.platforms.pop();
    const fileB = d.platformFiles.PaperB2025!;
    fileB.platforms.pop();
    const problems = checkCounts(EXPECTED, d, MINI);
    expect(problems).toContainEqual({ name: "platforms", expected: 3, actual: 2, source: "index.json platforms rows" });
    expect(problems.every((p) => p.name !== "papers")).toBe(true);
    expect(formatProblems(problems)).toMatch(/platforms: expected 3, actual 2/);
  });

  it("fails when an expected value differs from its release source", () => {
    const problems = checkCounts({ ...EXPECTED, candidates: 4 }, deriveAll(MINI), MINI);
    expect(problems).toContainEqual({ name: "candidates", expected: 4, actual: 3, source: "core/candidate.csv rows" });
  });

  it("fails when the platform files disagree with the index rows", () => {
    const d = deriveAll(MINI);
    delete d.platformFiles.PaperB2025;
    const problems = checkCounts(EXPECTED, d, MINI);
    expect(problems).toContainEqual({ name: "papers", expected: 2, actual: 1, source: "files in platforms/" });
    expect(problems.map((p) => p.name)).toContain("modules");
  });
});
