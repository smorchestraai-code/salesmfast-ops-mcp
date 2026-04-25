# salesmfast-ops-mcp

Facade-router MCP server. Wraps the upstream 280-tool [GoHighLevel-MCP](../GoHighLevel-MCP) as 13 category-level routers, sized to fit under host tool caps (~128 tools per session).

**Phase 1 vertical slice (this build):** ships `ghl-calendars-reader` (6 operations) + `ghl-toolkit-help`. Cap thesis proven: with `GHL_TOOL_CATEGORIES=calendars`, exactly 2 tools register on the host instead of ~280.

See [`BRD.md`](./BRD.md) for the full requirements and [`CLAUDE.md`](./CLAUDE.md) for the agent on-ramp.

---

## Install

```bash
git clone <repo> salesmfast-ops-mcp
cd salesmfast-ops-mcp
npm install
cp .env.example .env
# edit .env and fill in real values from BRD section 10.2
npm run build
npm run probe
```

`npm run probe` should exit 0 with all 6 assertions green, including a live API round-trip that returns `FKQpu4dGBFauC28DQfSP` from the GHL calendar groups endpoint.

The upstream is pinned via `file:/Users/mamounalamouri/GoHighLevel-MCP` (single-developer-machine assumption — see CLAUDE.md "Architecture decisions" log). If you edit the upstream, run `npm run build` there first, then re-run `npm install` here.

---

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `GHL_API_KEY` | yes | — | GoHighLevel Personal Integration Token (PIT). Dev value in BRD section 10.2. |
| `GHL_LOCATION_ID` | yes | — | GHL location id (e.g., `UNw9DraGO3eyEa5l4lkJ`). |
| `GHL_BASE_URL` | no | `https://services.leadconnectorhq.com` | GHL REST root. |
| `GHL_TOOL_CATEGORIES` | no | `all` | Comma-list of categories to register (`calendars`, `contacts`, ...). `all` registers every Phase 1 reader. |
| `GHL_TOOL_DENY` | no | `` | Comma-list of operation names to strip from the manifest. |

PIT keys go in `.env` only. `.env` is gitignored. The `secret-scanner-v2` pre-commit hook blocks any committed file containing a `<KEY-NAME>=...` pattern, regardless of whether the value looks real.

---

## Wire into Claude Desktop

Append to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
"salesmfast-ops": {
  "command": "node",
  "args": [
    "/Users/mamounalamouri/Desktop/repo-workspace/shared/salesmfast-ops-mcp/dist/server.js"
  ],
  "env": {
    "GHL_API_KEY":         "<your-PIT-here>",
    "GHL_LOCATION_ID":     "<your-location-id>",
    "GHL_BASE_URL":        "https://services.leadconnectorhq.com",
    "GHL_TOOL_CATEGORIES": "all",
    "GHL_TOOL_DENY":       ""
  }
}
```

Comment out the existing `ghl-mcp` block so the host loads only this server. Restart Claude Desktop. Verify ~13 tools appear in connector permissions UI (2 in this Phase 1 slice).

**Rollback:** revert that one block in `claude_desktop_config.json` and restart Claude Desktop. Drill is `optional` in `.smorch/project.json` — CEO-approved per `/smo-plan` workflow.

---

## Scripts

| Command | Effect |
|---------|--------|
| `npm run build` | Runs `prebuild` (regenerates `docs/operation-mapping.md`) then `tsc`. Emits `dist/`. |
| `npm run probe` | 6-assertion stdio JSON-RPC integration test (live GHL API). Exit 0 = green. |
| `npm run docs:mapping` | Regenerates the operation mapping doc on its own. |
| `npm run lint` | `tsc -p tsconfig.scripts.json` — type-checks `src/` + `scripts/` (no emit). |
| `npm run start` | `node dist/server.js` — boots the MCP server over stdio. |

---

## Project layout

```
salesmfast-ops-mcp/
├── BRD.md                            requirements, locked at v1.0
├── CLAUDE.md                         agent on-ramp + decisions log
├── README.md                         this file
├── package.json
├── tsconfig.json                     emits dist/ (rootDir=src)
├── tsconfig.scripts.json             type-checks scripts/ (no emit)
├── .env.example                      env-var contract
├── .smorch/project.json              locale + ship gates + rollback policy
├── .claude/lessons.md                project-scoped lessons
├── src/
│   ├── env.ts                        parseEnv() — single source of truth
│   ├── ambient.d.ts                  ambient types for upstream JS imports
│   ├── upstream.ts                   createUpstream(env) factory
│   ├── operations.ts                 typed manifest
│   ├── errors.ts                     McpError helpers (AC-8.x)
│   ├── schemas/build.ts              oneOf JSON Schema generator
│   ├── routers/
│   │   ├── types.ts                  RouterDef interface
│   │   ├── calendars.ts              ghl-calendars-reader
│   │   ├── help.ts                   ghl-toolkit-help
│   │   └── index.ts                  registry + env filter
│   └── server.ts                     MCP boot + handlers
├── scripts/
│   ├── probe.ts                      Story 6 integration test
│   └── gen-mapping-doc.ts            docs auto-generator
└── docs/
    └── operation-mapping.md          auto-generated, checked in
```

---

## Acceptance criteria coverage (Phase 1 slice)

Fully covered: AC-1.3, AC-3.1, AC-3.3, AC-3.4, AC-4.1, AC-4.2, AC-4.3, AC-5.1, AC-5.3, AC-5.4, AC-6.1, AC-6.2, AC-6.3, AC-7.1, AC-7.2, AC-8.1, AC-8.2, AC-8.3, AC-9.1, AC-9.2, AC-9.3, AC-10.3.

Deferred to subsequent slices (one slice per category): AC-1.1, AC-1.2, AC-2.1, AC-2.2, AC-2.3, AC-3.2, AC-5.2 (test coverage only — code path implemented), AC-6.4, AC-10.1, AC-10.2 (full).

See `~/.claude/plans/synchronous-dancing-falcon.md` for the full plan, the 5-hat self-score (9.9 composite), and the deferred-AC slice plan.

---

## License

UNLICENSED — internal tooling for SMOrchestra.ai. Not for redistribution.
