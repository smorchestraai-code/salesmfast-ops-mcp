# salesmfast-ops-mcp

Facade-router MCP server. Wraps the upstream 280-tool [GoHighLevel-MCP](../GoHighLevel-MCP) as **35 category-level routers across 18 categories**, sized to fit under host tool caps (~128 tools per session).

**Status (v1.1.2 — 2026-04-28):** ✅ Phase 1 + Phase 2 closed (full upstream coverage); UX hardening (auto-inject + agency-block + custom-field-v2 redirect) shipped. **34 routers + `ghl-toolkit-help` = 35 facade tools** covering ~259 operations. Cap thesis proven and validated against two operator machines (Mamoun, Lana).

> **Quick install for clients:** see [`CLIENT-GUIDE.md`](./CLIENT-GUIDE.md) — single-doc walkthrough + automated `install.sh` (clones upstream, builds, wires Claude Desktop config, verifies via probe).

**Migrating from upstream `ghl-mcp`?** Read [`docs/MIGRATION.md`](./docs/MIGRATION.md) — three-step host swap + the full old-name → new-router/operation mapping table + v1.1.1+ auto-inject behaviour.

See [`BRD.md`](./BRD.md) for the original requirements and [`CLAUDE.md`](./CLAUDE.md) for the agent on-ramp + architecture decisions log.

---

## Install

**For clients / non-developer operators**, use the one-shot installer:
```bash
git clone https://github.com/smorchestraai-code/salesmfast-ops-mcp.git
cd salesmfast-ops-mcp
bash install.sh                                  # pins to v1.1.2 by default
# → clones upstream, builds, prompts for PIT + locationId, writes .env, runs probe, merges Claude Desktop config
```
Override the version with `SALESMFAST_OPS_VERSION=main bash install.sh` for HEAD.

**For developers** (manual flow):
```bash
git clone <repo> salesmfast-ops-mcp
cd salesmfast-ops-mcp
git checkout v1.1.2-bridge-gaps                  # or `main` for HEAD
npm install
cp .env.example .env
# edit .env and fill in GHL_API_KEY + GHL_LOCATION_ID
npm run build
npm run probe                                    # 25 read-path assertions
npm run probe:write                              # 4 write-path round-trip assertions (mutates upstream)
```

`npm run probe` exits 0 with **25 assertions green**, including live-API round-trips across all 18 categories (calendars, contacts, conversations, opportunities, location, workflow, email, social, survey, invoice, products, payments, store, blog, media, custom-field-v2, object, association) plus negative tests for the v1.1.1 agency-block + custom-field-v2 redirect.

The upstream is pinned via `file:` link to `../GoHighLevel-MCP`. `install.sh` clones and builds it automatically. If you edit the upstream, run `npm run build` there first, then re-run `npm install` here.

---

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `GHL_API_KEY` | yes | — | GoHighLevel Personal Integration Token (PIT). Dev value in BRD section 10.2. |
| `GHL_LOCATION_ID` | yes | — | GHL location id (e.g., `UNw9DraGO3eyEa5l4lkJ`). |
| `GHL_BASE_URL` | no | `https://services.leadconnectorhq.com` | GHL REST root. |
| `GHL_TOOL_CATEGORIES` | no | `all` | Comma-list of categories to register (`calendars`, `contacts`, ...). `all` registers all 18 categories. See [`CLIENT-GUIDE.md`](./CLIENT-GUIDE.md) for the full list. |
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

Comment out the existing `ghl-mcp` block so the host loads only this server. Restart Claude Desktop. Verify **35 tools** appear in connector permissions UI (1 help tool + 34 facade routers across 18 categories).

**Rollback:** revert that one block in `claude_desktop_config.json` and restart Claude Desktop. Drill is `optional` in `.smorch/project.json` — CEO-approved per `/smo-plan` workflow.

---

## Scripts

| Command | Effect |
|---------|--------|
| `npm run build` | Runs `prebuild` (regenerates `docs/operation-mapping.md`) then `tsc`. Emits `dist/`. |
| `npm run probe` | 25-assertion stdio JSON-RPC integration test (live GHL API, read-only) covering all 18 categories + auto-inject regression + agency-block + v2-redirect negative tests. Exit 0 = green. |
| `npm run probe:write` | **Opt-in** AC-6.4 round-trip: creates a real GHL contact → gets it back → deletes it. NOT in CI default — mutates upstream state. |
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
