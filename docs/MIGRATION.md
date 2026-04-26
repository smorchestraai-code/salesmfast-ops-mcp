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

#### Slice 7 — GTM (added 2026-04-26, tag `v0.3.0-slice-7-gtm`)

| Old (`mcp__ghl-mcp__<name>`) | New router | New operation |
|---|---|---|
| `get_email_templates` | `ghl-email-reader` | `get-templates` |
| `get_email_campaigns` | `ghl-email-reader` | `get-campaigns` |
| `create_email_template` | `ghl-email-updater` | `create-template` |
| `update_email_template` | `ghl-email-updater` | `update-template` |
| `delete_email_template` | `ghl-email-updater` | `delete-template` |
| `verify_email` | `ghl-email-updater` | `verify-email` |
| `get_social_accounts` | `ghl-social-reader` | `get-accounts` |
| `get_platform_accounts` | `ghl-social-reader` | `get-platform-accounts` |
| `get_social_post` | `ghl-social-reader` | `get-post` |
| `search_social_posts` | `ghl-social-reader` | `search-posts` |
| `get_social_tags` | `ghl-social-reader` | `get-tags` |
| `get_social_tags_by_ids` | `ghl-social-reader` | `get-tags-by-ids` |
| `get_social_categories` | `ghl-social-reader` | `get-categories` |
| `get_social_category` | `ghl-social-reader` | `get-category` |
| `google` | `ghl-social-reader` | `get-google-locations` |
| `facebook` | `ghl-social-reader` | `get-facebook-pages` |
| `instagram` | `ghl-social-reader` | `get-instagram-accounts` |
| `linkedin` | `ghl-social-reader` | `get-linkedin-accounts` |
| `twitter` | `ghl-social-reader` | `get-twitter-profile` |
| `tiktok` | `ghl-social-reader` | `get-tiktok-profile` |
| `create_social_post` | `ghl-social-updater` | `create-post` |
| `update_social_post` | `ghl-social-updater` | `update-post` |
| `delete_social_post` | `ghl-social-updater` | `delete-post` |
| `bulk_delete_social_posts` | `ghl-social-updater` | `bulk-delete-posts` |
| `delete_social_account` | `ghl-social-updater` | `delete-account` |
| `start_social_oauth` | `ghl-social-updater` | `start-oauth` |
| `ghl_get_surveys` | `ghl-survey-reader` | `list` |
| `ghl_get_survey_submissions` | `ghl-survey-reader` | `list-submissions` |
| `list_invoices` | `ghl-invoice-reader` | `list` |
| `get_invoice` | `ghl-invoice-reader` | `get` |
| `list_estimates` | `ghl-invoice-reader` | `list-estimates` |
| `list_invoice_templates` | `ghl-invoice-reader` | `list-templates` |
| `get_invoice_template` | `ghl-invoice-reader` | `get-template` |
| `list_invoice_schedules` | `ghl-invoice-reader` | `list-schedules` |
| `get_invoice_schedule` | `ghl-invoice-reader` | `get-schedule` |
| `create_invoice` | `ghl-invoice-updater` | `create` |
| `send_invoice` | `ghl-invoice-updater` | `send-invoice` |
| `create_estimate` | `ghl-invoice-updater` | `create-estimate` |
| `send_estimate` | `ghl-invoice-updater` | `send-estimate` |
| `create_invoice_from_estimate` | `ghl-invoice-updater` | `create-from-estimate` |
| `create_invoice_template` | `ghl-invoice-updater` | `create-template` |
| `update_invoice_template` | `ghl-invoice-updater` | `update-template` |
| `delete_invoice_template` | `ghl-invoice-updater` | `delete-template` |
| `create_invoice_schedule` | `ghl-invoice-updater` | `create-schedule` |
| `generate_invoice_number` | `ghl-invoice-updater` | `generate-invoice-number` |
| `generate_estimate_number` | `ghl-invoice-updater` | `generate-estimate-number` |

**After slice 7: 123 upstream tool names → 18 routers + 126 operations** (still 3 `ghl-toolkit-help` ops). 19 facade tools registered on the host (was 13 after Phase 1).

#### Slice 8 — Revenue (added 2026-04-26, tag `v0.3.1-slice-8-revenue`)

