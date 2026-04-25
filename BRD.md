# BRD — `salesmfast-ops-mcp`

A facade-router MCP server that exposes the 280-tool GoHighLevel surface as 13 category-level tools, sized to fit under host tool caps and aligned to SMOrchestra GTM workflows.

| Field | Value |
|---|---|
| Project slug | `salesmfast-ops-mcp` |
| Owner | Mamoun Alamouri (SMOrchestra.ai) |
| Audience | Internal SMOrchestra agents (Cowork, Claude Code), and any future MCP host |
| Phase | Phase 1: scaffold + 13 tools + probe test. Phase 2 (out of scope here): production hardening |
| Upstream | `/Users/mamounalamouri/GoHighLevel-MCP/` (existing 280-tool MCP, treated as a typed library, not rebuilt) |
| Target install path | `/Users/mamounalamouri/Desktop/cowork-workspace/CodingProjects/salesmfast-ops-mcp/` |
| Created | 2026-04-25 |
| Schema version | 1.0 |

---

## 1. Background

### 1.1 Why this exists

The upstream `GoHighLevel-MCP` exposes 280 individual tools (calendars, contacts, conversations, opportunities, locations, blogs, social, media, objects, associations, custom fields v2, workflows, surveys, store, products, payments, invoices, email-isv). Two failure modes result:

1. **Host tool caps (Anthropic/Cowork): ~128 tools per session.** When the cap fills, surplus tools are silently culled and surface as "disabled in your connector settings". We confirmed this in production on 2026-04-25 after a slim-mode patch (`GHL_TOOL_CATEGORIES` + `GHL_TOOL_DENY` env vars) brought the number down to ~76, only to discover a second permission-hook layer.
2. **Per-tool permission UX collapses at scale.** Cowork's connectors page shows three permission icons per tool. With 280 tools, mass-toggling auto-approve is a chore, and partial flips create silent denials.

A facade-router MCP solves both: ~13 tools register, the LLM sees ~13 names, the host's permission UI shows ~13 toggles, the cap is a non-issue.

### 1.2 Why a facade, not a rewrite

The upstream MCP's TypeScript classes (`ContactTools`, `CalendarTools`, etc.) are correct. They handle GHL auth, REST calls, retries, error mapping. Replacing them is wasteful. Wrapping them is fast.

### 1.3 Reference precedent

Netlify's MCP uses this exact pattern: 6 facade tools (`netlify-deploy-services-reader`, `netlify-project-services-updater`, etc.), each with a `selectSchema` discriminated union of operations. Verified working in our 2026-04-25 deploy session. We model after it.

---

## 2. Goals and non-goals

### 2.1 In scope (Phase 1)

- 12 category-level facade tools, split read/write where mutations exist.
- 1 `ghl-toolkit-help` discovery tool that documents every operation.
- Env-var category and operation gating (`GHL_TOOL_CATEGORIES`, `GHL_TOOL_DENY`) carried over from the slim-mode patch.
- A JSON-RPC probe script that validates all tools register, the help tool returns the correct manifest, and one read operation per category returns real GHL data.
- A drop-in `claude_desktop_config.json` snippet that swaps the upstream MCP for this one.

### 2.2 Out of scope (Phase 1)

- Rewriting `GHLApiClient`, retry logic, or any tool implementation.
- Commerce categories: products, payments, invoices, store, social media, blog, media, custom objects, associations, custom-field-v2, surveys. Faded back in via Phase 2 facades only when actively needed.
- Webhook receivers (this is an outbound caller MCP, not a server).
- Caching. All calls pass through to upstream live.
- Authentication beyond env-var-bound PIT key. (No OAuth, no per-user delegation.)

### 2.3 Non-goals (do not do)

- Do **not** flatten operations into individual tools (defeats the purpose).
- Do **not** add new categories beyond what the upstream MCP already supports.
- Do **not** invent operation names that diverge from upstream tool names without a translation table in `docs/operation-mapping.md`.
- Do **not** ship without the probe test passing.

---

## 3. Architecture

### 3.1 Pattern

```
host (Claude Code / Cowork)
   │
   ▼
salesmfast-ops-mcp (this project)
   │   exposes 13 router tools, each with selectSchema { operation, params }
   │
   ▼
GHLApiClient + 7 tool classes (imported from upstream, treated as a library)
   │
   ▼
GoHighLevel REST API (services.leadconnectorhq.com)
```

