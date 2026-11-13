# sdl-workflows-mcp

A read-only [Model Context Protocol](https://modelcontextprotocol.io) server for the **sdl-workflows** database:
published self-driving laboratories coded step by step (modules, cycle steps, material connections, recorded step
durations), each item linked to the page of the paper it was read from.

It runs on your machine and works with the LLM app you already use. On first start it downloads the pinned data
release from Zenodo, checks its SHA-256 and every file's checksum, and answers from it. It sends nothing anywhere else
and needs no API key or account.

Data release served by this version: see `release_info`, or the Zenodo record linked from it.

## Install

Node.js 20 or later.

Claude Desktop, Cursor, VS Code and other clients that start local MCP servers — add to the client's MCP settings:

```json
{
  "mcpServers": {
    "sdl-workflows": { "command": "npx", "args": ["-y", "sdl-workflows-mcp"] }
  }
}
```

Claude Code:

```bash
claude mcp add sdl-workflows -- npx -y sdl-workflows-mcp
```

Web chat apps cannot start a local server. They can read the same data without it through
<https://ccy5123.github.io/sdl-workflows-explorer/llms.txt>, if their model can fetch web pages.

## Tools

| Tool | What it returns |
|---|---|
| `list_vocabulary` | Codes, labels, definitions and counts of module types, unit operations, transfer modes, field tags, integration modes and techniques |
| `search_platforms` | Platforms matching coded filters (including techniques) and/or 1–3 keywords (instrument or module name in any spelling, platform name, step) |
| `get_platform` | One platform: paper, modules, ordered steps, connections, recorded durations and throughputs, each with its evidence location |
| `get_paper` | A paper's metadata and its platforms |
| `similar_platforms` | Platforms ranked by step order, module types and transfer modes against a platform or a described workflow (structure only) |
| `simulate_cycle_time` | Cycle-time range and a discrete-event simulation for a workflow, from durations recorded on other platforms, with the rows used |
| `compare_platforms` | Module types, transfer modes and steps of 2 or 3 platforms side by side |
| `count_by_year` | Papers or platforms per year, split by integration mode, field, autonomy, module type or transfer mode |
| `release_info` | Version, DOI, SHA-256, licence, counts and citation |

Resources: the release's `DATA_CARD.md`, `CITATION.cff`, `data_dictionary.csv` and coding guideline.

Every result carries the record ids, paper keys, DOIs, evidence locations (document · page · locator), a link to the
record in the [explorer](https://ccy5123.github.io/sdl-workflows-explorer/) and the release citation. The server
asks the model to answer only from these results and to cite them. The records were coded from the papers by a
language model and the release contains no human coding, so check a claim against its evidence location before
relying on it.

An instrument named in any spelling (FTIR, FT-IR, ReactIR; XRD, diffractometer) is searched as its technique through
the explorer's technique tags, the same way as the explorer's search box; a term in double quotes is matched as
written.

## Settings

| Variable | Effect |
|---|---|
| `SDL_RELEASE_ZIP` | Path to a local copy of the release zip; checked against the pin like a download |
| `SDL_WORKFLOWS_MCP_CACHE` | Cache folder (default `~/.cache/sdl-workflows-mcp`, or `%LOCALAPPDATA%\sdl-workflows-mcp` on Windows) |

## Licence and citation

Code: MIT. Data: CC BY 4.0 — cite the release as `release_info` and every result's `cite_as` give it.

Source: the `mcp/` folder of <https://github.com/ccy5123/sdl-workflows-explorer>; the tools reuse the explorer's own
search, simulation and trends code.