| Old (`mcp__ghl-mcp__<name>`) | New router | New operation |
|---|---|---|
| `ghl_list_products` | `ghl-products-reader` | `list` |
| `ghl_get_product` | `ghl-products-reader` | `get` |
| `ghl_list_prices` | `ghl-products-reader` | `list-prices` |
| `ghl_list_product_collections` | `ghl-products-reader` | `list-collections` |
| `ghl_list_inventory` | `ghl-products-reader` | `list-inventory` |
| `ghl_create_product` | `ghl-products-updater` | `create` |
| `ghl_update_product` | `ghl-products-updater` | `update` |
| `ghl_delete_product` | `ghl-products-updater` | `delete` |
| `ghl_create_price` | `ghl-products-updater` | `create-price` |
| `ghl_create_product_collection` | `ghl-products-updater` | `create-collection` |
| `list_orders` | `ghl-payments-reader` | `list-orders` |
| `get_order_by_id` | `ghl-payments-reader` | `get-order` |
| `list_order_fulfillments` | `ghl-payments-reader` | `list-fulfillments` |
| `list_subscriptions` | `ghl-payments-reader` | `list-subscriptions` |
| `get_subscription_by_id` | `ghl-payments-reader` | `get-subscription` |
| `list_transactions` | `ghl-payments-reader` | `list-transactions` |
| `get_transaction_by_id` | `ghl-payments-reader` | `get-transaction` |
| `list_coupons` | `ghl-payments-reader` | `list-coupons` |
| `get_coupon` | `ghl-payments-reader` | `get-coupon` |
| `get_custom_provider_config` | `ghl-payments-reader` | `get-custom-provider-config` |
| `list_whitelabel_integration_providers` | `ghl-payments-reader` | `list-whitelabel-providers` |
| `create_order_fulfillment` | `ghl-payments-updater` | `create-fulfillment` |
| `create_coupon` | `ghl-payments-updater` | `create-coupon` |
| `update_coupon` | `ghl-payments-updater` | `update-coupon` |
| `delete_coupon` | `ghl-payments-updater` | `delete-coupon` |
| `create_custom_provider_config` | `ghl-payments-updater` | `create-custom-provider-config` |
| `disconnect_custom_provider_config` | `ghl-payments-updater` | `disconnect-custom-provider-config` |
| `create_custom_provider_integration` | `ghl-payments-updater` | `create-custom-provider-integration` |
| `delete_custom_provider_integration` | `ghl-payments-updater` | `delete-custom-provider-integration` |
| `create_whitelabel_integration_provider` | `ghl-payments-updater` | `create-whitelabel-provider` |
| `ghl_list_shipping_zones` | `ghl-store-reader` | `list-shipping-zones` |
| `ghl_get_shipping_zone` | `ghl-store-reader` | `get-shipping-zone` |
| `ghl_list_shipping_rates` | `ghl-store-reader` | `list-shipping-rates` |
| `ghl_get_shipping_rate` | `ghl-store-reader` | `get-shipping-rate` |
| `ghl_list_shipping_carriers` | `ghl-store-reader` | `list-shipping-carriers` |
| `ghl_get_shipping_carrier` | `ghl-store-reader` | `get-shipping-carrier` |
| `ghl_get_available_shipping_rates` | `ghl-store-reader` | `get-available-rates` |
| `ghl_get_store_setting` | `ghl-store-reader` | `get-store-setting` |
| `ghl_create_shipping_zone` | `ghl-store-updater` | `create-shipping-zone` |
| `ghl_update_shipping_zone` | `ghl-store-updater` | `update-shipping-zone` |
| `ghl_delete_shipping_zone` | `ghl-store-updater` | `delete-shipping-zone` |
| `ghl_create_shipping_rate` | `ghl-store-updater` | `create-shipping-rate` |
| `ghl_update_shipping_rate` | `ghl-store-updater` | `update-shipping-rate` |
| `ghl_delete_shipping_rate` | `ghl-store-updater` | `delete-shipping-rate` |
| `ghl_create_shipping_carrier` | `ghl-store-updater` | `create-shipping-carrier` |
| `ghl_update_shipping_carrier` | `ghl-store-updater` | `update-shipping-carrier` |
| `ghl_delete_shipping_carrier` | `ghl-store-updater` | `delete-shipping-carrier` |
| `ghl_create_store_setting` | `ghl-store-updater` | `create-store-setting` |

