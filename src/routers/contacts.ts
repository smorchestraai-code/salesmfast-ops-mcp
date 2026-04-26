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
    dispatch: (op, params) => upstream.contactTools.executeTool(op, params),
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
