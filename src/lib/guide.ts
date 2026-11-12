// Getting started (#/guide): five tasks a first-time reader can follow, each step pointing at the page it uses. Pure
// data; views/Guide.tsx renders it. tests/guide.test.ts checks that every link opens a known route and that every
// platform it names is in the release.
import { compareHash, platformHash } from "./route";

export interface GuideLink {
  href: string;
  text: string;
}

export interface GuideStep {
  text: string;
  link?: GuideLink;
}

export interface GuideTask {
  id: string;
  title: string;
  /** One sentence: what the reader has at the end. */
  outcome: string;
  steps: readonly GuideStep[];
}

/** Platforms the guide opens as examples; each must exist in the release. */
export const GUIDE_PLATFORMS = {
  read: "Aand2024/P1",
  compare: ["Pilon2026/P1", "Pilon2026/P2"],
} as const;

/** A builder state close to the example platform: four modules and the five steps of one cycle. */
export const GUIDE_WORKFLOW =
  "#/workflow?m=fluidics,flow_reactor,instrument_optical,software" +
  "&s=dispense_liquid~1,react_photo_electro~2,measure_optical~3,analyze_data~4,plan_next_experiment~4";

export const GUIDE_TITLE = "Getting started";
export const GUIDE_LEAD =
  "Five tasks, each a few steps long. Every step links to the page it uses, so you can follow along in another tab.";

export const GUIDE_TASKS: readonly GuideTask[] = [
  {
    id: "find",
    title: "Find platforms that use an instrument",
    outcome: "A list of coded platforms that use the instrument, and the paper behind each one.",
    steps: [
      {
        text:
          "Type an instrument, a step or a platform name into the search on Home, for example FT-IR, XRD or spin " +
          "coater. Several words must all match.",
        link: { href: "#/", text: "Open Home" },
      },
      {
        text:
          "Each match shows the platform's name and id. When it matched on something other than the name, a grey " +
          "line names the module or step that matched, such as the FT-IR the paper lists.",
      },
      {
        text: "Open a match to see that platform, or press Enter to open the first one.",
      },
      {
        text:
          "To narrow by field, year, module type or step across all platforms, use the filters in Browse on the " +
          "Platforms tab.",
        link: { href: "#/browse?view=platforms", text: "Open Browse, Platforms" },
      },
    ],
  },
  {
    id: "read",
    title: "Read one platform",
    outcome: "How one platform is built, what one cycle does, and the page of the paper each item was read from.",
    steps: [
      {
        text:
          "The graph shows the platform's modules as dots and the connections between them as lines. A solid line " +
          "is stated in the paper; a dashed line was inferred. The dashed box holds the modules that are part of the " +
          "platform itself.",
        link: { href: platformHash(GUIDE_PLATFORMS.read), text: `Open ${GUIDE_PLATFORMS.read}` },
      },
      {
        text:
          "Drag a module to move it. Hold Ctrl (⌘ on a Mac) and scroll, or use the buttons in the corner, to zoom; " +
          "scrolling without Ctrl moves the page.",
      },
      {
        text:
          "Cycle steps lists one cycle in order. Point at a step to light up the modules that perform it.",
      },
      {
        text:
          "Select a module, a connection, a step or a table row: the Evidence panel names the document, the page and " +
          "the figure or section it was read from. Show platform evidence does the same for the platform as a whole.",
      },
      {
        text: "If something does not match the paper, use Report a problem with this record at the top of the page.",
      },
    ],
  },
  {
    id: "compare",
    title: "Compare platforms and get the data",
    outcome: "Two or three platforms side by side, and the release files to work with yourself.",
    steps: [
      {
        text: "In Browse, on the Platforms tab, tick two or three rows in the Select column, then press Compare.",
        link: { href: "#/browse?view=platforms", text: "Open Browse, Platforms" },
      },
      {
        text:
          "The comparison lists the module types, material transfer modes and steps of each platform in columns. " +
          "This example compares the two configurations of RoboChem-Flex.",
        link: { href: compareHash(GUIDE_PLATFORMS.compare), text: "Open the example comparison" },
      },
      {
        text:
          "Download data on Home opens the release on Zenodo: the tables behind this site as CSV, Parquet and SQLite " +
          "files, a data dictionary for every column, and the data card. How to cite on Home gives the citation to copy.",
        link: { href: "#/", text: "Open Home" },
      },
    ],
  },
  {
    id: "build",
    title: "Sketch your own workflow",
    outcome: "The coded platforms most like your design, a cycle-time range and a batch simulation.",
    steps: [
      {
        text:
          "Open the Workflow builder. Start from a coded platform: pick one and press Fill the builder from this " +
          "platform. This example starts from a flow photochemistry setup like the one in Read one platform.",
        link: { href: GUIDE_WORKFLOW, text: "Open the example in the builder" },
      },
      {
        text: "Add, move or remove steps and modules. Each step runs on one module; the graph follows every edit.",
      },
      {
        text:
          "Read the outputs below the form: Similar platforms lists the coded platforms whose steps are most like " +
          "yours; Cycle time and throughput gives a range from the times the papers state; Simulation runs one batch " +
          "through your steps.",
      },
      {
        text:
          "Similar platforms compares the coded structure only; it says nothing about how well any platform worked.",
      },
    ],
  },
  {
    id: "ask",
    title: "Ask with your own AI",
    outcome: "Answers to plain-language questions from the AI app you already use, each naming the records and pages it rests on.",
    steps: [
      {
        text:
          "Set up your app once: a desktop app such as Claude Desktop, Cursor or VS Code runs the SDL Workflows MCP " +
          "server; Claude Code adds it with one command; a web chat app is given a link to the data files instead.",
        link: { href: "#/ask", text: "Open Ask with your own AI" },
      },
      {
        text:
          "Ask in plain language, for example which labs use an in-line FT-IR, or how many experiments per day a " +
          "workflow you describe could run.",
      },
      {
        text:
          "Each answer names platform ids, the papers' DOIs and the page each item was read from. Open a platform " +
          "here to check it.",
        link: { href: "#/browse?view=platforms", text: "Open Browse, Platforms" },
      },
    ],
  },
];