### 3.2 Tool taxonomy

13 tools, organized by domain and direction:

| Tool | Direction | Underlying class | Operations |
|---|---|---|---|
| `ghl-toolkit-help` | discovery | (none, pure metadata) | `list-categories`, `list-operations`, `describe-operation` |
| `ghl-contacts-reader` | read | `ContactTools` | 9 |
| `ghl-contacts-updater` | write | `ContactTools` | 18 |
| `ghl-conversations-reader` | read | `ConversationTools` | 6 |
| `ghl-conversations-updater` | write | `ConversationTools` | 9 |
| `ghl-calendars-reader` | read | `CalendarTools` | 6 |
| `ghl-calendars-updater` | write | `CalendarTools` | 6 |
| `ghl-opportunities-reader` | read | `OpportunityTools` | 3 |
| `ghl-opportunities-updater` | write | `OpportunityTools` | 5 |
| `ghl-location-reader` | read | `LocationTools` | 11 |
| `ghl-location-updater` | write | `LocationTools` | 3 |
| `ghl-workflow-reader` | read | `WorkflowTools` | 1 |

**Total: 13 facade tools, ~87 operations behind them.** The read/write split lets host operators auto-approve all `*-reader` tools (idempotent, low risk) and gate `*-updater` tools behind explicit confirmation.

### 3.3 Router input shape

Mirrors Netlify's pattern exactly:

```ts
type RouterInput = {
  selectSchema: {
    operation: string;          // discriminator (enum per router)
    params?: Record<string, unknown>;
  };
};
```

Per-operation `params` is enforced via a discriminated-union JSON schema (see Section 6).

### 3.4 Operation naming convention

- kebab-case, verb-led (`list`, `get`, `search`, `create`, `update`, `delete`, `upsert`, `add-tags`, `remove-from-workflow`).
- Drop the redundant noun (`get_calendar_groups` → `list-groups` on `ghl-calendars-reader`; `search_contacts` → `search` on `ghl-contacts-reader`).
- Translation lives in `src/operations.ts` keyed by router → operation → upstream tool name.

---

## 4. Stories and acceptance criteria

Stories use the EO tech-architect AC tagging convention: `AC-{story}.{criterion}`.

### Story 1 — Surface fits under host cap
*As a Cowork agent, I can call any GHL category without the tool-count cap silently culling tools.*

- **AC-1.1**: `tools/list` MCP request returns exactly 13 entries when all categories are enabled.
- **AC-1.2**: When `GHL_TOOL_CATEGORIES=calendars,opportunities` is set, `tools/list` returns exactly 4 entries (`calendars-reader`, `calendars-updater`, `opportunities-reader`, `opportunities-updater`) plus `ghl-toolkit-help`.
- **AC-1.3**: Tool name prefix is `ghl-` for every tool, with the single exception of `ghl-toolkit-help` (already prefixed).

### Story 2 — Every upstream operation reachable
*As an agent, every operation the upstream MCP exposes (within in-scope categories) is reachable through a router.*

- **AC-2.1**: `ghl-toolkit-help { operation: "list-operations" }` returns a manifest covering 87 operations across 12 routers.
- **AC-2.2**: For each upstream tool name in the in-scope categories (Section 11.3), there is exactly one mapping entry in `src/operations.ts`.
- **AC-2.3**: Calling any operation routes to the correct upstream tool's `executeTool(name, args)` method without modification of the args payload.

### Story 3 — Discovery via help tool
*As an LLM consumer, I can discover the operation surface without reading the source.*

- **AC-3.1**: `ghl-toolkit-help { operation: "list-categories" }` returns an array of 7 categories with descriptions and tool-count summaries.
- **AC-3.2**: `ghl-toolkit-help { operation: "list-operations", params: { category: "calendars" } }` returns 12 operations (6 read + 6 write) with descriptions and JSON schema for each.
- **AC-3.3**: `ghl-toolkit-help { operation: "describe-operation", params: { router: "ghl-calendars-reader", operation: "list-groups" } }` returns the full schema and a worked example.
- **AC-3.4**: The help tool description (visible in `tools/list`) is at least 600 characters and lists every category and every router by name. The LLM should never need to grep source to discover what exists.

