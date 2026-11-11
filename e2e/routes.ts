// The route list of SPEC-SITE-001 AC-12, shared by the theme, keyboard and layout specs. `title` is the REQ-010
// document-title name and `current` the nav link REQ-010 marks as current (null for none).
export interface SiteRoute {
  hash: string;
  title: string;
  current: string | null;
}

export const ROUTES: readonly SiteRoute[] = [
  { hash: "#/", title: "Home", current: "Home" },
  { hash: "#/about", title: "About", current: "About" },
  { hash: "#/guide", title: "Getting started", current: "Getting started" },
  { hash: "#/platform/Aand2024/P1", title: "Platform Aand2024/P1", current: null },
  { hash: "#/browse", title: "Browse", current: "Browse" },
  { hash: "#/browse?view=platforms", title: "Browse", current: "Browse" },
  { hash: "#/compare/Aand2024/P1,Li2020/P1", title: "Compare", current: null },
  { hash: "#/trends", title: "Trends", current: "Trends" },
  { hash: "#/taxonomy", title: "Taxonomy", current: "Taxonomy" },
  { hash: "#/taxonomy/module_type/flow_reactor", title: "Taxonomy: Flow reactor", current: "Taxonomy" },
  { hash: "#/benchmark", title: "Benchmark", current: "Benchmark" },
  { hash: "#/benchmark/items", title: "Benchmark items", current: "Benchmark" },
  { hash: "#/workflow", title: "Workflow builder", current: "Workflow" },
  { hash: "#/workflow?s=dispense_liquid~1,react_thermal~2&m=fluidics,thermal_unit", title: "Workflow builder", current: "Workflow" },
  { hash: "#/no-such-page", title: "Not found", current: null },
];

export const SITE_NAME = "SDL Workflows Explorer";

/** The links of the top bar from 800 px up: the site title and four tabs; the "Data" tab is a button. */
export const NAV_TAB_LINKS = ["SDL Workflows Explorer", "Home", "Browse", "Trends", "Workflow"];
/** The pages under the "Data" tab, in order. */
export const DATA_LINKS = ["About the data", "Getting started", "Taxonomy", "Benchmark"];
/** Every link of the menu below 800 px: the four tabs, then the pages under the "Data" heading. */
export const MENU_LINKS = ["Home", "Browse", "Trends", "Workflow", ...DATA_LINKS];

/** Opens the top bar's "Data" tab and follows one of its links. */
export async function openDataPage(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.locator(".nav-group-button").click();
  await page.locator(".nav-group-panel").getByRole("link", { name, exact: true }).click();
}

/** Waits until the view of a route has rendered its main heading. */
export const READY = "main h1";
