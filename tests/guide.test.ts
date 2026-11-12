// Getting started (#/guide): every link of the guide opens a known route, and every platform it names is in the
// release; the example builder state keeps all of its parts.
import { describe, expect, it } from "vitest";
import { GUIDE_PLATFORMS, GUIDE_TASKS, GUIDE_WORKFLOW } from "../src/lib/guide";
import { parseRoute } from "../src/lib/route";
import { dataAvailable, readIndex, warnIfMissing } from "./viewer-data";

warnIfMissing("guide.test.ts");

const links = GUIDE_TASKS.flatMap((t) => t.steps.flatMap((s) => (s.link ? [s.link] : [])));

describe("guide", () => {
  it("has five tasks with distinct ids, each with steps", () => {
    expect(GUIDE_TASKS.map((t) => t.id)).toEqual(["find", "read", "compare", "build", "ask"]);
    for (const t of GUIDE_TASKS) expect(t.steps.length).toBeGreaterThan(0);
  });

  it.each(links.map((l) => [l.href]))("links to a known route: %s", (href) => {
    expect(parseRoute(href).kind).not.toBe("notFound");
  });
});

describe.skipIf(!dataAvailable)("guide on the real index", () => {
  const ids = new Set(dataAvailable ? readIndex().platforms.map((p) => p.platform_id) : []);

  it("names only platforms that are in the release", () => {
    for (const id of [GUIDE_PLATFORMS.read, ...GUIDE_PLATFORMS.compare]) expect(ids.has(id), id).toBe(true);
  });

  it("opens the builder example with module types and unit operations of the release", () => {
    const taxonomy = readIndex().platforms;
    const types = new Set(taxonomy.flatMap((p) => p.module_types));
    const ops = new Set(taxonomy.flatMap((p) => p.unit_operations));
    const query = new URLSearchParams(GUIDE_WORKFLOW.split("?")[1]);
    for (const m of query.get("m")!.split(",")) expect(types.has(m), m).toBe(true);
    for (const s of query.get("s")!.split(",")) expect(ops.has(s.split("~")[0]!), s).toBe(true);
  });
});