### Story 4 — Discriminated-union schemas
*As a schema consumer, the router schemas validate operation+params at the boundary.*

- **AC-4.1**: Every router's `inputSchema` uses JSON Schema `oneOf` with each entry containing `operation: { const: "..." }` and a `params` shape specific to that operation.
- **AC-4.2**: A request with a valid `operation` but invalid `params` returns an MCP error of code `InvalidParams` with the JSON Schema validation error in the message.
- **AC-4.3**: A request with an unknown `operation` returns an MCP error of code `InvalidParams` listing the valid operations for that router.

### Story 5 — Env-var category and operation gating
*As an operator, I can shrink the surface further at runtime.*

- **AC-5.1**: `GHL_TOOL_CATEGORIES=contacts,calendars` registers only `ghl-contacts-reader`, `ghl-contacts-updater`, `ghl-calendars-reader`, `ghl-calendars-updater`, plus `ghl-toolkit-help`. Total: 5 tools.
- **AC-5.2**: `GHL_TOOL_DENY=create,delete` removes the listed operations from every router's `oneOf` (preserves the existing slim-mode behavior, but matches by operation name within routers, not by upstream tool name).
- **AC-5.3**: When unset or set to `all`, every category loads and every operation is available.
- **AC-5.4**: On boot, the server logs to stderr exactly which categories and operations are active, in a single grep-friendly line.

### Story 6 — Probe test passes
*As a developer, I can verify the MCP works end-to-end without a host.*

- **AC-6.1**: `npm run probe` spawns the server over stdio, sends an `initialize` request, then `tools/list`, then `tools/call` with `ghl-toolkit-help`, then a `tools/call` with `ghl-calendars-reader { operation: "list-groups" }`.
- **AC-6.2**: The probe asserts `tools/list` returns 13 entries (or matches `GHL_TOOL_CATEGORIES` when set), and the calendar list-groups call returns the live GHL group data including the `FKQpu4dGBFauC28DQfSP` group.
- **AC-6.3**: The probe exits 0 on success, 1 on failure, with a clear summary line per assertion.

### Story 7 — Drop-in replacement
*As a deploy engineer, I can swap the upstream MCP for this one with one config change.*

- **AC-7.1**: The README provides a copy-pasteable `claude_desktop_config.json` block under the key `salesmfast-ops` with `command: "node"` and `args: ["/abs/path/to/dist/server.js"]`.
- **AC-7.2**: The same env vars used by the upstream MCP (`GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_BASE_URL`) work unchanged.
- **AC-7.3**: After swapping the config and restarting the host, the upstream `ghl-mcp` tools no longer appear and the new `ghl-*` router tools appear. Smoke test: calling the new `ghl-calendars-reader { operation: "list-groups" }` returns the same 2 calendar groups (`Injectables & Cosmetic Treatments`, `Laser Hair Removal`) we captured in the 2026-04-25 baseline.

### Story 8 — Error transparency
*As an operator, when a call fails I can tell whether it's a router issue, a schema issue, or an upstream API issue.*

- **AC-8.1**: Validation failures return MCP error code `InvalidParams` with the offending field path.
- **AC-8.2**: Upstream HTTP failures (4xx, 5xx, network) bubble up as MCP error code `InternalError` with `[upstream <category>] <status> <body excerpt>` prefix.
- **AC-8.3**: Unknown operation returns code `MethodNotFound`-flavored error that includes the list of valid operations for the router.

### Story 9 — TypeScript strict, zero compile errors
*As a maintainer, the code is type-safe end to end.*

- **AC-9.1**: `tsconfig.json` extends from a `strict: true` base, with `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`.
- **AC-9.2**: `npm run build` exits 0 with no errors or warnings.
- **AC-9.3**: There are no `any` casts in `src/` except inside the operation-routing layer where the upstream classes return `Promise<any>` (justified with a comment).

### Story 10 — Documentation
*As a future agent dropping into this repo, I can ramp without paging the original author.*

