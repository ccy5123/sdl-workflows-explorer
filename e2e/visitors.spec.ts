// SPEC-VISIT-001 AC-5 to AC-7: the footer's visitor count against the e2e build, with the counting service answered by
// page.route (the e2e build calls E2E_VISITOR_API, a reserved host that never resolves).
import { expect, test, type Page, type Route } from "@playwright/test";
import { E2E_VISITOR_API, HEARTBEAT_MS, VISITOR_ABOUT, visitorText } from "../src/lib/visitors";

const COUNTS = { online: 3, visitors: 1204, since: "2026-11-10" };
const LATER = { online: 4, visitors: 1205, since: "2026-11-10" };
const CORS = { "Access-Control-Allow-Origin": "*" };

type Answer = (route: Route) => Promise<void>;
const ok = (body: unknown): Answer => (route) =>
  route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });

const FAILURES: [string, Answer][] = [
  ["unreachable", (route) => route.abort("connectionrefused")],
  ["HTTP 500", (route) => route.fulfill({ status: 500, headers: CORS, body: "error" })],
  ["malformed JSON", (route) => route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{online" })],
  ["invalid counts", ok({ online: -1, visitors: "many", since: "soon" })],
];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** Answers every check-in with the current `answer`; returns the requests seen. */
async function mockService(page: Page, first: Answer) {
  const state = { answer: first, requests: [] as { method: string; headers: Record<string, string> }[] };
  await page.route(`${new URL(E2E_VISITOR_API).origin}/**`, async (route) => {
    state.requests.push({ method: route.request().method(), headers: await route.request().allHeaders() });
    await state.answer(route);
  });
  return state;
}

const counter = (page: Page) => page.locator("footer.site-footer .footer-visitors");

test("AC-5: the footer shows both numbers on every view, checks in by POST without cookies and stores nothing", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install();
  const service = await mockService(page, ok(COUNTS));
  await page.goto("/#/");
  await expect(counter(page)).toHaveText(visitorText(COUNTS));
  expect(visitorText(COUNTS)).toBe("3 online · 1,204 visitors since 10 Nov 2026");

  await page.locator(".nav-group-button").click();
  await page.locator(".nav-group-panel").getByRole("link", { name: "About the data", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("About the data");
  await expect(counter(page)).toHaveText(visitorText(COUNTS));

  service.answer = ok(LATER);
  await page.clock.runFor(HEARTBEAT_MS);
  await expect(counter(page)).toHaveText(visitorText(LATER));

  expect(service.requests.length).toBe(2);
  for (const r of service.requests) {
    expect(r.method).toBe("POST");
    expect(r.headers["cookie"]).toBeUndefined();
  }
  expect(await page.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length])).toEqual(["", 0, 0]);
  expect(errors).toEqual([]);
});

test("AC-6: nothing shows when the first check-in fails", async ({ page }) => {
  const errors = trackErrors(page);
  await mockService(page, FAILURES[0]![1]);
  const failed = page.waitForEvent("requestfailed", (r) => r.url() === E2E_VISITOR_API);
  await page.goto("/#/");
  await failed;
  await expect(page.locator("footer.site-footer")).toContainText("Data version");
  await expect(counter(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [name, answer] of FAILURES) {
  test(`AC-6: the count disappears when a later check-in is ${name}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.clock.install();
    const service = await mockService(page, ok(COUNTS));
    await page.goto("/#/");
    await expect(counter(page)).toHaveText(visitorText(COUNTS));
    service.answer = answer;
    await page.clock.runFor(HEARTBEAT_MS);
    await expect(counter(page)).toHaveCount(0);
    await expect(page.locator("footer.site-footer")).toContainText("Data version");
    expect(errors).toEqual([]);
  });
}

test("AC-7: the About page explains the count", async ({ page }) => {
  await mockService(page, ok(COUNTS));
  await page.goto("/#/about");
  const section = page.getByRole("region", { name: VISITOR_ABOUT.heading });
  await expect(section).toBeVisible();
  for (const p of VISITOR_ABOUT.paragraphs) await expect(section).toContainText(p);
});
