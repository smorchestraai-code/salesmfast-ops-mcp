# SalesMfast Ops MCP — Audit Report

**GHL Location:** SMOrchestra (`UNw9DraGO3eyEa5l4lkJ`)
**Audit run:** 10 May 2026
**Scope:** End-to-end test of every reader in the SalesMfast Ops MCP. Read-only against live data.

This document summarises an end-to-end audit of every reader available in the SalesMfast Ops MCP for the SMOrchestra GHL location. Each connector was tested read-only against live data. Section 1 lists the issues that should be fixed by the team. Section 2 lists every connector that returned correct data, for completeness.

---

## 1. Issues to fix

### 1.1  Email connector — subject lines not retrievable

**Issue:** `ghl-email-reader.get-templates` returns only template metadata (name, type, dates, previewUrl). Subject lines are not in the response.

**Why:** Subject lines live on the **email campaign** record, not the template. The current MCP only exposes templates.

**Required fix:** Add a campaigns operation that hits GHL's `/emails/builder/campaigns` endpoint. Each campaign object includes `subject`, `fromName`, `fromEmail`, send window, recipient count, and analytics (opens, clicks, sent). Mirror the structure of `get-templates`:

- `ghl-email-reader.list-campaigns` → returns id, name, subject, status, sentAt, recipientCount
- `ghl-email-reader.get-campaign` → returns full campaign incl. analytics keyed by campaign ID

---

### 1.2  Social Planner — connected accounts not showing

**Issue:** `ghl-social-reader.get-accounts` returns 0 accounts and 0 groups, even when the GHL UI clearly shows connected channels (Facebook, LinkedIn, Instagram, etc.).

**Likely root cause:**

- The OAuth/PIT token scope may be missing `socialplanner/account.readonly`, or
- The wrapper is calling the wrong upstream endpoint (deprecated path).

**Required fix:**

- Verify the token scope includes `socialplanner/account.readonly` and `socialplanner/post.readonly`.
- Confirm the wrapper calls `GET /social-media-posting/{locationId}/accounts` (the v2 endpoint), not an older path.
- Same fix needed for `search-posts`, which also returns 0 even when posts exist in the UI.

---

### 1.3  Forms — not wrapped at all (separate connector needed)

**Issue:** `ghl-survey-reader` covers surveys, but **forms are not exposed**. Forms are heavily used (Pre-Call Qualifier, Newsletter, scorecard intake, etc.) and currently invisible to the MCP.

**Required fix:** Add a new category `ghl-forms-reader` that wraps the GHL v2 forms endpoints. Mirror the survey-reader structure:

- `ghl-forms-reader.list` → `GET /forms/`
- `ghl-forms-reader.get` → `GET /forms/{formId}` (returns field schema and questions)
- `ghl-forms-reader.list-submissions` → `GET /forms/submissions`

This is the most-used surface that's currently invisible — needed for scorecard, lead intake, and Pre-Call Qualifier audits.

---

### 1.4  Workflow connector — no analytics (open / click / sent rates)

**Issue:** `ghl-workflow-reader` only has `list`, which returns metadata (id, name, status, version, dates). There is **no way to see send counts, opens, clicks, replies, or completion rate** for any workflow.

**Required fix:** Add either:

- **Option A (preferred):** `ghl-workflow-reader.get-stats { workflowId }` → returns enrolled / completed / dropped / by-step counts. Backed by GHL's `/workflows/{id}/events` or `/workflows/{id}/stats` endpoint.
- **Option B:** Extend `ghl-email-reader` to return campaign analytics keyed by workflow ID, so we can correlate workflow → email sends → opens/clicks via `/emails/statistics`.

Without this, we can't measure any sequence performance (Post Registration, Cohort waitlist, AI-Native Readiness, etc.).

---

### 1.5  Bonus issues worth fixing in the same sweep

| Bug | Operation | Symptom |
|-----|-----------|---------|
| Schema discriminator bug | `ghl-calendars-reader.list-events` | Listed as valid, but every call fails with `/selectSchema/operation: must be equal to constant`. Completely unusable. Blocks ability to see scheduled bookings. |
| Schema discriminator bug | `ghl-object-reader.get-schema` | Same error pattern. Blocks ability to see custom-object field schemas via this tool. |
| Silent zero-result default | `ghl-blog-reader.get-posts` | Returns 0 posts unless `status` is explicitly passed, even though the UI has 83 posts. Should default to all statuses. |
| Scope gap | `ghl-custom-field-v2-reader.get-by-object-key` | Rejects `contact`, `opportunity`, `business` keys with no fallback. Need `ghl-location-reader.list-custom-fields` to cover contact custom fields. |

---

### 1.6  Priority order to fix

1. **Forms connector** — highest impact; entire surface is invisible right now.
2. **Workflow stats** — blocks all engagement analysis on automation.
3. **Email subject lines / campaigns** — blocks campaign-level audits.
4. **Social Planner** — blocks visibility into publishing.
5. **`list-events` and `get-schema` discriminator bugs** — small fixes; restore broken read paths.
6. **Blog default status filter** — one-line fix in the wrapper.

---

## 2. What is working well

For everything tested in this audit, the following connectors returned correct data with no issues. None of these required workarounds beyond standard parameter passing.

| Connector | Operations tested | Status |
|-----------|-------------------|--------|
| `ghl-contacts-reader` | search, list-appointments, list-notes | Working — found contacts by name, returned full custom-field values, attribution, tags |
| `ghl-conversations-reader` | search, get, get-recent-messages | Working — full thread retrieval; form-submission events visible inline |
| `ghl-opportunities-reader` | list-pipelines, search | Working — 21 pipelines and all open opportunities returned correctly |
| `ghl-location-reader` | get | Working — full location config, timezone, business details, settings |
| `ghl-invoice-reader` | list | Working — 9 invoices with status, amounts, currency, due dates, line items |
| `ghl-products-reader` | list, list-prices | Working — 33 products with prices, currencies, recurring or one-time payment types |
| `ghl-payments-reader` | list-transactions | Working — 115 transactions with provider, method, customer, source |
| `ghl-store-reader` | get-store-setting, list-shipping-zones, list-shipping-carriers | Working — shipping origin and notification config returned correctly |
| `ghl-media-reader` | get-files | Working — files with name, type, size, category, URL (after passing the `type` parameter) |
| `ghl-survey-reader` | list, list-submissions | Working — 12 surveys returned. Note: forms still not wrapped; separate ask in §1.3 |
| `ghl-association-reader` | list, get-relations-by-record | Working — 3 associations returned; relation lookup by record ID works |
| `ghl-object-reader` | list, search-records | Working — 4 objects (3 system, 1 custom); record counts accurate |
| `ghl-custom-field-v2-reader` | get-by-object-key | Working for custom objects (returned 5 fields on `custom_objects.webinars`) |
| `ghl-blog-reader` | get-sites, get-authors, get-categories, get-posts | Working — 2 sites, 2 authors, 2 categories, 78+ posts retrieved (after status-filter workaround) |
| `ghl-toolkit-help` | list-categories | Working — returned all 18 active categories cleanly |
| `ghl-calendars-reader` | list, list-groups, list-free-slots, get-blocked-slots | **Partial** — these work, but `list-events` is broken (see §1.5) |
| `ghl-workflow-reader` | list | **Partial** — list works (519 workflows returned), but no stats endpoint exists (see §1.4) |

---

*End of report.*