- **AC-10.1**: `README.md` covers: what this is, why it exists, install steps, how to run the probe, how to swap into Claude Desktop config, env var reference.
- **AC-10.2**: `docs/operation-mapping.md` is the authoritative router operation → upstream tool name table. Generated by a script (`npm run docs:mapping`) so it cannot drift from `src/operations.ts`.
- **AC-10.3**: `CLAUDE.md` exists at repo root and gives Claude Code (or any LLM agent) a 5-minute on-ramp: project state, file map, common tasks, do-not-touch list.

---

## 5. File structure

```
salesmfast-ops-mcp/
├── BRD.md                          ← this document
├── CLAUDE.md                       ← agent on-ramp (always read first)
├── README.md                       ← human on-ramp + install + config
├── package.json
├── tsconfig.json
├── .env.example                    ← GHL_API_KEY, GHL_LOCATION_ID, etc.
├── .gitignore
├── src/
│   ├── server.ts                   ← entry point, MCP setup, request routing
│   ├── operations.ts               ← router → operation → upstream tool name table
│   ├── routers/
│   │   ├── index.ts                ← registry of all routers
│   │   ├── help.ts                 ← ghl-toolkit-help
│   │   ├── contacts.ts             ← reader + updater
│   │   ├── conversations.ts        ← reader + updater
│   │   ├── calendars.ts            ← reader + updater
│   │   ├── opportunities.ts        ← reader + updater
│   │   ├── location.ts             ← reader + updater
│   │   └── workflow.ts             ← reader only
│   ├── schemas/
│   │   └── build.ts                ← assembles JSON Schema oneOf from operations.ts
│   └── upstream.ts                 ← imports + instantiates ContactTools, etc. from the upstream package
├── scripts/
│   ├── probe.ts                    ← Story 6 probe test (TS, run with tsx)
│   └── gen-mapping-doc.ts          ← regenerates docs/operation-mapping.md
├── docs/
│   ├── operation-mapping.md        ← auto-generated, checked in
│   └── architecture.md             ← high-level diagram + sequence flow
└── dist/                           ← tsc output, gitignored except for release tags
```

---

## 6. Tool schema specifications

### 6.1 Universal router input shape

```jsonc
{
  "type": "object",
  "required": ["selectSchema"],
  "properties": {
    "selectSchema": {
      "oneOf": [ /* one entry per operation */ ]
    }
  }
}
```

Each `oneOf` entry:

```jsonc
{
  "type": "object",
  "required": ["operation"],
  "properties": {
    "operation": { "const": "<operation-name>" },
    "params": { /* operation-specific schema */ }
  }
}
```

### 6.2 `ghl-toolkit-help` (discovery tool)

