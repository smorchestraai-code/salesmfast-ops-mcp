/**
 * ghl-contacts-reader + ghl-contacts-updater routers (slice 2).
 *
 * 27 ops total: 9 read (search, get, duplicate detection, tasks, notes,
 * appointments) + 18 write (CRUD on contacts/tasks/notes, tag mgmt,
 * campaign + workflow membership).
 *
 * Same factory pattern as calendars; the only category-specific bits are
 * the descriptions, the manifest slice, and the dispatch closure.
 */

import { operations } from "../operations.js";
import { createCategoryRouter } from "./factory.js";
import type { Upstream } from "../upstream.js";
import type { RouterDef } from "./types.js";

const CONTACTS_READER_DESCRIPTION =
  "Read-only access to GoHighLevel contacts (search, get, duplicate detection, tasks, notes, appointments). " +
  "Operations: `search`, `get`, `get-by-business`, `get-duplicate`, `list-tasks`, `get-task`, `list-notes`, `get-note`, `list-appointments`. " +
  "v1.1.3: `search` accepts the full GHL search surface — `query`, `pageLimit` (1-100), `startAfterId`/`startAfter` for cursor pagination, and `filters` object (with `email`, `phone`, `tags: string[]`, `dateAdded: { startDate, endDate }`). The facade bypasses upstream's tool wrapper which silently drops these params. " +
  "All operations are idempotent and side-effect-free; safe to auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-contacts-reader", operation: "<name>" } }` for the full schema.';

const CONTACTS_UPDATER_DESCRIPTION =
  "Write access to GoHighLevel contacts: create, update, upsert, delete; tag add/remove; task create/update/delete/complete; " +
  "note create/update/delete; campaign add/remove; workflow add/remove. " +
  "Operations: `create`, `update`, `upsert`, `delete`, `add-tags`, `remove-tags`, `create-task`, `update-task`, `delete-task`, " +
  "`update-task-completion`, `create-note`, `update-note`, `delete-note`, `add-to-campaign`, `remove-from-campaign`, " +
  "`remove-from-all-campaigns`, `add-to-workflow`, `remove-from-workflow`. " +
  "All operations mutate state — gate behind explicit confirmation in the host; do NOT auto-approve. " +
  'If the desired operation is unclear, call `ghl-toolkit-help { operation: "describe-operation", ' +
  'params: { router: "ghl-contacts-updater", operation: "<name>" } }` for the full schema.';

/**
 * v1.1.3 — direct-axios bypass for `/contacts/search`.
 *
 * Two upstream layers are broken for this endpoint:
 *
 * 1. `contact-tools.searchContacts` wrapper (line 531) drops `filters`,
 *    `pageLimit`, `startAfter`, `startAfterId` — only forwards
 *    `query`/`limit`/`email`/`phone`.
 *
 * 2. `ghl-api-client.searchContacts` (line 146) re-shapes `filters` as an
 *    object (`{ email, phone, tags, dateAdded }`) but GHL's current
 *    `/contacts/search` endpoint expects `filters` as an ARRAY of clauses
 *    (`[{ field, operator, value }, ...]`). Sending the object form
 *    triggers `value?.map is not a function` from GHL.
 *
 * The fix bypasses both layers. We POST directly to `/contacts/search` via
 * the api-client's pre-configured axios instance with the correct shape.
 *
 * Caller-friendly param surface (any of these work):
 *   - `query: "ceo"`                       — full-text fuzzy match
 *   - `pageLimit: 50`                      — page size (1-100, default 25)
 *   - `startAfter`, `startAfterId`         — cursor pagination
 *   - `filters: [...]`                     — pass-through array of clauses
 *   - `filters: { email, phone, tags, dateAdded }`  — convenience object,
 *      converted to array clauses on the way out
 *   - `email`, `phone`, `tags`, `dateAdded` at top level — same, hoisted
 *      into filters (convenience for LLM callers)
 */
interface FilterClause {
  field: string;
  operator: string;
  value: unknown;
}

function buildFilterClauses(
  filtersInput: unknown,
  flatFilters: Record<string, unknown>,
): FilterClause[] {
  // Already array form? Pass through.
  if (Array.isArray(filtersInput)) return filtersInput as FilterClause[];

  // Build object representing all flat filter keys (later overridden by
  // user-supplied filters object).
  const merged: Record<string, unknown> = { ...flatFilters };
  if (filtersInput && typeof filtersInput === "object") {
    Object.assign(merged, filtersInput as Record<string, unknown>);
  }

  const clauses: FilterClause[] = [];
  if (typeof merged.email === "string" && merged.email.trim()) {
    clauses.push({
      field: "email",
      operator: "eq",
      value: merged.email.trim(),
    });
  }
  if (typeof merged.phone === "string" && merged.phone.trim()) {
    clauses.push({
      field: "phone",
      operator: "eq",
      value: merged.phone.trim(),
    });
  }
  if (Array.isArray(merged.tags) && merged.tags.length > 0) {
    clauses.push({ field: "tags", operator: "contains", value: merged.tags });
  }
  if (merged.dateAdded && typeof merged.dateAdded === "object") {
    const d = merged.dateAdded as { startDate?: string; endDate?: string };
    if (d.startDate || d.endDate) {
      clauses.push({
        field: "dateAdded",
        operator: "between",
        value: { gte: d.startDate, lte: d.endDate },
      });
    }
  }
  return clauses;
}

async function dispatchContactsSearch(
  upstream: Upstream,
  params: Record<string, unknown>,
): Promise<unknown> {
  const cfgLocationId = upstream.client.getConfig().locationId;
  const userLocationId =
    typeof params.locationId === "string" && params.locationId !== ""
      ? params.locationId
      : undefined;

  // pageLimit takes precedence over `limit` (legacy alias).
  const pageLimit =
    typeof params.pageLimit === "number"
      ? params.pageLimit
      : typeof params.limit === "number"
        ? params.limit
        : 25;

  const payload: Record<string, unknown> = {
    locationId: userLocationId ?? cfgLocationId,
    pageLimit,
  };
  if (typeof params.query === "string" && params.query.trim()) {
    payload.query = params.query.trim();
  }
  if (typeof params.startAfterId === "string" && params.startAfterId.trim()) {
    payload.startAfterId = params.startAfterId.trim();
  }
  if (typeof params.startAfter === "number") {
    payload.startAfter = params.startAfter;
  }

  const flatFilters: Record<string, unknown> = {};
  for (const k of ["email", "phone", "tags", "dateAdded"] as const) {
    if (params[k] !== undefined) flatFilters[k] = params[k];
  }
  const clauses = buildFilterClauses(params.filters, flatFilters);
  if (clauses.length > 0) payload.filters = clauses;

  // Direct axios POST — bypass upstream's broken layers.
  try {
    const response = await upstream.client.axiosInstance.post<unknown>(
      "/contacts/search",
      payload,
    );
    return response.data;
  } catch (e) {
    const err = e as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    const status = err.response?.status ?? 500;
    const msg =
      err.response?.data?.message ?? err.message ?? "Failed to search contacts";
    const wrapped = new Error(msg) as Error & { status?: number };
    wrapped.status = status;
    throw wrapped;
  }
}

export function createContactsReader(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-contacts-reader",
    description: CONTACTS_READER_DESCRIPTION,
    category: "contacts",
    ops: operations.contacts.reader,
    deniedOps,
    dispatch: (op, params) => {
      // v1.1.3: route around the broken upstream wrapper for `search`.
      if (op === "search_contacts") {
        return dispatchContactsSearch(upstream, params);
      }
      return upstream.contactTools.executeTool(op, params);
    },
    // No contextDefaults: client.searchContacts already falls back to
    // configured locationId when omitted (see ghl-api-client.js:151).
    // Other contacts-reader ops use contactId-style strict schemas.
  });
}

export function createContactsUpdater(
  upstream: Upstream,
  deniedOps: readonly string[],
): RouterDef {
  return createCategoryRouter({
    name: "ghl-contacts-updater",
    description: CONTACTS_UPDATER_DESCRIPTION,
    category: "contacts",
    ops: operations.contacts.updater,
    deniedOps,
    dispatch: (op, params) => upstream.contactTools.executeTool(op, params),
  });
}