**After slice 8: 171 upstream tool names → 24 routers + 174 operations** (still 3 `ghl-toolkit-help` ops). 25 facade tools registered on the host. Note: `ghl-payments-reader` requires payments.readonly scope on the PIT — dev PIT lacks this (precedent L-SMO-009).

#### Slice 9 — Content (added 2026-04-26, tag `v0.3.2-slice-9-content`)

| Old (`mcp__ghl-mcp__<name>`) | New router | New operation |
|---|---|---|
| `get_blog_sites` | `ghl-blog-reader` | `get-sites` |
| `get_blog_posts` | `ghl-blog-reader` | `get-posts` |
| `get_blog_authors` | `ghl-blog-reader` | `get-authors` |
| `get_blog_categories` | `ghl-blog-reader` | `get-categories` |
| `check_url_slug` | `ghl-blog-reader` | `check-url-slug` |
| `create_blog_post` | `ghl-blog-updater` | `create-post` |
| `update_blog_post` | `ghl-blog-updater` | `update-post` |
| `get_media_files` | `ghl-media-reader` | `get-files` |
| `upload_media_file` | `ghl-media-updater` | `upload-file` |
| `delete_media_file` | `ghl-media-updater` | `delete-file` |

**After slice 9: 181 upstream tool names → 28 routers + 184 operations**. 29 facade tools registered on the host.

#### Slice 10 — Custom Data (added 2026-04-26, tag `v0.3.3-slice-10-custom-data`)

| Old (`mcp__ghl-mcp__<name>`) | New router | New operation |
|---|---|---|
| `ghl_get_custom_field_by_id` | `ghl-custom-field-v2-reader` | `get-by-id` |
| `ghl_get_custom_fields_by_object_key` | `ghl-custom-field-v2-reader` | `get-by-object-key` |
| `ghl_create_custom_field` | `ghl-custom-field-v2-updater` | `create-field` |
| `ghl_update_custom_field` | `ghl-custom-field-v2-updater` | `update-field` |
| `ghl_delete_custom_field` | `ghl-custom-field-v2-updater` | `delete-field` |
| `ghl_create_custom_field_folder` | `ghl-custom-field-v2-updater` | `create-folder` |
| `ghl_update_custom_field_folder` | `ghl-custom-field-v2-updater` | `update-folder` |
| `ghl_delete_custom_field_folder` | `ghl-custom-field-v2-updater` | `delete-folder` |
| `get_all_objects` | `ghl-object-reader` | `list` |
| `get_object_schema` | `ghl-object-reader` | `get-schema` |
| `get_object_record` | `ghl-object-reader` | `get-record` |
| `search_object_records` | `ghl-object-reader` | `search-records` |
| `create_object_schema` | `ghl-object-updater` | `create-schema` |
| `update_object_schema` | `ghl-object-updater` | `update-schema` |
| `create_object_record` | `ghl-object-updater` | `create-record` |
| `update_object_record` | `ghl-object-updater` | `update-record` |
| `delete_object_record` | `ghl-object-updater` | `delete-record` |
| `ghl_get_all_associations` | `ghl-association-reader` | `list` |
| `ghl_get_association_by_id` | `ghl-association-reader` | `get-by-id` |
| `ghl_get_association_by_key` | `ghl-association-reader` | `get-by-key` |
| `ghl_get_association_by_object_key` | `ghl-association-reader` | `get-by-object-key` |
| `ghl_get_relations_by_record` | `ghl-association-reader` | `get-relations-by-record` |
| `ghl_create_association` | `ghl-association-updater` | `create-association` |
| `ghl_update_association` | `ghl-association-updater` | `update-association` |
| `ghl_delete_association` | `ghl-association-updater` | `delete-association` |
| `ghl_create_relation` | `ghl-association-updater` | `create-relation` |
| `ghl_delete_relation` | `ghl-association-updater` | `delete-relation` |

**After slice 10: 208 upstream tool names → 34 routers + 211 operations**. 35 facade tools. **All 19 upstream tool classes wrapped (100% class coverage).** Phase 2 still has slice 11 (cleanup of missed ops in Phase 1 categories) to add the final ~48 ops.

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