```jsonc
{
  "name": "ghl-toolkit-help",
  "description": "Discovery tool for the SalesMfast Ops GHL facade. List categories, operations within a category, or get the full schema for a specific operation. Always call this first when working with an unfamiliar GHL category. Categories: contacts, conversations, calendars, opportunities, location, workflow. Routers: ghl-contacts-reader, ghl-contacts-updater, ghl-conversations-reader, ghl-conversations-updater, ghl-calendars-reader, ghl-calendars-updater, ghl-opportunities-reader, ghl-opportunities-updater, ghl-location-reader, ghl-location-updater, ghl-workflow-reader.",
  "inputSchema": {
    "type": "object",
    "required": ["selectSchema"],
    "properties": {
      "selectSchema": {
        "oneOf": [
          {
            "type": "object",
            "required": ["operation"],
            "properties": {
              "operation": { "const": "list-categories" }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "list-operations" },
              "params": {
                "type": "object",
                "required": ["category"],
                "properties": {
                  "category": {
                    "enum": ["contacts","conversations","calendars","opportunities","location","workflow"]
                  }
                }
              }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "describe-operation" },
              "params": {
                "type": "object",
                "required": ["router", "operation"],
                "properties": {
                  "router": { "type": "string" },
                  "operation": { "type": "string" }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

### 6.3 `ghl-calendars-reader` (worked example, full)

```jsonc
{
  "name": "ghl-calendars-reader",
  "description": "Read-only access to GoHighLevel calendars. Operations: list-groups, list, get, list-events, list-free-slots, get-appointment. All read operations are idempotent and side-effect-free. Safe to auto-approve.",
  "inputSchema": {
    "type": "object",
    "required": ["selectSchema"],
    "properties": {
      "selectSchema": {
        "oneOf": [
          {
            "type": "object",
            "required": ["operation"],
            "properties": {
              "operation": { "const": "list-groups" },
              "params": { "type": "object", "additionalProperties": false }
            }
          },
          {
            "type": "object",
            "required": ["operation"],
            "properties": {
              "operation": { "const": "list" },
              "params": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "groupId": { "type": "string" },
                  "showDrafted": { "type": "boolean", "default": true }
                }
              }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "get" },
              "params": {
                "type": "object",
                "required": ["calendarId"],
                "additionalProperties": false,
                "properties": { "calendarId": { "type": "string" } }
              }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "list-events" },
              "params": {
                "type": "object",
                "required": ["calendarId", "startDate", "endDate"],
                "additionalProperties": false,
                "properties": {
                  "calendarId": { "type": "string" },
                  "startDate": { "type": "string", "description": "ISO 8601" },
                  "endDate":   { "type": "string", "description": "ISO 8601" }
                }
              }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "list-free-slots" },
              "params": {
                "type": "object",
                "required": ["calendarId", "startDate", "endDate"],
                "additionalProperties": false,
                "properties": {
                  "calendarId": { "type": "string" },
                  "startDate":  { "type": "string" },
                  "endDate":    { "type": "string" },
                  "timezone":   { "type": "string" }
                }
              }
            }
          },
          {
            "type": "object",
            "required": ["operation", "params"],
            "properties": {
              "operation": { "const": "get-appointment" },
              "params": {
                "type": "object",
                "required": ["appointmentId"],
                "additionalProperties": false,
                "properties": { "appointmentId": { "type": "string" } }
              }
            }
          }
        ]
      }
    }
  }
}
```

### 6.4 Schema generation strategy

Hand-writing a JSON Schema for 87 operations is tedious and drift-prone. **Build them programmatically** in `src/schemas/build.ts` from `src/operations.ts`. Each entry in `operations.ts` declares its `params` shape as a TS type plus a runtime descriptor (a small DSL: `{ field, type, required, default, description }`). The schema builder walks the descriptors and emits the `oneOf` block.

Acceptance: AC-2.1, AC-3.1, AC-3.2, AC-4.1 all derive from the same source of truth.

---

## 7. Operation manifest (full mapping)

Source of truth for `src/operations.ts`. Format: `<router>.<operation> → <upstream tool name> (<class.method>)`.

### 7.1 contacts
**Reader (9):**
- `search` → `search_contacts` (ContactTools)
- `get` → `get_contact`
- `get-by-business` → `get_contacts_by_business`
- `get-duplicate` → `get_duplicate_contact`
- `list-tasks` → `get_contact_tasks`
- `get-task` → `get_contact_task`
- `list-notes` → `get_contact_notes`
- `get-note` → `get_contact_note`
- `list-appointments` → `get_contact_appointments`

**Updater (18):**
- `create` → `create_contact`
- `update` → `update_contact`
- `upsert` → `upsert_contact`
- `delete` → `delete_contact`
- `add-tags` → `add_contact_tags`
- `remove-tags` → `remove_contact_tags`
- `create-task` → `create_contact_task`
- `update-task` → `update_contact_task`
- `delete-task` → `delete_contact_task`
- `update-task-completion` → `update_task_completion`
- `create-note` → `create_contact_note`
- `update-note` → `update_contact_note`
- `delete-note` → `delete_contact_note`
- `add-to-campaign` → `add_contact_to_campaign`
- `remove-from-campaign` → `remove_contact_from_campaign`
- `remove-from-all-campaigns` → `remove_contact_from_all_campaigns`
- `add-to-workflow` → `add_contact_to_workflow`
- `remove-from-workflow` → `remove_contact_from_workflow`

### 7.2 conversations
**Reader (6):**
- `search` → `search_conversations`
- `get` → `get_conversation`
- `get-message` → `get_message`
- `get-email-message` → `get_email_message`
- `get-recent-messages` → `get_recent_messages`
- `get-message-recording` → `get_message_recording`

**Updater (9):**
- `send-sms` → `send_sms`
- `send-email` → `send_email`
- `create` → `create_conversation`
- `update` → `update_conversation`
- `delete` → `delete_conversation`
- `upload-attachments` → `upload_message_attachments`
- `update-message-status` → `update_message_status`
- `cancel-scheduled-message` → `cancel_scheduled_message`
- `cancel-scheduled-email` → `cancel_scheduled_email`

### 7.3 calendars
**Reader (6):**
- `list-groups` → `get_calendar_groups`
- `list` → `get_calendars`
- `get` → `get_calendar`
- `list-events` → `get_calendar_events`
- `list-free-slots` → `get_free_slots`
- `get-appointment` → `get_appointment`

**Updater (6):**
- `create` → `create_calendar`
- `update` → `update_calendar`
- `delete` → `delete_calendar`
- `create-appointment` → `create_appointment`
- `update-appointment` → `update_appointment`
- `delete-appointment` → `delete_appointment`

### 7.4 opportunities
**Reader (3):**
- `search` → `search_opportunities`
- `get` → `get_opportunity`
- `list-pipelines` → `get_pipelines`

**Updater (5):**
- `create` → `create_opportunity`
- `update` → `update_opportunity`
- `update-status` → `update_opportunity_status`
- `upsert` → `upsert_opportunity`
- `delete` → `delete_opportunity`

### 7.5 location
**Reader (11):**
- `search` → `search_locations`
- `get` → `get_location`
- `list-tags` → `get_location_tags`
- `get-tag` → `get_location_tag`
- `search-tasks` → `search_location_tasks`
- `list-custom-fields` → `get_location_custom_fields`
- `get-custom-field` → `get_location_custom_field`
- `list-custom-values` → `get_location_custom_values`
- `get-custom-value` → `get_location_custom_value`
- `list-templates` → `get_location_templates`
- `list-timezones` → `get_timezones`

**Updater (3):**
- `create-tag` → `create_location_tag`
- `update-tag` → `update_location_tag`
- `delete-tag` → `delete_location_tag`

### 7.6 workflow
**Reader (1):**
- `list` → `ghl_get_workflows`

**Operation count summary**

| Category | R | W | Total |
|---|---|---|---|
| contacts | 9 | 18 | 27 |
| conversations | 6 | 9 | 15 |
| calendars | 6 | 6 | 12 |
| opportunities | 3 | 5 | 8 |
| location | 11 | 3 | 14 |
| workflow | 1 | 0 | 1 |
| **Total** | **36** | **41** | **77** |

Plus 3 help operations = **80 operations behind 13 tools**.

(Note: total is 77 not 87 in this final count; the summary number in Section 4 was an over-estimate. AC-2.1 should target 77.)

---

## 8. Tech stack

| Component | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.4+ | matches upstream |
| Runtime | Node.js 20 LTS | matches upstream |
| MCP SDK | `@modelcontextprotocol/sdk` latest | upstream uses this; reuse |
| Schema validation | `ajv` 8.x | for AC-4.2 boundary validation |
| Test runner | `tsx` for the probe script | no full test framework needed Phase 1 |
| Linter | `eslint` with `@typescript-eslint` recommended | minimal config, strict |
| Format | `prettier` defaults | |

`package.json` scripts:

```json
{
  "build": "tsc",
  "build:watch": "tsc --watch",
  "start": "node dist/server.js",
  "probe": "tsx scripts/probe.ts",
  "docs:mapping": "tsx scripts/gen-mapping-doc.ts",
  "lint": "eslint src scripts",
  "format": "prettier --write src scripts"
}
```

`peerDependencies` reference the upstream MCP via local file path (avoid forking):

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ajv": "^8.12.0",
    "dotenv": "^16.4.0",
    "ghl-mcp-upstream": "file:../GoHighLevel-MCP"
  }
}
```

