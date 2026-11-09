// SPEC-VISIT-001 AC-4: endpoint choice, response check and footer text of the visitor count.
import { describe, expect, it } from "vitest";
import { ONLINE_WINDOW_MINUTES } from "../worker/src/counter";
import {
  E2E_VISITOR_API,
  ONLINE_MINUTES,
  SITE_ORIGIN,
  VISITOR_ABOUT,
  VISITOR_API,
  parseCounts,
  visitorEndpoint,
  visitorText,
} from "../src/lib/visitors";

describe("visitorEndpoint", () => {
  it("uses the Worker on the GitHub Pages origin only", () => {
    expect(SITE_ORIGIN).toBe("https://ccy5123.github.io");
    expect(VISITOR_API).toMatch(/^https:\/\/sdl-visitors\.[a-z0-9-]+\.workers\.dev\/hit$/);
    expect(visitorEndpoint("production", SITE_ORIGIN)).toBe(VISITOR_API);
    expect(visitorEndpoint("production", "http://localhost:4319")).toBeNull();
    expect(visitorEndpoint("development", "http://localhost:5173")).toBeNull();
  });

  it("uses a reserved host that never resolves in the e2e build", () => {
    expect(visitorEndpoint("e2e", "http://localhost:4317")).toBe(E2E_VISITOR_API);
    expect(new URL(E2E_VISITOR_API).hostname.endsWith(".invalid")).toBe(true);
  });
});

describe("parseCounts", () => {
  it("accepts the documented answer", () => {
    expect(parseCounts({ online: 3, visitors: 1204, since: "2026-11-10" })).toEqual({ online: 3, visitors: 1204, since: "2026-11-10" });
  });

  it.each([
    null,
    "3",
    {},
    { online: -1, visitors: 1, since: "2026-11-10" },
    { online: 1.5, visitors: 1, since: "2026-11-10" },
    { online: 1, visitors: "1", since: "2026-11-10" },
    { online: 1, since: "2026-11-10" },
    { online: 1, visitors: 1, since: "10 Nov 2026" },
    { online: 1, visitors: 1, since: "2026-13-40" },
    { online: Number.NaN, visitors: 1, since: "2026-11-10" },
  ])("rejects %j", (value) => {
    expect(parseCounts(value)).toBeNull();
  });
});

describe("visitorText", () => {
  it("writes both numbers and the start date", () => {
    expect(visitorText({ online: 3, visitors: 1204, since: "2026-11-10" })).toBe("3 online · 1,204 visitors since 10 Nov 2026");
    expect(visitorText({ online: 1, visitors: 1, since: "2027-01-02" })).toBe("1 online · 1 visitor since 2 Jan 2027");
  });
});

describe("About text", () => {
  it("states the same online window as the Worker", () => {
    expect(ONLINE_MINUTES).toBe(ONLINE_WINDOW_MINUTES);
    expect(VISITOR_ABOUT.paragraphs.join(" ")).toContain(`last ${ONLINE_MINUTES} minutes`);
  });
});
