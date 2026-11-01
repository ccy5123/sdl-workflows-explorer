# Structure

Planned layout after SPEC-DATA-001. Later SPECs add view folders under `src/views/`.

```
sdl-workflows-explorer/
├── release.config.json      # pinned release: version, Zenodo record, file name, URL, zip SHA-256, expected counts
├── scripts/
│   ├── fetch-release.ts     # download + verify (zip SHA-256, then MANIFEST.sha256 per file) + extract
│   ├── build-data.ts        # verified release -> public/data/*.json, then count check
│   └── lib/                 # pure functions used by both scripts and by the tests
│       ├── config.ts        # load and validate release.config.json
│       ├── checksum.ts      # SHA-256 of buffers/files, MANIFEST parsing and verification
│       ├── csv.ts           # CSV reading helpers
│       ├── derive.ts        # release tables -> index / platform / taxonomy / benchmark JSON
│       └── counts.ts        # counts of derived data, comparison with expected counts
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx              # shell; step 1 shows the counts read from data/index.json and the footer
│   └── data/types.ts        # TypeScript types of the JSON in public/data/ (shared by scripts and UI)
├── tests/                   # Vitest tests (unit tests with small fixtures + the count test on the real release)
├── public/data/             # generated, git-ignored
├── .cache/release/          # downloaded zip and extracted release, git-ignored
├── docs/plan.md             # the approved plan
└── .moai/                   # MoAI project docs and SPECs
```

## Generated data (`public/data/`)

| File | Content |
|---|---|
| `index.json` | release metadata (version, DOI, counts) and one row per paper and per platform |
| `platforms/<paper_id>.json` | full graphs (modules, steps, connections, evidence) of one paper's platforms |
| `taxonomy.json` | 69 classes with definitions and families, correspondence with sources, usage counts |
| `benchmark.json` | benchmark tasks, split sizes and reference results |