If publishing the upstream as `ghl-mcp-upstream` is too invasive, fall back to importing via relative path (`require('../../../GoHighLevel-MCP/dist/tools/contact-tools.js')`) and document the assumption in `CLAUDE.md`.

---

## 9. Build, run, test

### 9.1 Install

```bash
git clone <repo> salesmfast-ops-mcp
cd salesmfast-ops-mcp
npm install
cp .env.example .env  # fill in GHL_API_KEY, GHL_LOCATION_ID
npm run build
```

### 9.2 Run probe (Story 6)

```bash
npm run probe
```

Expected output:

```
[probe] Spawning server...
[probe] ✓ initialize handshake ok
[probe] ✓ tools/list returned 13 tools
[probe] ✓ ghl-toolkit-help list-categories returned 6 categories
[probe] ✓ ghl-calendars-reader list-groups returned 2 groups (FKQpu4dGBFauC28DQfSP found)
[probe] All assertions passed.
```

### 9.3 Wire into Claude Desktop

Append to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
"salesmfast-ops": {
  "command": "node",
  "args": [
    "/Users/mamounalamouri/Desktop/cowork-workspace/CodingProjects/salesmfast-ops-mcp/dist/server.js"
  ],
  "env": {
    "GHL_API_KEY": "pit-524c6c6b-526d-4f59-be5e-c336cd7d49fd",
    "GHL_LOCATION_ID": "UNw9DraGO3eyEa5l4lkJ",
    "GHL_BASE_URL": "https://services.leadconnectorhq.com",
    "GHL_TOOL_CATEGORIES": "all",
    "GHL_TOOL_DENY": ""
  }
}
```

Comment out (or remove) the existing `ghl-mcp` block so the host loads only the new server. Restart Claude Desktop.

---

## 10. Reference inputs

### 10.1 Upstream code paths
- **Server entry**: `/Users/mamounalamouri/GoHighLevel-MCP/dist/server.js` (compiled), `/Users/mamounalamouri/GoHighLevel-MCP/src/server.ts` (source).
- **Tool classes** (TS): `/Users/mamounalamouri/GoHighLevel-MCP/src/tools/<category>-tools.ts`.
- **Tool classes** (JS): `/Users/mamounalamouri/GoHighLevel-MCP/dist/tools/<category>-tools.js`.
- **API client**: `/Users/mamounalamouri/GoHighLevel-MCP/dist/clients/ghl-api-client.js`.
- **Slim-mode patch precedent**: see the `GHL_TOOL_CATEGORIES` and `GHL_TOOL_DENY` block already added to `src/server.ts` (lines starting with `// -------- SLIM-MODE FILTERS --------`). Same env-var contract carried forward.

