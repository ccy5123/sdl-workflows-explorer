// "Ask with your own AI" (#/ask): reachable from the main tabs, Home and Getting started; the setups, the copyable
// prompt for web chat apps with the site's own llms.txt, and the example questions; no sideways scroll at 375 px.
import { expect, test } from "@playwright/test";
import { ASK_EXAMPLES, ASK_TITLE, MCP_COMMAND } from "../src/lib/ask";

test("Ask: a main tab, a wide card on Home and a task in Getting started all open the page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Ask AI" }).click();
  await expect(page.locator("main h1")).toHaveText(ASK_TITLE);
  await expect(page).toHaveTitle(`${ASK_TITLE} · SDL Workflows Explorer`);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Ask AI" })).toHaveAttribute("aria-current", "page");

  await page.goto("/#/");
  const card = page.locator("main .hero-task-wide");
  await expect(card).toHaveAttribute("href", "#/ask");
  await expect(card).toContainText("Ask with your own AI");
  // The card spans the row under the other four.
  const widths = await page.evaluate(() => [".hero-tasks", ".hero-task-wide"].map((s) => document.querySelector(s)!.getBoundingClientRect().width));
  expect(widths[1]).toBeGreaterThan(widths[0]! * 0.95);

  await page.goto("/#/guide");
  await expect(page.getByRole("link", { name: "Open Ask with your own AI" })).toHaveAttribute("href", "#/ask");
});

test("Ask: setups for desktop apps, Claude Code and web chat apps, with the site's llms.txt in the prompt", async ({ page }) => {
  await page.goto("/#/ask");
  const main = page.locator("main");
  await expect(main.locator("h3")).toHaveText([
    "Claude Desktop, Cursor, VS Code and other desktop apps",
    "Claude Code",
    "Web chat apps (claude.ai, ChatGPT and others)",
  ]);
  await expect(main.locator('[data-setup="desktop"] pre')).toContainText('"args": [');
  await expect(main.locator('[data-setup="claude-code"] pre')).toHaveText(`claude mcp add sdl-workflows -- ${MCP_COMMAND}`);
  const prompt = main.locator('[data-setup="web"] pre');
  const llms = new URL("llms.txt", page.url().split("#")[0]).href;
  await expect(prompt).toContainText(llms);
  await expect(main.getByRole("button", { name: "Copy prompt" })).toBeVisible();
  for (const q of ASK_EXAMPLES) await expect(main.locator(".ask-examples")).toContainText(q);
  await expect(main).toContainText("the release contains no human coding");
});

test("Ask: at 375 px the page has no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#/ask");
  await expect(page.locator("main h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
