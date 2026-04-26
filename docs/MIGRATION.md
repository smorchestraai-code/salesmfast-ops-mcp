# Migration — `ghl-mcp` (upstream) → `salesmfast-ops` (facade)

**Audience:** operators (humans + agents) who used the upstream 280-tool [`ghl-mcp`](https://github.com/mastanley13/GoHighLevel-MCP) and now need to switch to the 13-tool facade-router shape that `salesmfast-ops-mcp` exposes.

**Why migrate:** host tool caps (~128 tools/session) force the upstream's 280 tools to be silently culled, and per-tool permission UX collapses at scale. The facade collapses 280 tools to 13 with `selectSchema` discriminated unions — same upstream code under the hood.

---

## TL;DR — three steps

1. **Swap the host config block** (`claude_desktop_config.json` for Claude Desktop, equivalent for Cowork). One block in, one block out.
2. **Restart the host** so it picks up the new server.
3. **Update tool-call shapes** in any skill / script / prompt that referenced the upstream tool names. Mapping table below.

After that, you have 13 facade tools where there used to be ~280 — and `ghl-toolkit-help` to discover the rest.

---

## Step 1 — host config swap

### `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop)

**Remove** the upstream block:

```json
"ghl-mcp": {
  "command": "node",
  "args": ["/path/to/GoHighLevel-MCP/dist/server.js"],
  "env": { "GHL_API_KEY": "...", "GHL_LOCATION_ID": "...", ... }
}
```

**Add** the facade block (paste your real values from BRD §10.2 into the `env` map; never commit a populated config):

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

**Cowork:** equivalent path; the JSON shape is the same.

Both blocks side-by-side during transition is fine — the host will register both. Remove the upstream once you've confirmed parity (§3 below).

---

## Step 2 — restart the host

Quit and relaunch Claude Desktop / Cowork. The connector permissions UI should now show:

| Tool | What it does |
|------|--------------|
| `ghl-toolkit-help` | discovery — `list-categories`, `list-operations`, `describe-operation` |
| `ghl-calendars-reader` | 6 read ops on calendars |
| `ghl-calendars-updater` | 6 write ops on calendars |
| `ghl-contacts-reader` | 9 read ops on contacts |
| `ghl-contacts-updater` | 18 write ops on contacts |
| `ghl-conversations-reader` | 6 read ops on conversations / messages |
| `ghl-conversations-updater` | 9 write ops (incl. `send-sms`, `send-email`) |
| `ghl-opportunities-reader` | 3 read ops (incl. `list-pipelines`) |
| `ghl-opportunities-updater` | 5 write ops |
| `ghl-location-reader` | 11 read ops on location-level data |
| `ghl-location-updater` | 3 write ops (tag CRUD) |
| `ghl-workflow-reader` | 1 read op (`list`) |

**13 tools instead of ~280.** First call should be `ghl-toolkit-help { operation: "list-categories" }` — it returns the active set so you can plan from there.

---

## Step 3 — call-shape migration

Every old tool name maps to one operation under one router. The router's input is always:

```json
{ "selectSchema": { "operation": "<op-name>", "params": { ... } } }
```

`params` is omitted for ops that take no arguments (`list-groups`, `list-pipelines`, etc.).

### Mapping table — every upstream tool used by SMOrchestra (Phase 1 in-scope)

| Old (`mcp__ghl-mcp__<name>`) | New router | New operation |
|---|---|---|
| `search_contacts` | `ghl-contacts-reader` | `search` |
| `get_contact` | `ghl-contacts-reader` | `get` |
| `get_contacts_by_business` | `ghl-contacts-reader` | `get-by-business` |
| `get_duplicate_contact` | `ghl-contacts-reader` | `get-duplicate` |
| `get_contact_tasks` | `ghl-contacts-reader` | `list-tasks` |
| `get_contact_task` | `ghl-contacts-reader` | `get-task` |
| `get_contact_notes` | `ghl-contacts-reader` | `list-notes` |
| `get_contact_note` | `ghl-contacts-reader` | `get-note` |
| `get_contact_appointments` | `ghl-contacts-reader` | `list-appointments` |
| `create_contact` | `ghl-contacts-updater` | `create` |
| `update_contact` | `ghl-contacts-updater` | `update` |
| `upsert_contact` | `ghl-contacts-updater` | `upsert` |
| `delete_contact` | `ghl-contacts-updater` | `delete` |
| `add_contact_tags` | `ghl-contacts-updater` | `add-tags` |
| `remove_contact_tags` | `ghl-contacts-updater` | `remove-tags` |
| `create_contact_task` | `ghl-contacts-updater` | `create-task` |
| `update_contact_task` | `ghl-contacts-updater` | `update-task` |
| `delete_contact_task` | `ghl-contacts-updater` | `delete-task` |
| `update_task_completion` | `ghl-contacts-updater` | `update-task-completion` |
| `create_contact_note` | `ghl-contacts-updater` | `create-note` |
| `update_contact_note` | `ghl-contacts-updater` | `update-note` |
| `delete_contact_note` | `ghl-contacts-updater` | `delete-note` |
| `add_contact_to_campaign` | `ghl-contacts-updater` | `add-to-campaign` |
| `remove_contact_from_campaign` | `ghl-contacts-updater` | `remove-from-campaign` |
| `remove_contact_from_all_campaigns` | `ghl-contacts-updater` | `remove-from-all-campaigns` |
| `add_contact_to_workflow` | `ghl-contacts-updater` | `add-to-workflow` |
| `remove_contact_from_workflow` | `ghl-contacts-updater` | `remove-from-workflow` |
| `search_conversations` | `ghl-conversations-reader` | `search` |
| `get_conversation` | `ghl-conversations-reader` | `get` |
| `get_message` | `ghl-conversations-reader` | `get-message` |
| `get_email_message` | `ghl-conversations-reader` | `get-email-message` |
| `get_recent_messages` | `ghl-conversations-reader` | `get-recent-messages` |
| `get_message_recording` | `ghl-conversations-reader` | `get-message-recording` |
| `send_sms` | `ghl-conversations-updater` | `send-sms` |
| `send_email` | `ghl-conversations-updater` | `send-email` |
| `create_conversation` | `ghl-conversations-updater` | `create` |
| `update_conversation` | `ghl-conversations-updater` | `update` |
| `delete_conversation` | `ghl-conversations-updater` | `delete` |
| `upload_message_attachments` | `ghl-conversations-updater` | `upload-attachments` |
| `update_message_status` | `ghl-conversations-updater` | `update-message-status` |
| `cancel_scheduled_message` | `ghl-conversations-updater` | `cancel-scheduled-message` |
| `cancel_scheduled_email` | `ghl-conversations-updater` | `cancel-scheduled-email` |
| `get_calendar_groups` | `ghl-calendars-reader` | `list-groups` |
| `get_calendars` | `ghl-calendars-reader` | `list` |
| `get_calendar` | `ghl-calendars-reader` | `get` |
| `get_calendar_events` | `ghl-calendars-reader` | `list-events` |
| `get_free_slots` | `ghl-calendars-reader` | `list-free-slots` |
| `get_appointment` | `ghl-calendars-reader` | `get-appointment` |
| `create_calendar` | `ghl-calendars-updater` | `create` |
| `update_calendar` | `ghl-calendars-updater` | `update` |
| `delete_calendar` | `ghl-calendars-updater` | `delete` |
| `create_appointment` | `ghl-calendars-updater` | `create-appointment` |
| `update_appointment` | `ghl-calendars-updater` | `update-appointment` |
| `delete_appointment` | `ghl-calendars-updater` | `delete-appointment` |
| `search_opportunities` | `ghl-opportunities-reader` | `search` |
| `get_opportunity` | `ghl-opportunities-reader` | `get` |
| `get_pipelines` | `ghl-opportunities-reader` | `list-pipelines` |
| `create_opportunity` | `ghl-opportunities-updater` | `create` |
| `update_opportunity` | `ghl-opportunities-updater` | `update` |
| `update_opportunity_status` | `ghl-opportunities-updater` | `update-status` |
| `upsert_opportunity` | `ghl-opportunities-updater` | `upsert` |
| `delete_opportunity` | `ghl-opportunities-updater` | `delete` |
| `search_locations` | `ghl-location-reader` | `search` |
| `get_location` | `ghl-location-reader` | `get` |
| `get_location_tags` | `ghl-location-reader` | `list-tags` |
| `get_location_tag` | `ghl-location-reader` | `get-tag` |
| `search_location_tasks` | `ghl-location-reader` | `search-tasks` |
| `get_location_custom_fields` | `ghl-location-reader` | `list-custom-fields` |
| `get_location_custom_field` | `ghl-location-reader` | `get-custom-field` |
| `get_location_custom_values` | `ghl-location-reader` | `list-custom-values` |
| `get_location_custom_value` | `ghl-location-reader` | `get-custom-value` |
| `get_location_templates` | `ghl-location-reader` | `list-templates` |
| `get_timezones` | `ghl-location-reader` | `list-timezones` |
| `create_location_tag` | `ghl-location-updater` | `create-tag` |
| `update_location_tag` | `ghl-location-updater` | `update-tag` |
| `delete_location_tag` | `ghl-location-updater` | `delete-tag` |
| `ghl_get_workflows` | `ghl-workflow-reader` | `list` |

**77 upstream tool names → 12 routers + 80 operations** (3 of those are `ghl-toolkit-help`'s own ops). The full machine-readable mapping lives in `docs/operation-mapping.md` (auto-generated from `src/operations.ts`).

### Worked example

**Old call:**

```js
mcp__ghl-mcp__search_contacts({
  locationId: "UNw9DraGO3eyEa5l4lkJ",
  query: "ruba",
  pageLimit: 10
})
```

**New call:**

```js
mcp__salesmfast-ops__ghl-contacts-reader({
  selectSchema: {
    operation: "search",
    params: { query: "ruba", pageLimit: 10 }
  }
})
```

`locationId` is auto-injected by the server from `GHL_LOCATION_ID` — drop it from the params payload.

### Worked example — write op with body

**Old:**

```js
mcp__ghl-mcp__add_contact_tags({
  contactId: "uHDvdJ5uiaX2TAwa9LH9",
  tags: ["#qatar", "engaged"]
})
```

**New:**

```js
mcp__salesmfast-ops__ghl-contacts-updater({
  selectSchema: {
    operation: "add-tags",
    params: { contactId: "uHDvdJ5uiaX2TAwa9LH9", tags: ["#qatar", "engaged"] }
  }
})
```

---

## Verification

Run from the host (Cowork / Claude Desktop) once the swap is live:

```js
ghl-toolkit-help({ operation: "list-categories" })
// → ["contacts", "conversations", "calendars", "opportunities", "location", "workflow"]

ghl-calendars-reader({ selectSchema: { operation: "list-groups" } })
// → { success: true, groups: [{ id: "FKQpu4dGBFauC28DQfSP", name: "Injectables..." }, ...] }
```

Or from the project root:

```bash
npm run probe         # 10/10 read-path assertions, exit 0
npm run probe:write   # 4/4 round-trip on a real contact (create → get → delete)
```

---

## Failure modes during migration

| Symptom | Likely cause | Fix |
|---|---|---|
| Host shows BOTH `ghl-mcp` and `salesmfast-ops` tools | Old block still in config | Remove old block; restart host. |
| Host shows neither | Config file not saved / host not restarted | Save config; full quit-and-launch. |
| `ghl-calendars-reader` returns `[upstream calendars] 401 ...` | Stale or revoked PIT in `env.GHL_API_KEY` | Rotate the PIT in both the host config and `.env`. The `secret-scanner-v2` hook will block accidental commits. |
| `MCP error -32602: must be equal to constant` | Calling a router with an unknown `operation` | Run `ghl-toolkit-help { operation: "list-operations", params: { category: "<cat>" } }` to see valid ops. |
| `MethodNotFound: Unknown operation "...". Valid operations: ...` | Typo'd operation name | Read the listed valid ops; correct the spelling. |
| `[upstream location] 4xx` on every location call | PIT lacks `locations.readonly` scope (see L-SMO-009) | Provision a higher-scoped PIT, or skip location calls until upgraded. |

---

## Rollback

The salesmfast-ops facade is local — no SSH, no PM2. Rollback = re-add the old `ghl-mcp` block to `claude_desktop_config.json`, remove or comment the `salesmfast-ops` block, restart the host. < 30 seconds.

The repository's `.smorch/project.json` declares `qa.rollback_drill: "optional"` for this reason — the drill is structurally N/A for a stdio MCP swap.

---

## When in doubt — call help

Every router's description ends with a pointer to `ghl-toolkit-help`. `describe-operation` returns the full input schema and a worked example for any operation. **No need to grep source.**