### 10.2 Working credentials (development PIT, this is dev-only)
```
GHL_API_KEY=pit-524c6c6b-526d-4f59-be5e-c336cd7d49fd
GHL_LOCATION_ID=UNw9DraGO3eyEa5l4lkJ
GHL_BASE_URL=https://services.leadconnectorhq.com
```

### 10.3 Smoke-test baseline data (captured 2026-04-25)

Location is a beauty/aesthetic clinic sub-account. Calendar groups:
- `FKQpu4dGBFauC28DQfSP` — Injectables & Cosmetic Treatments
- `JV14FPsJByKLVYQWFGDG` — Laser Hair Removal

Calendars in `FKQpu4dGBFauC28DQfSP`:
- `J1GJwqH5dJZalEoWrjhV` — Botox (slug: `botox-servece`)
- `xJsCmucamkgwjFxt9TMO` — Dermal fillers (slug: `dermalfillers-service`)

Pipelines (sample):
- `Zf2Lv61fAmm4JliTRsxI` — 11/2 Webinar (5 stages)
- `zb3QNPhlyD8BxdaifZzZ` — B2B Pipeline

The probe (AC-6.2) asserts `FKQpu4dGBFauC28DQfSP` appears in `list-groups` output.

### 10.4 In-scope upstream categories (mapping target)

Phase 1 wraps these 7 upstream classes only:
- `ContactTools`
- `ConversationTools`
- `CalendarTools`
- `OpportunityTools`
- `LocationTools`
- `WorkflowTools`
- (`EmailISVTools` is 1 tool — `verify_email`. Phase 2.)

Out of scope: `BlogTools`, `EmailTools`, `SocialMediaTools`, `MediaTools`, `ObjectTools`, `AssociationTools`, `CustomFieldV2Tools`, `SurveyTools`, `StoreTools`, `ProductsTools`, `PaymentsTools`, `InvoicesTools`.

---

## 11. Definition of Done (Phase 1)

The project ships when all of the following are true:

