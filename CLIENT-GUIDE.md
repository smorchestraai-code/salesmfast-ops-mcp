# SalesMfast Ops — Client User Guide

This is the single guide your operators need to install, configure, and use the SalesMfast Ops MCP server. It exposes the full GoHighLevel surface (~256 operations) as **35 facade tools** that any MCP host (Claude Desktop, Cowork, Claude Code) can use without hitting the host's tool-cap.

---

## Table of contents

1. [What this is](#what-this-is)
2. [Prerequisites](#prerequisites)
3. [Quick install (one command)](#quick-install-one-command)
4. [Manual install](#manual-install)
5. [First call — verify it works](#first-call--verify-it-works)
6. [How calls are shaped](#how-calls-are-shaped)
7. [The 18 categories](#the-18-categories)
   - CRM core: [contacts](#contacts) · [conversations](#conversations) · [calendars](#calendars) · [opportunities](#opportunities) · [location](#location) · [workflow](#workflow)
   - GTM: [email](#email) · [social-media](#social-media) · [survey](#survey) · [invoice](#invoice)
   - Revenue: [products](#products) · [payments](#payments) · [store](#store)
   - Content: [blog](#blog) · [media](#media)
   - Custom data: [custom-field-v2](#custom-field-v2) · [object](#object) · [association](#association)
8. [Common patterns](#common-patterns)
9. [Param-passing quirks](#param-passing-quirks)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## What this is

SalesMfast Ops is a **facade-router MCP server**. The upstream GoHighLevel MCP exposes ~256 individual tools, which exceeds the per-session tool cap on most hosts (~128). This server collapses those into **17 categories × 2 directions (read / write) + 1 help tool = 35 tools**, while preserving access to every underlying operation via a `selectSchema` discriminated union.

| | |
|---|---:|
| Upstream operations exposed | 259 |
| Facade tools the host sees | 35 |
| Categories | 18 |
| Live-verified read-paths | 18 / 18 |
| Cap-thesis ratio | **7.3× collapse** |

**Read routers (`*-reader`)** are idempotent and side-effect-free — safe to auto-approve.
**Write routers (`*-updater`)** mutate state — gate behind explicit confirmation.

---

## Prerequisites

| | |
|---|---|
| OS | macOS (primary), Linux. Windows: use WSL2. |
| Node.js | **20+** (LTS). Get it from https://nodejs.org. |
| git, curl | Should already be on macOS / Linux. |
| jq | Optional — needed for auto-merge of Claude Desktop config. `brew install jq` (Mac) or `apt install jq` (Linux). |
| GHL Personal Integration Token (PIT) | Generate in GHL → **Settings → Private Integrations → Create new integration**. **Grant ALL scopes** for full coverage (location, payments, social, email, etc.). |
| GHL Location ID | The sub-account ID. Visible in GHL URL: `app.gohighlevel.com/v2/location/<LOCATION_ID>/...`. |
| MCP host | Claude Desktop (most operators), Cowork, or Claude Code. |

---

## Quick install (one command)

From this repo's root:

```bash
bash install.sh
```

The script:

1. Checks prereqs (Node 20+, git, curl)
2. Clones the upstream `GoHighLevel-MCP` next to this repo
3. Builds upstream + this facade
4. Wires `package.json` to point at the local upstream
5. Prompts for your PIT + Location ID (or reads them from env)
6. Writes `.env` (gitignored, mode 600)
7. Smoke-tests the PIT against live GHL
8. Runs `npm run probe` — verifies all 18 categories live
9. Auto-merges the `salesmfast-ops` block into your Claude Desktop config (with timestamped backup)
10. Tells you to restart Claude Desktop

**Non-interactive (CI / scripted):**

```bash
export GHL_API_KEY="pit-xxxxx"
export GHL_LOCATION_ID="UNw9DraGO3eyEa5l4lkJ"
bash install.sh
```

**Skip Desktop auto-merge** (if you want to wire it into a different host yourself):

```bash
SKIP_DESKTOP_MERGE=1 bash install.sh
```

If install passes, **restart Claude Desktop** (Cmd+Q, reopen) and skip to [First call](#first-call--verify-it-works).

---

## Manual install

If you'd rather walk through it yourself:

```bash
# 1. Clone the upstream alongside this repo
cd $(dirname $PWD)
git clone https://github.com/mastanley13/GoHighLevel-MCP.git

# 2. Build upstream
cd GoHighLevel-MCP
npm install
npm run build

# 3. Back into this repo, point package.json at the local upstream
cd ../salesmfast-ops-mcp
npm pkg set dependencies.ghl-mcp-upstream="file:$(pwd)/../GoHighLevel-MCP"

# 4. Install + build
npm install
npm run build

# 5. Configure credentials
cp .env.example .env
# Edit .env — paste your PIT + Location ID (see .env.example for keys)

# 6. Verify
npm run probe   # should print "All assertions passed"

# 7. Wire into Claude Desktop
# Append to ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)
# under "mcpServers":
```

Desktop config block (substitute your absolute path + credentials):

```json
"salesmfast-ops": {
  "command": "node",
  "args": ["/absolute/path/to/salesmfast-ops-mcp/dist/server.js"],
  "env": {
    "GHL_API_KEY":         "pit-xxxxx",
    "GHL_LOCATION_ID":     "UNw9DraGO3eyEa5l4lkJ",
    "GHL_BASE_URL":        "https://services.leadconnectorhq.com",
    "GHL_TOOL_CATEGORIES": "all",
    "GHL_TOOL_DENY":       ""
  }
}
```

Restart Claude Desktop.

---

## First call — verify it works

In a new Claude Desktop chat, ask:

> *"Call ghl-toolkit-help with operation list-categories."*

You should see 18 category names: `contacts`, `conversations`, `calendars`, `opportunities`, `email`, `social-media`, `survey`, `invoice`, `products`, `payments`, `store`, `blog`, `media`, `custom-field-v2`, `object`, `association`, `location`, `workflow`.

If you see fewer or an error, jump to [Troubleshooting](#troubleshooting).

---

## How calls are shaped

Every router takes a `selectSchema` envelope:

```js
mcp__salesmfast-ops__ghl-<category>-<reader|updater>({
  selectSchema: {
    operation: "<op-name>",
    params: { /* op-specific keys */ }
  }
})
```

Three discovery operations on `ghl-toolkit-help` will tell you the live shape of any router:

| Help operation | What it returns |
|---|---|
| `list-categories` | Array of active category names |
| `list-operations { category }` | All operations in a category, with their JSON schemas |
| `describe-operation { router, operation }` | Full input schema + worked example for one operation |

**Default first move when you don't know the call shape: ask `ghl-toolkit-help describe-operation`.**

---

## The 18 categories

### CRM core (Phase 1)

#### contacts
**Routers:** `ghl-contacts-reader` (9 ops) + `ghl-contacts-updater` (22 ops)
**What it controls:** the central contact record, tasks, notes, tags, campaign + workflow membership, dedup, followers, bulk updates.
**Auto-approve reader:** ✅ — every operation is idempotent.

| Common operation | Router | Op | Required params |
|---|---|---|---|
| Search contacts (dedup, segment) | reader | `search` | — (filters via additionalProperties) |
| Get contact full record | reader | `get` | `contactId` |
| Find duplicate by email/phone | reader | `get-duplicate` | — |
| List tasks for contact | reader | `list-tasks` | `contactId` |
| List notes for contact | reader | `list-notes` | `contactId` |
| Create contact | updater | `create` | (firstName/lastName/email per GHL) |
| Update contact | updater | `update` | `contactId` |
| Upsert (create-or-update by email) | updater | `upsert` | — |
| Delete contact | updater | `delete` | `contactId` |
| Add tags | updater | `add-tags` | `contactId`, `tags[]` |
| Remove tags | updater | `remove-tags` | `contactId`, `tags[]` |
| Create note | updater | `create-note` | `contactId`, `body` |
| Create task | updater | `create-task` | `contactId`, `title` |
| Add to workflow | updater | `add-to-workflow` | `contactId`, `workflowId` |
| Add to campaign | updater | `add-to-campaign` | `contactId`, `campaignId` |

**Worked example — dedup before create:**

```js
// 1. Check for duplicate
mcp__salesmfast-ops__ghl-contacts-reader({
  selectSchema: { operation: "search", params: { query: "ruba@smorchestra.com" } }
})

// 2. If empty, create
mcp__salesmfast-ops__ghl-contacts-updater({
  selectSchema: {
    operation: "create",
    params: { firstName: "Ruba", email: "ruba@smorchestra.com", source: "linkedin" }
  }
})
```

**When to use:** every signal-to-CRM workflow starts here — Instantly replies, HeyReach connections, website forms, manual additions. Always dedup first.

---

#### conversations
**Routers:** `ghl-conversations-reader` (8 ops) + `ghl-conversations-updater` (12 ops)
**What it controls:** message threads (SMS, WhatsApp, email), recordings, transcriptions, send actions.

| Common operation | Router | Op | Required params |
|---|---|---|---|
| Search conversations | reader | `search` | — |
| Get conversation thread | reader | `get` | `conversationId` |
| Get recent messages | reader | `get-recent-messages` | `conversationId` |
| Get message recording | reader | `get-message-recording` | `messageId` |
| Get message transcription | reader | `get-message-transcription` | `messageId` |
| Send SMS / WhatsApp | updater | `send-sms` | `contactId`, `message` |
| Send email | updater | `send-email` | `contactId` |
| Cancel scheduled message | updater | `cancel-scheduled-message` | `messageId` |
| Cancel scheduled email | updater | `cancel-scheduled-email` | `emailMessageId` |

**Worked example — send WhatsApp:**

```js
mcp__salesmfast-ops__ghl-conversations-updater({
  selectSchema: {
    operation: "send-sms",
    params: {
      contactId: "uHDvdJ5uiaX2TAwa9LH9",
      message: "مرحباً! شكراً لتسجيلك في فعاليتنا.",
      type: "WhatsApp"
    }
  }
})
```

**MENA rule:** WhatsApp 24-hour window — outside it, you must use a pre-approved template.
**Shared-IP rule:** **NEVER cold-email through GHL** — its shared IP is for warm only. Use Instantly for cold.

---

#### calendars
**Routers:** `ghl-calendars-reader` (14 ops) + `ghl-calendars-updater` (25 ops)
**What it controls:** calendars + groups, events, free slots, appointments + notes, blocked slots, room/equipment resources, notifications.

| Common operation | Router | Op | Required params |
|---|---|---|---|
| List calendar groups | reader | `list-groups` | — |
| List calendars (in a group) | reader | `list` | optional `groupId` |
| Get appointment | reader | `get-appointment` | `appointmentId` |
| List free slots | reader | `list-free-slots` | `calendarId`, `startDate`, `endDate` |
| List appointment notes | reader | `list-appointment-notes` | `appointmentId` |
| List notifications | reader | `list-notifications` | `calendarId` |
| Create calendar | updater | `create` | (groupId + name) |
| Create appointment | updater | `create-appointment` | (calendarId + slot) |
| Create block slot | updater | `create-block-slot` | (calendarId + range) |
| Create calendar group | updater | `create-group` | — |
| Validate group slug | updater | `validate-group-slug` | (slug) |
| Create resource room | updater | `create-resource-room` | — |
| Create notification rule | updater | `create-notification` | — |

**Use case:** booking flows for SaaSfast / SalesMfast clients. Use `list-free-slots` before showing availability; `create-appointment` once a contact picks a slot.

---

#### opportunities
**Routers:** `ghl-opportunities-reader` (3 ops) + `ghl-opportunities-updater` (7 ops)
**What it controls:** deals + pipelines.

| Common operation | Router | Op | Required params |
|---|---|---|---|
| List pipelines + stages | reader | `list-pipelines` | — |
| Search opportunities | reader | `search` | — |
| Get opportunity | reader | `get` | `opportunityId` |
| Create opportunity | updater | `create` | (pipelineId + contactId + stage) |
| Update status | updater | `update-status` | `opportunityId`, `status` (open/won/lost/abandoned) |
| Upsert opportunity | updater | `upsert` | — |
| Add followers | updater | `add-followers` | (opportunityId + userIds) |

**Pipeline placement:** when a signal qualifies a contact, drop them into the right pipeline stage. Stage progression drives reporting.

---

#### location
**Routers:** `ghl-location-reader` (11 ops) + `ghl-location-updater` (13 ops)
**What it controls:** location-level config — tags, custom fields, custom values, templates, timezones.

> ⚠️ **Param-passing quirk:** every reader op needs `params.locationId` — the upstream extracts it explicitly. See [Param-passing quirks](#param-passing-quirks).

| Common operation | Router | Op | Required params |
|---|---|---|---|
| List location tags | reader | `list-tags` | `locationId` |
| List custom fields | reader | `list-custom-fields` | `locationId` |
| List custom values | reader | `list-custom-values` | `locationId` |
| List templates | reader | `list-templates` | `locationId` |
| List timezones | reader | `list-timezones` | `locationId` |
| Create tag | updater | `create-tag` | `name` |
| Update tag | updater | `update-tag` | `tagId` |
| Delete tag | updater | `delete-tag` | `tagId` |
| Create / update / delete custom field | updater | `create-custom-field` etc. | (varies) |

**Use case:** auditing tag taxonomy across clients, defining custom fields used by signals.

---

#### workflow
**Routers:** `ghl-workflow-reader` (1 op)
**What it controls:** lists workflows defined in the location.

| Operation | Op | Params |
|---|---|---|
| List all workflows | `list` | — |

**Use case:** before calling `ghl-contacts-updater.add-to-workflow`, list available workflow IDs first.

---

### GTM surface (Phase 2 — your team's headline use cases)

#### email
**Routers:** `ghl-email-reader` (2 ops) + `ghl-email-updater` (4 ops)
**What it controls:** email templates + campaigns. **Spans two upstream classes** — `EmailTools` for templates/campaigns + `EmailISVTools` for `verify-email`.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List email templates | reader | `get-templates` | — |
| List email campaigns | reader | `get-campaigns` | — |
| Create template | updater | `create-template` | — |
| Update template | updater | `update-template` | `templateId` |
| Delete template | updater | `delete-template` | `templateId` |
| Verify email deliverability (ISV) | updater | `verify-email` | `email` |

**Use case:** before sending a warm email blast, pull templates with `get-templates`, pick one, then orchestrate the send via `ghl-conversations-updater.send-email`. Campaign objects themselves are managed in the GHL UI; the API is read-only for `get-campaigns`.

---

#### social-media
**Routers:** `ghl-social-reader` (14 ops) + `ghl-social-updater` (6 ops)
**What it controls:** social posts across **Facebook, Instagram, LinkedIn, TikTok, Twitter/X, Google Business Profile**. Account connections (OAuth), tags, categories.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List connected accounts | reader | `get-accounts` | — |
| Search / list posts | reader | `search-posts` | — |
| Get a post | reader | `get-post` | `postId` |
| List tags / categories | reader | `get-tags` / `get-categories` | — |
| Get FB pages for an OAuth | reader | `get-facebook-pages` | `accountId` |
| Get IG accounts for an OAuth | reader | `get-instagram-accounts` | `accountId` |
| Get LinkedIn accounts | reader | `get-linkedin-accounts` | `accountId` |
| Get Google Business locations | reader | `get-google-locations` | `accountId` |
| Get Twitter/TikTok profile | reader | `get-twitter-profile` / `get-tiktok-profile` | `accountId` |
| Create a post | updater | `create-post` | (content + accounts) |
| Update / delete post | updater | `update-post` / `delete-post` | `postId` |
| Bulk-delete posts | updater | `bulk-delete-posts` | (postIds[]) |
| Disconnect account | updater | `delete-account` | `accountId` |
| Start OAuth flow | updater | `start-oauth` | (provider) |

**Worked example — schedule a multi-platform post:**

```js
// 1. Find connected accounts
mcp__salesmfast-ops__ghl-social-reader({ selectSchema: { operation: "get-accounts" } })

// 2. Schedule
mcp__salesmfast-ops__ghl-social-updater({
  selectSchema: {
    operation: "create-post",
    params: {
      accountIds: ["fb-account-id", "li-account-id"],
      content: "🚀 New webinar: AI for MENA founders",
      scheduledAt: "2026-05-01T15:00:00Z",
      mediaUrls: ["https://..."]
    }
  }
})
```

---

#### survey
**Routers:** `ghl-survey-reader` (2 ops, **no updater** — read-only category)
**What it controls:** surveys AND **forms** (GHL surfaces forms as surveys via the API).

| Operation | Op | Params |
|---|---|---|
| List surveys / forms | `list` | — |
| List submissions for one | `list-submissions` | (surveyId) |

**Use case:** every form submission on a SalesMfast / EO landing page becomes a "survey submission" here. Pull submissions periodically to enrich CRM contacts with form-field answers.

---

#### invoice
**Routers:** `ghl-invoice-reader` (7 ops) + `ghl-invoice-updater` (11 ops)
**What it controls:** invoices, estimates, recurring schedules, templates.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List invoices | reader | `list` | — |
| Get invoice | reader | `get` | `invoiceId` |
| List estimates | reader | `list-estimates` | — |
| List templates / schedules | reader | `list-templates` / `list-schedules` | — |
| Create invoice | updater | `create` | — |
| Send invoice | updater | `send-invoice` | `invoiceId` |
| Create estimate | updater | `create-estimate` | — |
| Send estimate | updater | `send-estimate` | `estimateId` |
| Convert estimate → invoice | updater | `create-from-estimate` | `estimateId` |
| Generate next invoice number | updater | `generate-invoice-number` | — |
| Generate next estimate number | updater | `generate-estimate-number` | — |

**Worked example — quote-to-invoice:**

```js
// 1. Create estimate with line items
mcp__salesmfast-ops__ghl-invoice-updater({
  selectSchema: {
    operation: "create-estimate",
    params: {
      contactId: "uHDvdJ5uiaX2TAwa9LH9",
      items: [{ name: "AI Strategy Workshop", qty: 1, amount: 5000 }]
    }
  }
})

// 2. Send to contact
mcp__salesmfast-ops__ghl-invoice-updater({
  selectSchema: { operation: "send-estimate", params: { estimateId: "<id-from-step-1>" } }
})

// 3. After client accepts, convert to invoice
mcp__salesmfast-ops__ghl-invoice-updater({
  selectSchema: { operation: "create-from-estimate", params: { estimateId: "<id>" } }
})
```

---

### Revenue surface (Phase 2)

#### products
**Routers:** `ghl-products-reader` (5 ops) + `ghl-products-updater` (5 ops)
**What it controls:** the product catalog — products, prices (variants), collections, inventory.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List products | reader | `list` | — |
| Get product | reader | `get` | `productId` |
| List prices | reader | `list-prices` | — |
| List collections | reader | `list-collections` | — |
| List inventory | reader | `list-inventory` | — |
| Create / update / delete product | updater | `create` / `update` / `delete` | (varies) |
| Create price (variant) | updater | `create-price` | — |
| Create collection | updater | `create-collection` | — |

**Use case:** offer catalogs for funnels and order forms. Every paid Stripe / NMI link links back to a product here.

---

#### payments
**Routers:** `ghl-payments-reader` (11 ops) + `ghl-payments-updater` (9 ops)
**What it controls:** orders, subscriptions, transactions, coupons, fulfillments, custom payment providers, whitelabel integrations.

> ⚠️ **Param-passing quirk:** every payments op needs `params.altId` (= location id) and `params.altType: "location"`. Without these, the upstream API rejects with 403.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List orders | reader | `list-orders` | `altId`, `altType` |
| Get order | reader | `get-order` | `orderId` |
| List subscriptions | reader | `list-subscriptions` | `altId`, `altType` |
| Get subscription | reader | `get-subscription` | `subscriptionId` |
| List transactions | reader | `list-transactions` | `altId`, `altType` |
| Get transaction | reader | `get-transaction` | `transactionId` |
| List / get coupons | reader | `list-coupons` / `get-coupon` | `altId`, `altType` (list) / `couponId` (get) |
| List fulfillments | reader | `list-fulfillments` | `orderId` |
| Create order fulfillment | updater | `create-fulfillment` | — |
| Create / update / delete coupon | updater | `create-coupon` / `update-coupon` / `delete-coupon` | (varies) |

**Worked example — recent revenue:**

```js
mcp__salesmfast-ops__ghl-payments-reader({
  selectSchema: {
    operation: "list-orders",
    params: { altId: "<your-location-id>", altType: "location", limit: 20 }
  }
})
// → { data: [{ amount, currency, contactName, status, ... }, ...], totalCount }
```

---

#### store
**Routers:** `ghl-store-reader` (8 ops) + `ghl-store-updater` (10 ops)
**What it controls:** shipping config — zones, rates, carriers, store-level settings. Useful for clients selling physical goods through GHL.

| Operation | Router | Op |
|---|---|---|
| List zones / rates / carriers | reader | `list-shipping-zones` / `list-shipping-rates` / `list-shipping-carriers` |
| Get available rates for an order | reader | `get-available-rates` |
| Get store settings | reader | `get-store-setting` |
| Zone / rate / carrier CRUD | updater | `create-shipping-*` / `update-shipping-*` / `delete-shipping-*` |

**Use case:** clients with physical products (e.g., Beauty Spa retail) — define zones + rates so checkout shows accurate shipping.

---

### Content surface (Phase 2)

#### blog
**Routers:** `ghl-blog-reader` (5 ops) + `ghl-blog-updater` (2 ops)
**What it controls:** blog posts (across multiple sites within a location), authors, categories, slug availability.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List blog sites | reader | `get-sites` | — |
| List posts | reader | `get-posts` | — |
| List authors | reader | `get-authors` | — |
| List categories | reader | `get-categories` | — |
| Check URL slug | reader | `check-url-slug` | (slug) |
| Create / update post | updater | `create-post` / `update-post` | (siteId, content) |

**Use case:** content automation — agentic blog post drafting that publishes via `create-post` after editorial review.

---

#### media
**Routers:** `ghl-media-reader` (1 op) + `ghl-media-updater` (2 ops)
**What it controls:** the location's media library — images, video, files used in funnels / blog posts / emails.

| Operation | Router | Op | Required params |
|---|---|---|---|
| List media files | reader | `get-files` | `type` (`image` / `video` / etc.) |
| Upload file | updater | `upload-file` | (multipart payload) |
| Delete file | updater | `delete-file` | `fileId` |

---

### Custom data surface (Phase 2)

#### custom-field-v2
**Routers:** `ghl-custom-field-v2-reader` (2 ops) + `ghl-custom-field-v2-updater` (6 ops)
**What it controls:** custom fields on **custom objects** (NOT contact / opportunity — those use the legacy custom-fields API on `ghl-location-reader`).

> ⚠️ **objectKey quirk:** the v2 API rejects `contact` / `opportunity` keys with `400 Invalid object key`. Use **custom-object keys** (e.g., `custom_objects.webinars`) — get them from `ghl-object-reader.list`.

| Operation | Router | Op | Required params |
|---|---|---|---|
| Get one field by id | reader | `get-by-id` | `fieldId` |
| List fields for an object | reader | `get-by-object-key` | `objectKey` |
| Create / update / delete field | updater | `create-field` / `update-field` / `delete-field` | (varies) |
| Create / update / delete folder | updater | `create-folder` / `update-folder` / `delete-folder` | (varies) |

---

#### object
**Routers:** `ghl-object-reader` (4 ops) + `ghl-object-updater` (5 ops)
**What it controls:** custom object schemas + records — your bespoke entity types beyond contacts/opportunities (Webinars, Courses, Equipment, etc.).

| Operation | Router | Op | Required params |
|---|---|---|---|
| List all object schemas | reader | `list` | **no params** (don't pass locationId) |
| Get schema | reader | `get-schema` | `schemaId` |
| Get record | reader | `get-record` | `recordId` |
| Search records | reader | `search-records` | (query) |
| Create / update schema | updater | `create-schema` / `update-schema` | (varies) |
| Create / update / delete record | updater | `create-record` / `update-record` / `delete-record` | (varies) |

**Worked example — find your custom objects:**

```js
mcp__salesmfast-ops__ghl-object-reader({ selectSchema: { operation: "list" } })
// → returns Company, Opportunity, Contact (SYSTEM_DEFINED) + your USER_DEFINED objects
```

The `key` field in each result is what you pass to `custom-field-v2-reader.get-by-object-key`.

---

#### association
**Routers:** `ghl-association-reader` (5 ops) + `ghl-association-updater` (5 ops)
**What it controls:** associations between custom-object **types** (e.g., "Contact ⇆ Webinar registrations") + relations between specific **records** (a contact's actual webinar attendances).

| Operation | Router | Op | Required params |
|---|---|---|---|
| List associations | reader | `list` | — |
| Get association by id / key / object-key | reader | `get-by-id` / `get-by-key` / `get-by-object-key` | (varies) |
| Get relations on a record | reader | `get-relations-by-record` | `recordId` |
| Association CRUD | updater | `create-association` / `update-association` / `delete-association` | (varies) |
| Relation create / delete | updater | `create-relation` / `delete-relation` | (varies) |

**Use case:** model "Contact attended Webinar X" as a relation under a "Contact ⇆ Webinar" association. Powers per-contact event history.

---

## Common patterns

1. **Discovery first.** When uncertain, call `ghl-toolkit-help describe-operation` — returns full schema + worked example for any operation.
2. **Auto-approve readers.** All `*-reader` ops are idempotent and side-effect-free. Approve them all in your host's connector permissions UI.
3. **Gate updaters.** All `*-updater` ops mutate state. Require explicit confirmation per call.
4. **Dedup before create.** Always `search` before `create` for contacts (and opportunities).
5. **Tags are additive.** `add-tags` doesn't remove existing tags — it appends. Use `remove-tags` for targeted removal.
6. **Don't cold-email through GHL.** Shared IP. Use Instantly for cold; GHL for warm.
7. **WhatsApp 24-hour window.** Outside it, you must use a pre-approved Meta template.

---

## Param-passing quirks

The upstream tool wrappers extract some params explicitly (they're NOT auto-injected from the configured location):

| Category | Required param(s) | Why |
|---|---|---|
| `ghl-location-reader.*` | `locationId` | Upstream's `LocationTools.getLocationTags(params.locationId)` etc. |
| `ghl-payments-reader.*` (list ops) | `altId` + `altType: "location"` | Upstream passes args verbatim as query params; GHL's payments API uses the alt-id pattern |
| `ghl-custom-field-v2-reader.get-by-object-key` | `objectKey` (and it must be a `custom_objects.*` key, NOT `contact` / `opportunity`) | The v2 API only supports custom objects; SYSTEM-defined types use the legacy custom-fields surface |
| `ghl-object-reader.list` | **none** (do NOT pass locationId — schema rejects it) | The op uses the configured location implicitly |

If you hit `400 must NOT have additional properties` or `403 Forbidden`, the param shape is the most likely cause — call `describe-operation` to see the exact schema.

---

## Troubleshooting

| Symptom | Most likely cause | Fix |
|---|---|---|
| `npm run probe` fails on first run with "dist/server.js not found" | Build hasn't run yet | `npm run build` |
| Probe fails with `[upstream <category>] 4xx Forbidden` | PIT lacks scope for that category | Regenerate PIT in GHL Settings → Private Integrations with **all scopes** granted |
| Probe fails with `[upstream <category>] ... locationId/undefined/...` | Forgot `params.locationId` for a location op | Pass `locationId` explicitly (see [Param-passing quirks](#param-passing-quirks)) |
| `must NOT have additional properties` on a call | Schema is strict — you passed an unknown key | Call `ghl-toolkit-help describe-operation` for the exact schema |
| `Invalid object key` on custom-field-v2 | You used `contact` / `opportunity` / a non-existent key | Use a `custom_objects.*` key from `ghl-object-reader.list` |
| 35 tools don't appear in Claude Desktop after install | Desktop wasn't fully quit | Cmd+Q (Mac) or close all windows (Win); then reopen |
| `BLOCKED: Cannot find module 'ghl-mcp-upstream'` | The `file:` link broke (e.g., upstream moved) | Re-run `bash install.sh` — it relinks the upstream |
| Probe returns "server process exited before response" | `.env` missing or PIT empty | Check `.env` exists and has both required keys (see `.env.example`) |
| Calling an op returns markdown text wrapped in `content[]` | Some upstream tools wrap with formatted text (e.g., `ghl-store-reader`) | Parse the `content[0].text` field as the response body — it's still valid data |

---

## FAQ

**Q. Can I limit which tools register?**
Yes. Set `GHL_TOOL_CATEGORIES` to a comma-list (e.g., `contacts,calendars`) and only those routers register. Set `GHL_TOOL_DENY` to a comma-list of operation names to strip them from the manifest.

**Q. Can I run multiple instances for different locations?**
Yes. Add multiple blocks under `mcpServers`, each with a different name (`salesmfast-ops-clientA`, `salesmfast-ops-clientB`) and different env (PIT + Location ID per client).

**Q. What happens if the upstream MCP gets a new tool class?**
Re-run `bash install.sh` — it pulls the latest upstream and rebuilds. New tool classes need to be wrapped via a new router; track that as a feature request to the maintainers.

**Q. Is the PIT stored anywhere committed?**
No. `.env` is gitignored and written at mode `600`. The Claude Desktop config holds it separately under `mcpServers["salesmfast-ops"].env`.

**Q. Where does the probe data come from?**
A live call to the GHL REST API using your PIT + Location ID. The probe verifies 22 assertions across all 18 categories on every run; it's the canonical source of truth for "is this thing healthy."

**Q. Can I add my own custom assertions to the probe?**
Yes — `scripts/probe.ts` has a `CATEGORY_PROBES` array. Add a new entry with your category, expected routers, and a `liveRead` block with a fixture id from your location. Re-run `npm run probe`.

---

## Need help?

- Mapping table (old `ghl-mcp` tool name → new router/operation): [`docs/MIGRATION.md`](./docs/MIGRATION.md)
- Auto-generated full operation manifest: [`docs/operation-mapping.md`](./docs/operation-mapping.md)
- Build / probe scripts reference: [`README.md`](./README.md)
- Decision log + lessons captured during build: [`CLAUDE.md`](./CLAUDE.md), [`.claude/lessons.md`](./.claude/lessons.md)
- Status + ship gates: [`STATUS.md`](./STATUS.md)