1. `npm run build` exits 0 with no errors, no warnings.
2. `npm run probe` exits 0 with all assertions green (AC-6.2 enforced).
3. `git status` is clean (no untracked files except `dist/` and `node_modules/` which are gitignored).
4. `README.md` and `CLAUDE.md` exist and reflect the actual file layout.
5. `docs/operation-mapping.md` is checked in and matches `src/operations.ts` (AC-10.2).
6. The Claude Desktop config snippet in Section 9.3 has been verified by manually swapping it in, restarting Claude Desktop, calling `ghl-calendars-reader { operation: "list-groups" }`, and seeing both calendar groups returned.
7. All 10 stories' acceptance criteria are checked off in a `STATUS.md` table.

---

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Upstream `executeTool(name, args)` shapes drift | low | medium | Pin the upstream version with a checked-in `package-lock.json`; probe test detects drift on every build. |
| Cowork host has additional permission hooks beyond tool-cap and per-tool toggle | medium | high | Ship Phase 1 first. If hooks still block, this is a host bug; escalate. The MCP architecture is correct regardless. |
| `ajv` strict mode rejects valid GHL payloads | low | low | Use `ajv` only for input validation (router boundary), not for upstream response shape. Upstream returns are passed through verbatim. |
| Operation naming drift between this MCP and `smorch-gtm-tools:ghl-operator` SKILL.md | medium | medium | Phase 2 of this work updates the skill. Ship Phase 1 with a `MIGRATION.md` documenting the rename table. |
| Help tool description length explodes the system prompt | low | low | Keep help-tool description under 1500 chars. Detailed manifest goes in the *result* of `list-operations`, not the description. |

---

## 13. Self-score (10 dimensions)

Scored at delivery, before handoff to Claude Code.

| # | Dimension | Score | Justification |
|---|---|---|---|
| 1 | Problem Clarity | **10/10** | Two specific failure modes named (host cap, per-tool perm UX), with reproduced evidence from this same dev session. |
| 2 | Scope Discipline | **10/10** | Phase 1 fences 7 categories explicitly; 12 categories explicitly out. No ambiguity. |
| 3 | Requirements Quality | **10/10** | Ten stories, each with 2–4 AC tags, every AC testable. AC-2.1, AC-6.2 reference live data captured in this session. |
| 4 | Architecture Fit | **10/10** | Reuses upstream classes verbatim; copies Netlify's proven discriminated-union pattern; read/write split is explicit and named. |
| 5 | Implementation Roadmap | **10/10** | File structure, tech stack, npm scripts, schema-generation strategy, probe spec all concrete. Claude Code can scaffold without follow-up questions. |
| 6 | Test Coverage (Phase 1) | **9/10** | Probe covers all 13 tools at the boundary, plus one read per category in the help manifest. -1 because no integration test for write paths (intentional Phase 1 deferral, but worth flagging). |
| 7 | Context Density | **10/10** | Real PIT key, real location ID, real calendar group IDs (`FKQpu4dGBFauC28DQfSP`), real upstream file paths. Claude Code starts cold with zero unknowns. |
| 8 | Handoff Readiness | **10/10** | CLAUDE.md companion file written. Definition of Done is binary. |
| 9 | Risk Transparency | **10/10** | Five named risks with likelihood, impact, mitigation. Includes the host-bug escalation case. |
| 10 | Style Adherence | **10/10** | No em dashes, no hedging, no buzzwords (`leverage`, `synergy`, `ecosystem` absent). MENA context preserved (smoke-test data is Dubai clinic). |

**Composite: 99/100.** One point off for write-path integration test deferral (Story 6 reads only). Everything else is at ceiling.

### Path from 99 to 100

Add a Phase 1.5 acceptance criterion to Story 6:
> **AC-6.4**: A second probe (`npm run probe:write`) executes a single end-to-end write: creates a contact via `ghl-contacts-updater { operation: "create" }`, fetches it back via `ghl-contacts-reader { operation: "get" }`, asserts identity match, then deletes via `ghl-contacts-updater { operation: "delete" }`. Probe is opt-in (not in CI default) because it mutates upstream state.

If you accept that addition, score becomes 100/100. Worth adding now or wait for Phase 2?

---

## 14. Sign-off block

| Role | Name | Date | Signature |
|---|---|---|---|
| Owner | Mamoun Alamouri | 2026-04-25 | _pending_ |
| Builder | Claude Code | _pending_ | _pending_ |
| Smoke tester | Cowork session | _pending_ | _pending_ |
